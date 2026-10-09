# Security Policy

## Supported versions

Only the latest commit on `main` is supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting: on the repository page, open the Security tab and choose "Report a vulnerability". (Maintainers: private vulnerability reporting is off by default on a new repository; enable it under Settings, then Security, before announcing the project, or this route does not exist.) Do not open a public issue for security problems. Include what you found, how to reproduce it, and what you think the impact is.

## Threat model

career-crew is a single-user, local tool. The untrusted inputs are job descriptions, scraped postings, company and contact web pages, and resume files. The sensitive assets are your profile, screening answers, experience library, and any API tokens.

| Threat | Control |
|---|---|
| Prompt injection via JD / web content | Every agent prompt carries an "untrusted content" rule: text from JDs, web pages, and scraped postings is data, never instructions; suspicious embedded instructions are reported to the user, not followed. Red-team e2e with an injected JD. |
| Exfiltration of profile data | Same rule plus: agents never put screening answers or contact data into URLs, web requests, or files outside `applications/`; Herald never sends. |
| Over-broad agent tools | Least-privilege tool lists per agent, asserted by tests; only resume specialists get Bash. Shipped `.claude/settings.json` denies `git push`, `curl`, `wget`, `rm -rf`, and the PowerShell web cmdlets (`Invoke-WebRequest`, `Invoke-RestMethod`, `iwr`, `irm`), and allowlists only the project's named scripts (`node scripts/<name>.js`, `npm run doctor|render|pdf|test`, `npm test`, `npm ci`) for both Bash and PowerShell; any other command still asks first. |
| Command injection via file paths | `to_pdf.js` never interpolates paths into a shell string: PowerShell receives paths via environment variables; `spawnSync` with `shell: false`. Tested with hostile filenames. |
| Path traversal via company/role names | `safeSegment()` reduces any company/role to `[A-Za-z0-9]` PascalCase; `scripts/app_path.js` is the only way agents derive an application folder. |
| Template / frontmatter injection via track fields | Track text fields must be single-line and length-limited; validation rejects newlines and `---`. |
| Malicious or huge resume files | `extract_text.js` rejects files over 10 MB and `document.xml` over 20 MB uncompressed. |
| Secrets committed by accident | `.env` gitignored; tokens live only in Claude Code MCP config; `privacy_scan.js --secrets` (Apify, Anthropic, GitHub, AWS, private-key patterns) runs in CI. |
| User data committed by accident | gitignore plus a doctor check that warns if any user-data path is tracked by git. |
| Dependency supply chain | Lockfile committed, `npm ci` in CI, `npm audit` gate, Dependabot. |

## Data handling

Your profile, library, inputs, and applications stay in gitignored folders on your own computer. career-crew itself sends nothing anywhere. When the crew reads your resume or a job posting, that text is processed by Claude through your own Claude Code account, under Anthropic's terms for that account. Optional modules (job scraper, LinkedIn checks) contact Apify, JobDataLake, or LinkedIn only if you turn them on, using tokens you enter in your own terminal. If you paste a token into the chat by mistake, regenerate it.
