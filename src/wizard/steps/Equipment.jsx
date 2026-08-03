import React, { useState } from 'react';
import {
  Button, Icon, Select, Stepper, Toggle, EmptyState,
} from '../../components/ui.jsx';
import { UnitEditModal } from '../../components/editors.jsx';

export default function EquipmentStep({ draft, setDraft, library, updateLibrary }) {
  const units = library.laserUnits || [];
  const rows = draft.equipment || [];
  const [creating, setCreating] = useState(false);

  const unitById = (id) => units.find((u) => u.id === id);
  const setRows = (next) => setDraft((prev) => ({ ...prev, equipment: next }));
  const setRow = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () => {
    const used = new Set(rows.map((r) => r.unitId));
    const unit = units.find((u) => !used.has(u.id)) || units[0];
    if (!unit) { setCreating(true); return; }
    setRows([...rows, { unitId: unit.id, qty: 1, includeTechSheet: !!unit.techSheetAsset }]);
  };

  const createUnit = (unit) => {
    const withId = { ...unit, id: crypto.randomUUID() };
    updateLibrary({ ...library, laserUnits: [...units, withId] });
    setRows([...rows, { unitId: withId.id, qty: 1, includeTechSheet: !!withId.techSheetAsset }]);
    setCreating(false);
  };

  return (
    <>
      <div className="step-heading">
        <h2>Laser equipment</h2>
        <div className="step-desc">
          The projectors on this show. Tech sheets are appended as appendices when included.
        </div>
      </div>

      <section className="card">
        <div className="card-head-row">
          <div className="card-title">Selected units</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" className="btn-sm" icon="plus" onClick={() => setCreating(true)}>
              New unit type
            </Button>
            <Button variant="primary" className="btn-sm" icon="plus" onClick={addRow} disabled={units.length === 0 && rows.length > 0}>
              Add unit
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon="zap" title="No laser units selected">
            Every RAMS needs at least one projector. Add one from the library or create a new type.
          </EmptyState>
        ) : (
          <div className="stack">
            {rows.map((row, i) => {
              const unit = unitById(row.unitId);
              const hasSheet = !!unit?.techSheetAsset;
              return (
                <div key={`${row.unitId}-${i}`} className="equip-row">
                  <div className="equip-select">
                    <Select
                      value={row.unitId || ''}
                      aria-label="Laser unit"
                      onChange={(e) => {
                        const next = unitById(e.target.value);
                        setRow(i, { unitId: e.target.value, includeTechSheet: !!next?.techSheetAsset });
                      }}
                    >
                      {!unit ? <option value={row.unitId || ''}>(unit no longer in library)</option> : null}
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.totalPower})</option>
                      ))}
                    </Select>
                  </div>
                  <Stepper value={row.qty} onChange={(v) => setRow(i, { qty: v })} min={1} max={99} />
                  <div
                    className="equip-tsheet"
                    title={hasSheet ? 'Append this unit’s technical sheet PDF as an appendix'
                      : 'No tech sheet PDF stored in the library for this unit. Add one in Library → Laser units'}
                  >
                    <Toggle
                      checked={hasSheet && row.includeTechSheet}
                      disabled={!hasSheet}
                      onChange={(v) => setRow(i, { includeTechSheet: v })}
                      label="Tech sheet"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="btn-icon"
                    aria-label="Remove unit"
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                  >
                    <Icon name="trash" size={15} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {rows.length > 0 ? (
        <section className="card">
          <div className="card-title">Inventory preview</div>
          <div className="card-sub">As it will appear in the equipment inventory table.</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Qty</th><th>Unit</th><th>Class</th><th>Power</th><th>Wavelengths</th><th>Divergence</th></tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const u = unitById(row.unitId);
                  return (
                    <tr key={`${row.unitId}-p${i}`}>
                      <td className="td-main">{row.qty}×</td>
                      <td className="td-main">{u?.name || <span style={{ color: 'var(--error)' }}>Missing unit</span>}</td>
                      <td>{u?.laserClass || '—'}</td>
                      <td>{u?.totalPower || '—'}</td>
                      <td className="td-sub">{u?.wavelengths || '—'}</td>
                      <td className="td-sub">{u?.divergence || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {creating ? <UnitEditModal onSave={createUnit} onClose={() => setCreating(false)} /> : null}
    </>
  );
}
