# Customizing your crew

Everything personal lives in `profile/`, `library/`, `inputs/`, and `applications/`.
Those folders are gitignored, so `git pull` never touches them. The easiest way to
change anything is to ask the orchestrator in plain words; it follows the onboarding
skill's "Later edits" section. Editing files by hand works too.

## Rename an agent

Ask: "Rename the outreach agent to Iris."

By hand: edit the name in `profile/crew.json` (`agents.<role>` for a core agent,
`specialists.<slug>` for a track specialist). Names use letters, digits, spaces, `_`
and `-`, at most 40 characters, and must be unique across the whole crew.

- The orchestrator, outreach, interview-prep, and job-scraper read their names every
  run, so the change takes effect immediately.
- Renaming resume-tailor or a specialist needs `npm run render` and a restart of
  Claude Code: both names are baked into the generated specialist files.

## Add or remove a track

Ask: "Add a Project Coordination track" or "Remove my continuous improvement track."
The orchestrator asks the same questions as onboarding stage 4 for a new track.

By hand:

1. Edit `profile/tracks.json` (1 to 6 tracks; each `slug` matches
   `^[a-z][a-z0-9-]{1,30}$` and is unique; every text field is one line, at most 300
   characters, and never contains `---`).
2. Add or remove the matching `"<slug>": "<name>"` entry under `specialists` in
   `profile/crew.json`.
3. Run `npm run render`. It validates both files, writes one
   `.claude/agents/resume-tailor-<slug>.md` per track, and deletes generated
   specialists for tracks you removed (only files carrying its generated-file marker).
4. Restart Claude Code so it loads the new set of specialists.

Existing applications keep their folders and tracker rows when a track is removed.

## Redo an onboarding stage

Ask: "Redo stage 5." The orchestrator reruns only that stage's questions and rewrites
only its files or sections; everything else stays. The stages:

| Stage | Covers | Rewrites |
|---|---|---|
| 1 | Agent names, your name | `profile/crew.json` |
| 2, 3 | Resume intake, role deep-dive | `library/Experience_Library.md`, merged entry by entry (see below) |
| 4 | Tracks and specialists | `profile/tracks.json`, `crew.json` (then render and restart) |
| 5 | Location, work authorization, languages, salary floor, coverage floor | `profile/preferences.md` sections, `profile/screening-answers.md` |
| 6 | Writing style | `preferences.md` Writing Style |
| 7 | Job Scraper, Outreach Chrome | `preferences.md` Modules |

Redoing stage 2 or 3 never wipes your library. The orchestrator first copies it to
`library/Experience_Library.md.bak`, then compares the new answers with what is there
one entry at a time and asks you about each difference. Faces, bullets, and date notes
you already confirmed stay unless you choose otherwise for that entry.

## Edit preferences by hand

`profile/preferences.md` is plain prose that agents read every run. Keep its seven
section headings (`## Location`, `## Work Authorization`, `## Languages`, `## Salary`,
`## Coverage Floor`, `## Writing Style`, `## Modules`). The Modules section must keep
exactly these two lines, each `on` or `off`:

```markdown
## Modules
Job Scraper: off
Outreach Chrome: off
```

Turning the Job Scraper on by hand skips its setup and test; rerunning stage 7 is
safer (see `docs/job-scraper-setup.md`). `profile/screening-answers.md` holds only
durable answers; salary expectations and other per-posting answers are always asked
fresh.

After any hand edit, run:

```
npm run doctor
```

It checks Node, the `docx` package, a PDF engine, the onboarding state, whether every
track has a rendered specialist, and whether any of your data is tracked by git. If you
edited `tracks.json` or `crew.json`, `npm run render` also validates them and prints
any error.

## Edit your experience library

Ask the orchestrator to add or change an entry, so it keeps the format the specialists
rely on (`Type: fixed` with bullets or `Type: flexible` with faces, date notes, and
mutual-exclusion notes). See `examples/persona/library/Experience_Library.md` for a
complete example.
