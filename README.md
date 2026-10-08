# career-crew

career-crew turns Claude Code into a small team for your job search. You give it your real work history once. After that, for each job you want, it picks the experience that fits the posting, builds a tailored resume (Word and PDF), researches who to contact, drafts the messages, and preps you for interviews. It is built for Canadian job seekers, in any field, and it starts blank: no one else's resume, name, or data ships with it.

You stay in charge. The crew drafts; you decide. Nothing is ever sent, submitted, or applied for without you saying so.

## Meet the crew

Each member has a default name. During setup you can keep it or pick your own.

| Role | Default name | What it does | What it never does |
|---|---|---|---|
| Orchestrator | Scout | The one you talk to. Runs setup, passes questions along, keeps your tracker and experience library. | Submit or send anything without your go-ahead, or invent facts about your work history. |
| Resume tailor | Weaver | Reads a job posting, decides which of your target tracks it fits, and hands it to that track's specialist. Reviews the result before you see it. | Edit your experience library or tracker. |
| Outreach | Herald | Finds real conversation hooks at a company, likely contacts, and drafts LinkedIn notes and emails. | Send a message. |
| Interview prep | Sage | Writes a prep document for one named round (recruiter screen, hiring manager, panel, technical, final) using your own stories. | Run a live mock interview. |
| Job scraper (optional) | Fred | Finds fresh Canadian postings for your tracks and files them for tailoring. | Judge fit, tailor resumes, or draft outreach. |

On top of that, each job-search track you set up gets its own resume specialist. The suggested names start from Drafter, Marshal, Warden, Kaizen, and Volt, and you can rename them too.

## Quick start

You need Claude Code, Node.js 22 or newer, and git. [PREREQUISITES.md](PREREQUISITES.md) has install commands for Windows, macOS, and Linux.

```bash
git clone https://github.com/<your-account>/career-crew.git
cd career-crew
npm install
npm run doctor
```

`npm run doctor` checks your setup and tells you, in plain words, how to fix anything missing. Then open the folder in Claude Code and say hi. The first time, Scout notices there is no profile yet and starts onboarding.

## What onboarding covers

Onboarding takes about 20 to 40 minutes. You can stop at any point and pick it up in a later session; your answers are saved as you go.

0. **Welcome and setup check.** What the crew does, and a run of the doctor.
1. **Meet the crew.** Keep the default names or choose your own, and tell the crew what to call you.
2. **Resume intake.** Give it your resume as a Word file, a PDF, or pasted text. It builds your experience library from it.
3. **Role deep-dive.** A few questions per role so the library holds real numbers and outcomes, not just job titles.
4. **Target tracks.** Up to six kinds of role you are going after, each with its own specialist.
5. **Search logistics.** Location, work authorization, languages, salary, and standard screening answers, saved so you are not asked twice.
6. **Writing style.** Your preferences, such as banning em-dashes or how to handle being overqualified.
7. **Optional modules.** Job scraping and outreach browser checks, both off unless you turn them on.
8. **Build and handoff.** Generates your specialists and your tracker, then asks you to restart Claude Code.

After that, paste a job posting and say you want to apply. Weaver and its specialist do the rest, and Scout asks you to confirm anything that needs your call.

## Your data stays on your computer

Everything personal lives in four folders: `profile/`, `library/`, `inputs/`, and `applications/`. All four are gitignored, so they are never committed by accident. career-crew has no server and sends nothing anywhere on its own.

One thing to know: when the crew reads your resume or a job posting, that text is processed by Claude through your own Claude Code account, under Anthropic's terms for that account. See [SECURITY.md](SECURITY.md) for the full data-handling note and the safeguards against prompt injection from job postings.

## Optional modules

- **Job scraper.** Pulls fresh Canadian postings via Apify and JobDataLake. Needs your own accounts and tokens. Setup: [docs/job-scraper-setup.md](docs/job-scraper-setup.md).
- **Outreach browser checks.** Lets Herald look at a LinkedIn profile in your own Chrome to confirm a contact's current title. It only views; it never clicks, types, or messages. Needs the Claude in Chrome extension.
- **Recommended plugin skills.** `marketings:content-humanizer`, `marketings:cold-email`, and `documents-skills:docx-toolkit` improve wording and checks. They are optional; without them the crew follows the built-in lists in [docs/checklists.md](docs/checklists.md).

## FAQ

**Why does onboarding ask me to restart Claude Code?**
Your track specialists are generated at the end of onboarding, and Claude Code only loads new agents when it starts. Close it, reopen the folder, and they are there.

**Do I need Word to get a PDF?**
No. PDF export uses Microsoft Word on Windows or LibreOffice on any system. Without either, you still get the `.docx`. Run `npm run pdf -- path/to/resume.docx` to convert one file.

**What Node version do I need?**
Node.js 22 or newer. Older versions are end-of-life and the libraries used here no longer support them. `npm run doctor` checks this.

**Can I change a name or add a track later?**
Yes. See [docs/customizing.md](docs/customizing.md), then run `npm run render` and restart.

**Will it apply to jobs for me?**
No. It prepares the materials. Submitting is yours; if you ask, Scout can walk you through a form step by step but never presses Submit without your go-ahead.

## More

- [docs/architecture.md](docs/architecture.md): how the pieces fit together.
- [docs/customizing.md](docs/customizing.md): names, tracks, and preferences.
- [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
- `examples/persona/`: a fictional example profile and library, to see what a finished setup looks like.

MIT licensed. See [LICENSE](LICENSE).
