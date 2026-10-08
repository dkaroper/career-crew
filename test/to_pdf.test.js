"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { chooseEngine, buildCommand } = require("../scripts/to_pdf.js");

const SCRIPT = path.join(__dirname, "..", "scripts", "to_pdf.js");

test("chooseEngine prefers Word on win32", () => {
  assert.strictEqual(chooseEngine({ platform: "win32", hasWord: true, hasSoffice: true }), "word");
});

test("chooseEngine falls back to LibreOffice on win32 without Word", () => {
  assert.strictEqual(chooseEngine({ platform: "win32", hasWord: false, hasSoffice: true }), "libreoffice");
});

test("chooseEngine ignores Word off Windows", () => {
  assert.strictEqual(chooseEngine({ platform: "darwin", hasWord: true, hasSoffice: true }), "libreoffice");
  assert.strictEqual(chooseEngine({ platform: "linux", hasWord: true, hasSoffice: false }), null);
});

test("chooseEngine returns null when nothing is available", () => {
  assert.strictEqual(chooseEngine({ platform: "win32", hasWord: false, hasSoffice: false }), null);
});

test("libreoffice command keeps spaced paths as single elements", () => {
  const inp = "C:\\My Docs\\a b.docx";
  const { cmd, args } = buildCommand("libreoffice", inp, "C:\\My Docs\\a b.pdf");
  assert.strictEqual(cmd, "soffice");
  for (const a of ["--headless", "--convert-to", "pdf", "--outdir", "C:\\My Docs"]) {
    assert.ok(args.includes(a), `missing ${a}`);
  }
  assert.ok(args.includes(inp));
});

test("word command passes hostile paths only through env", () => {
  const inp = "C:\\x\\a'; Remove-Item -Recurse ~; '.docx";
  const out = "C:\\x\\$(calc).pdf";
  const { cmd, args, env } = buildCommand("word", inp, out);
  assert.strictEqual(cmd, "powershell");
  for (const a of ["-NoProfile", "-NonInteractive", "-Command"]) assert.ok(args.includes(a));
  for (const a of args) {
    assert.ok(!a.includes("Remove-Item"), a);
    assert.ok(!a.includes("$(calc)"), a);
    assert.ok(!a.includes(inp) && !a.includes(out), a);
  }
  assert.strictEqual(env.CC_PDF_IN, inp);
  assert.strictEqual(env.CC_PDF_OUT, out);
  const script = args[args.indexOf("-Command") + 1];
  assert.ok(script.includes("$env:CC_PDF_IN"));
  assert.ok(script.includes("$env:CC_PDF_OUT"));
  assert.ok(/finally/.test(script) && /Quit/.test(script));
});

test("libreoffice command keeps shell metacharacters literal and source uses no shell", () => {
  const inp = "/tmp/$(touch pwned).docx";
  const { args } = buildCommand("libreoffice", inp, "/tmp/$(touch pwned).pdf");
  assert.strictEqual(args.filter((a) => a === inp).length, 1);
  const src = fs.readFileSync(SCRIPT, "utf8");
  assert.ok(/shell:\s*false/.test(src));
  assert.ok(!/shell:\s*true/.test(src));
  assert.ok(!/(?<![.\w])exec(Sync)?\s*\(/.test(src));
});

test("requiring the module does not probe for engines", () => {
  const { detect } = require("../scripts/to_pdf.js");
  assert.strictEqual(typeof detect, "function");
});

test("CLI exits 2 and mentions LibreOffice when no engine exists", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "nothing.docx"], {
    encoding: "utf8",
    shell: false,
    env: { ...process.env, CAREER_CREW_FORCE_NO_ENGINE: "1" },
  });
  assert.strictEqual(r.status, 2);
  assert.ok((r.stdout + r.stderr).includes("LibreOffice"));
});

test("word stages paths of 250+ characters through a short temp folder", () => {
  const { stagePaths } = require("../scripts/to_pdf.js");
  const longDir = path.join("C:", "d".repeat(240));
  const inp = path.join(longDir, "Raman_Resume.docx");
  const out = path.join(longDir, "Raman_Resume.pdf");
  const tmp = path.join("C:", "Temp", "cc-pdf-1");
  const s = stagePaths("word", inp, out, tmp);
  assert.strictEqual(s.staged, true);
  assert.strictEqual(s.convIn, path.join(tmp, "in.docx"));
  assert.strictEqual(s.convOut, path.join(tmp, "out.pdf"));
  assert.ok(s.convIn.length < 250 && s.convOut.length < 250);
});

test("short paths and LibreOffice are never staged", () => {
  const { stagePaths } = require("../scripts/to_pdf.js");
  const a = path.join("C:", "a", "r.docx");
  const b = path.join("C:", "a", "r.pdf");
  assert.deepStrictEqual(stagePaths("word", a, b, path.join("C:", "Temp", "x")), { staged: false, convIn: a, convOut: b });
  const longIn = path.join("d".repeat(300), "r.docx");
  assert.strictEqual(stagePaths("libreoffice", longIn, longIn.replace(".docx", ".pdf"), "x").staged, false);
});
