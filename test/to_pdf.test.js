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

test("findSoffice prefers soffice on PATH", () => {
  const { findSoffice } = require("../scripts/to_pdf.js");
  const r = findSoffice({ platform: "win32", env: {}, existsSync: () => false, probe: (c) => c === "soffice" });
  assert.strictEqual(r, "soffice");
});

test("findSoffice finds LibreOffice under Program Files on Windows when not on PATH", () => {
  const { findSoffice } = require("../scripts/to_pdf.js");
  const pf = "C:\Program Files";
  const expected = path.win32.join(pf, "LibreOffice", "program", "soffice.exe");
  const seen = [];
  const r = findSoffice({
    platform: "win32",
    env: { ProgramFiles: pf, "ProgramFiles(x86)": "C:\Program Files (x86)" },
    existsSync: (p) => {
      seen.push(p);
      return p === expected;
    },
    probe: () => false,
  });
  assert.strictEqual(r, expected);
});

test("findSoffice falls back to Program Files (x86) on Windows", () => {
  const { findSoffice } = require("../scripts/to_pdf.js");
  const x86 = "C:\Program Files (x86)";
  const expected = path.win32.join(x86, "LibreOffice", "program", "soffice.exe");
  const r = findSoffice({
    platform: "win32",
    env: { ProgramFiles: "C:\Program Files", "ProgramFiles(x86)": x86 },
    existsSync: (p) => p === expected,
    probe: () => false,
  });
  assert.strictEqual(r, expected);
});

test("findSoffice returns null on Windows with no install and tolerates missing env vars", () => {
  const { findSoffice } = require("../scripts/to_pdf.js");
  assert.strictEqual(findSoffice({ platform: "win32", env: {}, existsSync: () => true, probe: () => false }), null);
  assert.strictEqual(
    findSoffice({ platform: "win32", env: { ProgramFiles: "C:\PF" }, existsSync: () => false, probe: () => false }),
    null
  );
});

test("findSoffice ignores Program Files paths off Windows", () => {
  const { findSoffice } = require("../scripts/to_pdf.js");
  const r = findSoffice({ platform: "linux", env: { ProgramFiles: "C:\PF" }, existsSync: () => true, probe: () => false });
  assert.strictEqual(r, null);
});

test("a stale PDF is removed before converting, so a no-op engine is not reported as success", () => {
  const os = require("node:os");
  const { main } = require("../scripts/to_pdf.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pdf-test-"));
  try {
    const inp = path.join(dir, "r.docx");
    const out = path.join(dir, "Final.pdf");
    const intermediate = path.join(dir, "r.pdf");
    fs.writeFileSync(inp, "docx");
    fs.writeFileSync(out, "stale");
    fs.writeFileSync(intermediate, "stale intermediate");
    const calls = [];
    const code = main([inp, out], {
      detect: () => ({ hasWord: false, hasSoffice: true, soffice: "fake-soffice" }),
      spawnSync: (cmd, args, opts) => {
        calls.push({ cmd, args, opts });
        return { status: 0, stdout: "", stderr: "" };
      },
      log: () => {},
      error: () => {},
    });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].opts.shell, false);
    assert.strictEqual(code, 1, "no fresh PDF was produced, must not report success");
    assert.ok(!fs.existsSync(out), "stale output must be deleted");
    assert.ok(!fs.existsSync(intermediate), "stale LibreOffice intermediate must be deleted");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a fresh LibreOffice conversion is renamed to the requested output and reported", () => {
  const os = require("node:os");
  const { main } = require("../scripts/to_pdf.js");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-pdf-test-"));
  try {
    const inp = path.join(dir, "r.docx");
    const out = path.join(dir, "Final.pdf");
    fs.writeFileSync(inp, "docx");
    fs.writeFileSync(out, "stale");
    const logged = [];
    const code = main([inp, out], {
      detect: () => ({ hasWord: false, hasSoffice: true, soffice: "fake-soffice" }),
      spawnSync: () => {
        fs.writeFileSync(path.join(dir, "r.pdf"), "fresh");
        return { status: 0, stdout: "", stderr: "" };
      },
      log: (m) => logged.push(m),
      error: () => {},
    });
    assert.strictEqual(code, 0);
    assert.strictEqual(fs.readFileSync(out, "utf8"), "fresh");
    assert.deepStrictEqual(logged, [out]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
