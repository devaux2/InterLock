import React, { useMemo, useState } from 'react';
import {
  Button, ChipSelect, Field, Select, TextArea,
} from '../../components/ui.jsx';
import { PersonEditModal } from '../../components/editors.jsx';

export default function PersonnelStep({ draft, setDraft, library, updateLibrary }) {
  const p = draft.personnel || {};
  const people = library.personnel || [];
  const [adding, setAdding] = useState(false);

  const setP = (k, v) => setDraft((prev) => ({ ...prev, personnel: { ...prev.personnel, [k]: v } }));

  // LSO-capable people first in the LSO select; Operator-role first in chips.
  const lsoSorted = useMemo(() => {
    const has = (person) => (person.roles || []).includes('LSO');
    return [...people].sort((a, b) => (has(b) ? 1 : 0) - (has(a) ? 1 : 0));
  }, [people]);

  const roleSorted = (role) => {
    const has = (person) => (person.roles || []).includes(role);
    return [...people].sort((a, b) => (has(b) ? 1 : 0) - (has(a) ? 1 : 0));
  };

  const toggleIn = (key) => (id) => {
    const list = p[key] || [];
    setP(key, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const addPerson = (person) => {
    updateLibrary({ ...library, personnel: [...people, { ...person, id: crypto.randomUUID() }] });
    setAdding(false);
  };

  return (
    <>
      <div className="step-heading">
        <h2>Personnel</h2>
        <div className="step-desc">
          The named Laser Safety Officer and the trained operators for this display.
        </div>
      </div>

      <section className="card">
        <div className="card-head-row">
          <div className="card-title">Crew</div>
          <Button variant="secondary" className="btn-sm" icon="plus" onClick={() => setAdding(true)}>
            Add person
          </Button>
        </div>
        <div className="stack">
          <Field
            label="Laser Safety Officer (LSO)"
            required
            hint="The LSO holds executive stop authority over the display at all times."
          >
            <Select value={p.lsoId || ''} onChange={(e) => setP('lsoId', e.target.value || null)}>
              <option value="">Select LSO…</option>
              {lsoSorted.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}{(person.roles || []).includes('LSO') ? '' : ' (no LSO role in library)'}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Operators" required hint="Trained operators in attendance at the control position.">
            <ChipSelect
              options={roleSorted('Operator').map((person) => ({
                value: person.id,
                label: person.name,
                title: (person.roles || []).join(', '),
              }))}
              values={p.operatorIds || []}
              onToggle={toggleIn('operatorIds')}
            />
          </Field>

          <Field label="Assistants">
            <ChipSelect
              options={roleSorted('Assistant').map((person) => ({
                value: person.id,
                label: person.name,
                title: (person.roles || []).join(', '),
              }))}
              values={p.assistantIds || []}
              onToggle={toggleIn('assistantIds')}
            />
          </Field>

          <Field label="Extra notes" hint="Printed with the responsibilities section.">
            <TextArea
              rows={3}
              value={p.extraNotes || ''}
              onChange={(e) => setP('extraNotes', e.target.value)}
              placeholder="Anything unusual about crewing for this event…"
            />
          </Field>
        </div>
      </section>

      {adding ? <PersonEditModal onSave={addPerson} onClose={() => setAdding(false)} /> : null}
    </>
  );
}
