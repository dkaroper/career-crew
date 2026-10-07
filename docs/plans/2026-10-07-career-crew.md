# career-crew Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `career-crew`, a blank-slate, public Claude Code job-application system that onboards a new Canadian job seeker through a resumable interview and then tailors resumes, drafts outreach, and preps interviews for them.

**Architecture:** Static, generic agent prompts read the user's `profile/` at runtime; only per-track resume specialists are generated (from one template) by a Node script. Small, tested Node scripts handle rendering, `.docx`/PDF output, resume text extraction, prerequisite checks, and a privacy scan. All user data lives in gitignored lowercase folders.

**Tech Stack:** Node.js 18+ (CommonJS, `node:test`), `docx`, `jszip`; Markdown agent/skill prompts for Claude Code; Word COM (Windows) or LibreOffice for PDF.

**Spec:** `docs/specs/2026-10-07-career-crew-design.md`

**Source system (read-only reference, never copied wholesale):** the owner's private system at `../Job` relative to this repo (referred to below as `SRC`). It contains personal data. Port procedure text from it; never copy data files, application folders, or git history.

## Global Constraints

- Repo root: `career-crew/` (sibling of `SRC`), branch `main`, MIT license.
- Node >= 18, CommonJS, no build step. Runtime deps exactly: `docx`, `jszip`. No dev deps (tests use `node:test` + `node:assert`).
- `npm test` runs `node --test test/`.
- User-data paths (all gitignored, none shipped): `profile/`, `library/`, `inputs/`, `applications/`, generated `.claude/agents/resume-tailor-*.md`. Lowercase everywhere.
- Denylist: `../Job/.career-crew-denylist.txt` (outside this repo, never committed). Every "no personal data" verification means `grep -rniF -f ../Job/.career-crew-denylist.txt <paths>` returns nothing.
- Tracks: 1 to 6; slug regex `^[a-z][a-z0-9-]{1,30}$`; unique.
- Default names: orchestrator Scout, resume-tailor Weaver, outreach Herald, interview-prep Sage, job-scraper Fred. Specialist suggestion pool: design to Drafter, project to Marshal, quality to Warden, continuous-improvement to Kaizen, automation to Volt; fallback pool: Atlas, Beacon, Compass, Forge, Keystone, Lumen.
- Generated-file marker, exact line directly after frontmatter: `<!-- career-crew:generated (do not edit; rerun npm run render) -->`
- Output filename pattern: `<filePrefix>_<Company>_<Role>_Resume.{md,docx,pdf,_Report.md}` under `applications/<Company>_<Role>/`.
- Defaults offered in onboarding: em-dash ban ON, overqualification pre-emption ON when experience exceeds target seniority, coverage floor 70%.
- Shipped text (prompts, docs, README, comments) contains no em-dash characters (U+2014) and no personal data from SRC. Enforced by `test/repo-hygiene.test.js` (Task 9) and the privacy gate (Task 12).
- Plugin skills (`marketings:content-humanizer`, `marketings:cold-email`, `documents-skills:docx-toolkit`, `superpowers:*`) are optional: every prompt that uses one says "if installed, otherwise follow the built-in checklist in `docs/checklists.md`".

## Review Focus

1. **Accented / hyphenated names** (Quebec users: "Marie-Ève Côté-Tremblay"): `filePrefix` must be ASCII PascalCase ("CoteTremblay") and the `.docx` must render the accented full name intact. Tests in Task 1 and Task 3.
2. **Track labels with `&`, `/`, `:`** ("Automation & Controls", "Quality/QC"): rendered agent frontmatter must stay valid YAML and slugs must be derivable. Test in Task 2.
3. **Paths with spaces** (repo cloned under "My Documents" / OneDrive): PDF command construction must keep each path a single argument. Test in Task 4.
4. **Track removal does not delete user-authored agents:** renderer removes only `resume-tailor-*.md` files carrying the marker. Test in Task 2.
5. **Malformed or half-written profile JSON** (user hand-edits, crash mid-stage): loaders return a clear error naming the file, never throw a stack trace; doctor reports it and onboarding restarts that stage. Tests in Task 1 and Task 6.

---

### Task 1: Repo scaffold + profile library

**Files:**
- Create: `package.json`, `.gitignore`, `LICENSE`, `scripts/lib/profile.js`
- Test: `test/profile.test.js`, `test/fixtures/profile-valid/{crew.json,tracks.json}`

**Interfaces:**
- Produces (from `scripts/lib/profile.js`):
  - `readJson(filePath: string) -> {ok: true, value: any} | {ok: false, error: string}` (error names the file and the parse problem; missing file gives `error` starting `missing:`)
  - `validateTracks(obj) -> string[]` (empty array = valid)
  - `validateCrew(crew, tracks) -> string[]`
  - `slugify(label: string) -> string`
  - `deriveFilePrefix(fullName: string) -> string`
  - `suggestSpecialistName(slug: string, taken: string[]) -> string`
  - `profilePaths(root: string) -> {dir, crew, tracks, preferences, screening, state}`
  - `DEFAULT_AGENT_NAMES` (object, values from Global Constraints)

- [ ] **Step 0: Build the denylist** at `../Job/.career-crew-denylist.txt` from SRC's own data: the owner's full-name variants, emails, phone numbers, every employer in `SRC/resumes/Experience_Library.md`, every company in `SRC/Applications/Job_Application_Tracker.md`, and the folder names under `SRC/Friends/`. Add the filename to SRC's `.gitignore`. Never copy it into this repo.
- [ ] **Step 1: Scaffold.** `package.json` with name `career-crew`, `"engines": {"node": ">=18"}`, deps `docx` and `jszip` (current majors), scripts `test`, `doctor` (`node scripts/doctor.js`), `render` (`node scripts/render_specialists.js`), `pdf` (`node scripts/to_pdf.js`). `.gitignore`: `node_modules/`, `profile/`, `library/`, `inputs/`, `applications/`, `.claude/agents/resume-tailor-*.md`, `.claude/settings.local.json`, `.DS_Store`. MIT `LICENSE` with copyright holder "career-crew contributors". Run `npm install`; commit `package-lock.json`.

- [ ] **Step 2: Write failing tests** in `test/profile.test.js`:
  - `readJson` on a missing path returns `ok:false`, error starts with `missing:`; on a file containing `{"a":` returns `ok:false` with the file path in `error`.
  - `validateTracks({tracks: []})` contains an error mentioning `1 to 6`; 7 tracks likewise; slug `"Design"` rejected (regex); duplicate slugs rejected; fixture `tracks.json` returns `[]`.
  - `validateCrew`: fixture returns `[]`; a specialist named `"Weaver"` (same as a core agent) returns an error containing `duplicate name`; a track with no entry in `specialists` returns an error containing the slug.
  - `slugify("Automation & Controls") === "automation-controls"`, `slugify("Quality/QC") === "quality-qc"`, `slugify("Continuous Improvement") === "continuous-improvement"`.
  - `deriveFilePrefix("Marie-Ève Côté-Tremblay") === "CoteTremblay"`, `deriveFilePrefix("Jane Doe") === "Doe"`, `deriveFilePrefix("Cher") === "Cher"`.
  - `suggestSpecialistName("quality", []) === "Warden"`; `suggestSpecialistName("quality", ["Warden"]) === "Atlas"`; `suggestSpecialistName("nursing", ["Atlas"]) === "Beacon"`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4: Implement `scripts/lib/profile.js`.** `deriveFilePrefix`: last whitespace-separated token, NFD-normalize and strip combining marks, split on `-`, capitalize each part, join. Pool lookup in `suggestSpecialistName` matches on slug prefix (`continuous-improvement`, `automation*`, `quality*`, `design*`, `project*`).
- [ ] **Step 5: Run** `npm test`. Expected: all PASS.
- [ ] **Step 6: Commit** `feat: scaffold repo and profile validation library`.

### Task 2: Specialist template + renderer

**Files:**
- Create: `.claude/templates/track-specialist.md`, `scripts/render_specialists.js`
- Test: `test/render.test.js`

**Interfaces:**
- Consumes: Task 1 `readJson`, `validateTracks`, `validateCrew`, `profilePaths`.
- Produces: `renderSpecialists({root: string}) -> {written: string[], removed: string[], errors: string[]}` and CLI `node scripts/render_specialists.js [--root <dir>]` (exit 1 and print errors if any; on success prints each written/removed path and the exact line `Restart Claude Code so it loads the new specialists.`).
- Template placeholders: `{{name}}`, `{{slug}}`, `{{label}}`, `{{titleKeywords}}` (comma-joined), `{{seniority}}` (comma-joined), `{{scoringEmphasis.direct|transferable|adjacent|impact}}`, `{{header.label}}`, `{{header.guidance}}`, `{{weaverName}}`.

- [ ] **Step 1: Write the template.** Port the shared body of `SRC/.claude/agents/resume-tailor-design.md` plus the structure of `SRC/.claude/agents/resume-tailor-design/SKILL.md` into one file: frontmatter (`name: resume-tailor-{{slug}}`, `description:` as a double-quoted YAML string naming the `{{label}}` track and stating it is dispatched only by `resume-tailor`, `tools: Read, Write, Edit, Glob, Bash, WebSearch, WebFetch`), the marker line, an identity paragraph ("read `profile/crew.json`; your name is `specialists.{{slug}}`" with `{{name}}` as the fallback), the instruction to read `.claude/agents/resume-tailor/_shared-procedure.md` in full, then sections "Step 1 scoring emphasis" (four factor bullets) and "Step 3.5 header vocabulary" (label + guidance). Drop all SRC-specific worked examples and employer names.
- [ ] **Step 2: Write failing tests** in `test/render.test.js` (each test builds a temp root via `fs.mkdtempSync` with `profile/`, `.claude/agents/`, and a copy of the real template):
  - two valid tracks produce exactly `resume-tailor-design.md` and `resume-tailor-automation-controls.md`; each starts with `---\nname: resume-tailor-<slug>\n`; line after the closing `---` equals the marker; no `{{` remains.
  - label `"Automation & Controls"`: the `description:` line parses as a quoted string (assert it matches `/^description: ".*Automation & Controls.*"$/m`).
  - removing a track then re-rendering deletes its marked file; an unmarked `resume-tailor-custom.md` in the same folder survives both runs.
  - invalid `tracks.json` (8 tracks) returns non-empty `errors`, writes nothing.
- [ ] **Step 3: Run** `npm test`. Expected: render tests FAIL.
- [ ] **Step 4: Implement `scripts/render_specialists.js`.** Simple `{{key.path}}` replacement; escape `"` and `\` in values substituted inside the quoted description.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: track specialist template and renderer`.

### Task 3: Resume .docx generator

**Files:**
- Create: `scripts/generate_docx.js` (port of `SRC/.claude/agents/resume-tailor/scripts/generate_docx.js`), `examples/persona/resume.json`
- Test: `test/generate_docx.test.js`

**Interfaces:**
- Produces: CLI `node scripts/generate_docx.js <input.json> <output.docx>` (unchanged input shape from SRC) and export `buildDocument(data) -> Promise<Buffer>` (refactor the existing main into this so it is testable; CLI wraps it).

- [ ] **Step 1: Write `examples/persona/resume.json`** for the fictional persona "Marie-Ève Côté-Tremblay" (`marie.cote@example.com`, `555-0100`, Montréal QC; 2 jobs, education, one labeled-list section; header label `QUALITY TECHNICIAN`). Task 11 reuses this identity.
- [ ] **Step 2: Write failing test:** `buildDocument(persona)` resolves to a Buffer that `JSZip.loadAsync` opens; `word/document.xml` contains `Côté-Tremblay` and `QUALITY TECHNICIAN`; CLI with a missing input path exits non-zero with a message naming the path.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4: Port** the SRC generator verbatim to `scripts/generate_docx.js`, replace its header-comment sample data with the persona, and refactor main into exported `buildDocument` with a thin CLI wrapper.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat: port resume docx generator with fictional sample`.

### Task 4: PDF conversion

**Files:**
- Create: `scripts/to_pdf.js`
- Test: `test/to_pdf.test.js`

**Interfaces:**
- Produces: `chooseEngine({platform: string, hasWord: boolean, hasSoffice: boolean}) -> "word" | "libreoffice" | null`; `buildCommand(engine, inPath, outPath) -> {cmd: string, args: string[]}`; `detect() -> {hasWord, hasSoffice}`; CLI `node scripts/to_pdf.js <in.docx> [out.pdf]` (default out = same basename `.pdf`), converts exactly one file, synchronous, foreground.

- [ ] **Step 1: Write failing tests:**
  - `chooseEngine({platform:"win32", hasWord:true, hasSoffice:true}) === "word"`; win32 without Word but with soffice gives `"libreoffice"`; `darwin` with Word installed still gives `"libreoffice"` (Word COM is Windows-only); nothing available gives `null`.
  - `buildCommand("libreoffice", "C:\\My Docs\\a b.docx", "C:\\My Docs\\a b.pdf")`: `cmd` is `soffice`, args include `--headless`, `--convert-to`, `pdf`, `--outdir`, `C:\\My Docs`, and the input path as one unsplit element.
  - `buildCommand("word", ...)`: `cmd` is `powershell`, args contain `-NoProfile`, `-Command`, and the command string embeds both paths single-quoted with any `'` doubled.
  - CLI with no engine (stub via env `CAREER_CREW_FORCE_NO_ENGINE=1`) exits 2 and prints text containing `LibreOffice`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Word path: PowerShell COM script (`New-Object -ComObject Word.Application`, `Documents.Open`, `SaveAs2(out, 17)`, `Close`, `Quit`). Detection: Word via `reg query HKCR\Word.Application` exit code; soffice via `soffice --version` (also try `/Applications/LibreOffice.app/Contents/MacOS/soffice` on darwin). Use `spawnSync` with `shell: false`. LibreOffice output name: rename from `--outdir` result if `outPath` differs.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Manual check** on this machine: `node scripts/to_pdf.js examples/persona/out.docx` (generate it first with Task 3 CLI) produces a PDF. Delete the outputs afterward.
- [ ] **Step 6: Commit** `feat: cross-platform docx to pdf converter`.

### Task 5: Resume text extraction

**Files:**
- Create: `scripts/extract_text.js`
- Test: `test/extract_text.test.js`, `test/fixtures/resume.txt`

**Interfaces:**
- Produces: `extractText(filePath) -> Promise<string>`; CLI prints text to stdout. `.pdf` rejects with an Error whose `code === "USE_READ_TOOL"` (Claude's Read tool reads PDFs natively). Other extensions reject with `code === "UNSUPPORTED"`.

- [ ] **Step 1: Write failing tests:** `.txt` returns contents; a `.docx` produced by Task 3's `buildDocument` (written to a temp file) returns text containing `Côté-Tremblay` with paragraphs separated by `\n`; `.pdf` and `.rtf` reject with the codes above.
- [ ] **Step 2: Run**; FAIL.
- [ ] **Step 3: Implement** with `jszip`: read `word/document.xml`, join `<w:t>` text per `<w:p>`, decode XML entities.
- [ ] **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat: resume text extraction for intake`.

### Task 6: Doctor

**Files:**
- Create: `scripts/doctor.js`
- Test: `test/doctor.test.js`

**Interfaces:**
- Consumes: Task 1 `readJson`, `profilePaths`; Task 4 `detect`.
- Produces: `runChecks({root, nodeVersion, detectPdf, requireResolve}) -> Array<{name: string, ok: boolean, required: boolean, detail: string, fix: string}>` (all collaborators injectable for tests); CLI prints `PASS`/`FAIL`/`WARN` lines and exits 1 only if a `required` check fails.
- Checks, in order: `node` (>= 18, required), `docx` + `jszip` resolvable (required), `pdf-engine` (optional), `profile` (state: `not started` / `in progress (stage N)` / `complete` / `corrupt: <error>`; optional), `specialists` (when profile complete: every track in `tracks.json` has a rendered file; optional).

- [ ] **Step 1: Write failing tests:** node `16.20.0` gives node check `ok:false, required:true` and fix mentioning `nodejs.org`; missing `docx` gives required failure; no PDF engine gives `ok:false, required:false` with fix mentioning LibreOffice; `onboarding-state.json` containing `{` gives profile detail starting `corrupt:`; complete state with a track lacking a rendered file gives specialists `ok:false` with fix `npm run render`.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Commit** `feat: doctor prerequisite and profile checks`.

### Task 7: Port Weaver + shared procedure

**Files:**
- Create: `.claude/agents/resume-tailor.md`, `.claude/agents/resume-tailor/SKILL.md`, `.claude/agents/resume-tailor/_shared-procedure.md`, `docs/checklists.md`
- Sources: same paths under `SRC/.claude/agents/`.

**Interfaces:**
- Consumes: profile paths (Task 1), specialist naming `resume-tailor-<slug>` (Task 2), `scripts/generate_docx.js` CLI (Task 3), `scripts/to_pdf.js` CLI (Task 4).
- Produces: the read-profile preamble every later agent copies, exact text:
  > Before anything else, read `profile/crew.json` (your name is at `{{path}}`) and `profile/preferences.md`. If either is missing, stop and report that onboarding has not been completed.

- [ ] **Step 1: Port `_shared-procedure.md`.** Keep every step (0 through Output) and every checkpoint. Replace: `resumes/Experience_Library.md` with `library/Experience_Library.md`; the owner's surname file prefix with `<filePrefix>_` (from `crew.json` `user.filePrefix`); output location `applications/<Company>_<Role>/`; general-resume references removed (the library is the only source); generator path `scripts/generate_docx.js`; em-dash and overqualification rules become "apply the Writing Style section of `profile/preferences.md`"; coverage floor reads from preferences. Remove all SRC employer names and worked examples; replace any needed example with the fictional persona.
- [ ] **Step 2: Port `resume-tailor/SKILL.md` + `resume-tailor.md`.** Tracks come from `profile/tracks.json`; dispatch `subagent_type: resume-tailor-<slug>`; specialist display names from `crew.json` `specialists`; keep the ambiguous-track checkpoint, craft review at Step 4, batch track grouping, fresh-dispatch resume rule (SRC commit 608559f behavior), and interrupted-run recovery. Drop dated "As of" history notes (move a one-paragraph summary of each into `docs/architecture.md` in Task 11).
- [ ] **Step 3: Write `docs/checklists.md`** with three short sections: AI-phrasing check (fallback for content-humanizer), cold-email check (fallback for cold-email), docx audit (fallback for docx-toolkit). Each is 6 to 10 bullet checks, original wording.
- [ ] **Step 4: Verify:** denylist grep over `.claude/ docs/` returns nothing; `grep -rnE "Drafter|Marshal|Warden|Kaizen|Volt|resumes/" .claude/agents` returns nothing (specialist pool names live only in `scripts/lib/profile.js`); `npm test` still passes.
- [ ] **Step 5: Commit** `feat: port resume-tailor orchestration as profile-driven prompts`.

### Task 8: Port Herald, Sage, Fred

**Files:**
- Create: `.claude/agents/{outreach,interview-prep,job-scraper}.md` and each `<name>/SKILL.md`; `docs/job-scraper-setup.md`
- Sources: same paths under `SRC/.claude/agents/`.

**Interfaces:**
- Consumes: Task 7 preamble text; profile paths.

- [ ] **Step 1: Herald.** Port; keep never-sends boundary and checkpoint. Chrome LinkedIn checks only if `preferences.md` Modules allows it; otherwise web search only. Tool list keeps the Chrome tools (harmless when unused).
- [ ] **Step 2: Sage.** Port; keep five round types, STAR/PSTARP, `InterviewPrep_<Suffix>.md`, cross-round story variance, JD-fit tags.
- [ ] **Step 3: Fred.** Port; first instruction after preamble: if `preferences.md` Modules does not say `Job Scraper: on`, stop and report "Job Scraper is disabled; enable it by rerunning onboarding stage 7." Tracks, title keywords, seniority, exclude keywords, and locations come from `tracks.json` / `preferences.md`. Keep six sources and LinkedIn exclusion. State files: `inputs/.scraper-state.json`, `inputs/.scraper-graph.json`. Remove the capped-experiment and SRC-specific company aliases.
- [ ] **Step 4: Write `docs/job-scraper-setup.md`:** Apify account + token, adding the Apify MCP server to Claude Code, JobDataLake connector, cost note (free tier then paid), a one-result test, and optional daily scheduling via Claude Code's `/schedule`.
- [ ] **Step 5: Verify** the Task 7 Step 4 greps over the new files return nothing; `npm test` passes.
- [ ] **Step 6: Commit** `feat: port outreach, interview-prep, and optional job-scraper agents`.

### Task 9: Prompt hygiene tests

**Files:**
- Test: `test/repo-hygiene.test.js`

**Interfaces:**
- Consumes: all shipped `.md` files.

- [ ] **Step 1: Write tests:**
  - every `.claude/agents/*.md` (shipped) has frontmatter whose `name` equals its filename stem and has `description` and `tools`;
  - every shipped agent file and `.claude/skills/onboarding/SKILL.md` contains `profile/crew.json`;
  - no tracked text file (`git ls-files`, extensions `.md .js .json`) contains U+2014;
  - `.gitignore` contains each user-data path from Global Constraints.
- [ ] **Step 2: Run** `npm test`. Expected: the onboarding-skill assertion FAILS (file arrives in Task 10); everything else PASSES. Fix any other failure in the offending ported file.
- [ ] **Step 3: Commit** `test: prompt and repo hygiene checks`.

### Task 10: Onboarding skill

**Files:**
- Create: `.claude/skills/onboarding/SKILL.md`

**Interfaces:**
- Consumes: Task 1 schemas and `suggestSpecialistName` pool (named in prose), Task 2 CLI, Task 5 CLI, Task 6 CLI.
- Produces: writes `profile/{crew.json,tracks.json,preferences.md,screening-answers.md,onboarding-state.json}`, `library/Experience_Library.md`, `applications/Tracker.md`, `applications/Autonomous_Run_Log.md`.

- [ ] **Step 1: Write the skill** with stages 0 to 8 exactly as the spec's section 4 table. Requirements per stage that the spec pins:
  - every question via `AskUserQuestion`, one topic at a time, with a recommended default first;
  - after each stage, write its files then set `lastCompletedStage`; resume starts at `lastCompletedStage + 1`; corrupt state file means "tell the user, back it up as `.bak`, restart the stage it implies or stage 0";
  - stage 1 introduces each agent with: what it does, what it never does, suggested name;
  - stage 2: PDF via Read tool, DOCX via `node scripts/extract_text.js`, otherwise ask to paste; draft library entries use the same entry format as the shipped `examples/persona/library/Experience_Library.md` (Task 11);
  - stage 4 enforces 1 to 6 tracks and suggests specialist names from the pool;
  - stage 5 writes durable answers to `screening-answers.md`; salary is a floor only, per-posting salary is always asked fresh later;
  - stage 6 offers em-dash ban and overqualification defaults ON;
  - stage 7 Job Scraper default OFF; if ON, follow `docs/job-scraper-setup.md` and do a one-result test;
  - stage 8 runs `npm run render`, checks exit code, creates empty tracker (columns: #, Company, Role, Track, Status, Date Applied, Resume Used, JD Coverage, Researched, Reached out, Response, Interview Prep, Notes) and run log, then prints the restart instruction;
  - "later edits" section: rename an agent, add/remove a track (rerun render + restart notice), redo a stage.
- [ ] **Step 2: Run** `npm test`. Expected: all PASS, including the Task 9 onboarding assertion.
- [ ] **Step 3: Commit** `feat: onboarding interview skill`.

### Task 11: Orchestrator CLAUDE.md, example persona, docs

**Files:**
- Create: `CLAUDE.md`, `examples/persona/profile/{crew.json,tracks.json,preferences.md}`, `examples/persona/library/Experience_Library.md`, `examples/persona/applications/Tracker.md`, `examples/persona/sample-jd.md`, `docs/architecture.md`, `docs/customizing.md`
- Test: extend `test/profile.test.js`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write failing test:** `validateTracks` and `validateCrew` return `[]` for `examples/persona/profile/*`; persona has exactly 2 tracks (`quality`, `continuous-improvement`).
- [ ] **Step 2: Write persona files.** Fictional Montréal-based quality technician (identity from Task 3), bilingual, 2 tracks, a 4-entry library with at least one flexible entry with two faces, a one-row tracker, a fictional JD at `sample-jd.md` for a fictional company "Laurentide Composites".
- [ ] **Step 3: Run** `npm test`; PASS.
- [ ] **Step 4: Write `CLAUDE.md`** (target ~250 lines) from `SRC/CLAUDE.md`, current rules only: first-run detection block at the very top; team section (names from `crew.json`); resume tailoring delegation + checkpoint relay + Step 4 two-pass review + interrupted-run recovery; scanning `inputs/` + duplicate handling (lowercase paths, no Glob caveat); outreach; interview prep; application submission walkthrough (with permission boundaries, `profile/screening-answers.md`); autonomous mode (only when Job Scraper is on); skill usage (optional plugins, fallback to `docs/checklists.md`; PDF via `npm run pdf -- <file>`, one file per call); tracker ownership + archiving (floor from preferences); library ownership; strategist lens. Drop the dashboard URL; add an optional "publish my tracker as an Artifact" paragraph. Drop all dated history.
- [ ] **Step 5: Write `docs/architecture.md`** (roster table, dispatch graph as a Mermaid diagram, checkpoint relay, design history summarized from SRC specs without personal detail) and `docs/customizing.md` (rename, add/remove track, redo a stage, edit preferences by hand and run `npm run doctor`).
- [ ] **Step 6: Verify:** `npm test` passes; CLAUDE.md line count is under 320.
- [ ] **Step 7: Commit** `feat: orchestrator instructions, example persona, architecture docs`.

### Task 12: README, prerequisites, privacy gate

**Files:**
- Create: `README.md`, `PREREQUISITES.md`, `CONTRIBUTING.md`, `scripts/privacy_scan.js`
- Test: `test/privacy_scan.test.js`
- Consumes: the denylist built in Task 1 Step 0

**Interfaces:**
- Produces: `scanText(text: string, patterns: string[]) -> Array<{pattern, index}>` (case-insensitive literal match); CLI `node scripts/privacy_scan.js --denylist <path> [--history]` scans `git ls-files` contents, and with `--history` also `git log -p --all`; prints hits as `<file or commit>: <pattern>` and exits 1 on any hit, 0 otherwise. Denylist format: one literal per line, `#` comments.

- [ ] **Step 1: Write failing tests:** `scanText("Hello ZEBRA", ["zebra"])` has one hit; blank lines and `#` lines in a denylist are ignored; CLI against a temp git repo containing a seeded term exits 1, clean repo exits 0.
- [ ] **Step 2: Run**; FAIL. **Step 3: Implement.** **Step 4: Run**; PASS.
- [ ] **Step 5: Write docs.** README: one-paragraph pitch, "Meet the crew" table with default names, quick start (`git clone`, `npm install`, `npm run doctor`, open in Claude Code, say hi), what onboarding covers, privacy note (your data stays local and gitignored), optional modules, FAQ (restart after onboarding, PDF engine). PREREQUISITES: spec section 7 with Windows/macOS/Linux install commands for Node and LibreOffice. CONTRIBUTING: run `npm test`, no personal data, no em-dashes.
- [ ] **Step 6: Run** `node scripts/privacy_scan.js --denylist ../Job/.career-crew-denylist.txt --history`. Expected: exit 0. Any hit: remove it from the file, and if it is in history, report to the owner before rewriting anything.
- [ ] **Step 7: Commit** `docs: README, prerequisites, contributing; add privacy scan`.

### Task 13: End-to-end dry run and release prep

**Files:** none shipped; scratch clone only.

- [ ] **Step 1:** `git clone . <scratchpad>/cc-e2e`, `npm install`, `npm run doctor`. Expected: node/docx PASS, profile `not started`.
- [ ] **Step 2:** Start a Claude Code session in the clone (via a `claude` subagent pointed at that directory, or interactively with the owner) and complete onboarding as the persona, using `examples/persona` answers and 2 tracks. Expected: all profile files valid (`npm run doctor` shows `complete`), two rendered specialists.
- [ ] **Step 3:** New session (restart), paste `examples/persona/sample-jd.md`. Expected: Weaver classifies to a persona track, the specialist reaches the Step 4 checkpoint, and after confirmation `applications/LaurentideComposites_<Role>/` contains `.md`, `.docx`, `_Report.md`, and (after `npm run pdf`) `.pdf`; tracker has one new row.
- [ ] **Step 4:** Record any defect as a fix in the owning task's files, rerun `npm test`, commit `fix: <defect>` per defect.
- [ ] **Step 5:** Rerun the privacy scan with `--history`. Expected: exit 0.
- [ ] **Step 6:** Ask the owner for explicit go-ahead, then `gh repo create career-crew --private --source . --push`. Making it public is the owner's separate decision.
