'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'app_path.js');
const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', shell: false });

test('prints the application folder under --root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-app-'));
  const r = run(['Acme', 'Jr. QA Tech', '--root', root]);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(path.normalize(r.stdout.trim()), path.join(path.resolve(root), 'applications', 'Acme_JrQaTech'));
});

test('hostile input stays inside applications/', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-app-'));
  const r = run(['CON', '../x', '--root', root]);
  assert.strictEqual(r.status, 0, r.stderr);
  const out = path.normalize(r.stdout.trim());
  const base = path.join(path.resolve(root), 'applications');
  assert.ok(out.startsWith(base + path.sep));
  assert.strictEqual(path.dirname(out), base);
});

test('missing arguments exit 1', () => {
  assert.strictEqual(run(['OnlyOne']).status, 1);
});
