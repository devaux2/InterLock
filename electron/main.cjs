const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const storage = require('./storage.cjs');
const { exportPdf } = require('./pdfExport.cjs');

let mainWindow = null;
let fontCssCache = null;
const isHeadless = process.argv.includes('--export-sample') || process.argv.includes('--export') || process.argv.includes('--smoke');
let exportInFlight = 0;
let pendingQuit = false;

// ---- Print resources ---------------------------------------------------------
function getFontCss() {
  if (fontCssCache) return fontCssCache;
  const fontDir = path.join(storage.assetRoot(), 'print', 'fonts');
  const faces = [];
  const weights = { 'inter-400.woff2': 400, 'inter-500.woff2': 500, 'inter-600.woff2': 600, 'inter-700.woff2': 700, 'inter-800.woff2': 800 };
  for (const [file, weight] of Object.entries(weights)) {
    const fp = path.join(fontDir, file);
    if (fs.existsSync(fp)) {
      const b64 = fs.readFileSync(fp).toString('base64');
      faces.push(`@font-face{font-family:'Inter';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`);
    }
  }
  fontCssCache = faces.join('\n');
  return fontCssCache;
}

function buildPrintResources(event) {
  const settings = storage.getSettings();
  const logoRel = settings.company?.logoAsset || 'assets/logo.png';
  const images = {};
  for (const att of event?.attachments || []) {
    // Only images are embedded as figures (file type is authoritative; a PDF
    // in embed mode would print as a blank page).
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(att.file || '')) {
      const durl = storage.readFileDataUrl(att.file);
      if (durl) images[att.id] = durl;
    }
  }
  return {
    fontCss: getFontCss(),
    logoDataUrl: storage.readFileDataUrl(logoRel),
    images,
  };
}

// ---- Update check ------------------------------------------------------------
// Reads the GitHub repo from package.json "repository". Until a real slug is
// set there, the Settings card shows a "not configured" state. Checks are only
// ever run when the user clicks the button; nothing is downloaded or installed.
function repoSlug() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8'));
    const url = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || '';
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
    if (!m || /CHANGE-ME/i.test(url)) return null;
    return `${m[1]}/${m[2]}`;
  } catch { return null; }
}

function semverNewer(latest, current) {
  const a = String(latest).split('.').map(n => parseInt(n, 10) || 0);
  const b = String(current).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates() {
  const slug = repoSlug();
  const current = app.getVersion();
  if (!slug) return { state: 'unconfigured', current };
  try {
    const res = await fetch(`https://api.github.com/repos/${slug}/releases/latest`, {
      headers: { 'User-Agent': 'Interlock-update-check', Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) return { state: 'none', current, slug };
    if (!res.ok) return { state: 'error', current, message: `GitHub responded with status ${res.status}.` };
    const rel = await res.json();
    const latest = String(rel.tag_name || '').replace(/^v/i, '').trim();
    if (!latest) return { state: 'none', current, slug };
    return {
      state: semverNewer(latest, current) ? 'update' : 'current',
      current,
      latest,
      url: rel.html_url,
      name: rel.name || `v${latest}`,
      notes: String(rel.body || '').slice(0, 800),
      publishedAt: rel.published_at,
    };
  } catch {
    return { state: 'error', current, message: 'Could not reach GitHub. Check your connection and try again.' };
  }
}

// ---- Export ------------------------------------------------------------------
function sanitizeFilename(name) {
  return String(name || 'RAMS').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}
function formatDateDots(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
function defaultExportName(event) {
  const name = sanitizeFilename(event.details?.eventName || 'RAMS');
  const date = formatDateDots(event.details?.eventDateStart);
  return date ? `${name}_${date}.pdf` : `${name}.pdf`;
}

let printModulePromise = null;
function printModule() {
  if (!printModulePromise) {
    printModulePromise = import(
      'file://' + path.join(storage.assetRoot(), 'src', 'print', 'buildPrintHtml.mjs').replace(/\\/g, '/')
    );
  }
  return printModulePromise;
}

async function runExport({ event, html, outPath }) {
  const settings = storage.getSettings();
  let target = outPath;
  if (!target) {
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Export RAMS PDF',
      defaultPath: path.join(settings.lastExportDir || app.getPath('documents'), defaultExportName(event)),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (res.canceled || !res.filePath) return { canceled: true };
    target = res.filePath;
    // Patch the single key against a fresh read; never persist if the file is
    // unreadable (a transient failure must not become a destructive rewrite).
    try {
      const fresh = storage.getSettings();
      fresh.lastExportDir = path.dirname(target);
      storage.saveSettings(fresh);
    } catch { /* skip remembering the folder rather than risk the settings file */ }
  }
  const { assembleAppendices } = await printModule();
  const appendices = assembleAppendices(event, storage.getLibrary(), settings);
  const result = await exportPdf({
    html,
    appendices,
    eventName: event.details?.eventName || 'Event',
    author: settings.company?.name || 'Paradox State International Ltd',
    outPath: target,
  });
  // Record export in the saved event (if it exists on disk)
  const saved = storage.getEvent(event.id);
  if (saved) {
    saved.exportHistory = [...(saved.exportHistory || []), { date: new Date().toISOString(), path: result.path }];
    storage.saveEvent(saved);
  }
  return result;
}

// ---- Headless export ---------------------------------------------------------
//   electron . --export-sample [outPath]         the seeded sample (or first) event
//   electron . --export <eventId> [outPath]      any event: events/<eventId>.json
async function headlessExport(argv) {
  const argAfter = (i) => (argv[i] && !argv[i].startsWith('--') ? argv[i] : null);
  let event = null;
  let outArg = null;
  const exportIdx = argv.indexOf('--export');
  if (exportIdx >= 0) {
    const id = argAfter(exportIdx + 1);
    if (!id) throw new Error('--export needs an event id (the events/<id>.json filename without .json)');
    event = storage.getEvent(id);
    if (!event) throw new Error(`No event "${id}" in ${storage.p('events')}`);
    outArg = argAfter(exportIdx + 2);
  } else {
    const idx = argv.indexOf('--export-sample');
    outArg = argAfter(idx + 1);
    const events = storage.listEvents();
    event = storage.getEvent('sample-gottwood-2026') || events[0];
    if (!event) throw new Error('No events found to export');
  }
  const { buildPrintHtml } = await printModule();
  const html = buildPrintHtml(event, storage.getLibrary(), storage.getSettings(), buildPrintResources(event));
  const outPath = outArg || path.join(app.getPath('temp'), defaultExportName(event));
  const result = await runExport({ event, html, outPath });
  console.log('EXPORT_RESULT ' + JSON.stringify(result));
}

// ---- IPC ---------------------------------------------------------------------
function registerIpc() {
  ipcMain.handle('app:info', () => ({
    dataDir: storage.resolveDataDir(),
    version: app.getVersion(),
  }));
  ipcMain.handle('settings:get', () => storage.getSettings());
  ipcMain.handle('settings:save', (e, s) => {
    // The renderer's draft may pre-date a main-process lastExportDir update —
    // keep the newest value rather than letting the stale draft clobber it.
    if (s && s.lastExportDir === undefined) {
      try { s.lastExportDir = storage.getSettings().lastExportDir; } catch { }
    }
    return storage.saveSettings(s);
  });
  ipcMain.handle('library:get', () => storage.getLibrary());
  ipcMain.handle('library:save', (e, l) => storage.saveLibrary(l));
  ipcMain.handle('events:list', () => storage.listEvents());
  ipcMain.handle('events:get', (e, id) => storage.getEvent(id));
  ipcMain.handle('events:save', (e, ev) => storage.saveEvent(ev));
  ipcMain.handle('events:delete', (e, id) => storage.deleteEvent(id));
  ipcMain.handle('events:duplicate', (e, id) => storage.duplicateEvent(id));
  ipcMain.handle('attachments:pick', async (e, eventId, opts = {}) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: opts.title || 'Add attachment',
      properties: ['openFile', 'multiSelections'],
      filters: opts.filters || [
        { name: 'Documents & images', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp'] },
      ],
    });
    if (res.canceled) return [];
    return res.filePaths.map(fp => ({
      file: storage.addAttachment(eventId, fp),
      name: path.basename(fp),
      ext: path.extname(fp).toLowerCase(),
    }));
  });
  ipcMain.handle('assets:pick', async (e, opts = {}) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: opts.title || 'Choose file',
      properties: ['openFile'],
      filters: opts.filters || [{ name: 'All supported', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'svg'] }],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    return { file: storage.addAsset(res.filePaths[0]), name: path.basename(res.filePaths[0]) };
  });
  ipcMain.handle('file:exists', (e, rel) => storage.fileExists(rel));
  ipcMain.handle('file:dataUrl', (e, rel) => storage.readFileDataUrl(rel));
  ipcMain.handle('print:resources', (e, event) => buildPrintResources(event));
  ipcMain.handle('export:run', async (e, payload) => {
    exportInFlight += 1;
    try { return await runExport(payload); }
    finally {
      exportInFlight -= 1;
      if (pendingQuit && exportInFlight === 0) app.quit();
    }
  });
  ipcMain.handle('shell:reveal', (e, fp) => { shell.showItemInFolder(fp); return true; });
  ipcMain.handle('shell:open', (e, fp) => shell.openPath(fp));
  ipcMain.handle('updates:check', () => checkForUpdates());
  ipcMain.handle('shell:openExternal', (e, url) => {
    if (!/^https?:\/\//i.test(String(url))) return false;
    shell.openExternal(url);
    return true;
  });
}

// ---- Window ------------------------------------------------------------------
function createWindow() {
  let bg = '#0f1115';
  try {
    const ui = storage.getSettings().ui || {};
    if (ui.theme === 'light') bg = '#f3f4f7';
    else if (ui.theme === 'custom' && /^#[0-9a-fA-F]{6}$/.test(ui.customTheme || '')) bg = ui.customTheme;
  } catch { }
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'Interlock',
    backgroundColor: bg,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  const devUrl = process.env.RAMS_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }
}

// Headless runs (--export-sample / --smoke) must not fight the GUI app for the
// single-instance lock: they are short-lived and touch nothing the GUI holds open.
const gotLock = isHeadless ? true : app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    storage.seedIfNeeded();
    registerIpc();
    if (process.argv.includes('--smoke')) {
      // Load the built renderer hidden and report any console errors, then exit.
      const win = new BrowserWindow({
        show: false,
        webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: false },
      });
      const errors = [];
      win.webContents.on('console-message', (e, level, message) => { if (level >= 3) errors.push(message); });
      win.webContents.on('did-fail-load', (e, code, desc) => errors.push(`did-fail-load ${code} ${desc}`));
      try {
        await win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
        await new Promise(r => setTimeout(r, 2500));
        const rootPopulated = await win.webContents.executeJavaScript(
          `document.getElementById('root') && document.getElementById('root').children.length > 0`, true);
        const updates = await checkForUpdates();
        console.log('SMOKE_RESULT ' + JSON.stringify({ rootPopulated, errors, updates }));
        app.exit(errors.length || !rootPopulated ? 1 : 0);
      } catch (err) {
        console.error('SMOKE_ERROR', err);
        app.exit(1);
      }
      return;
    }
    if (isHeadless) {
      try {
        await headlessExport(process.argv);
        app.exit(0);
      } catch (err) {
        console.error('EXPORT_ERROR', err);
        app.exit(1);
      }
      return;
    }
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  // In headless export mode the hidden print window opening/closing must not quit
  // the app; likewise a quit triggered mid-export waits for the PDF to finish.
  app.on('window-all-closed', () => {
    if (isHeadless) return;
    if (exportInFlight > 0) { pendingQuit = true; return; }
    app.quit();
  });
}
