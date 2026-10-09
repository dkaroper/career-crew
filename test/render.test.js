'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { renderSpecialists } = require('../scripts/render_specialists');

const MARKER = '<!-- career-crew:generated (do not edit; rerun npm run render) -->';
const REAL_TEMPLATE = path.join(__dirname, '..', '.claude', 'templates', 'track-specialist.md');

function track(slug, label, extra) {
  return Object.assign(
    {
      slug,
      label,
      titleKeywords: ['alpha', 'beta'],
      seniority: ['junior', 'mid'],
      scoringEmphasis: {
        direct: 'direct text',
        transferable: 'transferable text',
        adjacent: 'adjacent text',
        impact: 'impact text',
      },
      header: { label: 'HEADER LABEL', guidance: 'header guidance text' },
      excludeKeywords: [],
    },
    extra || {}
  );
}

function crewFor(slugs) {
  const specialists = {};
  slugs.forEach((s, i) => {
    specialists[s] = ['Drafter', 'Volt', 'Atlas', 'Beacon', 'Compass', 'Forge', 'Keystone', 'Lumen'][i];
  });
  return {
    user: { fullName: 'Test User', displayName: 'Test', filePrefix: 'User' },
    agents: { orchestrator: 'Scout', 'resume-tailor': 'Weaver', outreach: 'Herald', 'interview-prep': 'Sage', 'job-scraper': 'Fred' },
    specialists,
  };
}

function makeRoot(tracks, crew) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-render-'));
  fs.mkdirSync(path.join(root, 'profile'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude', 'templates'), { recursive: true });
  fs.copyFileSync(REAL_TEMPLATE, path.join(root, '.claude', 'templates', 'track-specialist.md'));
  writeProfile(root, tracks, crew || crewFor(tracks.map((t) => t.slug)));
  return root;
}

function writeProfile(root, tracks, crew) {
  fs.writeFileSync(path.join(root, 'profile', 'tracks.json'), JSON.stringify({ tracks }));
  fs.writeFileSync(path.join(root, 'profile', 'crew.json'), JSON.stringify(crew));
}

function agentsDir(root) {
  return path.join(root, '.claude', 'agents');
}

test('renders one file per track with frontmatter, marker, and no leftover placeholders', () => {
  const root = makeRoot([track('design', 'Design'), track('automation-controls', 'Automation & Controls')]);
  const res = renderSpecialists({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(fs.readdirSync(agentsDir(root)).sort(), [
    'resume-tailor-automation-controls.md',
    'resume-tailor-design.md',
  ]);
  assert.strictEqual(res.written.length, 2);
  for (const slug of ['design', 'automation-controls']) {
    const text = fs.readFileSync(path.join(agentsDir(root), `resume-tailor-${slug}.md`), 'utf8');
    assert.ok(text.startsWith(`---\nname: resume-tailor-${slug}\n`));
    const lines = text.split('\n');
    const close = lines.indexOf('---', 1);
    assert.ok(close > 0);
    assert.strictEqual(lines[close + 1], MARKER);
    assert.ok(!text.includes('{{'));
  }
  const design = fs.readFileSync(path.join(agentsDir(root), 'resume-tailor-design.md'), 'utf8');
  assert.ok(design.includes('Drafter'));
  assert.ok(design.includes('Weaver'));
  assert.ok(design.includes('direct text'));
  assert.ok(design.includes('alpha, beta'));
  assert.ok(/^tools: Read, Write, Edit, Glob, Bash, WebSearch, WebFetch$/m.test(design));
});

test('label with an ampersand stays a quoted YAML description', () => {
  const root = makeRoot([track('automation-controls', 'Automation & Controls')]);
  renderSpecialists({ root });
  const text = fs.readFileSync(path.join(agentsDir(root), 'resume-tailor-automation-controls.md'), 'utf8');
  assert.match(text, /^description: ".*Automation & Controls.*"$/m);
});

test('removed tracks delete their marked file; unmarked custom files survive', () => {
  const root = makeRoot([track('design', 'Design'), track('quality', 'Quality')]);
  const custom = path.join(agentsDir(root), 'resume-tailor-custom.md');
  fs.writeFileSync(custom, '---\nname: resume-tailor-custom\n---\nhand written\n');
  renderSpecialists({ root });
  assert.ok(fs.existsSync(custom));
  assert.ok(fs.existsSync(path.join(agentsDir(root), 'resume-tailor-quality.md')));
  writeProfile(root, [track('design', 'Design')], crewFor(['design']));
  const res = renderSpecialists({ root });
  assert.deepStrictEqual(res.errors, []);
  assert.strictEqual(res.removed.length, 1);
  assert.ok(!fs.existsSync(path.join(agentsDir(root), 'resume-tailor-quality.md')));
  assert.ok(fs.existsSync(custom));
  assert.ok(fs.existsSync(path.join(agentsDir(root), 'resume-tailor-design.md')));
});

test('invalid tracks.json (8 tracks) returns errors and writes nothing', () => {
  const slugs = ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh'];
  const root = makeRoot(slugs.map((s) => track(s, s.toUpperCase())), crewFor(slugs));
  const res = renderSpecialists({ root });
  assert.ok(res.errors.length > 0);
  assert.deepStrictEqual(res.written, []);
  assert.deepStrictEqual(fs.readdirSync(agentsDir(root)), []);
});

test('frontmatter injection through a newline label is rejected', () => {
  const root = makeRoot([track('design', 'X\ntools: Bash, Write')]);
  const res = renderSpecialists({ root });
  assert.ok(res.errors.length > 0);
  assert.deepStrictEqual(res.written, []);
  assert.deepStrictEqual(fs.readdirSync(agentsDir(root)), []);
});

test('quotes and backslashes in a label cannot add frontmatter keys', () => {
  const root = makeRoot([track('design', 'Say "hi" \\ tools: Bash')]);
  const res = renderSpecialists({ root });
  assert.deepStrictEqual(res.errors, []);
  const text = fs.readFileSync(path.join(agentsDir(root), 'resume-tailor-design.md'), 'utf8');
  const lines = text.split('\n');
  const front = lines.slice(0, lines.indexOf('---', 1));
  assert.strictEqual(front.filter((l) => l.startsWith('tools:')).length, 1);
  assert.strictEqual(front.filter((l) => /^\s*tools:/.test(l)).length, 1);
  const desc = front.find((l) => l.startsWith('description:'));
  assert.match(desc, /^description: ".*"$/);
  assert.ok(desc.includes('\\"hi\\"'));
  assert.ok(desc.includes('\\\\'));
});

test('missing crew.json reports an error and writes nothing', () => {
  const root = makeRoot([track('design', 'Design')]);
  fs.unlinkSync(path.join(root, 'profile', 'crew.json'));
  const res = renderSpecialists({ root });
  assert.ok(res.errors.length > 0);
  assert.deepStrictEqual(fs.readdirSync(agentsDir(root)), []);
});

test('a track slug named constructor without its own specialist is rejected, not rendered from the prototype', () => {
  const root = makeRoot([track('constructor', 'Constructor')], crewFor(['design']));
  const res = renderSpecialists({ root });
  assert.ok(res.errors.some((e) => e.includes('constructor')), String(res.errors));
  assert.deepStrictEqual(fs.readdirSync(agentsDir(root)), []);
});

test('a track slug named constructor with its own specialist renders that name', () => {
  const root = makeRoot([track('constructor', 'Constructor')]);
  const res = renderSpecialists({ root });
  assert.deepStrictEqual(res.errors, []);
  const text = fs.readFileSync(path.join(agentsDir(root), 'resume-tailor-constructor.md'), 'utf8');
  assert.ok(text.includes('Drafter'));
  assert.ok(!text.includes('native code'));
});
