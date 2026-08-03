// The "Check" engine. Pure function: (event, library, settings) -> findings.
// level: 'error' blocks export; 'warn' is shown but does not block.
// step: wizard step id the finding relates to (for click-through).

export const riskScore = (l, s) => (Number(l) || 0) * (Number(s) || 0);
export const riskBand = (score) =>
  score >= 16 ? 'veryhigh' : score >= 10 ? 'high' : score >= 5 ? 'medium' : score >= 1 ? 'low' : 'none';
export const BAND_LABEL = { none: '—', low: 'Low', medium: 'Medium', high: 'High', veryhigh: 'Very High' };

export function resolveRisk(row, library) {
  if (!row) return null;
  const lib = row.libId ? (library.riskLibrary || []).find(r => r.id === row.libId) : null;
  return { ...(lib || {}), ...Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== undefined && v !== null && v !== '')) };
}

const isIso = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const parseIso = (d) => (isIso(d) ? new Date(d + 'T12:00:00') : null);

export function validateEvent(event, library, settings) {
  const f = [];
  const add = (level, step, message) => f.push({ level, step, message });
  const d = event.details || {};
  const today = new Date();

  // --- Required basics ---------------------------------------------------------
  if (!d.eventName?.trim()) add('error', 'details', 'Event name is missing. It is needed for the document and the export filename.');
  if (!isIso(d.eventDateStart)) add('error', 'details', 'Event start date is missing or incomplete.');
  if (!d.client?.trim()) add('warn', 'details', 'Client is blank.');
  if (!d.venue?.trim()) add('error', 'venue', 'Venue is missing.');
  if (!d.venueAddress?.trim()) add('warn', 'venue', 'Venue address is blank. Reviewers expect a full address with postcode.');
  if (!d.capacity) add('warn', 'venue', 'Capacity is blank.');
  if (!d.todaysDate) add('warn', 'details', 'Document date (“today’s date”) is blank.');

  // --- Date sanity (the stale-duplicate traps) --------------------------------
  const evStart = parseIso(d.eventDateStart);
  const evEnd = parseIso(d.eventDateEnd) || evStart;
  const loadIn = parseIso(d.loadInDate);
  const docDate = parseIso(d.todaysDate);
  if (evStart && evStart < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    add('warn', 'details', `Event start date ${d.eventDateStart} is in the past.`);
  }
  if (evStart && evEnd && evEnd < evStart) add('error', 'details', 'Event end date is before the start date.');
  if (evStart && loadIn && loadIn.getFullYear() !== evStart.getFullYear()) {
    add('error', 'details', `Load-in date ${d.loadInDate} is a different YEAR from the event date ${d.eventDateStart}. This looks like a stale value from a duplicated document.`);
  }
  if (evStart && loadIn && loadIn > evStart) add('warn', 'details', 'Load-in date is after the event start date.');
  if (docDate && Math.abs(today - docDate) > 1000 * 60 * 60 * 24 * 7) {
    add('warn', 'details', `Document date ${d.todaysDate} is more than a week from today. Update it before issuing.`);
  }

  // --- Personnel ---------------------------------------------------------------
  const people = library.personnel || [];
  const byId = (id) => people.find(p => p.id === id);
  if (!event.personnel?.lsoId || !byId(event.personnel.lsoId)) {
    add('error', 'personnel', 'No Laser Safety Officer is named. A named LSO with stop authority is required.');
  }
  if (!event.personnel?.operatorIds?.length) add('error', 'personnel', 'No laser operators are named.');
  (event.personnel?.operatorIds || []).concat(event.personnel?.assistantIds || []).forEach(id => {
    if (!byId(id)) add('warn', 'personnel', `A selected person (${id}) is no longer in the library.`);
  });

  // --- Equipment ---------------------------------------------------------------
  if (!event.equipment?.length) add('error', 'equipment', 'No laser units are selected.');
  (event.equipment || []).forEach(eq => {
    const unit = (library.laserUnits || []).find(u => u.id === eq.unitId);
    if (!unit) { add('warn', 'equipment', `A selected unit (${eq.unitId}) is no longer in the library.`); return; }
    if (eq.includeTechSheet && !unit.techSheetAsset) {
      add('warn', 'equipment', `“${unit.name}” is set to include its technical sheet but the library has no tech sheet PDF for it.`);
    }
  });

  // --- Show / scanning ---------------------------------------------------------
  if (!event.show?.effectsText?.trim()) add('warn', 'show', 'Effects & application description is empty.');
  if (d.audienceScanning) {
    add('warn', 'show', 'Audience scanning is YES, so the document will include the engineered safety-case wording. Ensure MPE measurement records exist and are appended; reviewers will expect them.');
    if (!(event.show?.scanningMeasurements || '').trim()) {
      add('error', 'show', 'Audience scanning is YES but no measurement details are recorded (instrument, measured irradiance at closest audience position).');
    }
  }

  // --- Outdoor / aviation ------------------------------------------------------
  if (d.indoorOutdoor === 'outdoor' && d.outdoorTermination === 'sky') {
    if (!event.aviation?.caaNotified) {
      add('warn', 'venue', 'Outdoor sky-terminating display: CAA notification (CAP 736 / DAP 1918) is not yet recorded. Notify at least 7 (target 28) days before the event and record the reference.');
    }
    if (!d.nearestAerodrome?.trim()) add('warn', 'venue', 'Outdoor sky-terminating display: nearest aerodrome / distance is blank.');
  }

  // --- Risks -------------------------------------------------------------------
  const risks = (event.risks || []).map(r => resolveRisk(r, library)).filter(Boolean);
  if (!risks.length) add('error', 'risks', 'The risk assessment table is empty.');
  risks.forEach((r) => {
    const init = riskScore(r.initL, r.initS);
    const res = riskScore(r.resL, r.resS);
    if (!init || !res) add('warn', 'risks', `“${r.hazard || 'Unnamed hazard'}” is missing likelihood/severity scores.`);
    if (res > init) add('warn', 'risks', `“${r.hazard}”: residual risk (${res}) is higher than initial risk (${init}).`);
    if (res >= 10) add('error', 'risks', `“${r.hazard}”: residual risk ${res} is ${BAND_LABEL[riskBand(res)]}. Residual risk must be reduced to Medium or Low before this document can be issued.`);
  });

  // --- Insurance ---------------------------------------------------------------
  const ins = settings.insurance || {};
  const insEnd = parseIso(ins.policyEnd);
  if (insEnd && evEnd && insEnd < evEnd) {
    add('error', 'check', `Public liability insurance (policy ${ins.policyNumber || '—'}) expires ${ins.policyEnd}, before the event ends ${(d.eventDateEnd || d.eventDateStart)}. Renew before issuing.`);
  } else if (insEnd && evStart) {
    const daysAfter = Math.round((insEnd - evStart) / (1000 * 60 * 60 * 24));
    if (daysAfter >= 0 && daysAfter <= 30) add('warn', 'check', `Insurance expires ${ins.policyEnd}, within a month of the event. Check renewal.`);
  }
  if (!ins.certAsset) add('error', 'attachments', 'No insurance certificate PDF is stored. The exported document must reproduce the certificate itself; a typed summary is not valid evidence of insurance. Add it on the Insurance tab.');

  // --- Attachments -------------------------------------------------------------
  (event.attachments || []).forEach(a => {
    if (a._missing) add('error', 'attachments', `Attachment file is missing on disk: ${a.title || a.file}`);
  });

  const errors = f.filter(x => x.level === 'error');
  return { findings: f, errors, warnings: f.filter(x => x.level === 'warn'), ok: errors.length === 0 };
}
