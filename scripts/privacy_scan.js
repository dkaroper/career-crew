#!/usr/bin/env node
"use strict";
// Privacy and secret scan: release gate that keeps personal data and tokens out of the repo.
//   node scripts/privacy_scan.js --denylist <path> [--history]
//   node scripts/privacy_scan.js --secrets [--history]
// Prints "<file or commit>: <pattern>" per hit; exits 1 on any hit, 0 if clean, 2 on bad usage.
// Secret hits print the pattern name only, never the matched value.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const SECRET_PATTERNS = [
  { name: "apify-token", re: /apify_api_[A-Za-z0-9]{20,}/ },
  { name: "anthropic-key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "github-token", re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "github-fine-grained-token", re: /github_pat_[A-Za-z0-9_]{40,}/ },
  { name: "aws-access-key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "private-key-block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const BINARY_EXT = new Set([".docx", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".ico", ".woff", ".woff2"]);

/** Case-insensitive literal match. Returns [{pattern, index}] for every occurrence. */
function scanText(text, patterns) {
  const hay = String(text).toLowerCase();
  const hits = [];
  for (const pattern of patterns) {
    const needle = String(pattern).toLowerCase();
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const i = hay.indexOf(needle, from);
      if (i === -1) break;
      hits.push({ pattern, index: i });
      from = i + needle.length;
    }
  }
  return hits;
}

/** Secret regex scan. Returns pattern names only (never values). */
function scanSecrets(text) {
  return SECRET_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.name);
}

function parseDenylist(content) {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, shell: false, encoding: "buffer", maxBuffer: 1024 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    throw new Error(`git ${args[0]} failed${r.stderr ? ": " + r.stderr.toString("utf8").trim() : ""}`);
  }
  return r.stdout;
}

const isBinary = (buf) => buf.includes(0);

function main(argv) {
  const args = argv.slice();
  const history = args.includes("--history");
  const secrets = args.includes("--secrets");
  const di = args.indexOf("--denylist");
  let patterns = [];
  if (di !== -1) {
    const p = args[di + 1];
    if (!p) return usage("--denylist needs a path");
    try {
      patterns = parseDenylist(fs.readFileSync(p, "utf8"));
    } catch (e) {
      return usage(`cannot read denylist: ${e.code || e.message}`);
    }
  }
  if (di === -1 && !secrets) return usage("give --denylist <path> and/or --secrets");

  const cwd = process.cwd();
  const out = [];
  const check = (label, text) => {
    const seen = new Set();
    for (const h of scanText(text, patterns)) {
      if (!seen.has(h.pattern)) {
        seen.add(h.pattern);
        out.push(`${label}: ${h.pattern}`);
      }
    }
    if (secrets) for (const name of scanSecrets(text)) out.push(`${label}: ${name}`);
  };

  const files = git(["ls-files", "-z"], cwd).toString("utf8").split("\0").filter(Boolean);
  for (const f of files) {
    if (BINARY_EXT.has(path.extname(f).toLowerCase())) continue;
    let buf;
    try {
      buf = fs.readFileSync(path.join(cwd, f));
    } catch {
      continue;
    }
    if (isBinary(buf)) continue;
    check(f, buf.toString("utf8"));
  }

  if (history) {
    const log = git(["log", "-p", "--all", "--no-color", "--text"], cwd).toString("utf8");
    const parts = log.split(/^commit (?=[0-9a-f]{40}\b)/m).slice(1);
    for (const part of parts) {
      check(`commit ${part.slice(0, 12)}`, part);
    }
  }

  for (const line of out) console.log(line);
  if (out.length) {
    console.error(`privacy_scan: ${out.length} hit(s)`);
    return 1;
  }
  console.log("privacy_scan: clean");
  return 0;
}

function usage(msg) {
  console.error(`privacy_scan: ${msg}`);
  console.error("usage: node scripts/privacy_scan.js (--denylist <path> | --secrets) [--history]");
  return 2;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { scanText, scanSecrets, parseDenylist, SECRET_PATTERNS };
