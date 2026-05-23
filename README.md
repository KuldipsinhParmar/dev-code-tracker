<p align="center">
  <img src="extension/icon.png" width="120" alt="Dev Code Tracker Icon"/>
</p>

<h1 align="center">Dev Code Tracker — Coding Time Tracker</h1>

<p align="center">
  Automatically tracks how much time you spend on each project in VS Code / Cursor AI.
  <br/>
  No manual start/stop. Just open your project and work.
</p>

---

## How It Works

```
Open project  →  timer starts  →  ⏱ Dev Code Tracker - 0s
Working...    →  ⏱ Dev Code Tracker - 1h 23m 45s  (counts every second)
Idle 5 min    →  session saved  →  ⏱ Dev Code Tracker - 1h 23m  (static total)
Come back     →  new session starts  →  ⏱ Dev Code Tracker - 0s
Close VS Code →  session saved automatically
```

- **Session starts** when you open a project folder
- **Session ends** after 5 minutes of idle (no window focus)
- **Timer resumes** when you come back to the window
- **Multi-Root Workspaces** supported automatically (tracks the folder of the currently active file)
- Works perfectly with **Cursor AI** and **Claude** — no file editing needed
- **Stunning Offline Dashboard**: The offline local dashboard uses a beautiful, fully interactive SPA interface directly inside VS Code!

---

## Status Bar

| State | Display |
|---|---|
| Active (working) | `⏱ Dev Code Tracker - 1h 23m 45s` — counts every second |
| Idle (no session) | `⏱ Dev Code Tracker - 2h 15m` — static today total |
| API connected | `$(cloud-upload) API connected` |
| Local only | `$(database) Local only` |

Click the timer to open your report.

---

## Commands

Open the Command Palette (`Ctrl+Shift+P`) and type **Dev Code Tracker**:

| Command | Description | Shortcut |
|---|---|---|
| `Dev Code Tracker: Open Dashboard (Online / Local)` | Choose between online web dashboard or local offline view | `Cmd+Alt+D` |
| `Dev Code Tracker: Open Local Dashboard (Offline View)` | Directly open the local offline webview | `Cmd+Alt+L` |
| `Dev Code Tracker: Show Today's Summary` | Quick today summary | — |
| `Dev Code Tracker: Set Display Name for Project` | Rename a project for display | — |
| `Dev Code Tracker: Configure Online API` | Set up sync to your PHP server | — |
| `Dev Code Tracker: Sync to Server Now` | Manually push sessions | — |
| `Dev Code Tracker: Clear Project Data` | Delete all local data for current project | — |

---

## Installation

### Option 1 — Install VSIX (recommended)
1. Open VS Code
2. `Ctrl+Shift+P` → **Extensions: Install from VSIX...**
3. Select `extension/dev-code-tracker-1.0.0.vsix`
4. Reload VS Code

### Option 2 — Build from source
```bash
cd extension
npm install
npm run compile
```
Then press `F5` in VS Code to launch in development mode.

---

## Local Data

Each project saves sessions to:
```
your-project/
  .devCodeTracker/
    sessions.json
```

Add `.devCodeTracker/` to your `.gitignore` to keep it private.

Each session stores: `project`, `display_name`, `start_time`, `end_time`, `duration_seconds`, `date`

---

## Online Sync (Optional)

If you have a PHP + MySQL server:

1. Upload the contents of the `server/` directory (api.php, dashboard.html, landing.html) to your server
2. Run `server/setup.sql` to create the database tables
3. Edit `api.php` — set your DB credentials, API key, and your local `timezone_offset` (e.g. `330` for IST, `-300` for EST).
4. In VS Code: `Ctrl+Shift+P` → **Dev Code Tracker: Configure Online API**
5. Enter your `api.php` URL and secret key

Sessions sync automatically every 5 minutes.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `devCodeTracker.idleTimeoutMinutes` | `5` | End session after N minutes of no activity |
| `devCodeTracker.syncIntervalMinutes` | `5` | Auto-sync interval in minutes (online mode) |
| `devCodeTracker.apiUrl` | — | Your PHP API endpoint URL |
| `devCodeTracker.apiKey` | — | Your API secret key |

---

**Built by Kuldipsinh Parmar**
