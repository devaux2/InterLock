import React, { useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { Badge, Button, Icon, ScoreChip, TextArea } from '../components/ui.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { UnitEditModal, RiskEditModal } from '../components/editors.jsx';
import { fileName, labelize } from '../components/util.jsx';

const TABS = [
  { id: 'units', label: 'Laser units' },
  { id: 'risks', label: 'Standard risks' },
  { id: 'boilerplate', label: 'Boilerplate' },
];

export default function Library({ library, updateLibrary }) {
  const [tab, setTab] = useState('units');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.listEvents().then((evs) => setEvents(evs || [])).catch(() => {});
  }, []);

  const usage = useMemo(() => ({
    unit: (id) => events.filter((ev) => (ev.equipment || []).some((e) => e.unitId === id)).length,
    risk: (id) => events.filter((ev) => (ev.risks || []).some((r) => r.libId === id)).length,
  }), [events]);

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Library</h1>
          <div className="screen-sub">Reusable laser units, standard risks and document text (crew is managed in Settings)</div>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'units' && <UnitsTab library={library} updateLibrary={updateLibrary} usage={usage} />}
      {tab === 'risks' && <RisksTab library={library} updateLibrary={updateLibrary} usage={usage} />}
      {tab === 'boilerplate' && <BoilerplateTab library={library} updateLibrary={updateLibrary} />}
    </div>
  );
}

/* ------------------------------ Units tab --------------------------------- */

function UnitsTab({ library, updateLibrary, usage }) {
  const [editing, setEditing] = useState(null); // unit | 'new'
  const [deleting, setDeleting] = useState(null);
  const units = library.laserUnits || [];

  const save = (unit) => {
    const isNew = editing === 'new';
    const next = isNew
      ? [...units, { ...unit, id: crypto.randomUUID() }]
      : units.map((u) => (u.id === editing.id ? { ...editing, ...unit } : u));
    updateLibrary({ ...library, laserUnits: next });
    setEditing(null);
  };

  const remove = () => {
    updateLibrary({ ...library, laserUnits: units.filter((u) => u.id !== deleting.id) });
    setDeleting(null);
  };

  return (
    <div className="stack">
      <div className="card-head-row">
        <div className="muted small">{units.length} unit type{units.length === 1 ? '' : 's'}</div>
        <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>New unit type</Button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Class</th><th>Power</th><th>Wavelengths</th><th>Tech sheet</th><th></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id}>
                <td className="td-main">{u.name}</td>
                <td>{u.laserClass}</td>
                <td>{u.totalPower}</td>
                <td className="td-sub">{u.wavelengths}</td>
                <td>
                  {u.techSheetAsset
                    ? <span title={fileName(u.techSheetAsset)}><Badge tone="green">PDF</Badge></span>
                    : <span className="muted">—</span>}
                </td>
                <td className="td-actions">
                  <Button variant="ghost" className="btn-sm" onClick={() => setEditing(u)}>Edit</Button>
                  <Button variant="ghost" className="btn-sm" onClick={() => setDeleting(u)}>Delete</Button>
                </td>
              </tr>
            ))}
            {units.length === 0 ? (
              <tr><td colSpan={6} className="muted">No laser units yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editing ? (
        <UnitEditModal
          initial={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete laser unit?"
          message={<DeleteUsageMsg name={deleting.name} count={usage.unit(deleting.id)} kind="unit" />}
          confirmLabel="Delete unit"
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------ Risks tab --------------------------------- */

function RisksTab({ library, updateLibrary, usage }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const risks = library.riskLibrary || [];

  const save = (risk) => {
    const isNew = editing === 'new';
    const next = isNew
      ? [...risks, { ...risk, id: crypto.randomUUID() }]
      : risks.map((r) => (r.id === editing.id ? { ...editing, ...risk } : r));
    updateLibrary({ ...library, riskLibrary: next });
    setEditing(null);
  };

  const remove = () => {
    updateLibrary({ ...library, riskLibrary: risks.filter((r) => r.id !== deleting.id) });
    setDeleting(null);
  };

  return (
    <div className="stack">
      <div className="card-head-row">
        <div className="muted small">{risks.length} standard risk{risks.length === 1 ? '' : 's'}</div>
        <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>New standard risk</Button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Hazard</th><th>Persons</th><th>Initial</th><th>Residual</th><th>Default</th><th></th></tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td className="td-main" style={{ maxWidth: 340 }}>{r.hazard}</td>
                <td className="td-sub">{r.persons}</td>
                <td><ScoreChip l={r.initL} s={r.initS} /></td>
                <td><ScoreChip l={r.resL} s={r.resS} /></td>
                <td>{r.default ? <Badge tone="green">Default</Badge> : <span className="muted">—</span>}</td>
                <td className="td-actions">
                  <Button variant="ghost" className="btn-sm" onClick={() => setEditing(r)}>Edit</Button>
                  <Button variant="ghost" className="btn-sm" onClick={() => setDeleting(r)}>Delete</Button>
                </td>
              </tr>
            ))}
            {risks.length === 0 ? (
              <tr><td colSpan={6} className="muted">No standard risks yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editing ? (
        <RiskEditModal
          initial={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete standard risk?"
          message={<DeleteUsageMsg name={deleting.hazard} count={usage.risk(deleting.id)} kind="risk" />}
          confirmLabel="Delete risk"
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </div>
  );
}

function DeleteUsageMsg({ name, count, kind }) {
  return (
    <>
      <p><b>{name}</b> will be removed from the library.</p>
      {count > 0 ? (
        <p style={{ color: 'var(--warn)' }}>
          It is referenced by {count} event{count === 1 ? '' : 's'}. Those events will flag it as
          missing on their Check step until you {kind === 'risk' ? 'replace the risk row' : 'pick a replacement'}.
        </p>
      ) : (
        <p className="muted">No events currently reference it.</p>
      )}
    </>
  );
}

/* --------------------------- Boilerplate tab ------------------------------- */

function BoilerplateTab({ library, updateLibrary }) {
  const bp = library.boilerplate || {};
  const [open, setOpen] = useState(null);

  const setKey = (key, value) =>
    updateLibrary({ ...library, boilerplate: { ...bp, [key]: value } });

  const entries = Object.entries(bp);

  return (
    <div className="stack">
      <p className="muted small">
        These texts are printed into every document (with <span className="mono">{'{{placeholders}}'}</span> filled
        in per event). Edits save automatically.
      </p>
      <div className="accordion">
        {entries.map(([key, value]) => (
          <div key={key} className={`accordion-item${open === key ? ' open' : ''}`}>
            <button type="button" className="accordion-head" onClick={() => setOpen(open === key ? null : key)}>
              <span className="acc-chev"><Icon name="chevronRight" size={14} /></span>
              {labelize(key)}
              <span className="acc-sub">
                {Array.isArray(value) ? `${value.length} items`
                  : typeof value === 'object' && value ? `${Object.keys(value).length} sections`
                  : `${String(value || '').length} chars`}
              </span>
            </button>
            {open === key ? (
              <div className="accordion-body">
                <BoilerplateValueEditor value={value} onChange={(v) => setKey(key, v)} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function BoilerplateValueEditor({ value, onChange }) {
  if (Array.isArray(value)) {
    return (
      <>
        <div className="field-hint">One item per line.</div>
        <TextArea
          rows={Math.min(16, Math.max(4, value.length + 1))}
          value={value.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          onBlur={(e) => onChange(e.target.value.split('\n').filter((line) => line.trim() !== ''))}
        />
      </>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="stack">
        {Object.entries(value).map(([subKey, subVal]) => (
          <div key={subKey} className="field">
            <span className="field-label">{labelize(subKey)}</span>
            <TextArea
              rows={Math.min(8, Math.max(2, Math.ceil(String(subVal || '').length / 110)))}
              value={String(subVal || '')}
              onChange={(e) => onChange({ ...value, [subKey]: e.target.value })}
            />
          </div>
        ))}
      </div>
    );
  }
  const str = String(value ?? '');
  return (
    <TextArea
      rows={Math.min(16, Math.max(3, Math.ceil(str.length / 110)))}
      value={str}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
