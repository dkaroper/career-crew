# Built-in checklists

Agents use these when the matching optional plugin skill is not installed. Each list is
a style or format pass only: none of them may change a factual claim, add a detail the
source material doesn't support, or remove real experience. If fixing a line would
change what it claims, leave the claim alone and flag the line instead.

Always apply the Writing Style section of `profile/preferences.md` on top of these
lists; where the two disagree, the user's preferences win.

## AI-phrasing check

Fallback for `marketings:content-humanizer`. Use on resume bullets, focus headers,
outreach drafts, and interview answers.

- **Stock buzzwords.** Flag words that signal filler rather than meaning: "leveraged,"
  "spearheaded," "synergy," "dynamic," "robust," "seamless," "cutting-edge,"
  "passionate," "results-driven," "proven track record." Replace each with the plain
  verb or the concrete thing that happened.
- **Empty intensifiers.** Cut "highly," "extremely," "truly," "significantly" unless a
  number follows that justifies them.
- **Same-shape lines.** Read the bullets in a row. If most open with the same pattern
  (past-tense verb, then object, then "resulting in ..."), vary the structure so they
  don't sound stamped from one mold.
- **Even rhythm.** If every sentence or bullet is about the same length, mix in a
  shorter one. Real writing has uneven cadence.
- **Rule of three by reflex.** Flag lists of exactly three adjectives or benefits that
  appear out of habit; keep three only when there are really three things.
- **Contrast framing.** Flag "not just X, but Y," "more than X, it's Y," and similar
  set-ups that add drama without adding information.
- **Vague outcomes.** Flag "improved efficiency," "enhanced quality," "drove results"
  with no number, scope, or example. Use the specific figure from the source if there
  is one; otherwise name the concrete change.
- **Banned punctuation.** Check for any punctuation the user's Writing Style bans
  (em-dashes by default) and rewrite with a comma, colon, semicolon, or a second
  sentence.
- **Read it aloud.** If a line sounds like a brochure rather than something the user
  would say to a colleague, rewrite it in plainer words.

## Cold-email check

Fallback for `marketings:cold-email`. Use on outreach email drafts before they reach
the user. Nothing is ever sent by an agent.

- **One real hook.** The opening line references something specific the outreach
  research actually found (a project, announcement, team detail), not a generic
  compliment about the company.
- **Clear reason for writing.** Within the first two sentences, the reader knows who
  is writing and which role or team this is about.
- **Short.** The body fits on a phone screen without scrolling: roughly 120 words or
  fewer, short paragraphs.
- **One ask, low effort.** A single, easy call to action (a short chat, a pointer to
  the right person), not several requests at once.
- **Proof, not adjectives.** One concrete result from the user's own experience that
  matches the role, instead of self-description.
- **Subject line.** Specific and plain, under about eight words; no clickbait, no all
  caps, no misleading "Re:" or "Fwd:".
- **Deliverability basics.** No attachments in a first message, at most one link, no
  spam-trigger phrasing ("act now," "guaranteed," heavy exclamation marks).
- **Recipient fit.** The person addressed plausibly owns the hiring decision or can
  route it; if the contact is uncertain, say so in the draft notes.
- **Follow-up.** Suggest one polite follow-up after about a week if there's no reply,
  with new information rather than "just checking in."

## Docx audit

Fallback for `documents-skills:docx-toolkit`. Use on every generated resume `.docx`
before it is converted to PDF.

Inspect the file with `node scripts/docx_inspect.js "<path to .docx>"`: it prints each
paragraph's style, list marker, tab count, and text, plus the fonts, comments, and
tracked changes, without changing the file. Compare that output with the `.md` for the
checks below. Never write a new script or helper file into the project to inspect a
`.docx`.

- **Heading hierarchy.** The candidate name is Heading 1, section titles are Heading 2,
  and job title lines are Heading 3, with no skipped levels and no fake headings made
  of bold body text.
- **One font.** Every run uses the same font (Arial from the generator); no stray
  fonts carried in from pasted text.
- **Title and date alignment.** Each job's title and date range sit on one line, the
  date right-aligned by a tab stop, not by spaces and not concatenated into one run.
- **Section heading text.** The experience section heading matches the `.md` exactly
  and matches the user's Writing Style preference.
- **Consistent bullets.** All bullets use the same list style and indentation; no
  manual hyphen or asterisk characters standing in for bullets.
- **Dates.** Date ranges use one format throughout (for example `Mar 2022 – Present`),
  and no two roles show overlapping dates that the library says must not overlap.
- **Clean document.** No comments, tracked changes, leftover template text,
  placeholder brackets, or empty sections.
- **Length.** The page count matches the length set in the user's Writing Style
  preference.
- **Content parity.** Every section and bullet in the `.md` appears in the `.docx`,
  and nothing appears in the `.docx` that isn't in the `.md`.
