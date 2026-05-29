<p align="center">
  <img src="extension/icon.png" width="100" alt="Dev Code Tracker Icon"/>
</p>

<h1 align="center">Dev Code Tracker</h1>

<p align="center">
  <strong>Know exactly how long you code. Zero setup. Zero cloud. Zero accounts.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/v/KuldipsinhParmar.dev-code-tracker.svg?label=VS%20Code%20Marketplace&color=blue&logo=visual-studio-code" alt="Marketplace"/></a>
  &nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/d/KuldipsinhParmar.dev-code-tracker.svg?label=Installs" alt="Installs"/></a>
  &nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/r/KuldipsinhParmar.dev-code-tracker.svg?label=Rating" alt="Rating"/></a>
  &nbsp;
  <a href="https://github.com/KuldipsinhParmar/dev-code-tracker/stargazers"><img src="https://img.shields.io/github/stars/KuldipsinhParmar/dev-code-tracker?style=flat&color=yellow" alt="Stars"/></a>
  &nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License"/></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker">Install from VS Code Marketplace</a>
  &nbsp;·&nbsp;
  <a href="https://devcodetracker.workshow.me/">Official Website</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KuldipsinhParmar/dev-code-tracker/issues">Report a Bug</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/KuldipsinhParmar/dev-code-tracker/issues">Request a Feature</a>
</p>

---

<p align="center">
  <img src="extension/assets/demo.gif" alt="Dev Code Tracker — live status bar and dashboard demo" width="700"/>
</p>

---

## What It Does

Dev Code Tracker automatically logs how long you spend on each project. Open a folder — the timer starts. Go idle — the session saves. Come back — a new session begins. No clicks, no config, no account.

Your data lives in a `.devCodeTracker/sessions.json` file inside your project. It never leaves your machine unless you explicitly set up optional self-hosted sync.

---

## Why Dev Code Tracker?

| Feature | Dev Code Tracker | Cloud-Based Trackers |
|---|---|---|
| Account required | **No** | Yes |
| Data stays on your machine | **Always** | No |
| Works fully offline | **Yes** | Partial |
| Cost | **Free** | Paid plans |
| Self-hosted sync | **Optional** | No |

---

## How It Works

```
Open project  →  timer starts         →  ⏱ Dev Code Tracker - 0s
Coding...     →  timer counts live    →  ⏱ Dev Code Tracker - 1h 23m 45s
Idle 5 min    →  session auto-saves   →  ⏱ Dev Code Tracker - 1h 23m
Come back     →  new session starts   →  ⏱ Dev Code Tracker - 0s
Close editor  →  session auto-saves
```

- Works with **VS Code**, **Cursor**, **Windsurf**, **Claude Code**, and **VSCodium**
- **Multi-Root Workspaces** — tracks the folder of the currently active file
- Click the status bar timer to open the dashboard

---

## Installation

Search **Dev Code Tracker** in the VS Code Extensions panel (`Ctrl+Shift+X`) and click **Install**.

Or install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker).

---

## Dashboard

Open the **local offline dashboard** inside VS Code — no browser or internet needed.

- Bar charts by day and by project
- Per-session breakdown with start/end times
- Today's total at a glance

**Shortcut:** `Cmd+Alt+L` (Mac) / `Ctrl+Alt+L` (Windows/Linux)

---

## Commands

Open the Command Palette (`Ctrl+Shift+P`) and type **Dev Code Tracker**:

| Command | Shortcut |
|---|---|
| Open Dashboard (Online / Local) | `Cmd+Alt+D` |
| Open Local Dashboard (Offline View) | `Cmd+Alt+L` |
| Show Today's Summary | — |
| Set Display Name for Project | — |
| Configure Online API | — |
| Sync to Server Now | — |
| Clear Project Data | — |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `devCodeTracker.idleTimeoutMinutes` | `5` | Pause timer after N minutes of inactivity |
| `devCodeTracker.syncIntervalMinutes` | `5` | Auto-sync interval (online mode) |
| `devCodeTracker.apiUrl` | — | Your PHP API endpoint |
| `devCodeTracker.apiKey` | — | Your API secret key |

---

## Online Sync (Optional)

Want history across machines or a team view? Self-host the included PHP + MySQL backend:

1. Upload the `server/` directory to your server
2. Run `server/setup.sql` to create the tables
3. Edit `api.php` — set DB credentials, API key, and `timezone_offset` (e.g. `330` for IST, `-300` for EST)
4. In VS Code: `Ctrl+Shift+P` → **Dev Code Tracker: Configure Online API**
5. Enter your `api.php` URL and secret key

Sessions sync automatically every 5 minutes.

---

## Enjoying Dev Code Tracker?

A rating takes 30 seconds and helps other developers find this extension.

[Leave a review on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker&ssr=false#review-details)

## Contributing

Found a bug or have a feature idea? [Open an issue](https://github.com/KuldipsinhParmar/dev-code-tracker/issues) — all feedback is welcome.

If Dev Code Tracker saves you time, consider giving the repo a **star** — it helps others find it.

---

## License

MIT — see [LICENSE](extension/LICENSE)

**Built by [Kuldipsinh Parmar](https://github.com/KuldipsinhParmar)**
