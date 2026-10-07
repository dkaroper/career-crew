'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { extractText, readEntryCapped } = require('../scripts/extract_text.js');
const { buildDocument } = require('../scripts/generate_docx.js');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cc-extract-'));
}

async function rejectsWith(p, code) {
  await assert.rejects(p, (err) => {
    assert.strictEqual(err.code, code);
    return true;
  });
}

test('txt returns contents', async () => {
  const text = await extractText(path.join(__dirname, 'fixtures', 'resume.txt'));
  assert.match(text, /Quality Technician/);
  assert.match(text, /Five years of inspection experience\./);
});

test('docx from buildDocument returns text with paragraphs split by newline', async () => {
  const dir = tmpDir();
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'persona', 'resume.json'), 'utf8'));
    const file = path.join(dir, 'r.docx');
    fs.writeFileSync(file, await buildDocument(data));
    const text = await extractText(file);
    assert.ok(text.includes('Côté-Tremblay'), 'name present');
    assert.ok(text.split('\n').length > 5, 'multiple paragraphs');
    assert.ok(text.split('\n').some((l) => l.includes('Côté-Tremblay')));
    assert.ok(!/<w:/.test(text), 'no xml left');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('docx decodes entities and joins runs per paragraph', async () => {
  const dir = tmpDir();
  try {
    const zip = new JSZip();
    zip.file('word/document.xml',
      '<w:document><w:body><w:p><w:r><w:t>A &amp; B</w:t></w:r><w:r><w:t xml:space="preserve"> &lt;C&gt; &#233;</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t>Second</w:t></w:r></w:p></w:body></w:document>');
    const file = path.join(dir, 'e.docx');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    assert.strictEqual(await extractText(file), 'A & B <C> é\nSecond');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('pdf rejects USE_READ_TOOL', async () => {
  await rejectsWith(extractText('whatever.pdf'), 'USE_READ_TOOL');
});

test('rtf rejects UNSUPPORTED', async () => {
  await rejectsWith(extractText('whatever.rtf'), 'UNSUPPORTED');
});

test('11 MB txt rejects TOO_LARGE', async () => {
  const dir = tmpDir();
  try {
    const file = path.join(dir, 'big.txt');
    fs.writeFileSync(file, '');
    fs.truncateSync(file, 11 * 1024 * 1024);
    await rejectsWith(extractText(file), 'TOO_LARGE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('docx bomb (21 MB document.xml) rejects TOO_LARGE', async () => {
  const dir = tmpDir();
  try {
    const zip = new JSZip();
    zip.file('word/document.xml', Buffer.alloc(21 * 1024 * 1024, 'a'));
    const file = path.join(dir, 'bomb.docx');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    assert.ok(fs.statSync(file).size < 1024 * 1024, 'compresses tiny');
    await rejectsWith(extractText(file), 'TOO_LARGE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('streamed fallback aborts at the limit when size field is absent', async () => {
  const zip = new JSZip();
  zip.file('word/document.xml', Buffer.alloc(3 * 1024, 'a'));
  const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const entry = loaded.file('word/document.xml');
  const ok = await readEntryCapped(entry, 4096);
  assert.strictEqual(ok.length, 3 * 1024);
  // JSZip itself would later complain about the missing size; the cap must trip first.
  delete entry._data.uncompressedSize;
  await rejectsWith(readEntryCapped(entry, 1024), 'TOO_LARGE');
});

test('docx missing document.xml rejects UNREADABLE', async () => {
  const dir = tmpDir();
  try {
    const zip = new JSZip();
    zip.file('other.xml', '<x/>');
    const file = path.join(dir, 'm.docx');
    fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer' }));
    await rejectsWith(extractText(file), 'UNREADABLE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('docx of random bytes rejects UNREADABLE', async () => {
  const dir = tmpDir();
  try {
    const file = path.join(dir, 'junk.docx');
    fs.writeFileSync(file, require('node:crypto').randomBytes(2048));
    await rejectsWith(extractText(file), 'UNREADABLE');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
