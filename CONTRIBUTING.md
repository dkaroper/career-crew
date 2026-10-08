# Contributing

Thanks for helping. A few rules keep the project safe to share.

## Before you open a pull request

1. Run `npm test`. Everything must pass.
2. Run `node scripts/privacy_scan.js --secrets`. It must exit 0.
3. Maintainers also run the privacy scan with their own denylist and `--history` before any push.

## Rules

- **No personal data.** No real names, emails, phone numbers, employers, or resumes in any file. The example persona is fictional; keep it that way.
- **No em-dashes.** Do not use the em-dash character in prompts, docs, or comments. Use a comma, colon, semicolon, or a second sentence. A test enforces this.
- **New agents** must include the Untrusted Content block (copy it exactly from an existing agent) and carry a least-privilege, allowlisted tool set. Only the generated track specialists get `Bash`. Add the agent to the allowlist in `test/security-policy.test.js` in the same change.
- **No shell strings.** Scripts call child processes with `spawnSync(cmd, [args], { shell: false })`. Never build a command from user or job-description text, and never use `exec` or `execSync`.
- **Application folders** come only from `scripts/app_path.js`.
- **Dependencies.** Runtime dependencies are `docx` and `jszip`. Discuss before adding any.
- Tests use `node:test` and `node:assert`. Test fixtures must not be `.js` files.

Report security problems privately; see [SECURITY.md](SECURITY.md).
