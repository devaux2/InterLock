// Jurisdictions a document can be prepared for. The default (UK) boilerplate
// lives in library.boilerplate; library.boilerplateVariants[id] overrides it
// key by key for the others (see resolveBoilerplate in src/print/buildPrintHtml.mjs).
export const JURISDICTIONS = [
  { id: 'uk', label: 'United Kingdom' },
  { id: 'hk', label: 'Hong Kong SAR' },
];

export const jurisdictionLabel = (id) =>
  (JURISDICTIONS.find((j) => j.id === id) || JURISDICTIONS[0]).label;
