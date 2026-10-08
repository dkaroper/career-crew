# Persona A: scripted onboarding answers

Test fixture for the end-to-end validation in `docs/validation.md`. Marie-Ève
Côté-Tremblay is fictional. A scripted session reads this file instead of asking the
user; every answer below is consistent with `examples/persona/profile/` and
`examples/persona/library/Experience_Library.md`. Where a question is not listed here,
accept the recommended option.

## Stage 0: Welcome + doctor
- Continue with onboarding now: yes.
- A missing PDF engine is fine to fix later.

## Stage 1: Meet the crew
- Keep every suggested agent name (Scout, Weaver, Herald, Sage, Fred).
- Full name: Marie-Ève Côté-Tremblay
- Display name: Marie-Ève
- File prefix: accept whatever the helper derives (expected `CoteTremblay`).

## Stage 2: Resume intake
- How the resume is shared: the file is already in `library/`, named `resume.docx`.
- The two roles parsed from the resume (Quality Technician at Atelier Exemple Inc.,
  Montréal, QC, Mar 2022 - Present; Inspection Assistant at Usinage Modèle Ltée,
  Laval, QC, Jun 2019 - Feb 2022) look right as parsed.
- Education: DEC, Mechanical Manufacturing Technology, Collège Exemple, Montréal, QC,
  2019.

## Stage 3: Role deep-dive

### Quality Technician, Atelier Exemple Inc.
- Context: incoming, in-process, and final inspection for a 60-person precision
  machining and assembly shop serving aerospace and medical customers.
- Tools: CMM (PC-DMIS), calipers, micrometers, height gauges, Minitab, SAP QM.
- Numbers and wins:
  - Cut first-article inspection time from 4 hours to 2 by building reusable CMM
    programs for 15 part families.
  - Led 8D reviews on recurring surface-finish defects, bringing customer returns for
    that defect from 9 a year to 2.
  - Closed 35+ NCRs a year to root cause, 92% within the 30-day target.
  - Trained 6 machinists to run in-process SPC checks at the machine, in French and
    English.
- Alternate faces: none. Fixed.

### Inspection Assistant, Usinage Modèle Ltée
- Context: dimensional inspection of machined brackets and housings across two shifts.
- Tools: calipers, micrometers, pin gauges, Excel calibration register.
- Numbers and wins:
  - Calibrated 120+ hand gauges on a monthly schedule and kept the calibration register
    audit-ready for two ISO 9001 surveillance audits.
  - Inspected 30+ parts per shift against drawings and logged results for every
    production lot.
- Fixed.

### Unlisted role: Production Associate, Usinage Modèle Ltée, Laval, QC
- Dates: Jan 2019 - May 2019 (before moving into inspection at the same company).
- Context: entry-level machine tending before moving into inspection.
- Flexible, with two faces:
  - **Production Associate**: Ran two CNC lathes and recorded hourly dimensional
    checks on the control chart.
  - **Process Improvement Assistant**: Proposed a quick-change fixture on the bracket
    line that cut setup time 20%, adopted on both shifts.
- Linked boundary: if this entry is dropped, the Inspection Assistant entry absorbs its
  dates (Jan 2019 - Feb 2022).

### Unlisted role: Metrology Lab Assistant (Co-op), Collège Exemple, Montréal, QC
- Dates: Sep 2018 - Dec 2018.
- Context: co-op term in the college's teaching metrology lab.
- Bullet: Prepared and verified gauge sets for 8 lab sections a week and logged
  instrument condition before each session.
- Fixed.

### Certifications, education, affiliations
- Certified Quality Technician (CQT), ASQ, 2023. Held.
- Lean Six Sigma Green Belt. In progress (do not claim as held).
- Member, Association Exemple de la qualité, 2022 - Present.

## Stage 4: Target tracks (2 tracks)
Use exactly the two tracks in `examples/persona/profile/tracks.json`:
1. Quality Control (slug `quality`): keep the suggested specialist name (expected
   Warden).
2. Continuous Improvement (slug `continuous-improvement`): keep the suggested
   specialist name (expected Kaizen).
Copy title keywords, seniority, scoring emphasis, header, and exclude keywords from
that file.

## Stage 5: Search logistics
- Target cities: Montréal, Laval, and the South Shore (Longueuil, Boucherville).
- Relocate: no.
- Work style: on-site and hybrid (not fully remote).
- Work authorization: Canadian citizen, no sponsorship needed.
- Criminal record: none.
- Professional licence: none held or required.
- Background and reference checks: ask me each time.
- Languages: French (native), English (professional working proficiency).
- Salary floor: 55,000 CAD per year.
- Coverage floor: 70% (Recommended).

## Stage 6: Writing style
- Em-dash ban: on.
- Other banned words: "passionate", "results-driven".
- Tone: plain and direct.
- Page length: 1 page.
- Contact header line: `Montréal, QC | 555-0100 | marie.cote@example.com | linkedin.com/in/example`
- Experience section heading: PROFESSIONAL EXPERIENCE.
- Overqualification pre-emption: off.

## Stage 7: Optional modules
- Job Scraper: off for now.
- Outreach Chrome: off.

## Tailoring checkpoints
- Approve every arrangement as proposed.
- Step 2.5 gap questions: no composites inspection (layup, tap test, ultrasonic NDT)
  experience; answer "none, skip it" rather than inventing any.
