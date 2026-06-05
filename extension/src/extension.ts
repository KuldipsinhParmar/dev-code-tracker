import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

interface TimeSession {
  id: string;
  project: string;
  display_name: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  date: string;
  synced_online?: boolean;
}

interface LocalData {
  project: string;
  display_name: string;
  sessions: TimeSession[];
  last_updated: string;
}

interface ActiveSession {
  project: string;
  display_name: string;
  project_path: string;
  start_time: Date;
  last_activity: Date;
}

const EXT          = 'devCodeTracker';
const DATA_DIR     = '.devCodeTracker';
const DATA_FILE    = 'sessions.json';

let ctx             : vscode.ExtensionContext;
let activeSession   : ActiveSession | null = null;
let pendingOnline   : TimeSession[]        = [];
let statusBar       : vscode.StatusBarItem;
let modeBar         : vscode.StatusBarItem;
let tickTimer       : NodeJS.Timeout | undefined;
let todayBaseline   : number               = 0;
let idleTickCount   : number               = 0;
let currentDateIST  : string               = '';

function migrateLocalFolders() {
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const oldDir = path.join(folder.uri.fsPath, '.devtracker');
    const newDir = path.join(folder.uri.fsPath, '.devCodeTracker');
    if (fs.existsSync(oldDir)) {
      if (!fs.existsSync(newDir)) {
        try {
          fs.renameSync(oldDir, newDir);
          console.log(`Dev Code Tracker: Migrated local data folder ${oldDir} to ${newDir}`);
        } catch (err: any) {
          console.error(`Dev Code Tracker: Data folder migration failed:`, err.message);
        }
      } else {
        try {
          const oldFile = path.join(oldDir, 'sessions.json');
          const newFile = path.join(newDir, 'sessions.json');
          if (fs.existsSync(oldFile) && fs.existsSync(newFile)) {
            const oldData = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
            const newData = JSON.parse(fs.readFileSync(newFile, 'utf8'));
            const existingIds = new Set(newData.sessions.map((s: any) => s.id));
            let merged = false;
            for (const s of (oldData.sessions || [])) {
              if (!existingIds.has(s.id)) {
                newData.sessions.push(s);
                merged = true;
              }
            }
            if (merged) {
              fs.writeFileSync(newFile, JSON.stringify(newData, null, 2), 'utf8');
              console.log(`Dev Code Tracker: Merged old sessions into ${newDir}`);
            }
          }
          fs.rmSync(oldDir, { recursive: true, force: true });
        } catch (err: any) {
          console.error(`Dev Code Tracker: Data folder merge failed:`, err.message);
        }
      }
    }
  }
}

async function migrateConfiguration() {
  const devtrackerConfig = vscode.workspace.getConfiguration('devtracker');
  const devCodeTrackerConfig = vscode.workspace.getConfiguration('devCodeTracker');

  const getOldSetting = (key: string) => {
    const info = devtrackerConfig.inspect(key);
    return info?.globalValue !== undefined || info?.workspaceValue !== undefined ? devtrackerConfig.get(key) : undefined;
  };

  const oldUrl = getOldSetting('apiUrl');
  const newUrlInfo = devCodeTrackerConfig.inspect('apiUrl');
  if (oldUrl !== undefined && newUrlInfo?.globalValue === undefined && newUrlInfo?.workspaceValue === undefined) {
    await devCodeTrackerConfig.update('apiUrl', oldUrl, vscode.ConfigurationTarget.Global);
  }

  const oldKey = getOldSetting('apiKey');
  const newKeyInfo = devCodeTrackerConfig.inspect('apiKey');
  if (oldKey !== undefined && newKeyInfo?.globalValue === undefined && newKeyInfo?.workspaceValue === undefined) {
    await devCodeTrackerConfig.update('apiKey', oldKey, vscode.ConfigurationTarget.Global);
  }

  const oldTimeout = getOldSetting('idleTimeoutMinutes');
  const newTimeoutInfo = devCodeTrackerConfig.inspect('idleTimeoutMinutes');
  if (oldTimeout !== undefined && newTimeoutInfo?.globalValue === undefined && newTimeoutInfo?.workspaceValue === undefined) {
    await devCodeTrackerConfig.update('idleTimeoutMinutes', oldTimeout, vscode.ConfigurationTarget.Global);
  }

  const oldDisplayNames = getOldSetting('projectDisplayNames');
  const newDisplayNamesInfo = devCodeTrackerConfig.inspect('projectDisplayNames');
  if (oldDisplayNames !== undefined && newDisplayNamesInfo?.globalValue === undefined && newDisplayNamesInfo?.workspaceValue === undefined) {
    await devCodeTrackerConfig.update('projectDisplayNames', oldDisplayNames, vscode.ConfigurationTarget.Global);
  }
}

export function activate(context: vscode.ExtensionContext) {
  ctx           = context;
  pendingOnline = ctx.globalState.get<TimeSession[]>('pendingOnline', []);

  migrateLocalFolders();
  migrateConfiguration();

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'devCodeTracker.openReport';
  statusBar.show();
  ctx.subscriptions.push(statusBar);

  modeBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  modeBar.command = 'devCodeTracker.configure';
  modeBar.show();
  ctx.subscriptions.push(modeBar);

  refreshBars();

  ctx.subscriptions.push(
    vscode.commands.registerCommand('devCodeTracker.openReport',         cmdOpenReport),
    vscode.commands.registerCommand('devCodeTracker.configure',          cmdConfigure),
    vscode.commands.registerCommand('devCodeTracker.syncNow',            () => onlineSync(true)),
    vscode.commands.registerCommand('devCodeTracker.renameProject',      cmdRename),
    vscode.commands.registerCommand('devCodeTracker.showToday',          cmdShowToday),
    vscode.commands.registerCommand('devCodeTracker.clearData',          cmdClearData),
    vscode.commands.registerCommand('devCodeTracker.showLocalDashboard', cmdShowLocalDashboard),
  );

  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(`${EXT}.idleTimeoutMinutes`)) {
        const minutes = cfg().get<number>('idleTimeoutMinutes') ?? 5;
        vscode.window.showInformationMessage(`Dev Code Tracker: Idle timeout updated to ${minutes} minute(s).`);
      }
    }),
  );

  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => { if (e) touch(e); }),
    vscode.workspace.onDidSaveTextDocument(() => touch()),
    vscode.workspace.onDidChangeTextDocument(e => { if (e.contentChanges.length) touch(); }),
    vscode.window.onDidChangeWindowState(s => {
      if (s.focused) startProjectTracking(vscode.window.activeTextEditor);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const needsSync = endSession();
      if (needsSync) onlineSync(false);
      startProjectTracking();
    }),
  );

  tickTimer = setInterval(tick, 1_000);
  currentDateIST = isoDateIST();
  startProjectTracking();

  if (!ctx.globalState.get<boolean>('welcomed')) {
    ctx.globalState.update('welcomed', true);
    vscode.window.showInformationMessage(
      '👋 Dev Code Tracker installed! Sessions save locally. Want to also sync to an online server?',
      'Configure API', 'Later'
    ).then(choice => {
      if (choice === 'Configure API') cmdConfigure();
    });
  }
}

export async function deactivate() {
  endSession();
  clearInterval(tickTimer as any);
  if (isOnlineConfigured() && pendingOnline.length) {
    await onlineSync(false);
  }
}

function refreshBars() {
  updateStatusBar();
  updateModeBar();
}

function updateModeBar() {
  if (isOnlineConfigured()) {
    modeBar.text    = '$(cloud-upload) API connected';
    modeBar.tooltip = 'Dev Code Tracker: Syncing to online server. Click to reconfigure.';
    modeBar.color   = '#00e5a0';
  } else {
    modeBar.text    = '$(database) Local only';
    modeBar.tooltip = 'Dev Code Tracker: Saving locally. Click to configure online sync.';
    modeBar.color   = '#7a89aa';
  }
}

function updateStatusBar() {
  if (!activeSession) {
    statusBar.text    = todayBaseline > 0
      ? `$(clock) Dev Code Tracker - ${fmtDur(todayBaseline)}`
      : '$(clock) Dev Code Tracker';
    statusBar.tooltip = todayBaseline > 0
      ? `Today total: ${fmtDur(todayBaseline)}\nIdle — click to open report`
      : 'Dev Code Tracker — click to open report';
    return;
  }
  const sessionSec = Math.floor((activeSession.last_activity.getTime() - activeSession.start_time.getTime()) / 1000);
  const todaySec   = todayBaseline + sessionSec;
  statusBar.text    = `$(clock) Dev Code Tracker - ${fmtLive(todaySec)}`;
  statusBar.tooltip =
    `Project    : ${activeSession.display_name}\n` +
    `Session    : ${fmtLive(sessionSec)}\n` +
    `Today total: ${fmtDur(todaySec)}\n` +
    `Started    : ${activeSession.start_time.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
    `Sync       : ${isOnlineConfigured() ? 'online + local' : 'local only'}`;
}

function cfg() { return vscode.workspace.getConfiguration(EXT); }

function idleMs()  { return (cfg().get<number>('idleTimeoutMinutes') ?? 5) * 60_000; }

function displayName(folderName: string): string {
  const map = cfg().get<Record<string,string>>('projectDisplayNames') ?? {};
  return map[folderName] ?? folderName;
}

async function saveDisplayName(folderName: string, name: string): Promise<boolean> {
  const map = cfg().get<Record<string,string>>('projectDisplayNames') ?? {};
  map[folderName] = name;
  return safeCfgUpdate('projectDisplayNames', map);
}

async function safeCfgUpdate(key: string, value: unknown): Promise<boolean> {
  try {
    await cfg().update(key, value, vscode.ConfigurationTarget.Global);
    return true;
  } catch (e: any) {
    const open = 'Open settings.json';
    vscode.window.showErrorMessage(
      `Dev Code Tracker: Cannot save settings — your VS Code settings.json has a JSON error. Fix it first.`,
      open
    ).then(choice => {
      if (choice === open) vscode.commands.executeCommand('workbench.action.openSettingsJson');
    });
    return false;
  }
}

function getProject(editor?: vscode.TextEditor) {
  const ws = editor
    ? vscode.workspace.getWorkspaceFolder(editor.document.uri)
    : vscode.workspace.workspaceFolders?.[0];
  if (!ws) return null;
  return { key: ws.name, name: displayName(ws.name), path: ws.uri.fsPath };
}

function isoDateIST(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function computeTodayBaseline(projectPath: string, _projectKey: string) {
  const today = isoDateIST();
  const data = localRead(projectPath);
  todayBaseline = (data?.sessions ?? [])
    .filter(s => s.date === today)
    .reduce((a, s) => a + s.duration_seconds, 0);
}

function startProjectTracking(editor?: vscode.TextEditor) {
  const proj = getProject(editor);
  if (!proj) return;

  if (activeSession && activeSession.project_path === proj.path) {
    computeTodayBaseline(proj.path, proj.key);
    updateStatusBar();
    return;
  }
  if (activeSession) {
    const needsSync = endSession();
    if (needsSync) onlineSync(false);
  }
  computeTodayBaseline(proj.path, proj.key);
  activeSession = newActive(proj, new Date());
  updateStatusBar();
}

function newActive(
  proj: { key: string; name: string; path: string },
  now: Date
): ActiveSession {
  return {
    project: proj.key, display_name: proj.name, project_path: proj.path,
    start_time: now, last_activity: now,
  };
}

function touch(editor?: vscode.TextEditor) {
  if (activeSession) {
    if (editor) {
      const proj = getProject(editor);
      if (proj && proj.key !== activeSession.project) {
        startProjectTracking(editor);
        return;
      }
    }
    activeSession.last_activity = new Date();
  } else {
    startProjectTracking(editor);
  }
}

function endSession(): boolean {
  if (!activeSession) return false;
  const now      = activeSession.last_activity;
  const dur      = Math.floor((now.getTime() - activeSession.start_time.getTime()) / 1000);
  const snap     = activeSession;
  activeSession  = null;

  let triggerSync = false;
  if (dur >= 60) {
    const s: TimeSession = {
      id:               `${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      project:          snap.project,
      display_name:     snap.display_name,
      start_time:       snap.start_time.toISOString(),
      end_time:         now.toISOString(),
      duration_seconds: dur,
      date:             new Date(snap.start_time.getTime() + 330 * 60_000).toISOString().slice(0, 10),
    };

    s.synced_online = false;
    localSave(s, snap.project_path);
    todayBaseline += dur;

    if (isOnlineConfigured()) {
      pendingOnline.push(s);
      ctx.globalState.update('pendingOnline', pendingOnline);
      triggerSync = true;
    }
  }
  updateStatusBar();
  return triggerSync;
}

function tick() {
  const nowDate = isoDateIST();
  if (nowDate !== currentDateIST) {
    currentDateIST = nowDate;
    const needsSync = endSession();
    if (needsSync) onlineSync(false);
    todayBaseline = 0;
  }

  updateStatusBar();
  idleTickCount = (idleTickCount + 1) % 15;
  if (idleTickCount === 0 && activeSession && Date.now() - activeSession.last_activity.getTime() > idleMs()) {
    const needsSync = endSession();
    if (needsSync) onlineSync(false);
  }
}

function localDir(projectPath: string): string | null {
  const dir = path.join(projectPath, DATA_DIR);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { return null; }
  }
  return dir;
}

function localRead(projectPath: string): LocalData | null {
  const dir = localDir(projectPath);
  if (!dir) return null;
  const fp = path.join(dir, DATA_FILE);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

function localSave(s: TimeSession, projectPath: string) {
  const data: LocalData = localRead(projectPath) ?? {
    project: s.project, display_name: s.display_name,
    sessions: [], last_updated: '',
  };
  data.display_name = s.display_name;
  data.sessions.push(s);
  data.last_updated = new Date().toISOString();

  const dir = localDir(projectPath);
  if (dir) {
    try { fs.writeFileSync(path.join(dir, DATA_FILE), JSON.stringify(data, null, 2), 'utf8'); }
    catch (e: any) { console.error('Dev Code Tracker write error:', e.message); }
  }

  maybePromptReview();
}

const REVIEW_MILESTONES = new Set([5, 15, 30]);
const MARKETPLACE_REVIEW_URL = 'https://marketplace.visualstudio.com/items?itemName=KuldipsinhParmar.dev-code-tracker&ssr=false#review-details';

function maybePromptReview() {
  if (ctx.globalState.get<boolean>('reviewDone')) return;

  const count = (ctx.globalState.get<number>('sessionsLogged') ?? 0) + 1;
  ctx.globalState.update('sessionsLogged', count);

  if (!REVIEW_MILESTONES.has(count)) return;

  vscode.window.showInformationMessage(
    'You\'ve been coding with Dev Code Tracker — enjoying it? A quick rating helps others find it.',
    'Rate it ⭐', 'Not Now', 'Never'
  ).then(choice => {
    if (choice === 'Rate it ⭐') {
      ctx.globalState.update('reviewDone', true);
      vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_REVIEW_URL));
    } else if (choice === 'Never') {
      ctx.globalState.update('reviewDone', true);
    }
  });
}

function isOnlineConfigured(): boolean {
  const apiUrl = cfg().get<string>('apiUrl');
  const apiKey = cfg().get<string>('apiKey');
  return !!(apiUrl && apiKey);
}

async function onlineSync(notify: boolean) {
  if (!isOnlineConfigured()) return;

  const wasActive = !!activeSession;
  if (wasActive) {
    endSession();
  }

  const unsyncedLocal = collectUnsyncedLocalSessions();
  for (const s of unsyncedLocal) {
    if (!pendingOnline.find(p => p.id === s.id)) {
      pendingOnline.push(s);
    }
  }
  if (unsyncedLocal.length) {
    ctx.globalState.update('pendingOnline', pendingOnline);
  }

  if (!pendingOnline.length) {
    if (notify) vscode.window.showInformationMessage('Dev Code Tracker: Nothing to sync.');
    if (wasActive) startProjectTracking();
    return;
  }

  const apiUrl = cfg().get<string>('apiUrl');
  const apiKey = cfg().get<string>('apiKey') ?? '';

  if (!apiUrl) {
    vscode.window.showWarningMessage('Dev Code Tracker: API URL not set. Run "Dev Code Tracker: Configure Online API".');
    if (wasActive) startProjectTracking();
    return;
  }

  const toSync = [...pendingOnline];
  try {
    await apiPost(apiUrl, JSON.stringify({ api_key: apiKey, sessions: toSync }));
    const n = toSync.length;
    pendingOnline = [];
    ctx.globalState.update('pendingOnline', []);
    markLocalSessionsSynced(toSync.map(s => s.id));
    if (notify) vscode.window.showInformationMessage(`Dev Code Tracker: Synced ${n} session(s) ✅`);
  } catch (e: any) {
    if (notify) vscode.window.showErrorMessage(`Dev Code Tracker sync failed: ${e.message}`);
  }

  if (wasActive) startProjectTracking();
}

function collectUnsyncedLocalSessions(): TimeSession[] {
  const result: TimeSession[] = [];
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const data = localRead(folder.uri.fsPath);
    if (!data) continue;
    for (const s of data.sessions) {
      if (!s.synced_online) result.push(s);
    }
  }
  return result;
}

function markLocalSessionsSynced(ids: string[]) {
  const idSet = new Set(ids);
  const folders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of folders) {
    const data = localRead(folder.uri.fsPath);
    if (!data) continue;
    let changed = false;
    for (const s of data.sessions) {
      if (idSet.has(s.id) && !s.synced_online) {
        s.synced_online = true;
        changed = true;
      }
    }
    if (changed) {
      data.last_updated = new Date().toISOString();
      const dir = localDir(folder.uri.fsPath);
      if (dir) {
        try { fs.writeFileSync(path.join(dir, DATA_FILE), JSON.stringify(data, null, 2), 'utf8'); }
        catch (err: any) { console.error('Dev Code Tracker write error:', err.message); }
      }
    }
  }
}

function apiPost(apiUrl: string, payload: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed  = new URL(apiUrl);
    const buf     = Buffer.from(payload);
    const mod     = parsed.protocol === 'https:' ? https : http;

    const req = mod.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers:  {
        'content-type':   'application/json',
        'content-length': buf.byteLength,
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const status = res.statusCode ?? 0;
        if (status >= 200 && status < 300) resolve();
        else reject(new Error(`HTTP ${status}: ${body}`));
      });
    });

    req.setTimeout(10_000, () => { req.destroy(new Error('Request timeout')); });
    req.on('error', (err) => reject(err));
    req.write(buf);
    req.end();
  });
}

async function cmdConfigure() {
  const c = cfg();

  const apiUrl = await vscode.window.showInputBox({
    title: 'Dev Code Tracker Config (1/3) — PHP API URL',
    prompt: 'Full URL to your api.php file on your server',
    value: c.get<string>('apiUrl') ?? '',
    placeHolder: 'http://yourserver.com/api.php',
  });
  if (apiUrl === undefined) return;
  if (!await safeCfgUpdate('apiUrl', apiUrl)) return;

  const apiKey = await vscode.window.showInputBox({
    title: 'Dev Code Tracker Config (2/3) — API Secret Key',
    prompt: 'Secret key (must match the api_key in api.php)',
    value: c.get<string>('apiKey') ?? '',
    password: true,
  });
  if (apiKey === undefined) return;
  if (!await safeCfgUpdate('apiKey', apiKey)) return;

  const idle = await vscode.window.showInputBox({
    title: 'Dev Code Tracker Config (3/3) — Idle Timeout (minutes)',
    prompt: 'End session after how many minutes of no activity? (default 5)',
    value: String(c.get<number>('idleTimeoutMinutes') ?? 5),
  });
  if (idle !== undefined) {
    const n = parseInt(idle);
    if (!isNaN(n) && n > 0) await safeCfgUpdate('idleTimeoutMinutes', n);
  }

  refreshBars();
  vscode.window.showInformationMessage('Dev Code Tracker: Online sync configured ✅');
}

async function cmdRename() {
  const proj = getProject(vscode.window.activeTextEditor);
  if (!proj) { vscode.window.showWarningMessage('Dev Code Tracker: Open a project folder first.'); return; }

  const name = await vscode.window.showInputBox({
    title: `Rename "${proj.key}"`,
    prompt: 'Enter a friendly display name for this project',
    value: proj.name,
    placeHolder: 'e.g. My Awesome App',
  });
  if (name?.trim()) {
    const ok = await saveDisplayName(proj.key, name.trim());
    if (!ok) return;
    if (activeSession) activeSession.display_name = name.trim();
    refreshBars();
    vscode.window.showInformationMessage(`Dev Code Tracker: "${proj.key}" now shows as "${name.trim()}" ✅`);
  }
}

/** Returns local session data, with the active in-progress session appended if ≥1 min. */
function readLocalWithLive(projPath: string, projKey: string, projName: string): LocalData {
  let data = localRead(projPath) ?? {
    project: projKey, display_name: projName,
    sessions: [], last_updated: new Date().toISOString(),
  };
  if (activeSession && activeSession.project_path === projPath) {
    const now = activeSession.last_activity;
    const dur = Math.floor((now.getTime() - activeSession.start_time.getTime()) / 1000);
    if (dur >= 60) {
      data = { ...data, sessions: [...data.sessions] };
      data.sessions.push({
        id: '__live__',
        project: activeSession.project,
        display_name: activeSession.display_name,
        start_time: activeSession.start_time.toISOString(),
        end_time: now.toISOString(),
        duration_seconds: dur,
        date: new Date(activeSession.start_time.getTime() + 330 * 60_000).toISOString().slice(0, 10),
        synced_online: false,
      });
    }
  }
  return data;
}

async function cmdShowLocalDashboard() {
  const proj = getProject(vscode.window.activeTextEditor);
  if (!proj) {
    vscode.window.showWarningMessage('Dev Code Tracker: Open a project folder to view the local dashboard.');
    return;
  }
  const liveData = readLocalWithLive(proj.path, proj.key, proj.name);
  const panel = vscode.window.createWebviewPanel(
    'devCodeTrackerLocalDash', `Dev Code Tracker — Local · ${liveData.display_name}`,
    vscode.ViewColumn.One, { enableScripts: true }
  );
  const iconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(ctx.extensionUri, 'icon.png')).toString();
  panel.webview.html = buildOfflineHTML(liveData, iconUri);
}

async function cmdShowToday() {
  const proj  = getProject(vscode.window.activeTextEditor);
  if (!proj) { vscode.window.showWarningMessage('Dev Code Tracker: Open a project folder first.'); return; }

  const today = isoDateIST();
  const [ty, tm, td] = today.split('-');
  const todayDisplay = `${td}-${tm}-${ty}`;
  const sessions: TimeSession[] = (localRead(proj.path)?.sessions ?? []).filter(s => s.date === today);

  const total = sessions.reduce((a, s) => a + s.duration_seconds, 0);
  const lines = [
    `# Dev Code Tracker — Today  (${todayDisplay})`,
    `**Project :** ${proj.name}   |   **Sync :** ${isOnlineConfigured() ? 'online + local' : 'local only'}`,
    `**Total   :** ${fmtDur(total)}  across ${sessions.length} session(s)`,
    '',
    ...sessions.map(s =>
      `- \`${ts(s.start_time)}\` → \`${ts(s.end_time)}\` · **${fmtDur(s.duration_seconds)}**`
    ),
  ];
  const doc = await vscode.workspace.openTextDocument({ content: lines.join('\n'), language: 'markdown' });
  vscode.window.showTextDocument(doc);
}

async function cmdClearData() {
  const proj = getProject(vscode.window.activeTextEditor);
  if (!proj) { vscode.window.showWarningMessage('Dev Code Tracker: No active project.'); return; }

  const ok = await vscode.window.showWarningMessage(
    `Delete ALL Dev Code Tracker data for "${proj.name}"?`,
    { modal: true }, 'Yes, delete it'
  );
  if (ok !== 'Yes, delete it') return;

  const dir = localDir(proj.path);
  if (dir) {
    const fp = path.join(dir, DATA_FILE);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  pendingOnline = pendingOnline.filter(s => s.project !== proj.key);
  ctx.globalState.update('pendingOnline', pendingOnline);
  vscode.window.showInformationMessage(`Dev Code Tracker: Data cleared for "${proj.name}" ✅`);
}

async function cmdOpenReport() {
  const wasActive = !!activeSession;
  if (wasActive) {
    endSession();
    if (isOnlineConfigured()) onlineSync(false);
  }

  if (isOnlineConfigured()) {
    // When online: let user choose Online dashboard OR Local dashboard
    const choice = await vscode.window.showQuickPick(
      [
        {
          label:       '$(globe) Open Online Dashboard',
          description: 'View your server dashboard in the browser',
          value:       'online' as const,
        },
        {
          label:       '$(database) Open Local Dashboard',
          description: 'View offline sessions saved in this project folder',
          value:       'local' as const,
        },
      ],
      { title: 'Dev Code Tracker — Open Dashboard', placeHolder: 'Choose which dashboard to open' }
    );

    if (choice?.value === 'online') {
      const apiUrl  = cfg().get<string>('apiUrl') ?? '';
      const dashUrl = apiUrl.replace(/api\.php.*$/, 'dashboard.html');
      vscode.env.openExternal(vscode.Uri.parse(dashUrl));
    } else if (choice?.value === 'local') {
      const proj = getProject(vscode.window.activeTextEditor);
      if (!proj) {
        vscode.window.showWarningMessage('Dev Code Tracker: Open a project folder to view the local dashboard.');
      } else {
        const data  = readLocalWithLive(proj.path, proj.key, proj.name);
        const panel = vscode.window.createWebviewPanel(
          'devCodeTrackerReport', `Dev Code Tracker — Local · ${data.display_name}`,
          vscode.ViewColumn.One, { enableScripts: true }
        );
        const iconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(ctx.extensionUri, 'icon.png')).toString();
        panel.webview.html = buildOfflineHTML(data, iconUri);
      }
    }
  } else {
    // Offline-only: open local dashboard directly
    const proj = getProject(vscode.window.activeTextEditor);
    if (!proj) {
      vscode.window.showWarningMessage('Dev Code Tracker: Open a project folder to view the local report.');
    } else {
      const data  = readLocalWithLive(proj.path, proj.key, proj.name);
      const panel = vscode.window.createWebviewPanel(
        'devCodeTrackerReport', `Dev Code Tracker — ${data.display_name}`,
        vscode.ViewColumn.One, { enableScripts: true }
      );
      const iconUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(ctx.extensionUri, 'icon.png')).toString();
      panel.webview.html = buildOfflineHTML(data, iconUri);
    }
  }

  if (wasActive) startProjectTracking();
}

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtLive(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ts(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}



function buildOfflineHTML(data: LocalData, iconUri: string): string {
  const sessions = [...data.sessions].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  const byDate: Record<string, number> = {};
  sessions.forEach(s => { byDate[s.date] = (byDate[s.date] || 0) + s.duration_seconds; });

  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const totalSec = sessions.reduce((a, s) => a + s.duration_seconds, 0);

  const todayD = new Date(today + 'T12:00:00');
  const dow = todayD.getDay();
  const dFM = dow === 0 ? 6 : dow - 1;
  const monD = new Date(todayD); monD.setDate(todayD.getDate() - dFM);
  const weekStart = monD.toISOString().slice(0, 10);

  let streak = 0;
  { const c = new Date(todayD); while (byDate[c.toISOString().slice(0,10)]) { streak++; c.setDate(c.getDate()-1); } }

  let longestStreak = 0;
  {
    const allDates = Object.keys(byDate).filter(d => byDate[d] > 0).sort();
    if (allDates.length > 0) {
      let run = 1;
      longestStreak = 1;
      for (let i = 1; i < allDates.length; i++) {
        const prev = new Date(allDates[i - 1] + 'T12:00:00');
        const curr = new Date(allDates[i] + 'T12:00:00');
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
        if (diff === 1) { run++; if (run > longestStreak) longestStreak = run; }
        else run = 1;
      }
    }
  }

  const last30: string[] = [];
  for (let i = 29; i >= 0; i--) {
    last30.push(new Date(Date.now() + 330*60_000 - i*86_400_000).toISOString().slice(0,10));
  }

  const t = (iso: string) => { const d = new Date(new Date(iso).getTime() + 330 * 60_000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

  const todaySessions = sessions.filter(s => s.date === today);
  const todaySec = todaySessions.reduce((a, s) => a + s.duration_seconds, 0);
  
  const weekSessions = sessions.filter(s => s.date >= weekStart && s.date <= today);
  const weekSec = weekSessions.reduce((a, s) => a + s.duration_seconds, 0);

  const D = {
    success: true,
    istToday: today,
    streak: { current: streak, longest: longestStreak },
    today: todaySec > 0 ? [{
      project: data.project,
      display_name: data.display_name,
      total_seconds: todaySec,
      session_count: todaySessions.length
    }] : [],
    week: weekSec > 0 ? [{
      project: data.project,
      display_name: data.display_name,
      total_seconds: weekSec,
      sessions: weekSessions.length
    }] : [],
    recent: sessions.map(s => ({
      project: data.project,
      display_name: data.display_name,
      date: s.date,
      start: t(s.start_time),
      end: t(s.end_time),
      duration_seconds: s.duration_seconds
    })),
    allTime: [{
      project: data.project,
      display_name: data.display_name,
      last_seen: sessions[0]?.date ?? today,
      total_seconds: totalSec,
      total_hours: totalSec / 3600,
      total_sessions: sessions.length
    }],
    daily: last30.map(date => ({
      summary_date: date,
      total_seconds: byDate[date] ?? 0
    }))
  };

  const htmlPath = vscode.Uri.joinPath(ctx.extensionUri, 'webview', 'dashboard.html');
  let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

  const scriptInject = `
<script>
  // Setup local data directly
  D = ${JSON.stringify(D)};
  allProj = D.allTime || [];
  cfg.url = 'Local Offline View'; // Tricks renderAll into showing this in footer

  // Hide online-only UI
  const cfgBtn = document.querySelector('button[onclick="toggleCfg()"]');
  if(cfgBtn) cfgBtn.style.display = 'none';
  
  const refreshBtn = document.getElementById('refreshBtn');
  if(refreshBtn) refreshBtn.style.display = 'none';
  
  const dot = document.getElementById('statusDot');
  if (dot) {
    dot.classList.remove('live');
    dot.style.background = 'var(--cyan)';
    dot.style.boxShadow = 'none';
    dot.style.animation = 'none';
  }
  const label = document.getElementById('statusLabel');
  if (label) label.textContent = 'local data';

  // Render the dashboard immediately
  if (typeof renderAll === 'function') renderAll();
</script>
`;
  
  // Disable online initialization behaviors
  html = html.replace('loadCfg();', '// loadCfg disabled');
  html = html.replace('if (cfg.url) { loadAll(); startAuto(); }', '// init disabled');
  
  html = html.replace('</body>', scriptInject + '</body>');
  html = html.replace(/icon\.png/g, iconUri);
  return html;
}
