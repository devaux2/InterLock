import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { Button, Field, Icon, TextInput } from '../components/ui.jsx';
import { assetPath, fileName } from '../components/util.jsx';
import { useSettingsDraft, SaveIndicatorText } from '../components/useSettingsDraft.js';

export default function Company({ settings, updateSettings }) {
  const { draft, setDraft, saveState } = useSettingsDraft(settings, updateSettings);
  const [logoUrl, setLogoUrl] = useState(null);

  const company = draft.company || {};
  const setCompany = (k, v) => setDraft((d) => ({ ...d, company: { ...d.company, [k]: v } }));

  useEffect(() => {
    let alive = true;
    if (!company.logoAsset) { setLogoUrl(null); return undefined; }
    api.fileDataUrl(company.logoAsset)
      .then((url) => { if (alive) setLogoUrl(url); })
      .catch(() => { if (alive) setLogoUrl(null); });
    return () => { alive = false; };
  }, [company.logoAsset]);

  const replaceLogo = async () => {
    const res = await api.pickAsset({
      title: 'Choose company logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
    });
    const path = assetPath(res);
    if (path) setCompany('logoAsset', path);
  };

  const replaceHsPolicy = async () => {
    const res = await api.pickAsset({
      title: 'Choose Health & Safety policy PDF',
      filters: [{ name: 'PDF documents', extensions: ['pdf'] }],
    });
    const path = assetPath(res);
    if (path) setCompany('hsPolicyAsset', path);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Company</h1>
          <div className="screen-sub">Printed on the cover, document control and compliance pages</div>
        </div>
        <div className={`save-indicator ${saveState}`}>{SaveIndicatorText(saveState)}</div>
      </div>

      <div className="stack-lg">
        <section className="card">
          <div className="card-title">Details</div>
          <div className="form-grid">
            <Field label="Company name" className="span2">
              <TextInput value={company.name || ''} onChange={(e) => setCompany('name', e.target.value)} />
            </Field>
            <Field label="Registered address">
              <TextInput value={company.registeredAddress || ''} onChange={(e) => setCompany('registeredAddress', e.target.value)} />
            </Field>
            <Field label="Trading address">
              <TextInput value={company.tradingAddress || ''} onChange={(e) => setCompany('tradingAddress', e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={company.phone || ''} onChange={(e) => setCompany('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput value={company.email || ''} onChange={(e) => setCompany('email', e.target.value)} />
            </Field>
            <Field label="Author (document signatory)">
              <TextInput value={company.author || ''} onChange={(e) => setCompany('author', e.target.value)} />
            </Field>
            <Field label="Author role">
              <TextInput value={company.authorRole || ''} onChange={(e) => setCompany('authorRole', e.target.value)} />
            </Field>
            <Field label="Document reference prefix" hint="Used for document references, e.g. PSI-RAMS-2026-001.">
              <TextInput value={company.docRefPrefix || ''} onChange={(e) => setCompany('docRefPrefix', e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="card-title">Documents & branding</div>
          <div className="form-grid">
            <Field label="Health & Safety policy (PDF)" className="span2" hint="Appended in full to every exported document.">
              <div className="file-slot">
                <span className="file-ic"><Icon name="file" size={15} /></span>
                <span className={`file-name${company.hsPolicyAsset ? '' : ' none'}`}>
                  {company.hsPolicyAsset ? fileName(company.hsPolicyAsset) : 'No policy stored'}
                </span>
                <Button variant="secondary" className="btn-sm" onClick={replaceHsPolicy}>
                  {company.hsPolicyAsset ? 'Replace' : 'Choose PDF'}
                </Button>
                {company.hsPolicyAsset ? (
                  <Button variant="ghost" className="btn-sm" onClick={() => setCompany('hsPolicyAsset', null)}>Remove</Button>
                ) : null}
              </div>
            </Field>
            <Field label="Logo" className="span2">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className={`logo-preview${logoUrl ? '' : ' empty'}`}>
                  {logoUrl ? <img src={logoUrl} alt="Company logo" /> : 'No logo'}
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  <Button variant="secondary" onClick={replaceLogo}>Replace logo</Button>
                  {company.logoAsset ? (
                    <span className="muted small mono">{fileName(company.logoAsset)}</span>
                  ) : null}
                </div>
              </div>
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}
