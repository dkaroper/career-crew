# Prerequisites

## Required

- **Claude Code.** Install from https://claude.com/claude-code and sign in with your own account.
- **Node.js 22 or newer.** Check with `node --version`.
- **git.** Check with `git --version`.

Then, inside the project folder, run `npm install` and `npm run doctor`.

### Install Node.js 22+

| System | Command |
|---|---|
| Windows | `winget install OpenJS.NodeJS` (or download the LTS installer from https://nodejs.org) |
| macOS | `brew install node` (or the installer from https://nodejs.org) |
| Linux (Debian/Ubuntu) | Use NodeSource or nvm: `nvm install 22` |
| Any system with nvm | `nvm install 22 && nvm use 22` |

### Install git

| System | Command |
|---|---|
| Windows | `winget install Git.Git` |
| macOS | `brew install git` (or `xcode-select --install`) |
| Linux (Debian/Ubuntu) | `sudo apt install git` |

## For PDF resumes

You need one of these. Without either, you still get `.docx` files.

| System | Option |
|---|---|
| Windows | Microsoft Word (already installed for many people), or `winget install TheDocumentFoundation.LibreOffice` |
| macOS | `brew install --cask libreoffice` |
| Linux (Debian/Ubuntu) | `sudo apt install libreoffice` |

## Optional

- **Job scraper:** an Apify account and token, plus the JobDataLake connector. See [docs/job-scraper-setup.md](docs/job-scraper-setup.md). Type tokens only in your own terminal, never into the chat.
- **Claude in Chrome extension:** lets the outreach agent view LinkedIn pages in your browser and supports file-upload steps during application walkthroughs.
- **Recommended plugin skills:** `marketings:content-humanizer`, `marketings:cold-email`, `documents-skills:docx-toolkit`, and the `superpowers` set. All optional; the built-in checklists in [docs/checklists.md](docs/checklists.md) cover the same ground.
