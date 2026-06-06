<p align="center">
  <img src="https://raw.githubusercontent.com/KuldipsinhParmar/dev-code-tracker/main/extension/icon.png" width="100" alt="Dev Code Tracker Icon"/>
</p>

<h1 align="center">Dev Code Tracker</h1>

<p align="center">
  <strong>Know exactly how long you code. Zero setup. Zero cloud. Zero accounts.</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/v/KuldipsinhParmar.dev-code-tracker.svg?label=Marketplace&color=blue&logo=visual-studio-code" alt="Marketplace"/></a>
  &nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/d/KuldipsinhParmar.dev-code-tracker.svg" alt="Downloads"/></a>
  &nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker"><img src="https://img.shields.io/visual-studio-marketplace/r/KuldipsinhParmar.dev-code-tracker.svg" alt="Rating"/></a>
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/KuldipsinhParmar/dev-code-tracker/main/extension/assets/demo.gif" alt="Dev Code Tracker — live status bar and dashboard" width="700"/>
</p>

---

## Why Dev Code Tracker?

Most time trackers require an account, send your data to the cloud, or charge a monthly fee. Dev Code Tracker keeps everything local — your data never leaves your machine unless you choose to sync it.

| Feature | Dev Code Tracker | Cloud-Based Trackers |
|---|---|---|
| Account required | **No** | Yes |
| Data stays on your machine | **Always** | No |
| Works fully offline | **Yes** | Partial |
| Cost | **Free** | Paid plans |
| Self-hosted sync option | **Yes** | No |

---

## How It Works

```
Open project  →  timer starts  →  ⏱ Dev Code Tracker - 0s
Working...    →  ⏱ Dev Code Tracker - 1h 23m 45s  (counts every second)
Idle 5 min    →  session saved  →  ⏱ Dev Code Tracker - 1h 23m  (static total)
Come back     →  new session starts  →  ⏱ Dev Code Tracker - 0s
Close VS Code →  session saved automatically
```

- **Session starts** when you open a project folder — no clicks needed
- **Session ends** after 5 minutes of idle (configurable)
- **Multi-Root Workspaces** supported — tracks the folder of the currently active file
- Works with **VS Code**, **Cursor**, **Windsurf**, **Claude Code**, and **VSCodium**
- Click the status bar timer to open your dashboard instantly

---

## Status Bar

| State | Display |
|---|---|
| Active (coding) | `⏱ Dev Code Tracker - 1h 23m 45s` — live counter |
| Idle / between sessions | `⏱ Dev Code Tracker - 2h 15m` — static today total |
| Online sync active | `☁ API connected` |
| Local only | `⊟ Local only` |

---

## Dashboard

Open the **offline local dashboard** directly inside VS Code — no browser needed.

- Bar charts by day and project
- Per-session breakdown with start/end times
- Today's total at a glance
- Fully interactive, works with no internet

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **Dev Code Tracker**:

| Command | Shortcut |
|---|---|
| Open Dashboard (Online / Local) | `Cmd+Alt+D` / `Ctrl+Alt+D` |
| Open Local Dashboard (Offline View) | `Cmd+Alt+L` / `Ctrl+Alt+L` |
| Show Today's Summary | — |
| Set Display Name for Project | — |
| Configure Online API | — |
| Sync to Server Now | — |
| Clear Project Data | — |

---

## Local Data

Sessions are saved locally — no account, no cloud:

```
your-project/
  .devCodeTracker/
    sessions.json
```

Add `.devCodeTracker/` to your `.gitignore` to keep session data private.

Each session stores: `project`, `start_time`, `end_time`, `duration_seconds`, `date`

---

## Setup Guide

### Local Mode (default — no setup needed)

Dev Code Tracker works out of the box with zero configuration:

1. Install the extension from the Marketplace
2. Open any project folder in VS Code
3. The status bar timer starts automatically — that's it

Your sessions are saved to `.devCodeTracker/sessions.json` inside each project. Add that folder to `.gitignore` to keep your data private.

---

### Online Sync (Optional — self-hosted)

Want your history across multiple machines or a web dashboard? Host the backend yourself on any shared PHP + MySQL server (e.g. Hostinger, cPanel, DigitalOcean).

**Requirements:** PHP 7.4+, MySQL 5.7+, a web server (Apache/Nginx)

**Step 1 — Upload server files**

Copy these two files from the `server/` folder in the [GitHub repo](https://github.com/KuldipsinhParmar/dev-code-tracker) to your web server's public directory:
- `api.php`
- `dashboard.html`

**Step 2 — Edit api.php**

Open `api.php` and fill in the `$config` block at the top:

```php
$config = [
    'db_host'         => 'localhost',
    'db_name'         => 'your_database_name',
    'db_user'         => 'your_database_user',
    'db_password'     => 'your_database_password',
    'api_key'         => 'your_secret_api_key',   // pick any strong random string
    'require_auth'    => true,
    'timezone_offset' => 330,  // minutes from UTC: 330=IST, 0=UTC, -300=EST, 60=CET
];
```

> Tables are created automatically on the first request — no need to run a SQL file manually.

**Step 3 — Connect VS Code**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Dev Code Tracker: Configure Online API**
3. Enter your `api.php` URL (e.g. `https://yourdomain.com/tracker/api.php`)
4. Enter the same `api_key` you set in Step 2

**Step 4 — Done**

The status bar shows `☁ API connected`. Sessions sync automatically every 5 minutes. Open your web dashboard at `https://yourdomain.com/tracker/dashboard.html?key=your_secret_api_key`.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `devCodeTracker.idleTimeoutMinutes` | `5` | Pause timer after N minutes of inactivity |
| `devCodeTracker.syncIntervalMinutes` | `5` | Auto-sync interval (online mode) |
| `devCodeTracker.apiUrl` | — | Your PHP API endpoint |
| `devCodeTracker.apiKey` | — | Your API secret key |

---

## Enjoying Dev Code Tracker?

A rating on the Marketplace takes 30 seconds and helps other developers find this extension.

[Leave a review on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker&ssr=false#review-details)

Found a bug or have an idea? [Open an issue on GitHub](https://github.com/KuldipsinhParmar/dev-code-tracker/issues) — all feedback is welcome.

---

**Official Website:** [devcodetracker.workshow.me](https://devcodetracker.workshow.me/)
&nbsp;|&nbsp;
**Built by Kuldipsinh Parmar**
