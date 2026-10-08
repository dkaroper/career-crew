# Persona B: scripted onboarding answers

Test fixture for the end-to-end validation in `docs/validation.md`. Priya Raman is
fictional, as are every employer, school, and clinic named here. A scripted session
reads this file instead of asking the user. Where a question is not listed here,
accept the recommended option. Answers marked **SKIP** mean the user chooses "Skip for
now"; each one must end up in `skipped` in `profile/onboarding-state.json`.

Persona B exists to prove "any field" (healthcare and office administration, not
manufacturing), the minimum-track path (exactly 1 track), a pasted resume (no file),
and skipped answers.

## Stage 0: Welcome + doctor
- Continue with onboarding now: yes.

## Stage 1: Meet the crew
- Keep Scout, Weaver, Sage, and Fred.
- Rename the outreach agent from Herald to **Iris**.
- Full name: Priya Raman
- Display name: Priya
- File prefix: accept whatever the helper derives (expected `Raman`).

## Stage 2: Resume intake
- How the resume is shared: **paste the text**. The pasted text is exactly the contents
  of `examples/persona-b/resume.txt`.
- All three roles look right as parsed.

## Stage 3: Role deep-dive

### Medical Office Administrator, Northwind Community Clinic (Apr 2021 - Present)
- Numbers: books about 60 appointments a day across five providers; cut rejected
  billing claims from roughly 8% to 3% of submissions by checking codes before
  sending.
- Tools: an EMR system (Accuro-style; call it "EMR" in bullets), MS Office, the
  provincial billing portal.
- Unlisted win: set up a reminder-call routine that brought no-shows down from about
  12% to 7% over six months.
- Alternate faces: none. Fixed.

### Administrative Assistant, Bluenose Accounting Group (Sep 2018 - Mar 2021)
- Numbers: **SKIP** (she doesn't remember volumes).
- Tools: MS Office, a document management system.
- Unlisted wins: **SKIP**.
- Fixed.

### Front Desk Clerk (part-time), Harbour Lights Inn (Jun 2016 - Aug 2018)
- Flexible (show only when it fits; it is customer-service experience).
- No alternate faces.

### Certifications, education, affiliations
- Certifications: Standard First Aid and CPR Level C, renewed 2024. Held.
- Education: Office Administration (Medical) Diploma, Atlantic Example College,
  Halifax, NS, 2018.
- Affiliations: **SKIP**.

## Stage 4: Target tracks (exactly 1 track)
- Label: Healthcare Admin
- Slug: `healthcare-admin`
- Title keywords: medical office administrator, medical receptionist, unit clerk,
  health records clerk, clinic administrator, office administrator
- Seniority: junior, intermediate
- Exclude keywords: manager, director, nurse
- Scoring emphasis:
  - direct: Patient scheduling, EMR updates, intake, physician billing, and front-desk
    work in a clinic or hospital.
  - transferable: Office administration, records management, and calendar
    coordination in any professional office.
  - adjacent: Customer-facing service work such as hotel front desk.
  - impact: Appointments handled, billing rejection rate, no-show rate, and turnaround
    time.
- Header: label `MEDICAL OFFICE ADMINISTRATOR`; guidance: Lead with the current clinic
  role and name EMR and billing in one line.
- Specialist name: keep the suggestion (expected Atlas).

## Stage 5: Search logistics
- Target cities: Halifax and Dartmouth, NS.
- Relocate: no.
- Work style: on-site and hybrid.
- Work authorization: permanent resident of Canada, no sponsorship needed.
- Criminal record: none.
- Professional licence: none.
- Background and reference checks: yes, I consent.
- Languages: English (fluent), Tamil (conversational). No French.
- Salary floor: **SKIP**.
- Coverage floor: 70% (Recommended).

## Stage 6: Writing style
- Em-dash ban: on.
- Other banned words: none.
- Tone: warm and conversational.
- Page length: 1 page.
- Contact header line: `Halifax, NS | 902-555-0147 | priya.raman@example.com`
- Experience section heading: EXPERIENCE.
- Overqualification pre-emption: off.

## Stage 7: Optional modules
- Job Scraper: off for now.
- Outreach Chrome: off.

## Tailoring checkpoints
- Approve every arrangement as proposed.
- Step 2.5 gap questions: answer only from this file; if the fact is not here, answer
  "skip it" rather than inventing anything.
