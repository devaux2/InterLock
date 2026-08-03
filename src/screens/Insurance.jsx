import React from 'react';
import api from '../api.js';
import { Button, Callout, Field, Icon, TextInput, DateInput } from '../components/ui.jsx';
import { assetPath, fileName } from '../components/util.jsx';
import { useSettingsDraft, SaveIndicatorText } from '../components/useSettingsDraft.js';

export default function Insurance({ settings, updateSettings }) {
  const { draft, setDraft, saveState } = useSettingsDraft(settings, updateSettings);
  const insurance = draft.insurance || {};
  const setInsurance = (k, v) => setDraft((d) => ({ ...d, insurance: { ...d.insurance, [k]: v } }));

  const replaceCert = async () => {
    const res = await api.pickAsset({
      title: 'Choose insurance certificate PDF',
      filters: [{ name: 'PDF documents', extensions: ['pdf'] }],
    });
    const path = assetPath(res);
    if (path) setInsurance('certAsset', path);
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Insurance</h1>
          <div className="screen-sub">The certificate itself is the evidence: it prints in full in every document</div>
        </div>
        <div className={`save-indicator ${saveState}`}>{SaveIndicatorText(saveState)}</div>
      </div>

      <div className="stack-lg">
        <section className="card">
          <div className="card-title">Certificate of insurance</div>
          <div className="card-sub">
            Reproduced in full, as its own pages, in every exported document. A typed summary is
            never printed because it is not valid evidence of insurance. Export is blocked until
            a certificate is stored.
          </div>
          <div className="file-slot">
            <span className="file-ic"><Icon name="shield" size={15} /></span>
            <span className={`file-name${insurance.certAsset ? '' : ' none'}`}>
              {insurance.certAsset ? fileName(insurance.certAsset) : 'No certificate stored'}
            </span>
            <Button variant="secondary" className="btn-sm" onClick={replaceCert}>
              {insurance.certAsset ? 'Replace' : 'Choose PDF'}
            </Button>
            {insurance.certAsset ? (
              <Button variant="ghost" className="btn-sm" onClick={() => setInsurance('certAsset', null)}>Remove</Button>
            ) : null}
          </div>
          {!insurance.certAsset ? (
            <Callout tone="warn" title="No certificate stored">
              Exports are blocked until the current certificate PDF is added. When the policy
              renews, replace it here once and every future document picks it up.
            </Callout>
          ) : null}
        </section>

        <section className="card">
          <div className="card-title">Policy dates & reference</div>
          <div className="card-sub">
            Used only by the Check step, which blocks export if the policy lapses before an event
            ends, and warns when renewal falls within a month of a show. Nothing here is printed.
          </div>
          <div className="form-grid">
            <Field label="Policy start">
              <DateInput value={insurance.policyStart || ''} onChange={(e) => setInsurance('policyStart', e.target.value)} />
            </Field>
            <Field label="Policy end">
              <DateInput value={insurance.policyEnd || ''} onChange={(e) => setInsurance('policyEnd', e.target.value)} />
            </Field>
            <Field label="Insurer" hint="For your own reference in this app.">
              <TextInput value={insurance.insurer || ''} onChange={(e) => setInsurance('insurer', e.target.value)} />
            </Field>
            <Field label="Policy number">
              <TextInput value={insurance.policyNumber || ''} onChange={(e) => setInsurance('policyNumber', e.target.value)} />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}
