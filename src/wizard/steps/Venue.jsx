import React from 'react';
import {
  Field, TextInput, TextArea, DateInput, Segmented, Select, Toggle, Callout,
} from '../../components/ui.jsx';

export default function VenueStep({ draft, setDraft }) {
  const d = draft.details || {};
  const av = draft.aviation || {};
  const set = (k, v) => setDraft((prev) => ({ ...prev, details: { ...prev.details, [k]: v } }));
  const setAv = (k, v) => setDraft((prev) => ({ ...prev, aviation: { ...(prev.aviation || {}), [k]: v } }));
  const onText = (k) => (e) => set(k, e.target.value);

  const outdoor = d.indoorOutdoor === 'outdoor';
  const sky = outdoor && d.outdoorTermination === 'sky';

  return (
    <>
      <div className="step-heading">
        <h2>Venue & site</h2>
        <div className="step-desc">Where the display happens, and what the beams terminate on.</div>
      </div>

      <section className="card">
        <div className="card-title">Venue</div>
        <div className="form-grid">
          <Field label="Venue" required className="span2">
            <TextInput value={d.venue || ''} onChange={onText('venue')} placeholder="e.g. Gottwood Festival, Carreglwyd Estate" />
          </Field>
          <Field label="Venue address" className="span2" hint="Full address with postcode. Reviewers expect it.">
            <TextArea rows={2} value={d.venueAddress || ''} onChange={onText('venueAddress')} />
          </Field>
          <Field label="Capacity">
            <TextInput value={d.capacity || ''} onChange={onText('capacity')} placeholder="e.g. 5000" inputMode="numeric" />
          </Field>
          <Field label="Environment">
            <Segmented
              value={d.indoorOutdoor || 'indoor'}
              onChange={(v) => set('indoorOutdoor', v)}
              options={[
                { value: 'indoor', label: 'Indoor' },
                { value: 'outdoor', label: 'Outdoor' },
              ]}
            />
          </Field>
        </div>
      </section>

      {outdoor ? (
        <section className="card">
          <div className="card-title">Outdoor site</div>
          <div className="form-grid">
            <Field label="Beams terminate" hint="Drives the aviation / CAA wording in the document.">
              <Select value={d.outdoorTermination || 'n/a'} onChange={(e) => set('outdoorTermination', e.target.value)}>
                <option value="sky">Open sky</option>
                <option value="structure">Structure / screen</option>
                <option value="treeline">Treeline</option>
                <option value="n/a">n/a</option>
              </Select>
            </Field>
            <Field label="OS grid reference">
              <TextInput value={d.gridRef || ''} onChange={onText('gridRef')} placeholder="e.g. SH 305 875" />
            </Field>
            <Field label="Nearest aerodrome / distance">
              <TextInput value={d.nearestAerodrome || ''} onChange={onText('nearestAerodrome')} placeholder="e.g. RAF Valley (approx. 8 km south-east)" />
            </Field>
            <Field label="Local authority">
              <TextInput value={d.localAuthority || ''} onChange={onText('localAuthority')} />
            </Field>
            <Field label="Haze / smoke provision">
              <TextInput value={d.hazeUse || ''} onChange={onText('hazeUse')} placeholder="e.g. Provided and operated by event production" />
            </Field>
            <Field label="Adjacent effects" hint="Pyro, flames, CO₂ etc. near the beam paths.">
              <TextInput value={d.adjacentEffects || ''} onChange={onText('adjacentEffects')} />
            </Field>
            <Field label="Event H&S contact" className="span2">
              <TextInput value={d.eventHsContact || ''} onChange={onText('eventHsContact')} />
            </Field>
          </div>
        </section>
      ) : null}

      {sky ? (
        <section className="card">
          <div className="card-title">Aviation (CAA)</div>
          <div className="card-sub">
            This display projects laser light into open airspace, so it falls under CAA CAP 736.
          </div>
          <div className="stack">
            <Callout tone="info" title="CAP 736 notification">
              Notify CAA Airspace Regulation (form DAP 1918 / online portal) with a target of{' '}
              <b>28 days’ notice</b> and never less than <b>7 days</b> before the event. Record the
              reference here. The Check step reminds you if it’s missing.
            </Callout>
            <Toggle
              checked={av.caaNotified}
              onChange={(v) => setAv('caaNotified', v)}
              label="CAA has been notified"
            />
            <div className="form-grid">
              <Field label="Notification reference">
                <TextInput value={av.caaNotifRef || ''} onChange={(e) => setAv('caaNotifRef', e.target.value)} />
              </Field>
              <Field label="Notification date">
                <DateInput value={av.caaNotifDate || ''} onChange={(e) => setAv('caaNotifDate', e.target.value)} />
              </Field>
              <Field label="NOTAM reference">
                <TextInput value={av.notamRef || ''} onChange={(e) => setAv('notamRef', e.target.value)} />
              </Field>
              <Field label="ATC contact" hint="Direct line/radio to the relevant air traffic control authority.">
                <TextInput value={av.atcContact || ''} onChange={(e) => setAv('atcContact', e.target.value)} />
              </Field>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
