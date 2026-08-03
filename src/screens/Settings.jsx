import React, { useRef, useState } from 'react';
import api from '../api.js';
import { Button, Callout, Icon, Segmented } from '../components/ui.jsx';
import {
  ACCENTS, applyAccent, applyTheme,
  DEFAULT_CUSTOM_ACCENT, DEFAULT_CUSTOM_THEME,
} from '../components/theme.js';
import { useSettingsDraft, SaveIndicatorText } from '../components/useSettingsDraft.js';

export default function Settings({ settings, updateSettings, appInfo }) {
  const { draft, setDraft, saveState } = useSettingsDraft(settings, updateSettings);
  const accent = draft.ui?.accent || 'green';
  const theme = draft.ui?.theme || 'dark';
  const customAccent = draft.ui?.customAccent || DEFAULT_CUSTOM_ACCENT;
  const customTheme = draft.ui?.customTheme || DEFAULT_CUSTOM_THEME;
  const accentPickerRef = useRef(null);

  const chooseAccent = (key, hex = customAccent) => {
    applyAccent(key, hex);
    setDraft((d) => ({ ...d, ui: { ...d.ui, accent: key, customAccent: hex } }));
  };

  const chooseTheme = (mode, hex = customTheme) => {
    applyTheme(mode, hex);
    setDraft((d) => ({ ...d, ui: { ...d.ui, theme: mode, customTheme: hex } }));
  };

  const [update, setUpdate] = useState(null); // null | 'checking' | result object
  const checkUpdates = async () => {
    setUpdate('checking');
    try { setUpdate(await api.checkUpdates()); }
    catch { setUpdate({ state: 'error', message: 'Something went wrong. Try again.' }); }
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Settings</h1>
          <div className="screen-sub">Appearance and data storage</div>
        </div>
        <div className={`save-indicator ${saveState}`}>{SaveIndicatorText(saveState)}</div>
      </div>

      <div className="stack-lg">
        <section className="card">
          <div className="card-title">Appearance</div>
          <div className="card-sub">Theme and accent colour for buttons, highlights and the step rail.</div>
          <div style={{ marginBottom: 16, maxWidth: 380 }}>
            <Segmented
              value={theme}
              onChange={chooseTheme}
              options={[
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            {theme === 'custom' ? (
              <div className="custom-colour-row">
                <input
                  type="color"
                  className="colour-input"
                  value={customTheme}
                  aria-label="Custom theme base colour"
                  onChange={(e) => chooseTheme('custom', e.target.value)}
                />
                <span className="mono small">{customTheme}</span>
                <span className="muted small">
                  Base background colour. The rest of the palette is derived from it.
                </span>
              </div>
            ) : null}
          </div>
          <div className="accent-row">
            {Object.entries(ACCENTS).map(([key, a]) => (
              <button
                key={key}
                type="button"
                className={`accent-swatch${accent === key ? ' active' : ''}`}
                title={a.label}
                aria-label={a.label}
                onClick={() => chooseAccent(key)}
              >
                <span className="accent-dot" style={{ background: a.accent }} />
                <span className="accent-name">{a.label}</span>
                {accent === key ? <Icon name="check" size={13} /> : null}
              </button>
            ))}
            <button
              type="button"
              className={`accent-swatch${accent === 'custom' ? ' active' : ''}`}
              title="Pick any colour"
              aria-label="Custom accent colour"
              onClick={() => {
                if (accent !== 'custom') chooseAccent('custom');
                accentPickerRef.current?.click();
              }}
            >
              <span className="accent-dot accent-dot-custom" style={accent === 'custom' ? { background: customAccent } : undefined} />
              <span className="accent-name">Custom{accent === 'custom' ? ` (${customAccent})` : ''}</span>
              {accent === 'custom' ? <Icon name="check" size={13} /> : null}
              <input
                ref={accentPickerRef}
                type="color"
                className="colour-input-hidden"
                value={customAccent}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => chooseAccent('custom', e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Updates</div>
          <div className="card-sub">
            Updates are never installed automatically. Check whenever you like; if a newer
            version exists you can open the download page and replace the app in your own time.
          </div>
          <div className="file-slot">
            <span className="file-ic"><Icon name="download" size={15} /></span>
            <span className="file-name">
              Current version: {appInfo?.version ? `v${appInfo.version}` : 'unknown'}
            </span>
            <Button
              variant="secondary"
              className="btn-sm"
              onClick={checkUpdates}
              disabled={update === 'checking'}
            >
              {update === 'checking' ? 'Checking…' : 'Check for updates'}
            </Button>
          </div>
          {update && update !== 'checking' ? (
            update.state === 'update' ? (
              <Callout tone="success" title={`Version ${update.latest} is available`}>
                <p>You are on v{update.current}. {update.name ? `Latest release: ${update.name}.` : ''}</p>
                {update.notes ? <p style={{ whiteSpace: 'pre-wrap' }}>{update.notes}</p> : null}
                <Button
                  variant="primary"
                  className="btn-sm"
                  onClick={() => api.openExternal(update.url).catch(() => {})}
                  style={{ marginTop: 8 }}
                >
                  Open download page
                </Button>
              </Callout>
            ) : update.state === 'current' ? (
              <Callout tone="info" title="You are up to date">
                v{update.current} is the latest release.
              </Callout>
            ) : update.state === 'none' ? (
              <Callout tone="info" title="No releases published yet">
                The project repository exists but has no published releases to compare against.
              </Callout>
            ) : update.state === 'unconfigured' ? (
              <Callout tone="info" title="Update checking not set up">
                This build has no release repository configured, so there is nothing to check
                against yet.
              </Callout>
            ) : update.state === 'unsupported' ? (
              <Callout tone="info" title="Not available in the browser preview">
                Update checks run in the desktop app.
              </Callout>
            ) : (
              <Callout tone="warn" title="Could not check for updates">
                {update.message || 'Try again later.'}
              </Callout>
            )
          ) : null}
        </section>

        <section className="card">
          <div className="card-title">Data storage</div>
          <div className="card-sub">
            Every event, the library, company details and attachments are plain files in this
            folder. It currently lives inside your Dropbox, so everything is synced and backed
            up automatically. Any folder synced by Dropbox or Google Drive works the same way.
            To move it, edit <span className="mono">rams.config.json</span> next to the app.
          </div>
          <div className="file-slot">
            <span className="file-ic"><Icon name="folder" size={15} /></span>
            <span className="file-name mono" title={appInfo?.dataDir || ''}>{appInfo?.dataDir || '—'}</span>
            <Button
              variant="secondary"
              className="btn-sm"
              onClick={() => { if (appInfo?.dataDir) api.openPath(appInfo.dataDir).catch(() => {}); }}
            >
              Open folder
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
