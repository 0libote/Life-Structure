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

const THRESHOLDS = {
  notes: [1, 2, 5, 10],
  words: [1, 100, 500, 1000],
  characters: [1, 500, 2500, 5000],
};

function activityLevel(count, metric = "notes") {
  const [, some, good, great] = THRESHOLDS[metric] || THRESHOLDS.notes;
  if (count >= great) return 4;
  if (count >= good) return 3;
  if (count >= some) return 2;
  return count ? 1 : 0;
}

function activityTotal(files = {}, metric = "notes") {
  if (metric === "notes") return Object.keys(files).length;
  return Object.values(files).reduce((total, counts) => total + (counts[metric] || 0), 0);
}

function combinedLevels(manual, activity, metric = "notes") {
  const levels = { ...manual };
  for (const [key, files] of Object.entries(activity)) {
    levels[key] = Math.max(levels[key] || 0, activityLevel(activityTotal(files, metric), metric));
  }
  return levels;
}

function textCounts(text) {
  return {
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    characters: [...text].length,
  };
}

function addedCounts(current, previous = { words: 0, characters: 0 }) {
  return {
    words: Math.max(0, current.words - previous.words),
    characters: Math.max(0, current.characters - previous.characters),
  };
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

module.exports = {
  activityLevel,
  activityTotal,
  addedCounts,
  combinedLevels,
  dateKey,
  gridColumns,
  periodData,
  stats,
  textCounts,
};
