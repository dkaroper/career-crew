"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");

function tracked() {
  const r = spawnSync("git", ["ls-files"], { shell: false, cwd: root, encoding: "utf8" });
  assert.strictEqual(r.status, 0, "git ls-files failed");
  return r.stdout.split("\n").filter(Boolean);
}

function shippedAgents() {
  return tracked().filter((f) => /^\.claude\/agents\/[^/]+\.md$/.test(f));
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(m, "missing frontmatter");
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("shipped agent list is non-empty", () => {
  assert.ok(shippedAgents().length >= 4);
});

for (const f of shippedAgents()) {
  test(`frontmatter valid: ${f}`, () => {
    const fm = frontmatter(read(f));
    assert.strictEqual(fm.name, path.basename(f, ".md"));
    assert.ok(fm.description, "description missing");
    assert.ok(fm.tools, "tools missing");
  });
}

const crewJsonFiles = [
  ...shippedAgents(),
  ".claude/templates/track-specialist.md",
  ".claude/skills/onboarding/SKILL.md",
];
for (const f of crewJsonFiles) {
  test(`references profile/crew.json: ${f}`, () => {
    assert.ok(fs.existsSync(path.join(root, f)), `${f} does not exist`);
    assert.ok(read(f).includes("profile/crew.json"));
  });
}

test("no tracked text file contains an em-dash (U+2014)", () => {
  const bad = tracked()
    .filter((f) => /\.(md|js|json|yml)$/.test(f))
    .filter((f) => fs.readFileSync(path.join(root, f), "utf8").includes("—"));
  assert.deepStrictEqual(bad, []);
});

test(".gitignore covers user-data paths and .env", () => {
  const lines = read(".gitignore").split(/\r?\n/).map((l) => l.trim());
  for (const p of ["profile/", "library/", "inputs/", "applications/", ".claude/agents/resume-tailor-*.md", ".env"]) {
    assert.ok(lines.includes(p), `.gitignore missing ${p}`);
  }
});
