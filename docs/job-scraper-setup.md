# Job Scraper setup

The Job Scraper is an optional module. When it is on, the job-scraper agent pulls
fresh Canadian postings for your tracks from six sources (HiringCafe, Indeed,
Glassdoor, SimplyHired, and Job Bank through Apify, plus JobDataLake directly) and
files them into `inputs/<YYYY-MM-DD>/` for tailoring. LinkedIn is deliberately not a
source.

It stays off until you turn it on. Onboarding stage 7 walks you through everything
below; this page is the same steps for reference, or for turning it on later.

## What you need

- An Apify account and API token (for five of the six sources).
- The JobDataLake connector (for the sixth source).
- Both registered in Claude Code under **exactly** the server names `apify` and
  `jobdatalake`. The agent's tool list refers to `mcp__apify__...` and
  `mcp__jobdatalake__...`; under any other name, Claude Code won't give the agent
  those tools and every source will fail.

## Keep your token out of this repo

Your Apify token goes only into Claude Code's own MCP configuration. Never put it in
any file inside this repository: not `profile/`, not a `.env` you commit, not a doc,
not `.mcp.json`. That is why the commands below use `--scope user`, which stores the
server in your personal Claude Code settings outside the repo. Don't use
`--scope project`; that writes a `.mcp.json` file into the repo folder, where it could
be committed. The project's CI secret scan fails on anything that looks like an Apify
token (they start with `apify_api_`), but it is far better never to paste one here.

## 1. Create an Apify account and token

1. Sign up at https://apify.com (the free plan is enough to start).
2. Only if you will use Option B below: open **Settings > API & Integrations** in the
   Apify Console and copy your personal API token. Treat it like a password.

## 2. Add the Apify MCP server to Claude Code

Apify's hosted MCP server address and its `tools` parameter can change. Before you
run either command below, check them against Apify's current MCP documentation
(https://docs.apify.com/platform/integrations/mcp) and use what it shows if it differs.

**Option A (recommended): sign in through your browser.** Your token never appears on
a command line, so it can't end up in your shell history. From a terminal (not inside a
Claude Code session), run:

```bash
claude mcp add --scope user --transport http apify "https://mcp.apify.com/?tools=actors,runs,storage"
```

Then start Claude Code, run `/mcp`, choose the `apify` server, and authenticate in the
browser window that opens.

**Option B: pass the token in a header.** Only if the browser sign-in doesn't work for
you. Replace `<your-token>`, and be aware your shell may save the line in its history
(clear that entry afterwards, or regenerate the token if you're unsure):

```bash
claude mcp add --scope user --transport http apify "https://mcp.apify.com/?tools=actors,runs,storage" --header "Authorization: Bearer <your-token>"
```

The `tools=actors,runs,storage` part makes sure the server exposes the three tools the
agent uses: `call-actor`, `get-actor-run`, and `get-dataset-items`.

Check it worked: run `claude mcp list` and confirm `apify` shows as connected, then
inside Claude Code run `/mcp` and confirm the three tools above are listed under
`apify`.

## 3. Add the JobDataLake connector

JobDataLake is an MCP server for job listings. Follow the setup instructions at
https://jobdatalake.com for Claude Code, and register it under the name `jobdatalake`
with `--scope user`, for example:

```bash
claude mcp add --scope user --transport http jobdatalake "<server URL from jobdatalake.com>"
```

If you get your own JobDataLake API key, it goes into that same Claude Code server
configuration (as JobDataLake's docs describe), never into a repo file.

Check it worked: `/mcp` inside Claude Code lists `search_jobs`, `get_job`, and
`get_filter_options` under `jobdatalake`.

## 4. Turn the module on

In `profile/preferences.md`, the **Modules** section must contain this line:

```
Job Scraper: on
```

Onboarding stage 7 writes it for you. Change it to `Job Scraper: off` (or remove it)
to disable the agent; it then stops immediately and reports that it is disabled.

Restart Claude Code after adding MCP servers so the agents pick up the new tools.

## 5. Run a one-result test

Before a full run, confirm both servers respond, cheaply. In Claude Code, ask:

> Use the jobdatalake search_jobs tool to find 1 posting for "quality technician" in
> Canada, and show me only its title and company.

Then:

> Use the apify call-actor tool to run valig/indeed-jobs-scraper with input
> {"country": "CA", "title": "quality technician", "location": "Canada", "limit": 1, "datePosted": "7"}
> and show me the title and company of the result.

Each should return one posting. If either fails, check the server name (`apify` or
`jobdatalake` exactly), that it shows as connected in `claude mcp list`, and that your
Apify token is valid. Once both work, ask for a real run ("find me new jobs").

## Cost

- **Apify:** the free plan includes a small monthly usage credit, which covers light
  testing. A daily run across several tracks and five Apify sources will likely
  outgrow it, after which you pay for usage on a paid plan. Some actors charge per
  result. Check your usage in the Apify Console after the first few runs and set a
  monthly spending limit there. The agent deliberately doesn't cap result volume
  itself; if cost becomes a problem, reduce your number of tracks or ask for the
  query settings in `.claude/agents/job-scraper/SKILL.md` to be tightened.
- **JobDataLake:** has a free tier with a daily call limit; heavier use needs your own
  API key from jobdatalake.com.

Prices and free-tier limits change; check each provider's current pricing page.

## Optional: run it daily (experimental)

You can have your computer start the crew once a day without you. This is
**experimental**: try one run by hand first (ask the orchestrator to "do a dry run of
the autonomous steps") and read what it decided before you schedule it.

**What a scheduled run does:** it scrapes new postings, tailors a resume for every
pending JD, and drafts outreach for each finished application. It never sends
anything, never submits an application, and never sets Status or Date Applied. Every
decision it makes on your behalf goes into `applications/Autonomous_Run_Log.md`, and
the orchestrator summarizes new entries the next time you open Claude Code. Anything
that needs a fact only you know (a gap in your history, a possible prompt injection, a
posting below your coverage floor) is held for you, not guessed.

**How it is started:** your own operating system's scheduler runs Claude Code in this
project folder with a prompt that begins with the exact words `AUTONOMOUS RUN`. That
prefix is the only thing that turns autonomous mode on; a normal session never
switches into it. Don't use Claude Code's `/schedule` (cloud routines): they run on a
copy of the repository without your gitignored `profile/`, `library/`, and `inputs/`
folders, and without your user-scope MCP servers, so they can't do this job.

The command runs Claude Code non-interactively (`claude -p`) with an explicit list of
tools it may use without asking. The project's `.claude/settings.json` already allows
the crew's own scripts (`node scripts/...`, `npm run pdf`, and so on). Nothing else is
allowed, so anything outside the list is refused rather than waiting for an answer.
Chrome tools are deliberately left out: unattended runs never open LinkedIn.

Before scheduling, open Claude Code in this folder interactively at least once (you did
during onboarding) so the folder is trusted, and run `claude` once from the same
account the scheduler will use.

### Windows (Task Scheduler)

1. Create a file named `run-career-crew.cmd` anywhere outside the repository (for
   example in your Documents folder), changing the folder path on the second line:

   ```bat
   @echo off
   cd /d "C:\Users\you\career-crew"
   claude -p "AUTONOMOUS RUN: follow the Autonomous mode section of CLAUDE.md." --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Agent" "SendMessage" "WebSearch" "WebFetch" "mcp__apify__call-actor" "mcp__apify__get-actor-run" "mcp__apify__get-dataset-items" "mcp__jobdatalake__search_jobs" "mcp__jobdatalake__get_job" "mcp__jobdatalake__get_filter_options" >> "applications\autonomous-output.txt" 2>&1
   ```

2. In a terminal, register it to run every day at 7:00 (change the path to where you
   saved the file):

   ```bat
   schtasks /Create /TN "career-crew daily" /SC DAILY /ST 07:00 /TR "\"C:\Users\you\Documents\run-career-crew.cmd\""
   ```

   Task Scheduler runs it only while you're signed in, which is what you want (PDF
   conversion with Word needs your desktop session). To remove it later:
   `schtasks /Delete /TN "career-crew daily"`.

### macOS and Linux (cron)

Run `which claude` to get the full path to Claude Code (cron doesn't load your usual
`PATH`), then `crontab -e` and add one line, changing both paths:

```bash
0 7 * * * cd "/home/you/career-crew" && /full/path/to/claude -p "AUTONOMOUS RUN: follow the Autonomous mode section of CLAUDE.md." --allowedTools "Read" "Write" "Edit" "Glob" "Grep" "Agent" "SendMessage" "WebSearch" "WebFetch" "mcp__apify__call-actor" "mcp__apify__get-actor-run" "mcp__apify__get-dataset-items" "mcp__jobdatalake__search_jobs" "mcp__jobdatalake__get_job" "mcp__jobdatalake__get_filter_options" >> applications/autonomous-output.txt 2>&1
```

On macOS, cron works if you allow it in System Settings (Privacy & Security, Full Disk
Access, add `/usr/sbin/cron`); `launchd` is the native alternative if you prefer it.

The raw output of each run is appended to `applications/autonomous-output.txt`
(gitignored with the rest of `applications/`); the run log is the readable summary.
