import React from 'react';
import {
  Field, Segmented, TextArea, TextInput, Toggle,
} from '../../components/ui.jsx';

export default function MethodStep({ draft, setDraft, library }) {
  const s = draft.show || {};
  const d = draft.details || {};
  const bp = library.boilerplate || {};
  const setShow = (k, v) => setDraft((prev) => ({ ...prev, show: { ...prev.show, [k]: v } }));

  const eStopSentence = s.eStopVariant === 'digital'
    ? (bp.eStopSentenceDigital || '')
    : (bp.eStopSentenceHardline || '');
  const scanningException = d.audienceScanning ? (bp.scanningExceptionYes || '') : '';

  const standardSteps = (bp.methodSteps || []).map((step) =>
    String(step)
      .replaceAll('{{eStopSentence}}', eStopSentence)
      .replaceAll('{{scanningException}}', scanningException)
  );
  const customSteps = String(s.methodText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      <div className="step-heading">
        <h2>Method & E-Stop</h2>
        <div className="step-desc">
          The numbered method statement, and how emission is killed in an emergency.
        </div>
      </div>

      <section className="card">
        <div className="card-title">Emergency stop</div>
        <div className="stack">
          <Field label="E-Stop variant" hint="Adjusts the method statement wording and the E-Stop specification.">
            <Segmented
              value={s.eStopVariant || 'hardline'}
              onChange={(v) => setShow('eStopVariant', v)}
              options={[
                { value: 'hardline', label: 'Hard-line FOH' },
                { value: 'digital', label: 'Digital' },
              ]}
            />
          </Field>
          <Toggle
            checked={s.includeEStopSpec}
            onChange={(v) => setShow('includeEStopSpec', v)}
            label="Include E-Stop technical specification page"
            sub="Category 0 stop to BS EN ISO 13850. Most reviewers expect this page."
          />
        </div>
      </section>

      <section className="card">
        <div className="card-title">Method statement</div>
        <div className="card-sub">
          The standard steps below print automatically, with your E-Stop and scanning answers
          substituted. Your additional notes are appended as extra numbered steps
          (<span style={{ color: 'var(--accent)' }}>highlighted</span>).
        </div>
        <ol className="method-steps">
          {standardSteps.map((step, i) => <li key={`std-${i}`}>{step}</li>)}
          {customSteps.map((step, i) => <li key={`cus-${i}`} className="custom-step">{step}</li>)}
        </ol>
      </section>

      <section className="card">
        <div className="card-title">Site specifics</div>
        <div className="stack">
          <Field label="Additional site-specific method notes" hint="One step per line, appended after the standard steps.">
            <TextArea
              rows={4}
              value={s.methodText || ''}
              onChange={(e) => setShow('methodText', e.target.value)}
              placeholder={'e.g. Projector positions accessed via scaff tower with venue supervision\nFOH position shared with lighting desk, cable route agreed with production'}
            />
          </Field>
          <div className="form-grid">
            <Field label="First aid location">
              <TextInput
                value={s.firstAidLocation || ''}
                onChange={(e) => setShow('firstAidLocation', e.target.value)}
                placeholder="e.g. Event medical centre, confirmed at site induction"
              />
            </Field>
            <Field label="Show-stop channel">
              <TextInput
                value={s.showStopChannel || ''}
                onChange={(e) => setShow('showStopChannel', e.target.value)}
                placeholder="e.g. Event control via radio; direct line to stage manager"
              />
            </Field>
          </div>
        </div>
      </section>
    </>
  );
}
