"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "docx_inspect.js");
const persona = JSON.parse(fs.readFileSync(path.join(ROOT, "examples", "persona", "resume.json"), "utf8"));

async function personaDocx() {
  const { buildDocument } = require("../scripts/generate_docx.js");
  const file = path.join(os.tmpdir(), `cc-inspect-${process.pid}.docx`);
  fs.writeFileSync(file, await buildDocument(persona));
  return file;
}

test("inspectDocx reports headings, fonts, tabs, and a clean document", async () => {
  const { inspectDocx } = require(SCRIPT);
  const r = await inspectDocx(await personaDocx());
  assert.ok(r.styles.Heading1 >= 1 && r.styles.Heading2 >= 1 && r.styles.Heading3 >= 1, JSON.stringify(r.styles));
  assert.deepStrictEqual(Object.keys(r.fonts), ["Arial"]);
  const job = r.paragraphs.find((p) => p.style === "Heading3" && p.text.startsWith("Quality Technician"));
  assert.ok(job && job.tabs === 1, "job title line uses one tab before its dates");
  assert.strictEqual(r.comments, false);
  assert.strictEqual(r.trackedChanges, false);
});

test("inspectXml flags tracked changes", () => {
  const { inspectXml } = require(SCRIPT);
  const r = inspectXml('<w:body><w:p><w:ins w:id="1"><w:r><w:t>x</w:t></w:r></w:ins></w:p></w:body>');
  assert.strictEqual(r.trackedChanges, true);
  assert.strictEqual(r.paragraphs[0].text, "x");
});

test("CLI prints the paragraph report and rejects non-docx input", async () => {
  const ok = spawnSync(process.execPath, [SCRIPT, await personaDocx()], { shell: false, encoding: "utf8" });
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.ok(ok.stdout.includes("Heading1 | - | 0 | Marie-Ève Côté-Tremblay"));
  assert.ok(ok.stdout.includes("Fonts: {\"Arial\""));
  const bad = spawnSync(process.execPath, [SCRIPT, path.join(ROOT, "README.md")], { shell: false, encoding: "utf8" });
  assert.strictEqual(bad.status, 1);
});
