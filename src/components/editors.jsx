// Shared record editors used by the Library screen and inline from wizard steps.
import React, { useState } from 'react';
import api from '../api.js';
import { Modal } from './Modal.jsx';
import {
  Button, Field, TextInput, TextArea, Toggle, Select, ScoreChip, PersonsPicker, Icon,
} from './ui.jsx';
import { assetPath, fileName } from './util.jsx';

/* ----------------------------- Laser unit --------------------------------- */

const EMPTY_UNIT = {
  name: '', laserClass: 'Class 4', totalPower: '', wavelengths: '', beamSize: '',
  divergence: '', scanner: '', maxScanAngle: '', control: '', safetyFeatures: '',
  notes: '', nohd: '', techSheetAsset: null,
};

export function UnitEditModal({ initial, onSave, onClose }) {
  const [u, setU] = useState({ ...EMPTY_UNIT, ...(initial || {}) });
  const set = (k) => (e) => setU((prev) => ({ ...prev, [k]: e.target.value }));
  const isNew = !initial?.id;

  const pickTechSheet = async () => {
    const res = await api.pickAsset({
      title: 'Choose technical sheet PDF',
      filters: [{ name: 'PDF documents', extensions: ['pdf'] }],
    });
    const path = assetPath(res);
    if (path) setU((prev) => ({ ...prev, techSheetAsset: path }));
  };

  return (
    <Modal
      title={isNew ? 'New laser unit type' : `Edit: ${initial.name}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!u.name.trim()} onClick={() => onSave(u)}>
            {isNew ? 'Add unit type' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <div className="form-grid">
        <Field label="Unit name" required className="span2">
          <TextInput value={u.name} onChange={set('name')} placeholder="e.g. Zeus 11W RGB" autoFocus />
        </Field>
        <Field label="Laser class">
          <TextInput value={u.laserClass} onChange={set('laserClass')} placeholder="Class 4" />
        </Field>
        <Field label="Total power">
          <TextInput value={u.totalPower} onChange={set('totalPower')} placeholder="e.g. 11 W" />
        </Field>
        <Field label="Wavelengths">
          <TextInput value={u.wavelengths} onChange={set('wavelengths')} placeholder="e.g. 637 / 520 / 445 nm" />
        </Field>
        <Field label="Beam size at aperture">
          <TextInput value={u.beamSize} onChange={set('beamSize')} placeholder="e.g. < 5 mm" />
        </Field>
        <Field label="Divergence">
          <TextInput value={u.divergence} onChange={set('divergence')} placeholder="e.g. < 1.0 mrad" />
        </Field>
        <Field label="Max scan angle">
          <TextInput value={u.maxScanAngle} onChange={set('maxScanAngle')} placeholder="e.g. 60°" />
        </Field>
        <Field label="Scanner" className="span2">
          <TextInput value={u.scanner} onChange={set('scanner')} placeholder="e.g. LV-30S analogue, 30 kpps @ 8°" />
        </Field>
        <Field label="Control" className="span2">
          <TextInput value={u.control} onChange={set('control')} placeholder="e.g. ILDA / Pangolin FB4" />
        </Field>
        <Field label="Safety features" className="span2">
          <TextArea rows={2} value={u.safetyFeatures} onChange={set('safetyFeatures')} placeholder="Key switch, remote interlock, emission indicator…" />
        </Field>
        <Field label="NOHD">
          <TextInput value={u.nohd} onChange={set('nohd')} placeholder="If established" />
        </Field>
        <Field label="Notes">
          <TextInput value={u.notes} onChange={set('notes')} />
        </Field>
        <Field label="Technical sheet (PDF)" className="span2" hint="Appended as an appendix when the unit is selected on an event with “include tech sheet” on.">
          <div className="file-slot">
            <span className="file-ic"><Icon name="file" size={15} /></span>
            <span className={`file-name${u.techSheetAsset ? '' : ' none'}`}>
              {u.techSheetAsset ? fileName(u.techSheetAsset) : 'No tech sheet stored'}
            </span>
            <Button variant="secondary" className="btn-sm" onClick={pickTechSheet}>
              {u.techSheetAsset ? 'Replace' : 'Choose PDF'}
            </Button>
            {u.techSheetAsset ? (
              <Button variant="ghost" className="btn-sm" onClick={() => setU((p) => ({ ...p, techSheetAsset: null }))}>
                Remove
              </Button>
            ) : null}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------- Person ----------------------------------- */

const ALL_ROLES = ['LSO', 'Operator', 'Assistant'];
const EMPTY_PERSON = { name: '', roles: ['Operator'], competence: '', phone: '' };

export function PersonEditModal({ initial, onSave, onClose }) {
  const [p, setP] = useState({ ...EMPTY_PERSON, ...(initial || {}) });
  const isNew = !initial?.id;
  const toggleRole = (role) => setP((prev) => {
    const has = (prev.roles || []).includes(role);
    return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...(prev.roles || []), role] };
  });

  return (
    <Modal
      title={isNew ? 'Add person' : `Edit: ${initial.name}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!p.name.trim()} onClick={() => onSave(p)}>
            {isNew ? 'Add person' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <div className="stack">
        <Field label="Full name" required>
          <TextInput value={p.name} onChange={(e) => setP((prev) => ({ ...prev, name: e.target.value }))} autoFocus />
        </Field>
        <Field label="Roles">
          <div className="roles-checks">
            {ALL_ROLES.map((role) => (
              <label key={role} className="check-inline">
                <input
                  type="checkbox"
                  checked={(p.roles || []).includes(role)}
                  onChange={() => toggleRole(role)}
                />
                {role === 'LSO' ? 'LSO (Laser Safety Officer)' : role}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Competence / qualifications">
          <TextArea rows={3} value={p.competence} onChange={(e) => setP((prev) => ({ ...prev, competence: e.target.value }))} placeholder="Training, experience, systems…" />
        </Field>
        <Field label="Phone">
          <TextInput value={p.phone} onChange={(e) => setP((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+44 …" />
        </Field>
      </div>
    </Modal>
  );
}

/* ----------------------------- Library risk -------------------------------- */

const EMPTY_RISK = {
  default: false, hazard: '', risk: '', persons: 'E, C', controls: '', action: '',
  initL: 3, initS: 3, resL: 1, resS: 3,
};

const L_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const S_LABELS = ['Negligible', 'Minor injury', 'Injury (treatment)', 'Major injury', 'Fatality / catastrophic'];

export function ScorePair({ label, l, s, onL, onS }) {
  return (
    <Field label={label}>
      <div className="ls-group">
        <Select value={l || ''} onChange={(e) => onL(Number(e.target.value))} aria-label={`${label} likelihood`}>
          <option value="" disabled>L</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{`L ${n}: ${L_LABELS[n - 1]}`}</option>)}
        </Select>
        <span className="ls-x">×</span>
        <Select value={s || ''} onChange={(e) => onS(Number(e.target.value))} aria-label={`${label} severity`}>
          <option value="" disabled>S</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{`S ${n}: ${S_LABELS[n - 1]}`}</option>)}
        </Select>
        <ScoreChip l={l} s={s} showBand />
      </div>
    </Field>
  );
}

export function RiskEditModal({ initial, onSave, onClose }) {
  const [r, setR] = useState({ ...EMPTY_RISK, ...(initial || {}) });
  const isNew = !initial?.id;
  const set = (k) => (e) => setR((prev) => ({ ...prev, [k]: e.target.value }));
  const setV = (k, v) => setR((prev) => ({ ...prev, [k]: v }));

  return (
    <Modal
      title={isNew ? 'New standard risk' : 'Edit standard risk'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!r.hazard.trim()} onClick={() => onSave(r)}>
            {isNew ? 'Add risk' : 'Save changes'}
          </Button>
        </>
      )}
    >
      <div className="stack">
        <Field label="Hazard" required>
          <TextInput value={r.hazard} onChange={set('hazard')} autoFocus />
        </Field>
        <Field label="Risk (what could happen)">
          <TextArea rows={2} value={r.risk} onChange={set('risk')} />
        </Field>
        <Field label="Persons at risk">
          <PersonsPicker value={r.persons} onChange={(v) => setV('persons', v)} />
        </Field>
        <Field label="Control measures">
          <TextArea rows={4} value={r.controls} onChange={set('controls')} />
        </Field>
        <Field label="Action / monitoring">
          <TextArea rows={2} value={r.action} onChange={set('action')} />
        </Field>
        <div className="form-grid">
          <ScorePair label="Initial risk (L × S)" l={r.initL} s={r.initS} onL={(v) => setV('initL', v)} onS={(v) => setV('initS', v)} />
          <ScorePair label="Residual risk (L × S)" l={r.resL} s={r.resS} onL={(v) => setV('resL', v)} onS={(v) => setV('resS', v)} />
        </div>
        <Toggle
          checked={r.default}
          onChange={(v) => setV('default', v)}
          label="Include in every new event"
          sub="Default rows pre-populate the risk table when a new RAMS is created."
        />
      </div>
    </Modal>
  );
}
