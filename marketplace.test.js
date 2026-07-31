"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, statSync } = require("node:fs");
const manifest = require("./manifest.json");
const packageJson = require("./package.json");
const versions = require("./versions.json");

const semver = /^\d+\.\d+\.\d+$/;

test("Obsidian marketplace metadata and assets are valid", () => {
  for (const file of ["README.md", "LICENSE", "manifest.json", "main.js", "styles.css"]) {
    assert.ok(statSync(file).size, `${file} must exist and not be empty`);
  }

  for (const field of ["id", "name", "version", "minAppVersion", "description", "author"]) {
    assert.equal(typeof manifest[field], "string", `${field} must be a string`);
    assert.ok(manifest[field], `${field} must not be empty`);
  }

  assert.match(manifest.id, /^[a-z-]+$/);
  assert.doesNotMatch(manifest.id, /obsidian/);
  assert.doesNotMatch(manifest.id, /plugin$/);
  assert.match(manifest.name, /^[A-Za-z0-9 +()-]+$/);
  assert.doesNotMatch(manifest.name, /obsidian|obsi-|-sidian|plugin/i);
  assert.match(manifest.version, semver);
  assert.match(manifest.minAppVersion, semver);
  assert.ok(manifest.description.length <= 250);
  assert.match(manifest.description, /\.$/);
  assert.equal(typeof manifest.isDesktopOnly, "boolean");

  if (manifest.authorUrl) assert.doesNotThrow(() => new URL(manifest.authorUrl));
  assert.equal(packageJson.version, manifest.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  for (const [version, minAppVersion] of Object.entries(versions)) {
    assert.match(version, semver);
    assert.match(minAppVersion, semver);
  }

  if (process.env.GITHUB_REF_TYPE === "tag") {
    assert.equal(process.env.GITHUB_REF_NAME, manifest.version);
  }

  assert.doesNotMatch(
    readFileSync("main.js", "utf8"),
    /\beval\b|new Function|createElement(?:NS)?\s*\(\s*["']script["']/,
  );
});
