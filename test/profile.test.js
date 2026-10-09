'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const p = require('../scripts/lib/profile');

const FIX = path.join(__dirname, 'fixtures', 'profile-valid');
const tracks = () => JSON.parse(fs.readFileSync(path.join(FIX, 'tracks.json'), 'utf8'));
const crew = () => JSON.parse(fs.readFileSync(path.join(FIX, 'crew.json'), 'utf8'));

test('readJson: missing file', () => {
  const r = p.readJson(path.join(os.tmpdir(), 'cc-does-not-exist.json'));
  assert.strictEqual(r.ok, false);
  assert.ok(r.error.startsWith('missing:'));
});

test('readJson: malformed file names the path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
  const f = path.join(dir, 'bad.json');
  fs.writeFileSync(f, '{"a":');
  const r = p.readJson(f);
  assert.strictEqual(r.ok, false);
  assert.ok(r.error.includes(f));
});

test('readJson: valid file', () => {
  const r = p.readJson(path.join(FIX, 'crew.json'));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.user.fullName, 'Jane Doe');
});

test('validateTracks: count limits', () => {
  assert.ok(p.validateTracks({ tracks: [] }).some((e) => e.includes('1 to 6')));
  const t = tracks().tracks[0];
  const seven = { tracks: Array.from({ length: 7 }, (_, i) => ({ ...t, slug: 'track-' + i })) };
  assert.ok(p.validateTracks(seven).some((e) => e.includes('1 to 6')));
});

test('validateTracks: slug rules', () => {
  const o = tracks();
  o.tracks[0].slug = 'Design';
  assert.ok(p.validateTracks(o).length > 0);
  const d = tracks();
  d.tracks[1].slug = d.tracks[0].slug;
  assert.ok(p.validateTracks(d).some((e) => e.includes('duplicate')));
});

test('validateTracks: fixture is valid', () => {
  assert.deepStrictEqual(p.validateTracks(tracks()), []);
});

test('validateTracks: single-line and length limits', () => {
  const a = tracks();
  a.tracks[0].label = 'X\ntools: Bash, Write';
  assert.ok(p.validateTracks(a).some((e) => e.includes('single-line')));
  const b = tracks();
  b.tracks[0].label = 'a --- b';
  assert.ok(p.validateTracks(b).length > 0);
  const c = tracks();
  c.tracks[0].scoringEmphasis.direct = 'x'.repeat(301);
  assert.ok(p.validateTracks(c).some((e) => e.includes('300')));
  const d = tracks();
  d.tracks[0].scoringEmphasis.direct = 'x'.repeat(300);
  assert.deepStrictEqual(p.validateTracks(d), []);
});

test('validateCrew', () => {
  assert.deepStrictEqual(p.validateCrew(crew(), tracks()), []);
  const dup = crew();
  dup.specialists.design = 'Weaver';
  assert.ok(p.validateCrew(dup, tracks()).some((e) => e.includes('duplicate name')));
  const missing = crew();
  delete missing.specialists.quality;
  assert.ok(p.validateCrew(missing, tracks()).some((e) => e.includes('quality')));
});

test('slugify', () => {
  assert.strictEqual(p.slugify('Automation & Controls'), 'automation-controls');
  assert.strictEqual(p.slugify('Quality/QC'), 'quality-qc');
  assert.strictEqual(p.slugify('Continuous Improvement'), 'continuous-improvement');
});

test('deriveFilePrefix', () => {
  assert.strictEqual(p.deriveFilePrefix('Marie-\u00c8ve C\u00f4t\u00e9-Tremblay'), 'CoteTremblay');
  assert.strictEqual(p.deriveFilePrefix('Jane Doe'), 'Doe');
  assert.strictEqual(p.deriveFilePrefix('Cher'), 'Cher');
});

test('suggestSpecialistName', () => {
  assert.strictEqual(p.suggestSpecialistName('quality', []), 'Warden');
  assert.strictEqual(p.suggestSpecialistName('quality', ['Warden']), 'Atlas');
  assert.strictEqual(p.suggestSpecialistName('nursing', ['Atlas']), 'Beacon');
  assert.strictEqual(p.suggestSpecialistName('continuous-improvement', []), 'Kaizen');
  assert.strictEqual(p.suggestSpecialistName('automation-controls', []), 'Volt');
});

test('safeSegment', () => {
  assert.strictEqual(p.safeSegment('Laurentide Composites Inc.'), 'LaurentideCompositesInc');
  assert.strictEqual(p.safeSegment('../../.ssh'), 'Ssh');
  assert.strictEqual(p.safeSegment('C:\\Windows'), 'CWindows');
  assert.strictEqual(p.safeSegment('Soci\u00e9t\u00e9 G\u00e9n\u00e9rale'), 'SocieteGenerale');
  assert.strictEqual(p.safeSegment(''), 'Unknown');
  assert.strictEqual(p.safeSegment('///'), 'Unknown');
  assert.strictEqual(p.safeSegment('a'.repeat(200)).length, 60);
});

test('profilePaths and DEFAULT_AGENT_NAMES', () => {
  const r = path.resolve('/x');
  const pp = p.profilePaths(r);
  assert.strictEqual(pp.dir, path.join(r, 'profile'));
  assert.strictEqual(pp.crew, path.join(r, 'profile', 'crew.json'));
  assert.strictEqual(pp.tracks, path.join(r, 'profile', 'tracks.json'));
  assert.strictEqual(pp.preferences, path.join(r, 'profile', 'preferences.md'));
  assert.strictEqual(pp.screening, path.join(r, 'profile', 'screening-answers.md'));
  assert.strictEqual(pp.state, path.join(r, 'profile', 'onboarding-state.json'));
  assert.strictEqual(p.DEFAULT_AGENT_NAMES['job-scraper'], 'Fred');
  assert.strictEqual(p.DEFAULT_AGENT_NAMES.orchestrator, 'Scout');
});

test('example persona profile passes validation', () => {
  const dir = path.join(__dirname, '..', 'examples', 'persona', 'profile');
  const t = p.readJson(path.join(dir, 'tracks.json'));
  const c = p.readJson(path.join(dir, 'crew.json'));
  assert.ok(t.ok, t.error);
  assert.ok(c.ok, c.error);
  assert.deepStrictEqual(p.validateTracks(t.value), []);
  assert.deepStrictEqual(p.validateCrew(c.value, t.value), []);
  assert.deepStrictEqual(t.value.tracks.map((x) => x.slug), ['quality', 'continuous-improvement']);
  assert.strictEqual(c.value.user.filePrefix, p.deriveFilePrefix(c.value.user.fullName));
  const prefs = fs.readFileSync(path.join(dir, 'preferences.md'), 'utf8');
  for (const s of ['Location', 'Work Authorization', 'Languages', 'Salary', 'Coverage Floor', 'Writing Style', 'Modules']) {
    assert.ok(prefs.includes(`## ${s}`), `preferences.md missing ${s}`);
  }
  assert.match(prefs, /^Job Scraper: off$/m);
  assert.match(prefs, /^Outreach Chrome: off$/m);
});

test('validateCrew: a track slug matching an Object.prototype key still needs its own specialist', () => {
  for (const slug of ['constructor']) {
    const t = tracks();
    t.tracks[0].slug = slug;
    const errs = p.validateCrew(crew(), t);
    assert.ok(errs.some((e) => e.includes(`track "${slug}" has no entry in specialists`)), `${slug}: ${errs}`);
  }
});
