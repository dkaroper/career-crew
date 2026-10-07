'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runChecks } = require('../scripts/doctor.js');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-'));
}
function write(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}
function run(root, over = {}) {
  return runChecks({
    root,
    nodeVersion: '22.1.0',
    detectPdf: () => ({ hasWord: false, hasSoffice: true }),
    requireResolve: () => 'ok',
    gitLsFiles: () => ({ ok: true, output: '' }),
    ...over,
  });
}
const get = (checks, name) => checks.find((c) => c.name === name);

test('old node fails as required with nodejs.org fix', () => {
  const c = get(run(tmpRoot(), { nodeVersion: '20.18.0' }), 'node');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.required, true);
  assert.match(c.fix, /nodejs\.org/);
});

test('node 22 passes', () => {
  assert.strictEqual(get(run(tmpRoot()), 'node').ok, true);
});

test('missing docx is a required failure', () => {
  const checks = run(tmpRoot(), {
    requireResolve: (m) => {
      if (m === 'docx') throw new Error('nope');
      return 'ok';
    },
  });
  const c = get(checks, 'docx');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.required, true);
  assert.match(c.fix, /npm install/);
  assert.strictEqual(get(checks, 'jszip').ok, true);
});

test('no pdf engine is optional failure mentioning LibreOffice', () => {
  const c = get(run(tmpRoot(), { detectPdf: () => ({ hasWord: false, hasSoffice: false }) }), 'pdf-engine');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.required, false);
  assert.match(c.fix, /LibreOffice/);
});

test('corrupt state file reports corrupt:', () => {
  const root = tmpRoot();
  write(root, 'profile/onboarding-state.json', '{');
  const c = get(run(root), 'profile');
  assert.match(c.detail, /^corrupt:/);
  assert.strictEqual(c.ok, false);
});

test('profile states: not started, in progress, complete', () => {
  const root = tmpRoot();
  assert.strictEqual(get(run(root), 'profile').detail, 'not started');
  write(root, 'profile/onboarding-state.json', JSON.stringify({ lastCompletedStage: 3, status: 'in-progress', skipped: [] }));
  assert.strictEqual(get(run(root), 'profile').detail, 'in progress (stage 3)');
  write(root, 'profile/onboarding-state.json', JSON.stringify({ lastCompletedStage: 8, status: 'complete', skipped: [] }));
  assert.strictEqual(get(run(root), 'profile').detail, 'complete');
});

test('complete profile with unrendered track fails specialists with npm run render', () => {
  const root = tmpRoot();
  write(root, 'profile/onboarding-state.json', JSON.stringify({ lastCompletedStage: 8, status: 'complete', skipped: [] }));
  write(root, 'profile/tracks.json', JSON.stringify({ tracks: [{ slug: 'design' }, { slug: 'project' }] }));
  write(root, '.claude/agents/resume-tailor-design.md', 'x');
  const c = get(run(root), 'specialists');
  assert.strictEqual(c.ok, false);
  assert.strictEqual(c.required, false);
  assert.match(c.detail, /project/);
  assert.strictEqual(c.fix, 'npm run render');
  write(root, '.claude/agents/resume-tailor-project.md', 'x');
  assert.strictEqual(get(run(root), 'specialists').ok, true);
});

test('tracked user data fails with git rm fix; none passes', () => {
  const bad = get(run(tmpRoot(), { gitLsFiles: () => ({ ok: true, output: 'profile/crew.json\n' }) }), 'user-data-tracked');
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.required, false);
  assert.match(bad.fix, /git rm -r --cached/);
  assert.match(bad.detail, /profile\/crew\.json/);
  assert.strictEqual(get(run(tmpRoot()), 'user-data-tracked').ok, true);
});

test('not a git repo skips the tracked check', () => {
  const c = get(run(tmpRoot(), { gitLsFiles: () => ({ ok: false, output: '' }) }), 'user-data-tracked');
  assert.strictEqual(c.ok, true);
  assert.match(c.detail, /skipped/);
});
