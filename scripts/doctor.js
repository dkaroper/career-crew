'use strict';
// Prerequisite and profile health checks. Run with `npm run doctor`.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { readJson, profilePaths } = require('./lib/profile.js');

const MIN_NODE_MAJOR = 22;
const TRACKED_PATHS = ['profile', 'library', 'inputs', 'applications', '.env'];

function defaultGitLsFiles(root) {
  const r = spawnSync('git', ['ls-files', ...TRACKED_PATHS], { shell: false, cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) return { ok: false, output: '' };
  return { ok: true, output: r.stdout || '' };
}

function defaultDetectPdf() {
  return require('./to_pdf.js').detect();
}

function checkNode(nodeVersion) {
  const major = parseInt(String(nodeVersion).trim().replace(/^v/i, '').split('.')[0], 10);
  const ok = Number.isFinite(major) && major >= MIN_NODE_MAJOR;
  return {
    name: 'node',
    ok,
    required: true,
    detail: Number.isFinite(major) ? `Node ${String(nodeVersion).trim().replace(/^v/i, '')}` : `unparseable Node version: ${JSON.stringify(String(nodeVersion))}`,
    fix: ok ? '' : `Install Node ${MIN_NODE_MAJOR} or newer from https://nodejs.org, then reopen your terminal.`,
  };
}

function checkModule(mod, requireResolve) {
  let ok = true;
  try {
    requireResolve(mod);
  } catch (_) {
    ok = false;
  }
  return {
    name: mod,
    ok,
    required: true,
    detail: ok ? 'installed' : 'not found',
    fix: ok ? '' : 'Run: npm install',
  };
}

function checkPdf(detectPdf) {
  let d;
  try {
    d = detectPdf() || {};
  } catch (_) {
    d = {};
  }
  const ok = Boolean(d.hasWord || d.hasSoffice);
  const which = d.hasWord ? 'Microsoft Word' : d.hasSoffice ? 'LibreOffice' : 'none found';
  return {
    name: 'pdf-engine',
    ok,
    required: false,
    detail: which,
    fix: ok ? '' : 'Install LibreOffice (https://www.libreoffice.org) or Microsoft Word to export PDF resumes; .docx output works without it.',
  };
}

function readProfileState(root) {
  const paths = profilePaths(root);
  const r = readJson(paths.state);
  if (!r.ok) {
    if (r.error.startsWith('missing:')) return { kind: 'not started' };
    return { kind: 'corrupt', error: r.error };
  }
  const s = r.value;
  if (!s || typeof s !== 'object') return { kind: 'corrupt', error: 'state file is not an object' };
  if (s.status === 'complete') return { kind: 'complete' };
  return { kind: 'in progress', stage: s.lastCompletedStage };
}

function checkProfile(state) {
  if (state.kind === 'corrupt') {
    return {
      name: 'profile',
      ok: false,
      required: false,
      detail: `corrupt: ${state.error}`,
      fix: 'Fix or delete profile/onboarding-state.json, then rerun onboarding.',
    };
  }
  if (state.kind === 'not started') {
    return { name: 'profile', ok: false, required: false, detail: 'not started', fix: 'Start onboarding in Claude Code to build your profile.' };
  }
  if (state.kind === 'in progress') {
    return {
      name: 'profile',
      ok: false,
      required: false,
      detail: `in progress (stage ${state.stage})`,
      fix: 'Resume onboarding in Claude Code to finish your profile.',
    };
  }
  return { name: 'profile', ok: true, required: false, detail: 'complete', fix: '' };
}

function checkSpecialists(root, state) {
  if (state.kind !== 'complete') {
    return { name: 'specialists', ok: true, required: false, detail: 'skipped (profile not complete)', fix: '' };
  }
  const t = readJson(profilePaths(root).tracks);
  if (!t.ok || !t.value || !Array.isArray(t.value.tracks)) {
    return { name: 'specialists', ok: false, required: false, detail: 'cannot read profile/tracks.json', fix: 'Fix profile/tracks.json, then run: npm run render' };
  }
  const missing = t.value.tracks
    .map((x) => x && x.slug)
    .filter((slug) => typeof slug === 'string' && !fs.existsSync(path.join(root, '.claude', 'agents', `resume-tailor-${slug}.md`)));
  if (missing.length === 0) return { name: 'specialists', ok: true, required: false, detail: 'all tracks rendered', fix: '' };
  return { name: 'specialists', ok: false, required: false, detail: `not rendered: ${missing.join(', ')}`, fix: 'npm run render' };
}

function checkTracked(gitLsFiles, root) {
  let r;
  try {
    r = gitLsFiles(root);
  } catch (_) {
    r = { ok: false, output: '' };
  }
  if (!r || !r.ok) {
    return { name: 'user-data-tracked', ok: true, required: false, detail: 'skipped (not a git repository)', fix: '' };
  }
  const files = String(r.output || '').split(/\r?\n/).filter(Boolean);
  if (files.length === 0) return { name: 'user-data-tracked', ok: true, required: false, detail: 'no user data tracked', fix: '' };
  return {
    name: 'user-data-tracked',
    ok: false,
    required: false,
    detail: `tracked by git: ${files.join(', ')}`,
    fix: `Untrack with: git rm -r --cached ${[...new Set(files.map((f) => f.split('/')[0]))].join(' ')}`,
  };
}

function runChecks(opts = {}) {
  const root = opts.root || path.resolve(__dirname, '..');
  const nodeVersion = opts.nodeVersion || process.versions.node;
  const detectPdf = opts.detectPdf || defaultDetectPdf;
  const requireResolve = opts.requireResolve || createRequire(path.join(root, 'package.json')).resolve;
  const gitLsFiles = opts.gitLsFiles || defaultGitLsFiles;
  const state = readProfileState(root);
  return [
    checkNode(nodeVersion),
    checkModule('docx', requireResolve),
    checkModule('jszip', requireResolve),
    checkPdf(detectPdf),
    checkProfile(state),
    checkSpecialists(root, state),
    checkTracked(gitLsFiles, root),
  ];
}

function format(checks) {
  const lines = [];
  for (const c of checks) {
    const tag = c.ok ? 'PASS' : c.required ? 'FAIL' : 'WARN';
    lines.push(`${tag} ${c.name}: ${c.detail}`);
    if (!c.ok && c.fix) lines.push(`     fix: ${c.fix}`);
  }
  return lines.join('\n');
}

if (require.main === module) {
  const checks = runChecks({});
  console.log(format(checks));
  process.exit(checks.some((c) => c.required && !c.ok) ? 1 : 0);
}

module.exports = { runChecks, format };
