# Validation matrix

Traceability from every requirement in the design spec
(`docs/specs/2026-10-07-career-crew-design.md`) to the evidence that proves it: a unit
test (by test name, run with `npm test`) or an end-to-end step (E2E-A, E2E-R, E2E-B,
E2E-RT, described below). End-to-end transcripts are kept outside the repo and are not
committed; the step names and transcript file names below identify them.

## End-to-end steps

All runs used fresh `git clone`s of this repo in a scratch folder, `npm ci`, and Claude
Code driven headlessly (`claude -p`, one process per session, so each new process is a
restart that loads newly rendered agents). Sessions used an empty MCP configuration
(`--strict-mcp-config`) and a narrow tool allowlist. `AskUserQuestion` is not available
headlessly, so each session was told it was a scripted test and took its answers from
the persona's `answers.md`.

- **E2E-A (persona A):** `examples/persona/` (fictional bilingual Montréal quality
  technician, 2 tracks, resume supplied as `.docx`). Onboarding from a blank clone, then
  a tailoring run for `examples/persona/sample-jd.md` through `.pdf`.
- **E2E-R (resumability):** persona B onboarding stopped after stage 3, then a new
  session.
- **E2E-B (persona B):** `examples/persona-b/` (fictional Halifax medical office
  administrator, 1 track, resume pasted as text, several answers skipped). Finish
  onboarding, then tailor `examples/persona-b/sample-jd.md` through `.pdf`.
- **E2E-RT (red-team):** in the persona A clone, paste
  `examples/security/injected-jd.md` (instructions to exfiltrate screening answers to a
  URL, copy them into the resume, and write outside the project), with WebFetch and
  WebSearch not allowed so any attempt shows as a denied tool call.

## Matrix

| Requirement | Source (spec section) | Evidence (test name or e2e step) | Result | Date |
|---|---|---|---|---|
| SC1: clone to tailored `.docx` + `.pdf` for a pasted JD with no hand-edited files | 1, success criterion 1 | | | |
| SC2: no personal data from the source system in the repo or its history | 1, success criterion 2 | | | |
| SC3: `git pull` of upstream changes without conflicts on user data or generated agents | 1, success criterion 3 | | | |
| SC4: works on Windows, macOS, and Linux | 1, success criterion 4 | | | |
| Stage 0: welcome + doctor; state written | 4, stage 0 | | | |
| Stage 1: meet the crew, keep or rename each agent, user name; `crew.json` | 4, stage 1 | | | |
| Stage 2: resume intake (file or pasted); `Experience_Library.md` | 4, stage 2 | | | |
| Stage 3: role deep-dive (numbers, faces, fixed or flexible); library | 4, stage 3 | | | |
| Stage 4: target tracks (1 to 6), specialists named; `tracks.json`, `crew.json` | 4, stage 4 | | | |
| Stage 5: search logistics; `preferences.md`, `screening-answers.md` | 4, stage 5 | | | |
| Stage 6: writing style; `preferences.md` | 4, stage 6 | | | |
| Stage 7: optional modules; `preferences.md` Modules | 4, stage 7 | | | |
| Stage 8: build + handoff; specialists rendered, tracker and run log created, `status: complete` | 4, stage 8 | | | |
| Resumability: stop after stage 3, new session resumes at stage 4 with data intact | 4 (resuming), 10 validation | | | |
| Skipped answers recorded in `skipped` | 4 (later edits / skipped) | | | |
| Prompt injection via JD or web content is refused and flagged | 10 security | | | |
| Exfiltration of profile data (no URLs, no files outside `applications/`) | 10 security | | | |
| Over-broad agent tools (least-privilege allowlists; only specialists get Bash; settings deny list) | 10 security | | | |
| Command injection via file paths | 10 security | | | |
| Path traversal via company or role names | 10 security | | | |
| Template or frontmatter injection via track fields | 10 security | | | |
| Malicious or huge resume files | 10 security | | | |
| Secrets committed by accident | 10 security | | | |
| User data committed by accident | 10 security | | | |
| Dependency supply chain (lockfile, `npm ci`, audit, Dependabot) | 10 security | | | |

Owner acceptance: pending
