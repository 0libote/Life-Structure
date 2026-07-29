"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  activityLevel,
  activityTotal,
  addedCounts,
  baselineCounts,
  combinedLevels,
  dateKey,
  firstActivityKeys,
  gridColumns,
  misplacedBaseline,
  periodData,
  sameCounts,
  stats,
  textCounts,
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
      {
        "2026-07-26": { "one.md": { words: 10, characters: 50 } },
        "2026-07-27": {
          "one.md": { words: 200, characters: 1000 },
          "two.md": { words: 300, characters: 1500 },
        },
      },
    ),
    { "2026-07-26": 4, "2026-07-27": 2 },
  );
  assert.deepEqual(
    combinedLevels(
      {},
      {
        "2026-07-27": {
          "one.md": { words: 200, characters: 1000 },
          "two.md": { words: 300, characters: 1500 },
        },
      },
      "words",
    ),
    { "2026-07-27": 3 },
  );
  assert.equal(
    activityTotal(
      {
        "one.md": { words: 200, characters: 1000 },
        "two.md": { words: 300, characters: 1500 },
      },
      "characters",
    ),
    2500,
  );
});

test("writing counts words and Unicode characters", () => {
  assert.deepEqual(textCounts("One  two\n👋"), { words: 3, characters: 10 });
  assert.deepEqual(addedCounts({ words: 3, characters: 10 }), {
    words: 3,
    characters: 10,
  });
  assert.deepEqual(
    addedCounts(
      { words: 2, characters: 8 },
      { words: 3, characters: 10 },
    ),
    { words: 0, characters: 0 },
  );
  assert.deepEqual(
    addedCounts(
      { words: 4, characters: 12 },
      { words: 2, characters: 8 },
    ),
    { words: 2, characters: 4 },
  );
  assert.deepEqual(
    baselineCounts(
      { words: 500, characters: 2500 },
      { words: 0, characters: 0 },
    ),
    { words: 500, characters: 2500 },
  );
  assert.equal(
    baselineCounts(
      { words: 500, characters: 2500 },
      { words: 10, characters: 50 },
    ),
    null,
  );
  assert.equal(
    sameCounts(
      { words: 500, characters: 2500 },
      { words: 500, characters: 2500 },
    ),
    true,
  );
  assert.equal(
    sameCounts(
      { words: 499, characters: 2500 },
      { words: 500, characters: 2500 },
    ),
    false,
  );
  assert.deepEqual(
    firstActivityKeys({
      "2026-07-01": { "new.md": {}, "old.md": {} },
      "2025-01-01": { "old.md": {} },
    }),
    { "old.md": "2025-01-01", "new.md": "2026-07-01" },
  );
  assert.deepEqual(
    misplacedBaseline(
      {
        "2025-01-01": { "old.md": { words: 0, characters: 0 } },
        "2026-07-01": { "old.md": { words: 500, characters: 2500 } },
      },
      "old.md",
      { words: 500, characters: 2500 },
      "2025-01-01",
    ),
    { words: 500, characters: 2500 },
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
