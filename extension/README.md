# Dev Code Tracker — Smart Coding Time Tracker

Automatically tracks how much time you spend on each project in VS Code, Cursor, Windsurf, Claude Code, and VSCodium.
**No manual start/stop.** Just open your project and work.

**Official Website:** [devcodetracker.workshow.me](https://devcodetracker.workshow.me/)

---

## How It Works

```
Open project  →  timer starts  →  ⏱ Dev Code Tracker - 0s
Working...    →  ⏱ Dev Code Tracker - 1h 23m 45s
Idle 5 min    →  session saved  →  ⏱ Dev Code Tracker - 1h 23m
Come back     →  new session starts
Close VS Code →  session saved automatically
```

- **Session starts** when you open a project folder
- **Session ends** after 5 minutes of idle (configurable)
- **Multi-Root Workspaces** supported automatically (tracks the folder of the currently active file)
- Works perfectly with **VS Code**, **Cursor**, **Windsurf**, **Claude Code**, and **VSCodium** — no file editing needed
- **Stunning Offline Dashboard**: The offline local dashboard uses a beautiful, fully interactive SPA interface directly inside VS Code!

---

## Status Bar

| State | Display |
|---|---|
| Active | `⏱ Dev Code Tracker - 1h 23m 45s` — live counter |
| Idle | `⏱ Dev Code Tracker - 2h 15m` — static total |
| Online mode | `☁ API connected` |
| Local only | `⊟ Local only` |

Click the timer to open your dashboard.

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **Dev Code Tracker**:

| Command | Description | Shortcut |
|---|---|---|
| `Dev Code Tracker: Open Dashboard (Online / Local)` | Choose between online web dashboard or local offline view | `Cmd+Alt+D` |
| `Dev Code Tracker: Open Local Dashboard (Offline View)` | Directly open the local offline webview | `Cmd+Alt+L` |
| `Dev Code Tracker: Show Today's Summary` | Quick today summary in a markdown file | — |
| `Dev Code Tracker: Set Display Name for Project` | Rename a project for display | — |
| `Dev Code Tracker: Configure Online API` | Set up sync to your PHP server | — |
| `Dev Code Tracker: Sync to Server Now` | Manually push sessions to server | — |
| `Dev Code Tracker: Clear Project Data` | Delete all local data for current project | — |

---

## Local Data

Sessions are saved locally at:

```
your-project/
  .devCodeTracker/
    sessions.json
```

Add `.devCodeTracker/` to your `.gitignore` to keep it private. Data is yours — no cloud, no accounts required.

---

## Online Sync (Optional)

If you have a PHP + MySQL server:

1. Upload the contents of the `server/` directory to your server
2. Run `server/setup.sql` to create the database tables
3. Edit `api.php` — set your DB credentials, API key, and your local `timezone_offset` (e.g. `330` for IST, `-300` for EST).
4. In VS Code: `Ctrl+Shift+P` → **Dev Code Tracker: Configure Online API**
5. Enter your `api.php` URL and secret key

Sessions sync automatically when a session ends.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `devCodeTracker.idleTimeoutMinutes` | `5` | End session after N minutes of inactivity |
| `devCodeTracker.apiUrl` | — | Your PHP API endpoint URL |
| `devCodeTracker.apiKey` | — | Your API secret key |
| `devCodeTracker.projectDisplayNames` | `{}` | Custom display names per project |

---

**Built by Kuldipsinh Parmar**
