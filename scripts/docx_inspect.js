#!/usr/bin/env node
'use strict';
// Read-only structure report for a generated resume .docx, used by the docx audit
// in docs/checklists.md when documents-skills:docx-toolkit is not installed.
// Prints one line per paragraph (style, list marker, tab count, text) plus a summary
// of fonts, styles, comments, and tracked changes. Never modifies the file.
//
// Usage: node scripts/docx_inspect.js <file.docx>

const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');
const { readEntryCapped } = require('./extract_text.js');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;

function decode(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function count(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function inspectXml(xml) {
  const paragraphs = [];
  const fonts = {};
  const styles = {};
  for (const pm of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const body = pm[1];
    const styleM = body.match(/<w:pStyle w:val="([^"]+)"/);
    const style = styleM ? styleM[1] : 'Normal';
    count(styles, style);
    const list = /<w:numPr>/.test(body);
    let text = '';
    for (const tm of body.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>/g)) {
      text += tm[1] !== undefined ? decode(tm[1]) : '\t';
    }
    // Tabs arrive either as <w:tab/> runs or as literal tab characters inside <w:t>.
    const tabs = (text.match(/\t/g) || []).length;
    for (const fm of body.matchAll(/<w:rFonts\b[^>]*\bw:ascii="([^"]+)"/g)) count(fonts, fm[1]);
    paragraphs.push({ style, list, tabs, text });
  }
  return {
    paragraphs,
    fonts,
    styles,
    trackedChanges: /<w:(ins|del)[\s>]/.test(xml),
  };
}

async function inspectDocx(filePath) {
  if (path.extname(filePath).toLowerCase() !== '.docx') throw new Error('expected a .docx file');
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_BYTES) throw new Error(`file is ${stat.size} bytes (limit ${MAX_FILE_BYTES})`);
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const entry = zip.file('word/document.xml');
  if (!entry) throw new Error('word/document.xml missing');
  const xml = (await readEntryCapped(entry, MAX_XML_BYTES)).toString('utf8');
  const report = inspectXml(xml);
  report.comments = zip.file('word/comments.xml') !== null;
  return report;
}

function format(report) {
  const out = ['Paragraphs (style | list | tabs | text):'];
  report.paragraphs.forEach((p, i) => {
    out.push(`${i + 1}. ${p.style} | ${p.list ? 'list' : '-'} | ${p.tabs} | ${p.text.replace(/\t/g, ' <TAB> ')}`);
  });
  out.push('');
  out.push(`Styles: ${JSON.stringify(report.styles)}`);
  out.push(`Fonts: ${JSON.stringify(report.fonts)}`);
  out.push(`Comments: ${report.comments ? 'yes' : 'no'}`);
  out.push(`Tracked changes: ${report.trackedChanges ? 'yes' : 'no'}`);
  return out.join('\n');
}

module.exports = { inspectXml, inspectDocx, format };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('usage: node scripts/docx_inspect.js <file.docx>\n');
    process.exit(1);
  }
  inspectDocx(file).then(
    (r) => process.stdout.write(format(r) + '\n'),
    (e) => {
      process.stderr.write(`docx_inspect: ${e.message}\n`);
      process.exit(1);
    }
  );
}
