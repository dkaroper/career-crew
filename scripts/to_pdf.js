#!/usr/bin/env node
"use strict";
// Convert one .docx to .pdf. Word COM on Windows, LibreOffice elsewhere.
// Security: paths never enter a script or shell string. Word receives them via
// env vars only; LibreOffice receives them as discrete argv elements.
// Always spawnSync with shell: false, one file per invocation, foreground.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const TIMEOUT_MS = 120000;
const MAC_SOFFICE = "/Applications/LibreOffice.app/Contents/MacOS/soffice";

// Fixed text. Do not interpolate anything into it.
const WORD_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$word = $null",
  "$doc = $null",
  "try {",
  "  $word = New-Object -ComObject Word.Application",
  "  $word.Visible = $false",
  "  $word.DisplayAlerts = 0",
  "  $doc = $word.Documents.Open($env:CC_PDF_IN)",
  "  $doc.SaveAs2($env:CC_PDF_OUT, 17)",
  "} finally {",
  "  if ($doc) { $doc.Close(0) }",
  "  if ($word) { $word.Quit() }",
  "}",
].join("\n");

function chooseEngine({ platform, hasWord, hasSoffice }) {
  if (platform === "win32" && hasWord) return "word";
  if (hasSoffice) return "libreoffice";
  return null;
}

function buildCommand(engine, inPath, outPath, sofficeCmd = "soffice") {
  if (engine === "word") {
    return {
      cmd: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", WORD_SCRIPT],
      env: { CC_PDF_IN: inPath, CC_PDF_OUT: outPath },
    };
  }
  if (engine === "libreoffice") {
    return {
      cmd: sofficeCmd,
      args: ["--headless", "--convert-to", "pdf", "--outdir", path.dirname(outPath), inPath],
      env: {},
    };
  }
  throw new Error(`Unknown engine: ${engine}`);
}

// Word cannot open or save a path of 255+ characters ("String is longer than 255
// characters"). For long paths, convert a copy in a short temp folder instead.
const WORD_MAX_PATH = 250;
function stagePaths(engine, inPath, outPath, tmpDir) {
  if (engine === "word" && (inPath.length >= WORD_MAX_PATH || outPath.length >= WORD_MAX_PATH)) {
    return { staged: true, convIn: path.join(tmpDir, "in.docx"), convOut: path.join(tmpDir, "out.pdf") };
  }
  return { staged: false, convIn: inPath, convOut: outPath };
}

function probe(cmd, args) {
  const r = spawnSync(cmd, args, { shell: false, stdio: "ignore", timeout: 30000 });
  return !r.error && r.status === 0;
}

// Windows installers put soffice.exe under Program Files without adding it to PATH.
function windowsSofficeCandidates(env) {
  const roots = [env.ProgramFiles, env["ProgramFiles(x86)"]].filter((r) => typeof r === "string" && r.length > 0);
  return roots.map((r) => path.win32.join(r, "LibreOffice", "program", "soffice.exe"));
}

// Returns the soffice command to run, or null. Dependencies are injectable for tests.
function findSoffice({ platform, env, existsSync, probe: probeFn }) {
  if (probeFn("soffice", ["--version"])) return "soffice";
  if (platform === "darwin" && existsSync(MAC_SOFFICE) && probeFn(MAC_SOFFICE, ["--version"])) return MAC_SOFFICE;
  if (platform === "win32") {
    for (const candidate of windowsSofficeCandidates(env)) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

// Not called at require time.
function detect() {
  const hasWord = process.platform === "win32" && probe("reg", ["query", "HKCR\\Word.Application"]);
  const soffice = findSoffice({ platform: process.platform, env: process.env, existsSync: fs.existsSync, probe });
  return { hasWord, hasSoffice: soffice !== null, soffice };
}

// LibreOffice writes <outdir>/<input base>.pdf. Any copy left from an earlier run
// must go before converting, so the existence check afterwards proves a fresh file.
function libreOfficeProduct(inPath, outDir) {
  return path.join(outDir, path.basename(inPath).replace(/\.[^.]*$/, "") + ".pdf");
}

function removeStale(paths) {
  for (const p of new Set(paths)) fs.rmSync(p, { force: true });
}

function main(argv, deps = {}) {
  const run = deps.spawnSync || spawnSync;
  const log = deps.log || ((m) => console.log(m));
  const error = deps.error || ((m) => console.error(m));
  const [inArg, outArg] = argv;
  if (!inArg) {
    error("Usage: node scripts/to_pdf.js <in.docx> [out.pdf]");
    return 1;
  }
  const inPath = path.resolve(inArg);
  const outPath = path.resolve(outArg || inPath.replace(/\.docx$/i, "") + ".pdf");

  let found;
  if (process.env.CAREER_CREW_FORCE_NO_ENGINE === "1") found = { hasWord: false, hasSoffice: false, soffice: null };
  else found = (deps.detect || detect)();
  const engine = chooseEngine({ platform: process.platform, hasWord: found.hasWord, hasSoffice: found.hasSoffice });
  if (!engine) {
    error(
      "No PDF engine found. Install LibreOffice (https://www.libreoffice.org/) so `soffice` is available, " +
        "or use Microsoft Word on Windows. You can also open the .docx and use Save As PDF."
    );
    return 2;
  }
  if (!fs.existsSync(inPath)) {
    error(`Input not found: ${inPath}`);
    return 1;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let tmpDir = null;
  let stage = stagePaths(engine, inPath, outPath, "");
  try {
    if (stage.staged) {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pdf-"));
      stage = stagePaths(engine, inPath, outPath, tmpDir);
      fs.copyFileSync(inPath, stage.convIn);
    }
    const stale = [outPath, stage.convOut];
    if (engine === "libreoffice") stale.push(libreOfficeProduct(stage.convIn, path.dirname(stage.convOut)));
    removeStale(stale.filter((p) => p !== inPath && p !== stage.convIn));

    const { cmd, args, env } = buildCommand(engine, stage.convIn, stage.convOut, found.soffice || "soffice");
    const r = run(cmd, args, {
      shell: false,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      env: { ...process.env, ...env },
    });
    if (r.error || r.status !== 0) {
      error(`PDF conversion with ${engine} failed: ${(r.error && r.error.message) || r.stderr || r.stdout}`);
      return 1;
    }
    if (engine === "libreoffice") {
      const produced = libreOfficeProduct(stage.convIn, path.dirname(stage.convOut));
      if (produced !== stage.convOut && fs.existsSync(produced)) fs.renameSync(produced, stage.convOut);
    }
    if (stage.staged && fs.existsSync(stage.convOut)) fs.copyFileSync(stage.convOut, outPath);
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  if (!fs.existsSync(outPath)) {
    error(`Conversion reported success but ${outPath} was not created.`);
    return 1;
  }
  log(outPath);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { chooseEngine, buildCommand, detect, findSoffice, stagePaths, main };
