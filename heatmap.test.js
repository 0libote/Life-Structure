"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  activityLevel,
  combinedLevels,
  dateKey,
  gridColumns,
  periodData,
  stats,
} = require("./src/heatmap");

test("stats count levels and the current streak", () => {
  const levels = { "2026-07-24": 4, "2026-07-25": 1, "2026-07-26": 2 };
  assert.deepEqual(stats(levels, new Date(2026, 6, 27, 12)), {
    active: 3,
    points: 7,
    streak: 3,
  });
  assert.equal(dateKey(new Date(2026, 0, 2)), "2026-01-02");
});

test("vault activity fills levels without overwriting manual effort", () => {
  assert.deepEqual([0, 1, 2, 5, 10].map(activityLevel), [0, 1, 2, 3, 4]);
  assert.deepEqual(
    combinedLevels(
      { "2026-07-26": 4 },
      { "2026-07-26": ["one.md"], "2026-07-27": ["one.md", "two.md"] },
    ),
    { "2026-07-26": 4, "2026-07-27": 2 },
  );
});

test("period data makes future days unavailable", () => {
  const data = periodData(
    { "2026-07-01": 3 },
    new Date(2026, 6, 1, 12),
    new Date(2026, 6, 3, 12),
    new Date(2026, 6, 2, 12),
  );
  assert.deepEqual(data.map(({ value }) => value), [3, 0, "#00000000"]);
});

test("year grid uses the pane in both directions", () => {
  assert.equal(gridColumns(7, 960, 500, 114, 153), 4);
  assert.equal(gridColumns(7, 240, 500, 114, 153), 2);
  assert.equal(gridColumns(12, 960, 500, 114, 153), 6);
});
