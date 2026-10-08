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
2. Open **Settings > API & Integrations** in the Apify Console and copy your personal
   API token. Treat it like a password.

## 2. Add the Apify MCP server to Claude Code

From a terminal (not inside a Claude Code session), run, replacing `<your-token>`:

```bash
claude mcp add --scope user --transport http apify "https://mcp.apify.com/?tools=actors,runs,storage" --header "Authorization: Bearer <your-token>"
```

The `tools=actors,runs,storage` part makes sure the server exposes the three tools the
agent uses: `call-actor`, `get-actor-run`, and `get-dataset-items`. If you prefer not
to pass the token on the command line, Apify's hosted server also supports signing in
through your browser: add it without the `--header` part, then run `/mcp` inside
Claude Code and authenticate the `apify` server there.

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

## Optional: run it daily

The agent has no checkpoints, so it can run unattended. To schedule it, use Claude
Code's `/schedule` command and describe the job, for example:

> Every day at 7:00, run the job-scraper agent in this project and summarize what it
> filed.

Make sure the scheduled run can reach this project folder and both MCP servers. A
scheduled run only files postings into `inputs/`; it never tailors resumes or sends
anything. Next time you open Claude Code, ask the orchestrator to check `inputs/` for
pending applications.
