import React, { useState } from 'react';
import { resolveBoilerplate } from '../../print/buildPrintHtml.mjs';
import {
  Button, Callout, Field, TextArea, Toggle, YesNo,
} from '../../components/ui.jsx';
import { ConfirmModal } from '../../components/Modal.jsx';

function terminationPhrase(details) {
  if (details.indoorOutdoor !== 'outdoor') {
    return 'onto defined non-reflective surfaces within the venue';
  }
  switch (details.outdoorTermination) {
    case 'sky': return 'into open sky in accordance with the aviation safety section of this document';
    case 'structure': return 'onto defined non-reflective structures';
    case 'treeline': return 'into the treeline beyond the audience area';
    default: return 'onto defined non-reflective surfaces';
  }
}

function unitSummary(draft, library) {
  const units = library.laserUnits || [];
  const parts = (draft.equipment || [])
    .map((row) => {
      const u = units.find((x) => x.id === row.unitId);
      if (!u) return null;
      return `${row.qty}× ${u.name} (${[u.laserClass, u.totalPower].filter(Boolean).join(', ')})`;
    })
    .filter(Boolean);
  return parts.length ? parts.join('; ') : 'custom-built RGB projectors';
}

function controlRuns(draft, library) {
  const units = library.laserUnits || [];
  const controls = [...new Set(
    (draft.equipment || [])
      .map((row) => units.find((x) => x.id === row.unitId)?.control)
      .filter(Boolean)
  )];
  return controls.length ? controls.join('; ') : 'FB3 + ILDA control runs';
}

export default function ShowStep({ draft, setDraft, library }) {
  const d = draft.details || {};
  const s = draft.show || {};
  const bp = resolveBoilerplate(library, draft.jurisdiction);
  const [confirmInsert, setConfirmInsert] = useState(null); // { key, text }

  const setShow = (k, v) => setDraft((prev) => ({ ...prev, show: { ...prev.show, [k]: v } }));
  const setDetail = (k, v) => setDraft((prev) => ({ ...prev, details: { ...prev.details, [k]: v } }));

  const standardEffects = () =>
    String(bp.effectsTemplate || '').replaceAll('{{termination}}', terminationPhrase(d));
  const standardUnits = () =>
    String(bp.unitsControlTemplate || '')
      .replaceAll('{{unitSummary}}', unitSummary(draft, library))
      .replaceAll('{{controlRuns}}', controlRuns(draft, library));

  const insert = (key, text) => {
    if ((s[key] || '').trim() && s[key].trim() !== text.trim()) {
      setConfirmInsert({ key, text });
    } else {
      setShow(key, text);
    }
  };

  return (
    <>
      <div className="step-heading">
        <h2>Show & effects</h2>
        <div className="step-desc">
          What the display looks like, how it is controlled, and whether the audience is ever scanned.
        </div>
      </div>

      <section className="card">
        <div className="card-head-row">
          <div className="card-title">Effects & application</div>
          <Button
            variant="secondary" className="btn-sm"
            onClick={() => insert('effectsText', standardEffects())}
            disabled={!bp.effectsTemplate}
          >
            Insert standard text
          </Button>
        </div>
        <Field hint="Standard text adapts the termination wording to your venue answers.">
          <TextArea
            rows={6}
            value={s.effectsText || ''}
            onChange={(e) => setShow('effectsText', e.target.value)}
            placeholder="Describe the effects, control software and desired look…"
          />
        </Field>
      </section>

      <section className="card">
        <div className="card-head-row">
          <div className="card-title">Units & control</div>
          <Button
            variant="secondary" className="btn-sm"
            onClick={() => insert('unitsControlText', standardUnits())}
            disabled={!bp.unitsControlTemplate}
          >
            Insert standard text
          </Button>
        </div>
        <Field hint="Standard text summarises the units selected on the Equipment step.">
          <TextArea
            rows={5}
            value={s.unitsControlText || ''}
            onChange={(e) => setShow('unitsControlText', e.target.value)}
            placeholder="Projector build, wavelengths, control system, physical masking…"
          />
        </Field>
      </section>

      <section className="card">
        <div className="card-title">Audience exposure</div>
        <div className="stack">
          <Field label="Audience scanning" hint="Deliberately directing effects into audience-accessible areas.">
            <YesNo value={d.audienceScanning} onChange={(v) => setDetail('audienceScanning', v)} />
          </Field>

          {d.audienceScanning ? (
            <>
              <Callout tone="warn" title="Engineered safety case required">
                Audience scanning demands a verified exposure assessment under PD IEC TR 60825-3
                and PLASA guidance: measured irradiance at the closest audience position through a
                7 mm aperture, under normal and simulated-failure conditions, below the MPE.
                Reviewers will expect the measurement records appended.
              </Callout>
              <Field
                label="Measurement details" required
                hint="Instrument used, measured irradiance at the closest audience position, and method."
              >
                <TextArea
                  rows={4}
                  value={s.scanningMeasurements || ''}
                  onChange={(e) => setShow('scanningMeasurements', e.target.value)}
                  placeholder="e.g. Measured with <instrument> through 7 mm aperture at closest audience position; peak irradiance <value> W/m² under normal and scan-failure conditions…"
                />
              </Field>
              <Toggle
                checked={d.childrenPresent}
                onChange={(v) => setDetail('childrenPresent', v)}
                label="Performance intended for children"
                sub="Reduces the exposure limit by a factor of 10 below 500 nm in the safety-case wording."
              />
            </>
          ) : null}

          <Field label="Audience exposure from diffraction effects" hint="Gratings or beam-splitting effects directed toward the audience.">
            <YesNo
              value={d.audienceExposureDiffraction}
              onChange={(v) => setDetail('audienceExposureDiffraction', v)}
            />
          </Field>
        </div>
      </section>

      {confirmInsert ? (
        <ConfirmModal
          title="Replace existing text?"
          message="This will replace what you’ve written with the standard template text."
          confirmLabel="Replace text"
          danger={false}
          onConfirm={() => { setShow(confirmInsert.key, confirmInsert.text); setConfirmInsert(null); }}
          onCancel={() => setConfirmInsert(null)}
        />
      ) : null}
    </>
  );
}
