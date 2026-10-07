#!/usr/bin/env node
/**
 * Resume text extraction for onboarding intake.
 *
 * Usage: node scripts/extract_text.js <resume.docx|resume.txt>
 *
 * Exports extractText(filePath) -> Promise<string>. PDFs are not handled here
 * (Claude's Read tool reads them natively). Resumes are untrusted input, so
 * the file size and the unzipped document.xml size are both capped.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('jszip');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_XML_BYTES = 20 * 1024 * 1024;

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Read a zip entry into a Buffer, rejecting TOO_LARGE past `limit` bytes. */
function readEntryCapped(entry, limit) {
  const declared = entry && entry._data && entry._data.uncompressedSize;
  if (typeof declared === 'number' && declared > limit) {
    return Promise.reject(fail('TOO_LARGE', `document.xml declares ${declared} bytes uncompressed (limit ${limit})`));
  }
  // Fallback (and defense against lying headers): count streamed bytes, abort at the limit.
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let done = false;
    const stream = entry.internalStream('uint8array');
    stream
      .on('data', (chunk) => {
        if (done) return;
        total += chunk.length;
        if (total > limit) {
          done = true;
          stream.pause();
          reject(fail('TOO_LARGE', `document.xml exceeds ${limit} bytes uncompressed`));
          return;
        }
        chunks.push(chunk);
      })
      .on('error', (e) => {
        if (done) return;
        done = true;
        reject(fail('UNREADABLE', `could not read document.xml: ${e.message}`));
      })
      .on('end', () => {
        if (done) return;
        done = true;
        resolve(Buffer.concat(chunks.map((c) => Buffer.from(c))));
      })
      .resume();
  });
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, body) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : m;
  });
}

function xmlToText(xml) {
  const lines = [];
  const para = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pm;
  while ((pm = para.exec(xml)) !== null) {
    let line = '';
    const tok = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>/g;
    let tm;
    while ((tm = tok.exec(pm[1])) !== null) {
      if (tm[1] !== undefined) line += decodeEntities(tm[1]);
      else if (tm[0].startsWith('<w:tab')) line += '\t';
      else line += '\n';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    throw fail('USE_READ_TOOL', 'PDFs are read with Claude\'s Read tool, not this script');
  }
  if (ext !== '.docx' && ext !== '.txt') {
    throw fail('UNSUPPORTED', `unsupported file type "${ext}" (use .docx, .txt, or .pdf)`);
  }
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    throw fail('UNREADABLE', `cannot read file: ${e.message}`);
  }
  if (stat.size > MAX_FILE_BYTES) {
    throw fail('TOO_LARGE', `file is ${stat.size} bytes (limit ${MAX_FILE_BYTES})`);
  }
  const buf = fs.readFileSync(filePath);
  if (ext === '.txt') return buf.toString('utf8');

  let zip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch (e) {
    throw fail('UNREADABLE', `not a readable .docx: ${e.message}`);
  }
  const entry = zip.file('word/document.xml');
  if (!entry) throw fail('UNREADABLE', 'not a readable .docx: word/document.xml missing');
  const xml = (await readEntryCapped(entry, MAX_XML_BYTES)).toString('utf8');
  return xmlToText(xml);
}

module.exports = { extractText, readEntryCapped };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    process.stderr.write('UNSUPPORTED: usage: node scripts/extract_text.js <resume.docx|resume.txt>\n');
    process.exit(1);
  }
  extractText(file).then(
    (text) => {
      process.stdout.write(text.endsWith('\n') ? text : text + '\n');
    },
    (err) => {
      process.stderr.write(`${err.code || 'UNREADABLE'}: ${err.message}\n`);
      process.exit(1);
    }
  );
}
