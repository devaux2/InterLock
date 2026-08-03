// Storage layer: JSON persistence + attachment files under the data dir.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let dataDirCache = null;

// Read-only bundled assets (seed/, print/fonts, src/print). In a packaged app
// these are shipped as extraResources next to the asar.
function assetRoot() {
  return app.isPackaged ? process.resourcesPath : app.getAppPath();
}

// Where rams.config.json and (by default) the data dir live. A portable exe
// extracts itself to %TEMP%, so use the folder the user actually launched from.
function portableRoot() {
  if (!app.isPackaged) return app.getAppPath();
  return process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
}

function resolveDataDir() {
  if (dataDirCache) return dataDirCache;
  const cfgPath = path.join(portableRoot(), 'rams.config.json');
  let dir = null;
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg.dataDir) {
      dir = path.isAbsolute(cfg.dataDir) ? cfg.dataDir : path.join(portableRoot(), cfg.dataDir);
    }
  } catch { /* no config */ }
  if (!dir) {
    dir = app.isPackaged && process.env.PORTABLE_EXECUTABLE_DIR
      ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data')
      : app.isPackaged ? path.join(app.getPath('userData'), 'data')
        : path.join(app.getAppPath(), 'data');
  }
  fs.mkdirSync(dir, { recursive: true });
  dataDirCache = dir;
  return dir;
}

function p(...parts) { return path.join(resolveDataDir(), ...parts); }

function readJson(file, fallback) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    // Transient read failure (e.g. Dropbox sync lock) — do NOT treat the file as
    // empty, or a later save would wipe it. Surface the failure instead.
    throw e;
  }
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON: keep a backup so a subsequent save can never silently
    // destroy the only copy of the user's data.
    try {
      const bak = `${file}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
      if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
    } catch { }
    return fallback;
  }
}

function writeJsonAtomic(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

// ---- First-run seeding -------------------------------------------------------
function seedIfNeeded() {
  const seedDir = path.join(assetRoot(), 'seed');
  if (!fs.existsSync(seedDir)) return;
  const dd = resolveDataDir();
  fs.mkdirSync(p('events'), { recursive: true });
  fs.mkdirSync(p('attachments'), { recursive: true });
  fs.mkdirSync(p('assets'), { recursive: true });
  fs.mkdirSync(p('tmp'), { recursive: true });

  if (!fs.existsSync(p('settings.json'))) {
    const s = readJson(path.join(seedDir, 'settings.json'), null);
    if (s) writeJsonAtomic(p('settings.json'), s);
  }
  if (!fs.existsSync(p('library.json'))) {
    const l = readJson(path.join(seedDir, 'library.json'), null);
    if (l) writeJsonAtomic(p('library.json'), l);
  }
  // Seed sample events once (marker file prevents re-adding after user deletes them)
  const marker = p('.seeded-events');
  if (!fs.existsSync(marker)) {
    const evDir = path.join(seedDir, 'events');
    if (fs.existsSync(evDir)) {
      for (const f of fs.readdirSync(evDir).filter(f => f.endsWith('.json'))) {
        const ev = readJson(path.join(evDir, f), null);
        if (ev && !fs.existsSync(p('events', f))) writeJsonAtomic(p('events', f), ev);
      }
    }
    fs.writeFileSync(marker, new Date().toISOString());
  }
  // Copy seed assets (logo etc.) if missing
  const seedAssets = path.join(seedDir, 'assets');
  if (fs.existsSync(seedAssets)) {
    for (const f of fs.readdirSync(seedAssets)) {
      const dst = p('assets', f);
      if (!fs.existsSync(dst)) fs.copyFileSync(path.join(seedAssets, f), dst);
    }
  }
  return dd;
}

// ---- Settings / library ------------------------------------------------------
const getSettings = () => readJson(p('settings.json'), {});
const saveSettings = (s) => { writeJsonAtomic(p('settings.json'), s); return s; };
const getLibrary = () => readJson(p('library.json'), { laserUnits: [], personnel: [], riskLibrary: [], boilerplate: {} });
const saveLibrary = (l) => { writeJsonAtomic(p('library.json'), l); return l; };

// ---- Events ------------------------------------------------------------------
function listEvents() {
  const dir = p('events');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJson(path.join(dir, f), null))
    .filter(Boolean)
    .sort((a, b) => String(b.details?.eventDateStart || '').localeCompare(String(a.details?.eventDateStart || '')));
}
const getEvent = (id) => readJson(p('events', id + '.json'), null);
function saveEvent(ev) {
  ev.updatedAt = new Date().toISOString();
  writeJsonAtomic(p('events', ev.id + '.json'), ev);
  return ev;
}
function deleteEvent(id) {
  try { fs.rmSync(p('events', id + '.json')); } catch { }
  try { fs.rmSync(p('attachments', id), { recursive: true, force: true }); } catch { }
  return true;
}
function duplicateEvent(id) {
  const src = getEvent(id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = crypto.randomUUID();
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  copy.createdFrom = id;
  copy.createdFromName = src.details?.eventName || '';
  copy.exportHistory = [];
  copy.details.todaysDate = new Date().toISOString().slice(0, 10);
  // Copy attachment files so deleting the original doesn't break the duplicate
  const srcDir = p('attachments', id);
  const dstDir = p('attachments', copy.id);
  if (fs.existsSync(srcDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
    for (const att of copy.attachments || []) {
      const base = path.basename(att.file || '');
      const from = path.join(srcDir, base);
      if (base && fs.existsSync(from)) {
        fs.copyFileSync(from, path.join(dstDir, base));
        att.file = path.join('attachments', copy.id, base).replace(/\\/g, '/');
      }
    }
  }
  saveEvent(copy);
  return copy;
}

// ---- Attachments & assets ----------------------------------------------------
function addAttachment(eventId, sourcePath) {
  const base = crypto.randomUUID().slice(0, 8) + '-' + path.basename(sourcePath);
  const dstDir = p('attachments', eventId);
  fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(dstDir, base));
  return path.join('attachments', eventId, base).replace(/\\/g, '/');
}
function addAsset(sourcePath) {
  const base = crypto.randomUUID().slice(0, 8) + '-' + path.basename(sourcePath);
  fs.mkdirSync(p('assets'), { recursive: true });
  fs.copyFileSync(sourcePath, p('assets', base));
  return path.join('assets', base).replace(/\\/g, '/');
}
function absPath(relOrAbs) {
  if (!relOrAbs) return null;
  return path.isAbsolute(relOrAbs) ? relOrAbs : p(relOrAbs);
}
function fileExists(relOrAbs) {
  const a = absPath(relOrAbs);
  return !!(a && fs.existsSync(a));
}
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
function readFileDataUrl(relOrAbs) {
  const a = absPath(relOrAbs);
  if (!a || !fs.existsSync(a)) return null;
  const mime = MIME[path.extname(a).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(a).toString('base64')}`;
}

module.exports = {
  assetRoot, portableRoot, resolveDataDir, seedIfNeeded, p,
  getSettings, saveSettings, getLibrary, saveLibrary,
  listEvents, getEvent, saveEvent, deleteEvent, duplicateEvent,
  addAttachment, addAsset, absPath, fileExists, readFileDataUrl,
};
