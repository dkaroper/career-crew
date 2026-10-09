'use strict';
// Renders one resume-tailor-<slug>.md agent per track in profile/tracks.json from
// .claude/templates/track-specialist.md. Only files carrying the generated marker are
// ever overwritten or deleted; hand-written agents in the same folder are left alone.
const fs = require('node:fs');
const path = require('node:path');
const { readJson, validateTracks, validateCrew, profilePaths } = require('./lib/profile');

const MARKER = '<!-- career-crew:generated (do not edit; rerun npm run render) -->';
const FILE_RE = /^resume-tailor-([a-z][a-z0-9-]*)\.md$/;

function lookup(vars, key) {
  return Object.hasOwn(vars, key) ? vars[key] : undefined;
}

function escapeQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Single-pass {{key.path}} replacement. Lines starting with "description:" are the
// double-quoted YAML string, so substituted values are escaped there.
function fill(template, vars, errors, where) {
  return template
    .split('\n')
    .map((line) => {
      const quoted = line.startsWith('description:');
      return line.replace(/\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g, (m, key) => {
        const v = lookup(vars, key);
        if (v === undefined) {
          errors.push(`${where}: unknown template placeholder ${m}`);
          return m;
        }
        return quoted ? escapeQuoted(v) : v;
      });
    })
    .join('\n');
}

function isGenerated(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return false;
  const close = lines.indexOf('---', 1);
  return close > 0 && lines[close + 1] === MARKER;
}

function renderSpecialists(options) {
  const root = path.resolve((options && options.root) || process.cwd());
  const result = { written: [], removed: [], errors: [] };
  const paths = profilePaths(root);

  const tr = readJson(paths.tracks);
  const cr = readJson(paths.crew);
  if (!tr.ok) result.errors.push(tr.error);
  if (!cr.ok) result.errors.push(cr.error);
  if (result.errors.length) return result;

  result.errors.push(...validateTracks(tr.value));
  if (!result.errors.length) result.errors.push(...validateCrew(cr.value, tr.value));
  if (result.errors.length) return result;

  const templatePath = path.join(root, '.claude', 'templates', 'track-specialist.md');
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8').replace(/\r\n/g, '\n');
  } catch (err) {
    result.errors.push(`cannot read template ${templatePath}: ${err.message}`);
    return result;
  }

  const crew = cr.value;
  const weaverName = crew.agents['resume-tailor'];
  const rendered = [];
  for (const t of tr.value.tracks) {
    const vars = {
      name: Object.hasOwn(crew.specialists, t.slug) ? crew.specialists[t.slug] : undefined,
      slug: t.slug,
      label: t.label,
      titleKeywords: t.titleKeywords.join(', '),
      seniority: t.seniority.join(', '),
      'scoringEmphasis.direct': t.scoringEmphasis.direct,
      'scoringEmphasis.transferable': t.scoringEmphasis.transferable,
      'scoringEmphasis.adjacent': t.scoringEmphasis.adjacent,
      'scoringEmphasis.impact': t.scoringEmphasis.impact,
      'header.label': t.header.label,
      'header.guidance': t.header.guidance,
      weaverName,
    };
    const text = fill(template, vars, result.errors, `track ${t.slug}`);
    rendered.push({ slug: t.slug, text });
  }
  if (result.errors.length) return result;

  const agentsDir = path.join(root, '.claude', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const keep = new Set();
  for (const r of rendered) {
    const file = path.join(agentsDir, `resume-tailor-${r.slug}.md`);
    keep.add(path.basename(file));
    if (fs.existsSync(file) && !isGenerated(fs.readFileSync(file, 'utf8'))) {
      result.errors.push(`refusing to overwrite hand-written ${file}; rename it or change the track slug`);
    }
  }
  if (result.errors.length) return result;

  for (const r of rendered) {
    const file = path.join(agentsDir, `resume-tailor-${r.slug}.md`);
    fs.writeFileSync(file, r.text);
    result.written.push(file);
  }
  for (const entry of fs.readdirSync(agentsDir)) {
    if (!FILE_RE.test(entry) || keep.has(entry)) continue;
    const file = path.join(agentsDir, entry);
    if (isGenerated(fs.readFileSync(file, 'utf8'))) {
      fs.unlinkSync(file);
      result.removed.push(file);
    }
  }
  return result;
}

function main(argv) {
  let root = process.cwd();
  const i = argv.indexOf('--root');
  if (i !== -1) {
    if (!argv[i + 1]) {
      console.error('--root needs a directory');
      return 1;
    }
    root = argv[i + 1];
  }
  const res = renderSpecialists({ root });
  if (res.errors.length) {
    for (const e of res.errors) console.error(e);
    return 1;
  }
  for (const f of res.written) console.log(`wrote ${f}`);
  for (const f of res.removed) console.log(`removed ${f}`);
  console.log('Restart Claude Code so it loads the new specialists.');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { renderSpecialists, MARKER };
