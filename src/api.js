// Unified access to the Electron backend. In a plain browser (UI development /
// preview) an in-memory mock backs the same interface so every screen still works.

const hasElectron = typeof window !== 'undefined' && !!window.rams?.isElectron;

function makeMock() {
  const mem = {
    settings: null,
    library: null,
    events: {},
  };
  const seedFetch = async (path) => {
    try { const r = await fetch(path); return r.ok ? await r.json() : null; } catch { return null; }
  };
  const init = (async () => {
    mem.settings = (await seedFetch('/seed/settings.json')) || { company: {}, insurance: {} };
    mem.library = (await seedFetch('/seed/library.json')) || { laserUnits: [], personnel: [], riskLibrary: [], boilerplate: {} };
    const sample = await seedFetch('/seed/events/sample-gottwood-2026.json');
    if (sample) mem.events[sample.id] = sample;
  })();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  return {
    isElectron: false,
    appInfo: async () => ({
      dataDir: '(browser preview, data not persisted)',
      version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    }),
    getSettings: async () => { await init; return clone(mem.settings); },
    saveSettings: async (s) => { mem.settings = clone(s); return clone(s); },
    getLibrary: async () => { await init; return clone(mem.library); },
    saveLibrary: async (l) => { mem.library = clone(l); return clone(l); },
    listEvents: async () => { await init; return Object.values(clone(mem.events)); },
    getEvent: async (id) => { await init; return mem.events[id] ? clone(mem.events[id]) : null; },
    saveEvent: async (ev) => { ev.updatedAt = new Date().toISOString(); mem.events[ev.id] = clone(ev); return clone(ev); },
    deleteEvent: async (id) => { delete mem.events[id]; return true; },
    duplicateEvent: async (id) => {
      const src = mem.events[id]; if (!src) return null;
      const copy = clone(src);
      copy.id = crypto.randomUUID();
      copy.createdFrom = id;
      copy.createdFromName = src.details?.eventName || '';
      copy.createdAt = new Date().toISOString();
      copy.exportHistory = [];
      copy.details.todaysDate = new Date().toISOString().slice(0, 10);
      mem.events[copy.id] = copy;
      return clone(copy);
    },
    pickAttachments: async () => { alert('File dialogs need the desktop app'); return []; },
    pickAsset: async () => { alert('File dialogs need the desktop app'); return null; },
    fileExists: async () => true,
    fileDataUrl: async (rel) => {
      // Serve seed assets from the dev server so previews look like the real app.
      try {
        const r = await fetch('/seed/' + String(rel || '').replace(/^\/+/, ''));
        if (!r.ok) return null;
        const blob = await r.blob();
        return await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => res(null);
          fr.readAsDataURL(blob);
        });
      } catch { return null; }
    },
    printResources: async () => ({ fontCss: '', logoDataUrl: null, images: {} }),
    exportPdf: async () => ({ canceled: true, mockNote: 'PDF export needs the desktop app' }),
    revealPath: async () => false,
    openPath: async () => false,
    openExternal: async (url) => { window.open(url, '_blank', 'noopener'); return true; },
    checkUpdates: async () => ({ state: 'unsupported', current: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev' }),
  };
}

const api = hasElectron ? window.rams : makeMock();
export default api;
