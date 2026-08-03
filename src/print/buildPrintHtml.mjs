// Builds the complete print HTML for a RAMS document.
// Dependency-free ESM: used by the renderer (live preview) and dynamically
// imported by the Electron main process (headless export).
//
//   buildPrintHtml(event, library, settings, resources) -> html string
//   assembleAppendices(event, library, settings) -> [{title, file}]
//
// resources: { fontCss, logoDataUrl, images: {attachmentId: dataUrl} }

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nl2p = (s, cls = '') => String(s || '').split(/\n\s*\n/).filter(Boolean)
  .map(p => `<p${cls ? ` class="${cls}"` : ''}>${esc(p.trim()).replace(/\n/g, '<br/>')}</p>`).join('');

// Returns plain text — callers escape at the point of interpolation.
const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
const yesNo = (v) => (v === true || v === 'YES' || v === 'yes' ? 'YES' : 'NO');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const score = (l, s) => (Number(l) || 0) * (Number(s) || 0);
const band = (n) => (n >= 16 ? 'veryhigh' : n >= 10 ? 'high' : n >= 5 ? 'medium' : n >= 1 ? 'low' : 'none');
const BAND_TEXT = { none: '—', low: 'Low', medium: 'Medium', high: 'High', veryhigh: 'Very High' };

function resolveRiskRow(row, library) {
  const lib = row.libId ? (library.riskLibrary || []).find(r => r.id === row.libId) : null;
  const merged = { ...(lib || {}) };
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && v !== '') merged[k] = v;
  }
  return merged;
}

export function assembleAppendices(event, library, settings) {
  const out = [];
  const seen = new Set();
  const push = (title, file) => {
    if (!file || seen.has(file)) return;
    seen.add(file);
    out.push({ title, file });
  };
  for (const eq of event.equipment || []) {
    const unit = (library.laserUnits || []).find(u => u.id === eq.unitId);
    if (unit && eq.includeTechSheet && unit.techSheetAsset) {
      push(`Technical specification: ${unit.name}`, unit.techSheetAsset);
    }
  }
  if (settings.insurance?.certAsset) push('Certificate of insurance', settings.insurance.certAsset);
  if (settings.company?.hsPolicyAsset) push('Health & Safety Policy, ' + (settings.company?.name || ''), settings.company.hsPolicyAsset);
  for (const att of event.attachments || []) {
    // File type is authoritative: only PDFs can be merged as appendices,
    // whatever mode an older event record may have stored.
    if (/\.pdf$/i.test(att.file || '')) push(att.title || att.file, att.file);
  }
  return out;
}

const isImageFile = (f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f || '');

// ---------------------------------------------------------------------------

export function buildPrintHtml(event, library, settings, resources = {}) {
  const d = event.details || {};
  const bp = library.boilerplate || {};
  const company = settings.company || {};
  const ins = settings.insurance || {};
  const people = library.personnel || [];
  const byId = (id) => people.find(p => p.id === id);

  const lso = byId(event.personnel?.lsoId);
  const operators = (event.personnel?.operatorIds || []).map(byId).filter(Boolean);
  const assistants = (event.personnel?.assistantIds || []).map(byId).filter(Boolean);

  const units = (event.equipment || []).map(eq => ({
    ...((library.laserUnits || []).find(u => u.id === eq.unitId) || { name: 'Unknown unit' }),
    qty: eq.qty || 1,
  }));

  const risks = (event.risks || []).map(r => resolveRiskRow(r, library));
  const appendices = assembleAppendices(event, library, settings);
  const embeds = (event.attachments || []).filter(a => isImageFile(a.file));

  const year = (d.eventDateStart || '').slice(0, 4) || new Date().getFullYear();
  const isOutdoorSky = d.indoorOutdoor === 'outdoor' && d.outdoorTermination === 'sky';
  const docRef = event.docMeta?.reference || `${company.docRefPrefix || 'PSI-RAMS'}-${year}`;
  const eventDates = d.eventDateEnd && d.eventDateEnd !== d.eventDateStart
    ? `${fmtDate(d.eventDateStart)} – ${fmtDate(d.eventDateEnd)}`
    : fmtDate(d.eventDateStart);

  // ---- method steps ----------------------------------------------------------
  const eStopSentence = event.show?.eStopVariant === 'digital'
    ? (bp.eStopSentenceDigital || '')
    : (bp.eStopSentenceHardline || '');
  const scanningException = d.audienceScanning ? (bp.scanningExceptionYes || '') : '';
  let methodSteps = (bp.methodSteps || []).map(s => s
    .replace('{{eStopSentence}}', eStopSentence)
    .replace('{{scanningException}}', scanningException));
  // One step per line, matching the Method step editor's rule.
  const extraMethod = (event.show?.methodText || '').split(/\n/).map(s => s.trim()).filter(Boolean);
  methodSteps = methodSteps.concat(extraMethod);

  // ---- section numbering -----------------------------------------------------
  let secNo = 0;
  const sec = (title) => `<h2><span class="secno">${++secNo}</span>${esc(title)}</h2>`;

  // ---- reusable table row ----------------------------------------------------
  const kv = (label, value, opts = {}) =>
    `<tr><th>${esc(label)}</th><td${opts.strong ? ' class="strong"' : ''}>${value === '' || value == null ? '—' : (opts.raw ? value : esc(value))}</td></tr>`;

  const scoreCell = (l, s) => {
    const n = score(l, s);
    const b = band(n);
    return `<td class="num">${l || '—'}</td><td class="num">${s || '—'}</td><td class="score band-${b}">${n || '—'}<span class="bandword">${BAND_TEXT[b]}</span></td>`;
  };

  // ---- document sections -----------------------------------------------------

  const cover = `
  <section class="cover">
    <div class="cover-top">
      <div class="cover-event">${esc(d.eventName || 'Untitled Event')}</div>
      <div class="cover-year">${esc(String(year))}</div>
      ${resources.logoDataUrl ? `<img class="cover-logo" src="${resources.logoDataUrl}" alt=""/>` : ''}
      <div class="cover-title">Laser Safety,<br/>Risk Assessment &amp;<br/>Method Statement</div>
      <div class="cover-compliance">${esc(bp.complianceLine || '')}</div>
    </div>
    <div class="cover-bottom">
      <table class="cover-meta">
        <tr><td>Document ref</td><td>${esc(docRef)}</td><td>Revision</td><td>${esc(event.docMeta?.revision || '1')} (${esc(event.docMeta?.status || 'Issued')})</td></tr>
        <tr><td>Venue</td><td>${esc(d.venue || '—')}</td><td>Event date${d.eventDateEnd && d.eventDateEnd !== d.eventDateStart ? 's' : ''}</td><td>${esc(eventDates)}</td></tr>
        <tr><td>Client</td><td>${esc(d.client || '—')}</td><td>Issue date</td><td>${esc(fmtDate(d.todaysDate))}</td></tr>
      </table>
      <div class="cover-company">
        <div class="cover-company-name">${esc(company.name || '')}</div>
        <div>Prepared by ${esc(company.author || '')}${company.authorRole ? `, ${esc(company.authorRole)}` : ''}</div>
        <div>Registered address: ${esc(company.registeredAddress || '')}</div>
        <div>${esc(company.phone || '')} &nbsp;·&nbsp; ${esc(company.email || '')}</div>
      </div>
    </div>
  </section>`;

  const docControl = `
  ${sec('Document control')}
  <table class="kv">
    ${kv('Document reference', docRef)}
    ${kv('Revision / status', `${event.docMeta?.revision || '1'} (${event.docMeta?.status || 'Issued'})`)}
    ${kv('Prepared by', `${company.author || ''}${company.authorRole ? ', ' + company.authorRole : ''}`)}
    ${kv('Reviewed / approved by (LSO)', lso ? lso.name : '—')}
    ${kv('Issue date', fmtDate(d.todaysDate))}
    ${kv('Issued to', [d.client, 'Event H&S management', 'Venue management'].filter(Boolean).join(' · '))}
    ${kv('Review trigger', 'Any change to equipment, positions, programming, venue layout or personnel; otherwise before each event.')}
  </table>
  <table class="grid rev-table">
    <thead><tr><th>Rev</th><th>Date</th><th>Description of change</th><th>By</th><th>Approved</th></tr></thead>
    <tbody>
      <tr><td>${esc(event.docMeta?.revision || '1')}</td><td>${esc(fmtDate(d.todaysDate))}</td><td>Issued for event</td><td>${esc(initials(company.author))}</td><td>${esc(initials(lso?.name))}</td></tr>
      <tr class="blank"><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>`;

  const eventDetails = `
  ${sec('Event details')}
  <table class="kv">
    ${kv('Event name', d.eventName, { strong: true })}
    ${kv('Client', d.client)}
    ${kv('Contact(s)', d.contacts)}
    ${kv('Contact number', d.contactNumber)}
    ${kv('Event date' + (d.eventDateEnd && d.eventDateEnd !== d.eventDateStart ? 's' : ''), eventDates)}
    ${kv('Show times', d.showTimes)}
    ${kv('Venue', d.venue)}
    ${kv('Venue address', d.venueAddress)}
    ${d.gridRef ? kv('Site grid reference', d.gridRef) : ''}
    ${kv('Capacity', d.capacity)}
    ${kv('Indoor / outdoor', cap(d.indoorOutdoor))}
    ${d.indoorOutdoor === 'outdoor' ? kv('Beam termination', terminationText(d.outdoorTermination)) : ''}
    ${d.indoorOutdoor === 'outdoor' ? kv('Nearest aerodrome', d.nearestAerodrome) : ''}
    ${d.localAuthority ? kv('Local authority', d.localAuthority) : ''}
    ${kv('Load-in', [fmtDate(d.loadInDate), d.loadInTime].filter(Boolean).join(' · '))}
    ${kv('Rehearsal (approx.)', d.rehearsal)}
    ${kv('Inspection (approx.)', d.inspection)}
    ${kv('Alcohol served', yesNo(d.alcoholServed))}
    ${kv('Type of event', d.eventType)}
    ${kv('Haze / smoke', d.hazeUse)}
    ${d.adjacentEffects ? kv('Adjacent effects (pyro / SFX)', d.adjacentEffects) : ''}
    ${d.eventHsContact ? kv('Event H&S contact', d.eventHsContact) : ''}
    ${kv('Audience scanning', yesNo(d.audienceScanning), { strong: true })}
    ${kv('Audience exposure from diffraction', yesNo(d.audienceExposureDiffraction))}
    ${kv('Type of installation', d.installationType)}
  </table>`;

  const scopePara = (bp.scopeTemplate || '')
    .replace('{{company}}', company.name || '')
    .replace('{{eventName}}', d.eventName || '')
    .replace('{{venuePart}}', d.venue && d.venue !== d.eventName ? `, ${d.venue}` : '');
  const scope = `
  ${sec('Scope of works & references')}
  ${nl2p(scopePara)}
  <p>This document is prepared with reference to:</p>
  <ul class="refs">${(bp.references || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>`;

  const roles = `
  ${sec('Roles, responsibilities & the Laser Safety Officer')}
  ${nl2p(bp.lsoResponsibilities)}
  <table class="grid personnel-table">
    <thead><tr><th style="width:34%">Name</th><th style="width:22%">Role</th><th>Competence</th></tr></thead>
    <tbody>
      ${lso ? personRow(lso, 'Laser Safety Officer' + (operators.some(o => o.id === lso.id) ? ' / Operator' : '')) : ''}
      ${operators.filter(o => !lso || o.id !== lso.id).map(o => personRow(o, 'Laser Operator')).join('')}
      ${assistants.map(a => personRow(a, 'Assistant / Runner')).join('')}
    </tbody>
  </table>
  ${event.personnel?.extraNotes ? nl2p(event.personnel.extraNotes) : ''}`;

  const inventory = `
  ${sec('Laser equipment inventory')}
  <table class="grid inv-table">
    <thead><tr>
      <th>Ref</th><th>Unit</th><th>Qty</th><th>Class</th><th>Max output</th><th>Wavelengths</th>
      <th>Beam Ø</th><th>Divergence</th><th>Scanners</th><th>NOHD</th>
    </tr></thead>
    <tbody>
      ${units.map((u, i) => `<tr>
        <td>L${i + 1}</td><td class="strong">${esc(u.name)}</td><td class="num">${u.qty}</td>
        <td>${esc(u.laserClass || 'Class 4')}</td><td>${esc(u.totalPower || '—')}</td>
        <td>${esc(u.wavelengths || '—')}</td><td>${esc(u.beamSize || '—')}</td>
        <td>${esc(u.divergence || '—')}</td><td>${esc(u.scanner || '—')}</td>
        <td>${esc(u.nohd || 'On file')}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${units.length ? `<p class="tablenote">Classification per BS EN 60825-1:2014+A11:2021. Safety features per unit:
  ${units.map((u, i) => `<strong>L${i + 1}</strong>: ${esc(u.safetyFeatures || 'see technical sheet')}`).join('; ')}.
  ${units.some(u => u.control) ? 'Control: ' + units.map((u, i) => `<strong>L${i + 1}</strong> ${esc(u.control)}`).join('; ') + '.' : ''}</p>` : ''}
  ${event.show?.unitsControlText ? nl2p(event.show.unitsControlText) : ''}`;

  const effects = `
  ${sec('Effects & application')}
  ${nl2p(event.show?.effectsText || '—')}`;

  const exposure = `
  ${sec('Exposure assessment: MPE, NOHD & audience separation')}
  ${nl2p(bp.nohdStatement)}`;

  const zones = `
  ${sec('Laser controlled areas, zoning & beam termination')}
  ${nl2p(bp.controlledAreas)}`;

  const childrenClause = d.audienceScanning && d.childrenPresent ? (bp.audienceScanningYesChildrenClause || '') : '';
  const scanningText = d.audienceScanning
    ? (bp.audienceScanningYes || '').replace('{{childrenClause}}', childrenClause)
    : (bp.audienceScanningNo || '');
  const diffractionText = d.audienceExposureDiffraction ? bp.diffractionYes : bp.diffractionNo;
  const scanning = `
  ${sec('Audience scanning statement')}
  <div class="callout ${d.audienceScanning ? 'callout-warn' : 'callout-ok'}">${nl2p(scanningText)}</div>
  ${d.audienceScanning && event.show?.scanningMeasurements ? `<p class="strong">Measurement record:</p>${nl2p(event.show.scanningMeasurements)}` : ''}
  ${nl2p(diffractionText)}`;

  const alignment = `
  ${sec('Alignment & pre-show checks')}
  ${nl2p(bp.alignmentProcedure)}`;

  const method = `
  ${sec('Method statement')}
  <ol class="method">${methodSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;

  const eStopSpecText = event.show?.eStopVariant === 'digital'
    ? (bp.eStopSpecDigital || bp.eStopSpec)
    : bp.eStopSpec;
  const estop = event.show?.includeEStopSpec ? `
  ${sec('Emergency stop technical specification')}
  ${nl2p(eStopSpecText)}` : '';

  const emergency = `
  ${sec('Emergency procedures & incident reporting')}
  ${nl2p(bp.emergencyProcedures)}
  <table class="kv">
    ${kv('First aid', event.show?.firstAidLocation || 'Per venue/event arrangements, confirmed at site induction')}
    ${kv('Show-stop channel', event.show?.showStopChannel || 'Event control / stage management')}
  </table>`;

  const aviation = isOutdoorSky ? `
  ${sec('Aviation safety (outdoor display)')}
  ${nl2p(bp.aviationSafety)}
  ${d.installOver30Days ? nl2p(bp.aviationPermanentSite) : ''}
  <table class="kv">
    ${kv('CAA notified', event.aviation?.caaNotified ? 'YES' : 'Notification in progress')}
    ${kv('Notification reference', event.aviation?.caaNotifRef)}
    ${kv('Notification date', fmtDate(event.aviation?.caaNotifDate))}
    ${event.aviation?.notamRef ? kv('NOTAM reference', event.aviation.notamRef) : ''}
    ${kv('Nearest aerodrome', d.nearestAerodrome)}
    ${event.aviation?.atcContact ? kv('ATC contact arrangement', event.aviation.atcContact) : ''}
  </table>` : '';

  const toggles = event.siteSafetyToggles || {};
  const siteKeys = ['electrical', 'workAtHeight', 'manualHandling', 'cables', 'haze', 'fire', 'ppe', 'weather'];
  const siteParas = siteKeys.filter(k => toggles[k] && bp.siteSafety?.[k]).map(k => bp.siteSafety[k]);
  const siteSafety = siteParas.length ? `
  ${sec('General site safety arrangements')}
  ${siteParas.map(p => nl2p(p)).join('')}` : '';

  const riskTable = `
  ${sec('Site-specific risk assessment')}
  <div class="risk-key avoid-break">
    <table class="grid key-table">
      <thead><tr><th colspan="2">Likelihood (L)</th><th colspan="2">Severity (S)</th><th colspan="2">Risk rating (L × S)</th></tr></thead>
      <tbody>
        <tr><td class="num">1</td><td>Rare</td><td class="num">1</td><td>Negligible</td><td class="score band-low">1–4</td><td>Low: monitor</td></tr>
        <tr><td class="num">2</td><td>Unlikely</td><td class="num">2</td><td>Minor (first aid)</td><td class="score band-medium">5–9</td><td>Medium: manage &amp; monitor controls</td></tr>
        <tr><td class="num">3</td><td>Possible</td><td class="num">3</td><td>Moderate (medical treatment)</td><td class="score band-high">10–15</td><td>High: further controls before work</td></tr>
        <tr><td class="num">4</td><td>Likely</td><td class="num">4</td><td>Major (specified injury)</td><td class="score band-veryhigh">16–25</td><td>Very high: do not proceed</td></tr>
        <tr><td class="num">5</td><td>Almost certain</td><td class="num">5</td><td>Catastrophic (fatality)</td><td colspan="2">Persons: E employees · C contractors · P public/audience · V venue staff · A artists</td></tr>
      </tbody>
    </table>
  </div>
  <table class="grid risk-table">
    <thead><tr>
      <th style="width:13%">Hazard / activity</th>
      <th style="width:15%">Risk & who may be harmed</th>
      <th style="width:24%">Existing controls</th>
      <th class="num">L</th><th class="num">S</th><th>Initial</th>
      <th style="width:20%">Monitoring / further action</th>
      <th class="num">L</th><th class="num">S</th><th>Residual</th>
    </tr></thead>
    <tbody>
      ${risks.map(r => `<tr>
        <td class="strong">${esc(r.hazard || '—')}</td>
        <td>${esc(r.risk || '—')}${r.persons ? `<div class="persons">${esc(r.persons)}</div>` : ''}</td>
        <td>${esc(r.controls || '—')}</td>
        ${scoreCell(r.initL, r.initS)}
        <td>${esc(r.action || '—')}</td>
        ${scoreCell(r.resL, r.resS)}
      </tr>`).join('')}
    </tbody>
  </table>`;

  const compliance = `
  ${sec('Legal compliance statement')}
  ${nl2p(bp.complianceStatement)}`;

  // The certificate itself is the evidence of insurance — it is reproduced in
  // full as an appendix; this section only points to it (a re-typed summary
  // carries no legal weight and is never printed).
  const certIdx = ins.certAsset ? appendices.findIndex(a => a.file === ins.certAsset) : -1;
  const insurance = `
  ${sec('Insurance')}
  ${nl2p(bp.insuranceBlurb)}
  ${certIdx >= 0
    ? `<p class="strong">The current Certificate of Insurance is reproduced in full as Appendix ${String.fromCharCode(65 + certIdx)} of this document.</p>`
    : `<p class="strong" style="color:#b3261e">No certificate of insurance is attached to this draft. The issued document must include the certificate itself; add it on the Insurance tab before export.</p>`}`;

  const briefRows = [...operators, ...assistants.filter(a => !operators.some(o => o.id === a.id))]
    .filter(pn => !lso || pn.id !== lso.id);
  const signoff = `
  ${sec('Sign-off & crew briefing record')}
  ${nl2p(bp.signOffText)}
  <table class="grid sign-table">
    <thead><tr><th style="width:26%"></th><th style="width:28%">Name</th><th style="width:22%">Signature</th><th style="width:14%">Date</th></tr></thead>
    <tbody>
      <tr><td class="strong">Prepared by</td><td>${esc(company.author || '')}</td><td></td><td></td></tr>
      <tr><td class="strong">Approved by (LSO)</td><td>${esc(lso?.name || '')}</td><td></td><td></td></tr>
      <tr><td class="strong">Client / event H&amp;S acceptance</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <p class="strong" style="margin-top:5mm">${esc(bp.briefingText || '')}</p>
  <table class="grid sign-table">
    <thead><tr><th style="width:32%">Name</th><th style="width:24%">Role</th><th style="width:26%">Signature</th><th style="width:18%">Date</th></tr></thead>
    <tbody>
      ${briefRows.map(pn => `<tr><td>${esc(pn.name)}</td><td>${esc(roleOf(pn, event))}</td><td></td><td></td></tr>`).join('')}
      ${Array.from({ length: Math.max(3, 8 - briefRows.length) }).map(() => '<tr class="blank"><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('')}
    </tbody>
  </table>`;

  const figures = embeds.map(a => `
  <section class="figure-page">
    <div class="figure-title">${esc(a.title || figureKindLabel(a.kind))}</div>
    ${resources.images?.[a.id]
      ? `<img class="figure-img" src="${resources.images[a.id]}" alt=""/>`
      : `<div class="figure-missing">Image unavailable: ${esc(a.title || a.file || '')}</div>`}
  </section>`).join('');

  const appendixToc = appendices.length ? `
  ${sec('Appendices')}
  <p>The following documents are appended to and form part of this RAMS:</p>
  <table class="grid appendix-table">
    <thead><tr><th style="width:14%">Appendix</th><th>Document</th></tr></thead>
    <tbody>
      ${appendices.map((a, i) => `<tr><td class="strong">Appendix ${String.fromCharCode(65 + i)}</td><td>${esc(a.title)}</td></tr>`).join('')}
    </tbody>
  </table>
  <p class="tablenote">Appendix pages follow this section with continuous page numbering.</p>` : '';

  // ---- assemble --------------------------------------------------------------
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8"/>
<title>${esc(d.eventName || 'RAMS')} Laser Safety RAMS</title>
<style>
${resources.fontCss || ''}
${PRINT_CSS}
</style>
</head>
<body>
${cover}
<main>
${docControl}
${eventDetails}
${scope}
${roles}
${inventory}
${effects}
${exposure}
${zones}
${scanning}
${alignment}
${method}
${estop}
${emergency}
${aviation}
${siteSafety}
${riskTable}
${compliance}
${insurance}
${signoff}
</main>
${figures}
${appendixToc ? `<main>${appendixToc}</main>` : ''}
</body>
</html>`;
}

// ---- helpers ---------------------------------------------------------------

function initials(name) {
  return String(name || '').split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('');
}
function personRow(pn, role) {
  return `<tr><td class="strong">${esc(pn.name)}</td><td>${esc(role)}</td><td>${esc(pn.competence || '')}</td></tr>`;
}
function roleOf(pn, event) {
  if (event.personnel?.operatorIds?.includes(pn.id)) return 'Laser Operator';
  if (event.personnel?.assistantIds?.includes(pn.id)) return 'Assistant / Runner';
  return '';
}
function terminationText(t) {
  return t === 'sky' ? 'Into open sky (see Aviation safety section)'
    : t === 'structure' ? 'Onto structure / non-reflective surface'
      : t === 'treeline' ? 'Above audience, below treeline, terminating on landscape'
        : '—';
}
function figureKindLabel(kind) {
  return kind === 'sitePlan' ? 'Site plan' : kind === 'zoneDiagram' ? 'Laser zone diagram' : 'Figure';
}

// ---- print stylesheet -------------------------------------------------------

const PRINT_CSS = `
:root { color-scheme: light; }
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 16mm 15mm 18mm 15mm; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  font-size: 9.5pt; line-height: 1.5; color: #16181d; background: #fff;
}

/* ---- cover ---- */
.cover { height: 258mm; display: flex; flex-direction: column; justify-content: space-between;
  text-align: center; page-break-after: always; }
.cover-top { padding-top: 18mm; }
.cover-event { font-size: 30pt; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
.cover-year { font-size: 17pt; font-weight: 600; color: #444; margin-top: 2mm; }
.cover-logo { height: 26mm; margin: 12mm auto 10mm; display: block; }
.cover-title { font-size: 19pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.32; }
.cover-compliance { font-size: 8pt; color: #555; max-width: 128mm; margin: 8mm auto 0; line-height: 1.55; }
.cover-bottom { padding-bottom: 4mm; }
.cover-meta { width: 100%; border-collapse: collapse; margin-bottom: 7mm; font-size: 8.5pt; text-align: left; }
.cover-meta td { border-top: 0.35mm solid #16181d; padding: 2.2mm 2mm; vertical-align: top; }
.cover-meta td:nth-child(odd) { font-weight: 700; width: 15%; white-space: nowrap; }
.cover-meta td:nth-child(even) { width: 35%; }
.cover-company { font-size: 8.5pt; color: #333; line-height: 1.6; }
.cover-company-name { font-weight: 800; font-size: 10.5pt; color: #16181d; }

/* ---- sections ---- */
main { display: block; }
h2 { font-size: 12.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;
  margin: 9mm 0 3.2mm; padding-bottom: 1.6mm; border-bottom: 0.5mm solid #16181d;
  break-after: avoid-page; break-inside: avoid; }
h2 .secno { display: inline-block; min-width: 8mm; color: #8a8f9c; font-weight: 700; }
main > h2:first-child { margin-top: 0; }
p { margin: 0 0 2.6mm; text-align: justify; }
p.strong, td.strong, .strong { font-weight: 600; }
ul.refs { margin: 1mm 0 3mm 6mm; }
ul.refs li { margin-bottom: 1.1mm; }
ol.method { margin: 1mm 0 3mm 6mm; }
ol.method li { margin-bottom: 2.2mm; padding-left: 1mm; text-align: justify; }
.avoid-break { break-inside: avoid; }

/* ---- tables ---- */
table.kv { width: 100%; border-collapse: collapse; margin: 0 0 4mm; break-inside: auto; }
table.kv th { width: 34%; text-align: left; font-weight: 600; background: #f2f3f5;
  border: 0.25mm solid #c9ccd4; padding: 1.9mm 2.4mm; vertical-align: top; }
table.kv td { border: 0.25mm solid #c9ccd4; padding: 1.9mm 2.4mm; vertical-align: top; }
table.kv tr { break-inside: avoid; }

table.grid { width: 100%; border-collapse: collapse; margin: 0 0 4mm; font-size: 8.3pt; }
table.grid th { background: #16181d; color: #fff; font-weight: 600; text-align: left;
  padding: 1.8mm 2mm; border: 0.25mm solid #16181d; }
table.grid td { border: 0.25mm solid #c9ccd4; padding: 1.8mm 2mm; vertical-align: top; }
table.grid thead { display: table-header-group; }
table.grid tr { break-inside: avoid; }
td.num, th.num { text-align: center; width: 6mm; }

.rev-table td.blank, .sign-table tr.blank td { height: 8mm; }

.inv-table { font-size: 7.6pt; }
.tablenote { font-size: 8pt; color: #444; }

/* risk table */
.risk-table { font-size: 7.6pt; }
.risk-table td { padding: 1.6mm 1.6mm; }
.persons { margin-top: 1mm; font-weight: 600; color: #555; font-size: 7pt; }
td.score { text-align: center; font-weight: 800; white-space: nowrap; width: 11mm; }
td.score .bandword { display: block; font-weight: 600; font-size: 6.4pt; }
.band-low { background: #2f9e57; color: #fff; }
.band-medium { background: #e8a33d; color: #16181d; }
.band-high { background: #e06a2b; color: #fff; }
.band-veryhigh { background: #d64550; color: #fff; }
.band-none { background: #eee; color: #555; }
.key-table td.score { width: 14mm; }

/* callouts */
.callout { border: 0.35mm solid #16181d; padding: 3mm 3.5mm; margin: 0 0 3mm; }
.callout p:last-child { margin-bottom: 0; }
.callout-ok { border-color: #2f9e57; background: #f2faf5; }
.callout-warn { border-color: #e8a33d; background: #fdf7ec; }

/* figures */
.figure-page { page-break-before: always; height: 250mm; display: flex; flex-direction: column; }
.figure-title { font-size: 12.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;
  border-bottom: 0.5mm solid #16181d; padding-bottom: 1.6mm; margin-bottom: 5mm; }
.figure-img { max-width: 100%; max-height: 225mm; object-fit: contain; margin: auto; }
.figure-missing { margin: auto; color: #999; border: 0.4mm dashed #bbb; padding: 20mm; }

/* keep appendix TOC on its own page */
main + main { display: block; }
main:last-of-type h2 { page-break-before: always; }
`;
