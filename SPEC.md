# RAMS Doc Maker — Specification

Desktop app (Electron) for Paradox State International Ltd to create, check and export
laser-display RAMS (Laser Safety, Risk Assessment & Method Statement) documents as
high-quality PDFs. Replaces the manual Affinity Publisher / PDF-editor workflow.

## Goals
1. Answer a series of questions in a clean wizard → app generates the full document.
2. Re-use a previous event ("New from previous") with everything prefilled and editable.
3. Upload site documentation: site plans / zone diagrams (images, embedded as figures),
   laser tech sheets / insurance certificate / H&S policy (PDFs, merged as appendices).
4. Built-in "Check" step: validation catches stale dates, expired insurance, missing
   fields, contradictory answers before export.
5. Export as `"<Event name>_<DD.MM.YYYY>.pdf"` with continuous page numbers across
   the generated body and all appended PDFs.

## Stack
- Electron (main: `electron/*.cjs`), React 18 + Vite (renderer, `src/`).
- PDF: hidden BrowserWindow → `webContents.printToPDF` (A4, backgrounds, CSS @page)
  → `pdf-lib` appends appendix PDFs and stamps continuous footer page numbers.
- Storage: plain JSON in a data dir + copied attachment files. No database.
- Fonts: bundled Inter (UI + print). Fully offline / self-contained.

## Data model (data dir)
```
data/
  settings.json      company profile, author, insurance summary, preferences
  library.json       laserUnits[], personnel[], riskLibrary[], boilerplate{}
  events/<id>.json   one file per event
  attachments/<eventId>/...   copied uploads
  assets/            logo, reusable PDFs (tech sheets, H&S policy, insurance cert)
```
Data dir resolution: `rams.config.json` next to app root (`{"dataDir": "./data"}`),
else Electron userData. Ships with `./data` so everything lives in Dropbox.

### Event record (events/<id>.json)
```jsonc
{
  "id": "uuid", "createdAt": "...", "updatedAt": "...", "createdFrom": "eventId|null",
  "details": {
    "eventName": "", "client": "", "contacts": "", "contactNumber": "",
    "todaysDate": "", "eventDateStart": "", "eventDateEnd": "",       // ISO dates
    "venue": "", "venueAddress": "", "capacity": null,
    "indoorOutdoor": "indoor|outdoor", "eventType": "",
    "loadInDate": "", "loadInTime": "", "rehearsal": "", "inspection": "",
    "alcoholServed": true, "installationType": "Temporary|Permanent",
    "audienceScanning": false, "audienceExposureDiffraction": false,
    "outdoorTermination": "sky|structure|treeline|n/a"                // drives CAA text
  },
  "personnel": { "lsoId": "person-id", "operatorIds": [], "assistantIds": [],
                 "extraNotes": "" },
  "equipment": [ { "unitId": "lib-id", "qty": 2, "includeTechSheet": true } ],
  "show": { "effectsText": "", "unitsControlText": "", "methodText": "",
            "eStopVariant": "hardline|digital", "includeEStopSpec": true },
  "risks": [ { "libId": "or null for custom", "hazard": "", "risk": "",
               "persons": "", "controls": "", "action": "",
               "initL": 3, "initS": 4, "resL": 1, "resS": 4 } ],
  "attachments": [ { "id": "", "kind": "sitePlan|zoneDiagram|techSheet|insurance|policy|other",
                     "title": "", "file": "relative path", "mode": "embed|append" } ],
  "compliance": { "includeCAA": true },   // derived default, overridable
  "exportHistory": [ { "date": "", "path": "" } ]
}
```

### Library
- `laserUnits[]`: id, name, class ("Class 4"), totalPower, wavelengths (r/g/b nm + mW),
  beamSize, divergence, scanner, maxScanAngle, ip, weight, dims, control, notes,
  techSheetAsset (path|null).
- `personnel[]`: id, name, roles ["LSO","Operator","Assistant"], qualifications, phone.
- `riskLibrary[]`: same row shape as event risks, plus `default: true` rows that
  pre-populate every new event.
- `boilerplate{}`: effectsTemplate, unitsControlTemplate, methodTemplate (per eStop
  variant), eStopSpec, complianceStatement, insuranceBlurb — all with `{{placeholders}}`.

## Screens
1. **Home** — event cards (name, date, venue, last export), search; actions:
   New RAMS / New from previous / Open / Export / Delete (confirm).
2. **Wizard** — steps with sidebar progress; every step prefilled when duplicating:
   1 Event details → 2 Venue & site → 3 Personnel → 4 Laser equipment →
   5 Show & effects → 6 Method & E-Stop → 7 Risk assessment →
   8 Attachments → 9 Check & export (validation report + live PDF preview).
3. **Library** — manage laser units, people, standard risks, boilerplate text.
4. **Settings** — company profile, author, insurance summary, data folder, logo.

## Generated document structure (A4)
1. Cover — event name + year, doc title, compliance line, company + author block, logo.
2. Document control — version, dates, author, revision table, distribution.
3. Event details table.
4. Responsibilities & competence — LSO designation, operators table, sign-on lines.
5. Laser equipment inventory table (per unit: class, power, wavelengths, divergence,
   scanner, control) + safety features paragraph.
6. Effects & application + audience separation / termination statement.
7. Method statement (numbered steps) + alignment & zoning procedure.
8. E-Stop technical specification (optional page).
9. Risk assessment — L×S matrix key, then table with initial & residual scores,
   colour-banded.
10. Emergency procedures & aviation/CAA statement (outdoor sky-terminating shows).
11. Compliance statement (correct current regs) + insurance summary.
12. Sign-off / briefing record.
13. Appendices TOC → merged PDFs (site plan images become full-page figures in body).

Footer on every page (stamped post-merge): "«Event» — Laser Safety RAMS — Page n of N".

## Validation ("Check") rules — as implemented in src/validation.js
- **errors (block export):** event name / start date / venue missing; event end
  before start; load-in year ≠ event year (stale duplicate trap); no named LSO;
  no operators; no laser units; audienceScanning=YES without measurement details;
  empty risk table; any residual risk ≥ 10 (High/Very High); insurance policyEnd
  before event end; no insurance certificate PDF stored in Settings (the document
  must reproduce the certificate itself — no typed summary is printed); attachment
  file missing on disk.
- **warnings:** client / venue address / capacity / document date blank; document
  date >7 days from today; event date in past; load-in after event start; selected
  person/unit no longer in library; tech sheet flagged but not stored; effects text
  empty; audienceScanning=YES advisory (append MPE measurement records);
  outdoor+sky without recorded CAA notification or nearest aerodrome; risk rows
  missing L/S scores; residual > initial; insurance expiring within 30 days of the
  event.

## Post-review amendments (v1.0)
- The Insurance section never prints a typed policy summary — it only points to
  the appendix where the uploaded certificate PDF is reproduced in full (a
  re-typed summary is not valid evidence of insurance). Missing certificate is
  an export-blocking error; policy dates in Settings exist solely for the
  expiry validation rule.
- Attachment mode is decided by file type everywhere (images → embedded figures,
  PDFs → appendices); the UI shows the mode as a label, not a choice.
- `settings.company.hsPolicyAsset` (H&S policy PDF) is editable in Settings and
  auto-appended, like the insurance certificate and unit tech sheets.
- `boilerplate.eStopSpecDigital` prints for events with `show.eStopVariant =
  "digital"`; the original `eStopSpec` text covers the hard-line FOH variant.
- Appendix footer letters are assigned by TOC position even if an appendix fails
  to merge; encrypted appendix PDFs are refused with a clear export warning.

## Verification hooks (dev)
- `npm run export:sample` — headless (hidden window) export of the seeded Gottwood
  2026 event to scratchpad, prints output path, exits. Used for end-to-end testing.
- Renderer runs standalone in a plain browser with an in-memory mock of the
  `window.rams` API (for UI preview/testing without Electron).
