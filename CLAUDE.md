# Interlock

Electron + React app that generates laser display RAMS PDFs. See README.md for
product detail and SPEC.md for architecture. Repo: github.com/devaux2/InterLock.

## Working agreement

The maintainer does not touch git or GitHub. The assistant owns all of it:

- Commit and push to `origin main` at natural completion points (a feature done,
  a fix verified) without asking. Never ask the maintainer to run git commands
  or do anything on github.com.
- To ship a release: bump `version` in package.json, commit, tag `vX.Y.Z`,
  push with `--follow-tags`. GitHub Actions builds Interlock.exe and publishes
  the release (.github/workflows/release.yml). Only ship when the maintainer
  says the change should reach users; pushing code to main needs no approval.
- Never commit `data/` (live business data; gitignored). Seeds live in `seed/`.

## Conventions

- No em dashes anywhere in user-facing copy or documents. Restructure the
  sentence instead (commas, colons, parentheses). Bare placeholder dashes in
  empty table cells are fine.
- UK spelling throughout. Document boilerplate must cite current guidance
  (PLASA Safety of Display Lasers 2016, PD IEC TR 60825-3:2022, AOR 2010);
  HSG95 is withdrawn and must not be cited as current.
- The insurance section of generated documents never prints a typed summary;
  the uploaded certificate PDF is the evidence and is merged in full.

## Build and test

- `npm run dev` dev server + Electron; `npm run start` production run.
- Headless checks: `electron . --smoke` (UI boots + update check) and
  `electron . --export-sample out.pdf` (full PDF pipeline). On Windows, launch
  via Start-Process with output redirects; Electron detaches stdout otherwise.
- `npm run dist` packages the portable exe. If it fails with EBUSY in Dropbox,
  point `build.directories.output` at a temp folder outside Dropbox and retry.
- Renderer runs standalone in a browser against a mock backend for UI checks
  (`.claude/launch.json` preview config).
