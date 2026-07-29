"use strict";

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function stats(levels, today = new Date()) {
  const todayKey = dateKey(today);
  const active = Object.values(levels).filter((level) => level > 0).length;
  const points = Object.values(levels).reduce((sum, level) => sum + level, 0);
  let streak = 0;
  const cursor = dateFromKey(todayKey);
  if (!levels[todayKey]) cursor.setDate(cursor.getDate() - 1);
  while (levels[dateKey(cursor)] > 0) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { active, points, streak };
}

function activityLevel(count) {
  if (count >= 10) return 4;
  if (count >= 5) return 3;
  if (count >= 2) return 2;
  return count ? 1 : 0;
}

function combinedLevels(manual, edits) {
  const levels = { ...manual };
  for (const [key, paths] of Object.entries(edits)) {
    levels[key] = Math.max(levels[key] || 0, activityLevel(paths.length));
  }
  return levels;
}

function periodData(levels, start, end, cutoff) {
  const data = [];
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    data.push({
      date: +date,
      value: date <= cutoff ? levels[dateKey(date)] || 0 : "#00000000",
    });
  }
  return data;
}

function gridColumns(count, width, height, itemWidth, itemHeight, gap = 12) {
  let bestColumns = 1;
  let bestScale = 0;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const scale = Math.min(
      width / (columns * itemWidth + (columns - 1) * gap),
      height / (rows * itemHeight + (rows - 1) * gap),
    );
    if (scale > bestScale) {
      bestColumns = columns;
      bestScale = scale;
    }
  }
  return bestColumns;
}

module.exports = { activityLevel, combinedLevels, dateKey, gridColumns, periodData, stats };
