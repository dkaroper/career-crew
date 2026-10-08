"use strict";
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SCRIPT = path.join(__dirname, "..", "scripts", "privacy_scan.js");
const { scanText } = require(SCRIPT);

function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, shell: false, encoding: "utf8" });
  assert.strictEqual(r.status, 0, `git ${args.join(" ")} failed: ${r.stderr}`);
  return r.stdout;
}

function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-scan-"));
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.name", "Test"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "commit.gpgsign", "false"]);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "init"]);
  return dir;
}

function run(cwd, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, shell: false, encoding: "utf8" });
}

function denylist(dir, text) {
  const p = path.join(os.tmpdir(), `cc-deny-${process.pid}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(p, text);
  return p;
}

test("scanText finds a case-insensitive literal", () => {
  const hits = scanText("Hello ZEBRA", ["zebra"]);
  assert.strictEqual(hits.length, 1);
  assert.strictEqual(hits[0].pattern, "zebra");
  assert.strictEqual(hits[0].index, 6);
});

test("scanText treats patterns as literals, not regex", () => {
  assert.strictEqual(scanText("a.b", ["a.b"]).length, 1);
  assert.strictEqual(scanText("axb", ["a.b"]).length, 0);
});

test("denylist ignores blank lines, comments, and CRLF", () => {
  const dir = makeRepo({ "a.txt": "nothing to see here\n" });
  const dl = denylist(dir, "# comment\r\n\r\n   \r\nquokkaterm\r\n");
  const ok = run(dir, ["--denylist", dl]);
  assert.strictEqual(ok.status, 0, ok.stdout + ok.stderr);
  const dir2 = makeRepo({ "a.txt": "has a QuokkaTerm inside\n" });
  const bad = run(dir2, ["--denylist", dl]);
  assert.strictEqual(bad.status, 1);
  assert.match(bad.stdout, /a\.txt: quokkaterm/);
});

test("comment text in the denylist is not itself a pattern", () => {
  const dir = makeRepo({ "a.txt": "this mentions comment words\n" });
  const dl = denylist(dir, "# comment words\n");
  assert.strictEqual(run(dir, ["--denylist", dl]).status, 0);
});

test("clean repo exits 0, seeded term exits 1", () => {
  const dl = denylist(null, "zebrafish\n");
  assert.strictEqual(run(makeRepo({ "a.txt": "clean\n" }), ["--denylist", dl]).status, 0);
  assert.strictEqual(run(makeRepo({ "a.txt": "a zebrafish\n" }), ["--denylist", dl]).status, 1);
});

test("binary files are skipped", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-scan-"));
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.name", "Test"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  fs.writeFileSync(path.join(dir, "b.bin"), Buffer.concat([Buffer.from("zebrafish"), Buffer.from([0, 1, 2])]));
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "bin"]);
  const dl = denylist(null, "zebrafish\n");
  assert.strictEqual(run(dir, ["--denylist", dl]).status, 0);
});

test("--history finds a term that was removed from the working tree", () => {
  const dir = makeRepo({ "a.txt": "a zebrafish\n" });
  fs.writeFileSync(path.join(dir, "a.txt"), "clean now\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "clean"]);
  const dl = denylist(null, "zebrafish\n");
  assert.strictEqual(run(dir, ["--denylist", dl]).status, 0);
  const h = run(dir, ["--denylist", dl, "--history"]);
  assert.strictEqual(h.status, 1);
  assert.match(h.stdout, /zebrafish/);
});

test("--secrets flags a token and never prints it", () => {
  const token = "apify_api_" + "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5";
  const dir = makeRepo({ "doc.txt": `token: ${token}\n` });
  const r = run(dir, ["--secrets"]);
  assert.strictEqual(r.status, 1);
  assert.ok(!r.stdout.includes(token), "stdout leaked token");
  assert.ok(!r.stderr.includes(token), "stderr leaked token");
  assert.match(r.stdout, /doc\.txt/);
});

test("--secrets allows a bare prefix as used in docs", () => {
  const dir = makeRepo({ "doc.txt": "tokens start with apify_api_ and a long string\n" });
  assert.strictEqual(run(dir, ["--secrets"]).status, 0);
});

test("--secrets --history finds a removed token without printing it", () => {
  const token = "sk-ant-" + "abcdefghijklmnopqrstuvwxyz012345";
  const dir = makeRepo({ "k.txt": token + "\n" });
  fs.writeFileSync(path.join(dir, "k.txt"), "gone\n");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-q", "-m", "rm"]);
  assert.strictEqual(run(dir, ["--secrets"]).status, 0);
  const h = run(dir, ["--secrets", "--history"]);
  assert.strictEqual(h.status, 1);
  assert.ok(!h.stdout.includes(token));
});

test("usage errors exit 2", () => {
  const dir = makeRepo({ "a.txt": "x\n" });
  assert.strictEqual(run(dir, []).status, 2);
  assert.strictEqual(run(dir, ["--denylist", path.join(dir, "nope.txt")]).status, 2);
});
