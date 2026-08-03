import React, { useEffect, useRef, useState } from 'react';
import api from './api.js';
import { makeNewEvent } from './newEvent.js';
import { Icon, Spinner } from './components/ui.jsx';
import Home from './screens/Home.jsx';
import Library from './screens/Library.jsx';
import Company from './screens/Company.jsx';
import Crew from './screens/Crew.jsx';
import Insurance from './screens/Insurance.jsx';
import Settings from './screens/Settings.jsx';
import About from './screens/About.jsx';
import Wizard from './wizard/Wizard.jsx';
import { applyAccent, applyTheme } from './components/theme.js';

export const PRODUCT_NAME = 'Interlock';

const NAV = [
  { id: 'home', label: 'Events', icon: 'zap' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'company', label: 'Company', icon: 'building' },
  { id: 'crew', label: 'Crew', icon: 'users' },
  { id: 'insurance', label: 'Insurance', icon: 'shield' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'about', label: 'About', icon: 'info' },
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [wizard, setWizard] = useState(null); // { event, initialStep? }
  const [settings, setSettings] = useState(null);
  const [library, setLibrary] = useState(null);
  const [appInfo, setAppInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [brandLogo, setBrandLogo] = useState(null);

  // Sidebar shows the company's own logo once one is uploaded in Company.
  const logoAsset = settings?.company?.logoAsset;
  useEffect(() => {
    let alive = true;
    if (!logoAsset) { setBrandLogo(null); return undefined; }
    api.fileDataUrl(logoAsset)
      .then((url) => { if (alive) setBrandLogo(url); })
      .catch(() => { if (alive) setBrandLogo(null); });
    return () => { alive = false; };
  }, [logoAsset]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, l, info] = await Promise.all([api.getSettings(), api.getLibrary(), api.appInfo()]);
        if (!alive) return;
        setSettings(s || { company: {}, insurance: {} });
        applyAccent(s?.ui?.accent, s?.ui?.customAccent);
        applyTheme(s?.ui?.theme, s?.ui?.customTheme);
        setLibrary(l || { laserUnits: [], personnel: [], riskLibrary: [], boilerplate: {} });
        setAppInfo(info || {});
      } catch (e) {
        if (alive) setLoadError(String(e?.message || e));
      }
    })();
    return () => { alive = false; };
  }, []);

  // Library saves are debounced so Boilerplate typing doesn't hammer the disk;
  // the in-memory state updates immediately.
  const libSaveTimer = useRef(null);
  const updateLibrary = (next) => {
    setLibrary(next);
    clearTimeout(libSaveTimer.current);
    libSaveTimer.current = setTimeout(() => { api.saveLibrary(next).catch(() => {}); }, 500);
  };

  const updateSettings = (next) => setSettings(next);

  const openWizard = (event, opts = {}) => setWizard({ event, initialStep: opts.initialStep || null });

  const handleNewEvent = async () => {
    const ev = makeNewEvent(library, settings);
    try { await api.saveEvent(ev); } catch { /* draft still opens; wizard autosave retries */ }
    openWizard(ev);
  };

  const handleOpenEvent = async (id, opts = {}) => {
    const ev = await api.getEvent(id);
    if (ev) openWizard(ev, opts);
  };

  const handleDuplicateEvent = async (id) => {
    const copy = await api.duplicateEvent(id);
    if (copy) openWizard(copy);
  };

  if (loadError) {
    return (
      <div className="app-loading">
        <Icon name="alert" size={18} />
        Failed to load app data: {loadError}
      </div>
    );
  }

  if (!settings || !library) {
    return <div className="app-loading"><Spinner size={17} /> Loading…</div>;
  }

  if (wizard) {
    return (
      <Wizard
        key={wizard.event.id}
        initialEvent={wizard.event}
        initialStep={wizard.initialStep}
        library={library}
        settings={settings}
        updateLibrary={updateLibrary}
        onClose={() => setWizard(null)}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className={`brand-mark${brandLogo ? ' has-logo' : ''}`}>
            {brandLogo ? <img src={brandLogo} alt="" /> : <Icon name="zap" size={17} />}
          </span>
          <div className="brand-name">{settings.company?.name || 'Your company'}</div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${screen === item.id ? ' active' : ''}`}
              onClick={() => setScreen(item.id)}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button
            type="button"
            className="foot-brand"
            title="About Interlock"
            onClick={() => setScreen('about')}
          >
            <span className="foot-product">{PRODUCT_NAME}</span>
            {appInfo?.version ? <span className="foot-version">v{appInfo.version}</span> : null}
          </button>
        </div>
      </aside>
      <main className="content">
        {screen === 'home' && (
          <Home
            onNew={handleNewEvent}
            onOpen={handleOpenEvent}
            onDuplicate={handleDuplicateEvent}
          />
        )}
        {screen === 'library' && <Library library={library} updateLibrary={updateLibrary} />}
        {screen === 'company' && (
          <Company key="company" settings={settings} updateSettings={updateSettings} />
        )}
        {screen === 'crew' && <Crew library={library} updateLibrary={updateLibrary} />}
        {screen === 'insurance' && (
          <Insurance key="insurance" settings={settings} updateSettings={updateSettings} />
        )}
        {screen === 'settings' && (
          <Settings key="settings" settings={settings} updateSettings={updateSettings} appInfo={appInfo} />
        )}
        {screen === 'about' && <About />}
      </main>
    </div>
  );
}
