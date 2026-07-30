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

function addedCounts(current, previous) {
  return {
    words: Math.max(0, current.words - (previous?.words || 0)),
    characters: Math.max(0, current.characters - (previous?.characters || 0)),
  };
}

function baselineCounts(current, recorded) {
  return recorded?.words || recorded?.characters ? null : current;
}

function firstActivityKeys(activity) {
  const first = {};
  for (const key of Object.keys(activity).sort((left, right) => left.localeCompare(right))) {
    for (const path of Object.keys(activity[key])) first[path] ??= key;
  }
  return first;
}

function sameCounts(left, right) {
  return left?.words === right.words && left?.characters === right.characters;
}

function misplacedBaseline(activity, path, counts, targetKey) {
  return (
    Object.entries(activity).find(
      ([key, files]) => key !== targetKey && sameCounts(files[path], counts),
    )?.[1][path] || null
  );
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

module.exports = {
  activityLevel,
  activityTotal,
  addedCounts,
  baselineCounts,
  combinedLevels,
  dateFromKey,
  dateKey,
  firstActivityKeys,
  misplacedBaseline,
  periodData,
  sameCounts,
  stats,
  textCounts,
};
