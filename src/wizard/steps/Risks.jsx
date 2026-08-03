import React, { useState } from 'react';
import { resolveRisk } from '../../validation.js';
import {
  Badge, Button, Field, Icon, PersonsPicker, ScoreChip, TextArea, TextInput,
  PERSON_CODES, EmptyState,
} from '../../components/ui.jsx';
import { Modal } from '../../components/Modal.jsx';
import { ScorePair } from '../../components/editors.jsx';

const OVERRIDE_KEYS = ['hazard', 'risk', 'persons', 'controls', 'action', 'initL', 'initS', 'resL', 'resS'];

export default function RisksStep({ draft, setDraft, library }) {
  const rows = draft.risks || [];
  const [expanded, setExpanded] = useState(() => new Set());
  const [picking, setPicking] = useState(false);

  const setRows = (next) => setDraft((prev) => ({ ...prev, risks: next }));
  const setRowField = (i, key, value) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const toggleExpand = (i) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const removeRow = (i) => {
    setRows(rows.filter((_, idx) => idx !== i));
    setExpanded((prev) => {
      const next = new Set();
      prev.forEach((idx) => { if (idx < i) next.add(idx); else if (idx > i) next.add(idx - 1); });
      return next;
    });
  };

  const addCustom = () => {
    const next = [...rows, {
      libId: null, hazard: '', risk: '', persons: 'E, C', controls: '', action: '',
      initL: 3, initS: 3, resL: 1, resS: 3,
    }];
    setRows(next);
    setExpanded((prev) => new Set(prev).add(next.length - 1));
  };

  const usedLibIds = new Set(rows.map((r) => r.libId).filter(Boolean));
  const unusedLibRisks = (library.riskLibrary || []).filter((r) => !usedLibIds.has(r.id));

  const addFromLibrary = (libRisk) => {
    setRows([...rows, { libId: libRisk.id }]);
  };

  return (
    <>
      <div className="step-heading">
        <h2>Risk assessment</h2>
        <div className="step-desc">
          The L×S risk table. Library rows can be edited locally for this event without changing the library.
        </div>
      </div>

      <div className="card-head-row">
        <div className="muted small">{rows.length} risk row{rows.length === 1 ? '' : 's'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary" className="btn-sm" icon="plus"
            onClick={() => setPicking(true)}
            disabled={unusedLibRisks.length === 0}
            title={unusedLibRisks.length === 0 ? 'All library risks are already in the table' : undefined}
          >
            Add from library
          </Button>
          <Button variant="primary" className="btn-sm" icon="plus" onClick={addCustom}>
            Add custom risk
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="alert" title="The risk table is empty">
          A RAMS without risk rows can’t be issued. Add the standard rows from the library or a custom risk.
        </EmptyState>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {rows.map((row, i) => (
            <RiskRow
              key={row.libId ? `lib-${row.libId}` : `custom-${i}`}
              row={row}
              resolved={resolveRisk(row, library) || {}}
              expanded={expanded.has(i)}
              onToggle={() => toggleExpand(i)}
              onField={(k, v) => setRowField(i, k, v)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </div>
      )}

      <section className="card">
        <div className="card-title">Scoring key</div>
        <div className="legend-grid">
          <div>
            <h4>Likelihood (L)</h4>
            <div className="legend-list">
              <span><b>1</b> Rare</span>
              <span><b>2</b> Unlikely</span>
              <span><b>3</b> Possible</span>
              <span><b>4</b> Likely</span>
              <span><b>5</b> Almost certain</span>
            </div>
          </div>
          <div>
            <h4>Severity (S)</h4>
            <div className="legend-list">
              <span><b>1</b> Negligible</span>
              <span><b>2</b> Minor injury</span>
              <span><b>3</b> Injury (medical treatment)</span>
              <span><b>4</b> Major injury</span>
              <span><b>5</b> Fatality / catastrophic</span>
            </div>
          </div>
          <div>
            <h4>Risk bands (L × S)</h4>
            <div className="legend-bands">
              <span className="legend-band-row"><span className="band-swatch" style={{ background: 'var(--band-low)' }} /> 1–4 Low</span>
              <span className="legend-band-row"><span className="band-swatch" style={{ background: 'var(--band-medium)' }} /> 5–9 Medium</span>
              <span className="legend-band-row"><span className="band-swatch" style={{ background: 'var(--band-high)' }} /> 10–15 High</span>
              <span className="legend-band-row"><span className="band-swatch" style={{ background: 'var(--band-veryhigh)' }} /> 16–25 Very High</span>
            </div>
          </div>
          <div>
            <h4>Persons at risk</h4>
            <div className="legend-list">
              {PERSON_CODES.map((p) => (
                <span key={p.code}><b>{p.code}</b> {p.label}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {picking ? (
        <Modal title="Add risks from the library" onClose={() => setPicking(false)}>
          {unusedLibRisks.length === 0 ? (
            <p className="muted">Every library risk is already in the table.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {unusedLibRisks.map((r) => (
                <div key={r.id} className="equip-row" style={{ flexWrap: 'nowrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="td-main" style={{ fontSize: 13.5 }}>{r.hazard}</div>
                    <div className="td-sub" style={{ marginTop: 2 }}>{r.risk}</div>
                  </div>
                  <ScoreChip l={r.resL} s={r.resS} />
                  <Button variant="secondary" className="btn-sm" onClick={() => addFromLibrary(r)}>Add</Button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      ) : null}
    </>
  );
}

function RiskRow({ row, resolved, expanded, onToggle, onField, onRemove }) {
  const isLib = !!row.libId;
  const editedLocally = isLib && OVERRIDE_KEYS.some((k) => row[k] !== undefined && row[k] !== null && row[k] !== '');

  return (
    <div className={`risk-row${expanded ? ' expanded' : ''}`}>
      <div
        className="risk-row-head"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      >
        <span className="risk-chev"><Icon name="chevronRight" size={14} /></span>
        <span className="risk-hazard">
          {resolved.hazard || <span className="placeholder">New risk: describe the hazard</span>}
        </span>
        {isLib
          ? <Badge tone="neutral">{editedLocally ? 'Library · edited' : 'Library'}</Badge>
          : <Badge tone="blue">Custom</Badge>}
        <span className="risk-scores">
          <ScoreChip l={resolved.initL} s={resolved.initS} />
          <span className="arrow">→</span>
          <ScoreChip l={resolved.resL} s={resolved.resS} />
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="btn-icon" aria-label="Remove risk" onClick={onRemove}>
            <Icon name="trash" size={14} />
          </Button>
        </span>
      </div>

      {expanded ? (
        <div className="risk-row-body">
          {isLib ? (
            <div className="field-hint" style={{ marginTop: 10 }}>
              Changes here apply to this event only. The library row is untouched.
            </div>
          ) : null}
          <div className="form-grid">
            <Field label="Hazard" className="span2">
              <TextInput value={resolved.hazard || ''} onChange={(e) => onField('hazard', e.target.value)} />
            </Field>
            <Field label="Risk (what could happen)" className="span2">
              <TextArea rows={2} value={resolved.risk || ''} onChange={(e) => onField('risk', e.target.value)} />
            </Field>
            <Field label="Persons at risk" className="span2">
              <PersonsPicker value={resolved.persons || ''} onChange={(v) => onField('persons', v)} />
            </Field>
            <Field label="Control measures" className="span2">
              <TextArea rows={4} value={resolved.controls || ''} onChange={(e) => onField('controls', e.target.value)} />
            </Field>
            <Field label="Action / monitoring" className="span2">
              <TextArea rows={2} value={resolved.action || ''} onChange={(e) => onField('action', e.target.value)} />
            </Field>
            <ScorePair
              label="Initial risk (L × S)"
              l={resolved.initL} s={resolved.initS}
              onL={(v) => onField('initL', v)} onS={(v) => onField('initS', v)}
            />
            <ScorePair
              label="Residual risk (L × S)"
              l={resolved.resL} s={resolved.resS}
              onL={(v) => onField('resL', v)} onS={(v) => onField('resS', v)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
