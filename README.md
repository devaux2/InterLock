# Interlock

A self-contained desktop app by **Paradox State International Ltd**, released free
to the laser display industry. It creates, checks and exports laser-display
**RAMS** (Laser Safety, Risk Assessment & Method Statement) documents as
high-quality PDFs, replacing the copy-a-PDF-and-edit workflow.

Named after the thing every laserist checks before emission is possible: the
interlock. This is the paperwork version.

## What it does

- **Answer questions, get a document.** A 9-step wizard (event details → venue &
  site → personnel → laser equipment → show & effects → method & e-stop → risk
  assessment → attachments → check & export) produces the full document.
- **Repeat events in minutes.** "New from this event" clones any previous event
  with everything prefilled; edit as you step through. The document date resets
  automatically.
- **Built-in checking.** The Check step catches the classic copy-paste traps
  before export: load-in dates from the wrong year, stale document dates, insurance
  that expires before the event, missing CAA notification for outdoor sky shows,
  residual risks that are still High, and more. Errors block export; warnings don't.
- **Site documentation.** Attach site plans / zone diagrams (images, printed as
  full-page figures) and PDFs (merged as appendices). Laser tech sheets for the
  selected units, the insurance certificate and the company H&S policy are appended
  automatically with continuous page numbering and appendix footers.
- **Exports as `Event name_DD.MM.YYYY.pdf`** with correct PDF metadata.

## The generated document

Modernised version of the established Paradox State format (cover, event details
table, effects prose, e-stop spec, risk table, insurance) extended to 2026
professional standard, based on current guidance research:

- Cites **PLASA "Safety of Display Lasers" (April 2016)** and **PD IEC TR
  60825-3:2022**, *not* the withdrawn HSG95 (the old documents cited this; it was
  withdrawn by HSE years ago). Correct regulation years throughout (MHSWR **1999**,
  PUWER **1998**, AOR 2010 SI 2010/1140, BS EN 60825-1:2014+A11:2021).
- Adds the sections reviewers now expect: document control & revision history,
  named **Laser Safety Officer** with stop authority, laser equipment inventory
  table, MPE/NOHD & audience separation statement, controlled areas & beam
  termination, audience-scanning statement (engineered safety-case wording when
  YES), alignment & pre-show checks (Display Safety Record), emergency procedures
  incl. suspected-eye-exposure protocol, **CAA CAP 736 aviation section** for
  outdoor sky-terminating shows, 5×5 initial/residual colour-banded risk matrix,
  and a sign-off & crew briefing record.

## Running it

Requires Node.js (a portable copy lives at
`%LOCALAPPDATA%\Programs\node-portable`, no system install needed).

```bash
npm run start
```

builds the UI and launches the app. For development with hot reload: `npm run dev`.

To build a standalone portable `RAMS Doc Maker.exe` (no Node needed to run it):

```bash
npm run dist
```

(If the build fails with an `EBUSY … win-unpacked.tmp` error, Dropbox is syncing the
build folder mid-write. Pause Dropbox syncing or run the build again; it is
intermittent. The finished exe lands in `release/`.)

## Publishing updates (GitHub)

The project lives at https://github.com/devaux2/InterLock with `data/` excluded
(live business data never leaves this machine).

To ship a release: bump `"version"` in package.json, commit, then push a
matching tag:

```bash
git push origin main --follow-tags
```

The GitHub Actions workflow (`.github/workflows/release.yml`) builds
Interlock.exe on GitHub's servers and publishes the release automatically.
The Settings → Updates card in every copy of the app compares the running
version against the latest release tag. Checks are manual only; nothing ever
downloads or installs itself.

Before making the repo public, note that `seed/` ships your company details
(the same names, phone number and policy number printed on every RAMS you send
out, plus the H&S policy PDF). That is what makes fresh installs useful demos,
but review it once with public eyes.

## Jurisdictions

Each event has a **Jurisdiction** (Event details step). *United Kingdom* prints
the default boilerplate in `library.boilerplate`; *Hong Kong SAR* overlays
`library.boilerplateVariants.hk` key by key (legislation and standards
references, compliance statement, electrical / work-at-height / fire wording,
method steps, and a "Display laser information" sheet cross-referenced to the
FEHD form FEHB104 Annex III that the TPPE licence application needs). Add
another territory by adding a key under `boilerplateVariants` and an entry in
`src/jurisdictions.js`; anything a variant does not override falls back to the
UK text.

Headless export of any event: `electron . --export <eventId> [out.pdf]`
(`<eventId>` is the `data/events/<id>.json` filename without `.json`).

## Where your data lives

Everything is stored as plain JSON + copied files in **`data/`** next to the app
(configured in `rams.config.json`), so it syncs with Dropbox:

```
data/settings.json     company profile, author, insurance summary
data/library.json      laser units, people, standard risks, boilerplate text
data/events/*.json     one file per event
data/attachments/      copied uploads per event
data/assets/           logo, tech sheets, H&S policy, insurance certificate
```

The sidebar: **Events** (create, duplicate, export), **Library** (laser units,
standard risk rows, boilerplate text), **Company** (details, logo, H&S policy;
the logo and company name also brand the sidebar), **Crew** (operators /
assistants / LSOs; the wizard picks from this list), **Insurance** (certificate
PDF + policy dates for the expiry check), **Settings** (dark / light / custom
theme, preset or custom-hex accent colour, data storage) and **About** (the
story behind the tool + industry links).

## Things to check once

- **Insurance certificate**: the exported document reproduces your certificate
  PDF in full as its own appendix pages; it never prints a typed summary (a
  re-typed summary is not valid evidence of insurance). No *current* certificate
  was on file to seed (the 2022 one in the Risk assessments folder is expired),
  so add the current certificate via Settings → Insurance; **export is blocked
  until one is stored**. The policy dates in Settings only drive the
  expiry-before-event check.
- **Phone number**: your old documents used both +44 79**44** 282 177 and
  +44 79**74** 282 177. The seed uses 7974 (the one in your most recent
  documents). Fix on the Company tab if wrong.
- **Author name**: seeded as "Whitcliffe Theodore Frederick Wainhouse" (the old
  docs also variously used "Whitcliffe de Vaux"). Change on the Company tab if
  preferred.
- **Logo**: extracted from your existing PDF at print quality; replace with an
  original vector/PNG in Settings for even crisper output.
