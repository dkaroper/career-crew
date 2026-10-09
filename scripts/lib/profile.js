'use strict';
// Profile helpers shared by the career-crew scripts: JSON loading, validation of
// profile/tracks.json and profile/crew.json, naming helpers, and safe path segments.
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_AGENT_NAMES = Object.freeze({
  orchestrator: 'Scout',
  'resume-tailor': 'Weaver',
  outreach: 'Herald',
  'interview-prep': 'Sage',
  'job-scraper': 'Fred',
});

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const MAX_FIELD = 300;
const MIN_TRACKS = 1;
const MAX_TRACKS = 6;

const SPECIALIST_POOL = [
  ['design', 'Drafter'],
  ['project', 'Marshal'],
  ['quality', 'Warden'],
  ['continuous-improvement', 'Kaizen'],
  ['automation', 'Volt'],
];
const FALLBACK_POOL = ['Atlas', 'Beacon', 'Compass', 'Forge', 'Keystone', 'Lumen'];

function readJson(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return { ok: false, error: `missing: ${filePath}` };
    return { ok: false, error: `unreadable: ${filePath} (${err.message})` };
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: `invalid JSON in ${filePath}: ${err.message}` };
  }
}

function checkText(value, where, errors) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${where} must be a non-empty string`);
    return;
  }
  if (/[\r\n\u2028\u2029]/.test(value)) errors.push(`${where} must be single-line text`);
  if (value.length > MAX_FIELD) errors.push(`${where} must be at most ${MAX_FIELD} characters`);
  if (value.includes('---')) errors.push(`${where} must not contain "---"`);
}

function checkTextList(list, where, errors) {
  if (!Array.isArray(list)) {
    errors.push(`${where} must be an array`);
    return;
  }
  list.forEach((item, i) => checkText(item, `${where}[${i}]`, errors));
}

function validateTracks(obj) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.tracks)) {
    return ['tracks.json must be an object with a "tracks" array'];
  }
  const list = obj.tracks;
  if (list.length < MIN_TRACKS || list.length > MAX_TRACKS) {
    errors.push(`tracks must contain 1 to 6 entries (found ${list.length})`);
  }
  const seen = new Set();
  list.forEach((t, i) => {
    const where = `tracks[${i}]`;
    if (!t || typeof t !== 'object') {
      errors.push(`${where} must be an object`);
      return;
    }
    if (typeof t.slug !== 'string' || !SLUG_RE.test(t.slug)) {
      errors.push(`${where}.slug must match ${SLUG_RE}`);
    } else if (seen.has(t.slug)) {
      errors.push(`duplicate slug: ${t.slug}`);
    } else {
      seen.add(t.slug);
    }
    checkText(t.label, `${where}.label`, errors);
    checkTextList(t.titleKeywords, `${where}.titleKeywords`, errors);
    checkTextList(t.seniority, `${where}.seniority`, errors);
    if (t.excludeKeywords !== undefined) checkTextList(t.excludeKeywords, `${where}.excludeKeywords`, errors);
    const se = t.scoringEmphasis;
    if (!se || typeof se !== 'object') {
      errors.push(`${where}.scoringEmphasis must be an object`);
    } else {
      for (const k of ['direct', 'transferable', 'adjacent', 'impact']) {
        checkText(se[k], `${where}.scoringEmphasis.${k}`, errors);
      }
    }
    const h = t.header;
    if (!h || typeof h !== 'object') {
      errors.push(`${where}.header must be an object`);
    } else {
      checkText(h.label, `${where}.header.label`, errors);
      checkText(h.guidance, `${where}.header.guidance`, errors);
    }
  });
  return errors;
}

function validateCrew(crew, tracks) {
  const errors = [];
  if (!crew || typeof crew !== 'object') return ['crew.json must be an object'];
  const user = crew.user;
  if (!user || typeof user !== 'object') {
    errors.push('user must be an object');
  } else {
    for (const k of ['fullName', 'displayName', 'filePrefix']) {
      if (typeof user[k] !== 'string' || user[k].trim() === '') errors.push(`user.${k} must be a non-empty string`);
    }
    if (typeof user.filePrefix === 'string' && !/^[A-Za-z0-9]+$/.test(user.filePrefix)) {
      errors.push('user.filePrefix must be ASCII letters and digits only');
    }
  }
  const agents = crew.agents && typeof crew.agents === 'object' ? crew.agents : null;
  if (!agents) errors.push('agents must be an object');
  const specialists = crew.specialists && typeof crew.specialists === 'object' ? crew.specialists : null;
  if (!specialists) errors.push('specialists must be an object');

  const names = new Map();
  const note = (name, where) => {
    if (typeof name !== 'string' || name.trim() === '') {
      errors.push(`${where} must be a non-empty name`);
      return;
    }
    if (/[^A-Za-z0-9 _-]/.test(name) || name.length > 40) {
      errors.push(`${where} has an invalid name: letters, digits, space, underscore, hyphen only (max 40)`);
    }
    const key = name.trim().toLowerCase();
    if (names.has(key)) errors.push(`duplicate name "${name}" (${names.get(key)} and ${where})`);
    else names.set(key, where);
  };
  if (agents) {
    for (const k of Object.keys(DEFAULT_AGENT_NAMES)) note(agents[k], `agents.${k}`);
  }
  if (specialists) {
    for (const [slug, name] of Object.entries(specialists)) note(name, `specialists.${slug}`);
    const list = tracks && Array.isArray(tracks.tracks) ? tracks.tracks : [];
    for (const t of list) {
      if (t && typeof t.slug === 'string' && !Object.hasOwn(specialists, t.slug)) {
        errors.push(`track "${t.slug}" has no entry in specialists`);
      }
    }
  }
  return errors;
}

function stripMarks(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slugify(label) {
  return stripMarks(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(w) {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

function deriveFilePrefix(fullName) {
  const tokens = String(fullName).trim().split(/\s+/).filter(Boolean);
  const last = tokens.length ? tokens[tokens.length - 1] : '';
  return stripMarks(last)
    .split('-')
    .map((part) => part.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .map(capitalize)
    .join('');
}

function suggestSpecialistName(slug, taken) {
  const used = new Set((taken || []).map((n) => String(n).toLowerCase()));
  const hit = SPECIALIST_POOL.find(([prefix]) => slug === prefix || slug.startsWith(prefix));
  if (hit && !used.has(hit[1].toLowerCase())) return hit[1];
  const free = FALLBACK_POOL.find((n) => !used.has(n.toLowerCase()));
  if (free) return free;
  let i = 2;
  while (used.has(`${FALLBACK_POOL[0]}${i}`.toLowerCase())) i++;
  return `${FALLBACK_POOL[0]}${i}`;
}

function profilePaths(root) {
  const dir = path.join(root, 'profile');
  return {
    dir,
    crew: path.join(dir, 'crew.json'),
    tracks: path.join(dir, 'tracks.json'),
    preferences: path.join(dir, 'preferences.md'),
    screening: path.join(dir, 'screening-answers.md'),
    state: path.join(dir, 'onboarding-state.json'),
  };
}

function safeSegment(text) {
  const words = stripMarks(typeof text === 'string' ? text : '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const out = words.map(capitalize).join('').slice(0, 60);
  return out === '' ? 'Unknown' : out;
}

module.exports = {
  readJson,
  validateTracks,
  validateCrew,
  slugify,
  deriveFilePrefix,
  suggestSpecialistName,
  profilePaths,
  safeSegment,
  DEFAULT_AGENT_NAMES,
};
