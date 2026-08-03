import React from 'react';
import {
  Field, TextInput, DateInput, TimeInput, Segmented, YesNo, Toggle,
} from '../../components/ui.jsx';

export default function DetailsStep({ draft, setDraft }) {
  const d = draft.details || {};
  const set = (k, v) => setDraft((prev) => ({ ...prev, details: { ...prev.details, [k]: v } }));
  const onText = (k) => (e) => set(k, e.target.value);

  const spanDays = (() => {
    if (!d.eventDateStart || !d.eventDateEnd) return 0;
    const a = new Date(d.eventDateStart); const b = new Date(d.eventDateEnd);
    return Math.round((b - a) / 86400000);
  })();
  const showOver30 = d.installationType === 'Permanent' || spanDays > 30 || d.installOver30Days;

  return (
    <>
      <div className="step-heading">
        <h2>Event details</h2>
        <div className="step-desc">Who the show is for, and when it happens.</div>
      </div>

      <section className="card">
        <div className="card-title">Event & client</div>
        <div className="form-grid">
          <Field label="Event name" required className="span2">
            <TextInput value={d.eventName || ''} onChange={onText('eventName')} placeholder="e.g. Gottwood Festival" />
          </Field>
          <Field label="Client">
            <TextInput value={d.client || ''} onChange={onText('client')} />
          </Field>
          <Field label="Contact(s)">
            <TextInput value={d.contacts || ''} onChange={onText('contacts')} placeholder="Names of client contacts" />
          </Field>
          <Field label="Contact number">
            <TextInput value={d.contactNumber || ''} onChange={onText('contactNumber')} placeholder="+44 …" />
          </Field>
          <Field label="Event type">
            <TextInput value={d.eventType || ''} onChange={onText('eventType')} placeholder="e.g. Live Concert / Festival" />
          </Field>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Dates & times</div>
        <div className="form-grid">
          <Field label="Document date" hint="Printed as “today’s date”. The Check step flags it when stale.">
            <DateInput value={d.todaysDate || ''} onChange={onText('todaysDate')} />
          </Field>
          <Field label="Show times">
            <TextInput value={d.showTimes || ''} onChange={onText('showTimes')} placeholder="e.g. 22:00 – 03:00 nightly" />
          </Field>
          <Field label="Event start date" required>
            <DateInput value={d.eventDateStart || ''} onChange={onText('eventDateStart')} />
          </Field>
          <Field label="Event end date">
            <DateInput value={d.eventDateEnd || ''} onChange={onText('eventDateEnd')} />
          </Field>
          <Field label="Load-in date">
            <DateInput value={d.loadInDate || ''} onChange={onText('loadInDate')} />
          </Field>
          <Field label="Load-in time">
            <TimeInput value={d.loadInTime || ''} onChange={onText('loadInTime')} />
          </Field>
          <Field label="Rehearsal">
            <TextInput value={d.rehearsal || ''} onChange={onText('rehearsal')} placeholder="e.g. 22:00, or n/a" />
          </Field>
          <Field label="Inspection">
            <TextInput value={d.inspection || ''} onChange={onText('inspection')} placeholder="e.g. To be scheduled by on-site authority" />
          </Field>
        </div>
      </section>

      <section className="card">
        <div className="card-title">Installation</div>
        <div className="form-grid">
          <Field label="Alcohol served at the event">
            <YesNo value={d.alcoholServed} onChange={(v) => set('alcoholServed', v)} />
          </Field>
          <Field label="Installation type">
            <Segmented
              value={d.installationType || 'Temporary'}
              onChange={(v) => set('installationType', v)}
              options={[
                { value: 'Temporary', label: 'Temporary' },
                { value: 'Permanent', label: 'Permanent' },
              ]}
            />
          </Field>
          {showOver30 ? (
            <div className="span2">
              <Toggle
                checked={d.installOver30Days}
                onChange={(v) => set('installOver30Days', v)}
                label="Installation in place for more than 30 days"
                sub="Treated as a permanent site under CAP 736 Chapter 4 (LPA / CAA consultation and AIP publication) for outdoor sky-terminating displays."
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
