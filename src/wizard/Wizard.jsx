import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api.js';
import { validateEvent } from '../validation.js';
import { buildPrintHtml } from '../print/buildPrintHtml.mjs';
import { Button, Icon, Spinner } from '../components/ui.jsx';
import DetailsStep from './steps/Details.jsx';
import VenueStep from './steps/Venue.jsx';
import PersonnelStep from './steps/Personnel.jsx';
import EquipmentStep from './steps/Equipment.jsx';
import ShowStep from './steps/Show.jsx';
import MethodStep from './steps/Method.jsx';
import RisksStep from './steps/Risks.jsx';
import AttachmentsStep from './steps/Attachments.jsx';
import CheckStep from './steps/Check.jsx';

export const STEPS = [
  { id: 'details', label: 'Event details', component: DetailsStep },
  { id: 'venue', label: 'Venue & site', component: VenueStep },
  { id: 'personnel', label: 'Personnel', component: PersonnelStep },
  { id: 'equipment', label: 'Laser equipment', component: EquipmentStep },
  { id: 'show', label: 'Show & effects', component: ShowStep },
  { id: 'method', label: 'Method & E-Stop', component: MethodStep },
  { id: 'risks', label: 'Risk assessment', component: RisksStep },
  { id: 'attachments', label: 'Attachments', component: AttachmentsStep },
  { id: 'check', label: 'Check & export', component: CheckStep },
];

export default function Wizard({ initialEvent, initialStep, library, settings, updateLibrary, onClose }) {
  const [draft, setDraft] = useState(initialEvent);
  const [stepId, setStepId] = useState(initialStep || 'details');
  const [visited, setVisited] = useState(() => new Set([initialStep || 'details']));
  const [saveState, setSaveState] = useState('saved'); // saved | saving | error
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  /* ------------------------------ Autosave -------------------------------- */

  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const timerRef = useRef(null);
  const firstRef = useRef(true);

  const doSave = async () => {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await api.saveEvent(draftRef.current);
      if (!dirtyRef.current) setSaveState('saved');
    } catch {
      dirtyRef.current = true;
      setSaveState('error');
    }
  };

  useEffect(() => {
    draftRef.current = draft;
    if (firstRef.current) { firstRef.current = false; return undefined; }
    dirtyRef.current = true;
    setSaveState('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, 800);
    return () => clearTimeout(timerRef.current);
  }, [draft]);

  const flushSave = async () => {
    clearTimeout(timerRef.current);
    await doSave();
  };

  const handleBack = async () => {
    await flushSave();
    onClose();
  };

  /* ------------- Check attachment files still exist on disk ---------------- */

  useEffect(() => {
    let alive = true;
    (async () => {
      const atts = draftRef.current.attachments || [];
      if (!atts.length) return;
      const results = await Promise.all(
        atts.map(async (a) => { try { return await api.fileExists(a.file); } catch { return true; } })
      );
      if (!alive) return;
      setDraft((d) => {
        let changed = false;
        const next = (d.attachments || []).map((a) => {
          const idx = atts.findIndex((x) => x.id === a.id);
          if (idx < 0) return a;
          const missing = !results[idx];
          if (!!a._missing !== missing) { changed = true; return { ...a, _missing: missing }; }
          return a;
        });
        return changed ? { ...d, attachments: next } : d;
      });
    })();
    return () => { alive = false; };
  }, []);

  /* ------------------------------ Validation ------------------------------- */

  const validation = useMemo(
    () => validateEvent(draft, library, settings),
    [draft, library, settings]
  );

  const errorsByStep = useMemo(() => {
    const m = {};
    validation.findings.forEach((f) => {
      if (f.level === 'error') m[f.step] = (m[f.step] || 0) + 1;
    });
    return m;
  }, [validation]);

  /* ------------------------------ Navigation ------------------------------- */

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const goToStep = (id) => {
    if (!STEPS.some((s) => s.id === id)) return;
    setVisited((v) => new Set(v).add(id));
    setStepId(id);
  };
  const goPrev = () => { if (stepIndex > 0) goToStep(STEPS[stepIndex - 1].id); };
  const goNext = () => { if (stepIndex < STEPS.length - 1) goToStep(STEPS[stepIndex + 1].id); };

  /* --------------------------- Export & preview ---------------------------- */

  const buildHtml = async () => {
    const event = draftRef.current;
    const resources = await api.printResources(event);
    return buildPrintHtml(event, library, settings, resources);
  };

  const doExport = async () => {
    if (validation.errors.length || exporting) return;
    setExporting(true);
    setExportResult(null);
    try {
      await flushSave();
      const event = draftRef.current;
      const resources = await api.printResources(event);
      const html = buildPrintHtml(event, library, settings, resources);
      const res = await api.exportPdf({ event, html, outPath: null });
      if (res?.canceled) {
        setExportResult({ canceled: true, note: res.mockNote || null });
      } else if (res?.path) {
        // The backend may have appended to exportHistory itself; pick that up,
        // otherwise record the export locally so the "Exported" badge appears.
        let history = null;
        try { history = (await api.getEvent(event.id))?.exportHistory || null; } catch { /* keep local */ }
        setDraft((d) => {
          let hist = history || d.exportHistory || [];
          if (!hist.some((h) => h.path === res.path)) {
            hist = [...hist, { date: new Date().toISOString(), path: res.path }];
          }
          return { ...d, exportHistory: hist };
        });
        setExportResult({ path: res.path, warnings: res.warnings || [] });
      } else {
        setExportResult({ error: res?.error || 'Export did not complete.' });
      }
    } catch (e) {
      setExportResult({ error: String(e?.message || e) });
    } finally {
      setExporting(false);
    }
  };

  /* -------------------------------- Render --------------------------------- */

  const StepComponent = STEPS[stepIndex]?.component || DetailsStep;
  const isLast = stepIndex === STEPS.length - 1;
  const showBanner = !!draft.createdFrom && !bannerDismissed;

  const stepProps = {
    draft, setDraft, library, settings, updateLibrary, goToStep,
    validation,
    // Check step extras:
    doExport, exporting, exportResult, buildHtml, hasErrors: validation.errors.length > 0,
  };

  return (
    <div className="wizard">
      <header className="wizard-top">
        <Button variant="ghost" icon="chevronLeft" onClick={handleBack}>Back to events</Button>
        <input
          className="wizard-title-input"
          value={draft.details?.eventName || ''}
          placeholder="Untitled event"
          aria-label="Event name"
          onChange={(e) =>
            setDraft((d) => ({ ...d, details: { ...d.details, eventName: e.target.value } }))
          }
        />
        <div className={`save-indicator ${saveState}`}>
          {saveState === 'saving' ? (<><Spinner size={13} /> Saving…</>)
            : saveState === 'error' ? 'Save failed, retrying on next change'
            : 'Saved ✓'}
        </div>
      </header>

      <div className="wizard-main">
        <nav className="wizard-steps" aria-label="Wizard steps">
          {STEPS.map((s, i) => {
            const errCount = errorsByStep[s.id] || 0;
            const done = visited.has(s.id) && errCount === 0;
            return (
              <button
                key={s.id}
                type="button"
                className={`step-item${s.id === stepId ? ' current' : ''}`}
                aria-current={s.id === stepId ? 'step' : undefined}
                onClick={() => goToStep(s.id)}
              >
                <span className={`step-num${done ? ' done' : ''}`}>
                  {done ? <Icon name="check" size={12} /> : i + 1}
                </span>
                <span className="step-label">{s.label}</span>
                {errCount > 0 ? (
                  <span className="step-errbadge" title={`${errCount} error${errCount === 1 ? '' : 's'}`}>
                    {errCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="wizard-content">
          <div className="wizard-scroll">
            <div className="wizard-body">
              {showBanner ? (
                <div className="dup-banner">
                  <span className="dup-ic"><Icon name="copy" size={16} /></span>
                  <span className="grow">
                    Duplicated from <b>{draft.createdFromName || 'a previous event'}</b>. Review
                    each step; dates, venue details and attachments carry over.
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Dismiss"
                    onClick={() => setBannerDismissed(true)}
                  >
                    <Icon name="x" size={15} />
                  </button>
                </div>
              ) : null}
              <StepComponent {...stepProps} />
            </div>
          </div>

          <footer className="wizard-bottom">
            <Button variant="secondary" icon="chevronLeft" onClick={goPrev} disabled={stepIndex === 0}>
              Previous
            </Button>
            <span className="grow" />
            {isLast ? (
              <Button
                variant="primary"
                icon={exporting ? undefined : 'download'}
                onClick={doExport}
                disabled={validation.errors.length > 0 || exporting}
                title={validation.errors.length > 0 ? 'Fix the errors on the Check step first' : undefined}
              >
                {exporting ? (<><Spinner size={14} /> Exporting…</>) : 'Export PDF'}
              </Button>
            ) : (
              <Button variant="primary" onClick={goNext}>
                Next
                <Icon name="chevronRight" size={15} />
              </Button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
