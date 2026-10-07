"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const JSZip = require("jszip");

const ROOT = path.join(__dirname, "..");
const SCRIPT = path.join(ROOT, "scripts", "generate_docx.js");
const persona = JSON.parse(fs.readFileSync(path.join(ROOT, "examples", "persona", "resume.json"), "utf8"));

test("buildDocument returns a Buffer holding the persona's text", async () => {
  const { buildDocument } = require(SCRIPT);
  const buf = await buildDocument(persona);
  assert.ok(Buffer.isBuffer(buf));
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes("Côté-Tremblay"));
  assert.ok(xml.includes("QUALITY TECHNICIAN"));
});

test("buildDocument rejects an unknown section type", async () => {
  const { buildDocument } = require(SCRIPT);
  await assert.rejects(buildDocument({ name: "A", contact: "B", sections: [{ title: "X", type: "nope" }] }), /Unknown section type/);
});

test("CLI with a missing input path exits non-zero and names the path", () => {
  const missing = path.join(ROOT, "does-not-exist.json");
  const r = spawnSync(process.execPath, [SCRIPT, missing, path.join(ROOT, "out.docx")], { shell: false, encoding: "utf8" });
  assert.notStrictEqual(r.status, 0);
  assert.ok(r.stderr.includes("does-not-exist.json"));
});

test("CLI writes a valid docx", async () => {
  const out = path.join(require("node:os").tmpdir(), `cc-resume-${process.pid}.docx`);
  const r = spawnSync(process.execPath, [SCRIPT, path.join(ROOT, "examples", "persona", "resume.json"), out], { shell: false, encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  const zip = await JSZip.loadAsync(fs.readFileSync(out));
  assert.ok(zip.file("word/document.xml"));
  fs.unlinkSync(out);
});
