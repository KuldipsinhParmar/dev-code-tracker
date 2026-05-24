# Dev Code Tracker — Complete Installation Guide

## 📁 Files in This Package

```
dev-code-tracker/
├── extension/                ← Install this as VS Code / Cursor / Windsurf / VSCodium extension
│   ├── src/
│   │   └── extension.ts      ← Main extension code
│   ├── package.json
│   └── tsconfig.json
│
└── server/                   ← Upload this to your web server (only for Online mode)
    ├── api.php               ← PHP REST API
    ├── setup.sql             ← Run once to create database tables
    └── dashboard.html        ← Web dashboard (Online mode)
```

---

## PART A — Extension Setup (Required for everyone)

### Step 1 — Install Node.js
Download from https://nodejs.org — install version 18 or higher.
Verify: open terminal and type `node -v` — should show v18 or above.

### Step 2 — Build the extension

Open terminal, go into the extension folder:

```bash
cd dev-code-tracker/extension
```

Install dependencies:
```bash
npm install
```

Compile TypeScript to JavaScript:
```bash
npx tsc -p ./
```

Install the packaging tool:
```bash
npm install -g @vscode/vsce
```

Package into .vsix file:
```bash
vsce package --no-dependencies
```

This creates: `dev-code-tracker-1.0.0.vsix` in the same folder.

### Step 3 — Install the .vsix into VS Code or Cursor

**VS Code:**
```bash
code --install-extension dev-code-tracker-1.0.0.vsix
```

**Cursor:**
```bash
cursor --install-extension dev-code-tracker-1.0.0.vsix
```

**Or manually (both editors):**
- Open your editor (VS Code, Cursor, Windsurf, VSCodium)
- Press `Ctrl+Shift+P`
- Type: `Extensions: Install from VSIX`
- Select the `dev-code-tracker-1.0.0.vsix` file

### Step 4 — First run

Restart your editor (VS Code, Cursor, Windsurf, VSCodium). Open any project folder.

A welcome popup appears:
- Choose **Offline (local JSON)** → starts immediately, no setup needed
- Choose **Online (PHP + Database)** → follow Part B below first

---

## PART B — Server Setup (Only needed for Online mode)

### Step 5 — Create the database

Open phpMyAdmin or run in MySQL terminal:

```sql
CREATE DATABASE devCodeTracker CHARACTER SET utf8mb4;
```

Then run the setup.sql file:
```bash
mysql -u root -p devCodeTracker < server/setup.sql
```

Or in phpMyAdmin:
1. Click the `devCodeTracker` database
2. Click the **SQL** tab
3. Paste the contents of `setup.sql`
4. Click **Go**

### Step 6 — Edit api.php

Open `server/api.php` and find the `$config` block at the top:

```php
$config = [
    'db_host'      => 'localhost',
    'db_name'      => 'devCodeTracker',
    'db_user'      => 'root',              // ← your database username
    'db_password'  => 'YOUR_DB_PASSWORD',  // ← your database password
    'api_key'      => 'YOUR_SECRET_KEY',   // ← any random secret string
    'require_auth' => true,
];
```

Change `YOUR_DB_PASSWORD` and `YOUR_SECRET_KEY` to your own values.
The api_key can be anything — example: `xK9mP2qT7nR4vZ`

### Step 7 — Upload server files

Upload both files to your web server inside a folder called `devCodeTracker`:

```
your-server/public_html/dev-code-tracker/
    api.php
    dashboard.html
```

The final URL will be: `http://yoursite.com/dev-code-tracker/api.php`

### Step 8 — Test the API

Open this URL in your browser:
```
http://yoursite.com/dev-code-tracker/api.php?action=dashboard
```

You should see:
```json
{"success": true, "today": [], "week": [], ...}
```

If you see that — the API is working ✅

### Step 9 — Configure the extension for Online mode

In your editor (VS Code, Cursor, Windsurf, VSCodium, etc.) press `Ctrl+Shift+P` and run:
**`Dev Code Tracker: Configure Online API`**

It asks 3 questions:
1. **API URL** → `http://yoursite.com/dev-code-tracker/api.php`
2. **API Key** → the same secret key you set in api.php
3. **Idle timeout** → type `5` (or any number of minutes)

Done! Extension automatically switches to Online mode.

---

## PART C — Daily Usage

### The status bar (bottom of your editor)

```
⏱ Dev Code Tracker - 12m     $(database) Offline
```

- Left badge = timer for current project (click to open report)
- Right badge = current mode (click to switch mode)

### Switching between Online and Offline

Click the mode badge in the status bar, OR press `Ctrl+Shift+P` and run:
**`Dev Code Tracker: Switch Mode (Online ↔ Offline)`**

### All commands (Ctrl+Shift+P)

| Command | What it does |
|---|---|
| `Dev Code Tracker: Open Report / Dashboard` | Open report (offline = VS Code panel, online = browser) |
| `Dev Code Tracker: Switch Mode` | Toggle between Online and Offline |
| `Dev Code Tracker: Configure Online API` | Set API URL, key, idle timeout |
| `Dev Code Tracker: Sync to Server Now` | Manually push data (Online mode) |
| `Dev Code Tracker: Set Display Name for Project` | Rename project label |
| `Dev Code Tracker: Show Today's Summary` | Quick markdown summary |
| `Dev Code Tracker: Clear Project Data` | Delete data for current project |

### Rename a project

Press `Ctrl+Shift+P` → `Dev Code Tracker: Set Display Name for Project`
Type a friendly name like "My E-Commerce App".

This name shows in the status bar and all reports.

---

## PART D — Where data is stored

### Offline mode
Data is saved inside each project folder:
```
your-project/
  .devCodeTracker/
    sessions.json     ← all time data for this project
    report.html       ← generated when you open report
```

Add to `.gitignore` if you don't want to commit it:
```
.devCodeTracker/
```

### Online mode
Data is in your MySQL database in 3 tables:
- `time_sessions` — every session with start_time and end_time
- `daily_summary` — aggregated totals per project per day
- `projects` — all known projects and their display names

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `vsce: command not found` | Run `npm install -g @vscode/vsce` again |
| `tsc: command not found` | Run `npm install` in the extension folder first |
| API shows database error | Check db_user and db_password in api.php |
| Sync fails with HTTP 401 | API key in extension doesn't match api.php |
| Timer not starting | Make sure you have a folder open, not just a single file |
| Dashboard shows no data | Check the API URL — no trailing slash needed |
| `.vsix` not found | Run `npx tsc -p ./` first, then `vsce package` |
