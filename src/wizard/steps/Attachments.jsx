import React, { useEffect, useState } from 'react';
import api from '../../api.js';
import {
  Button, Callout, Icon, Select, TextInput, EmptyState,
} from '../../components/ui.jsx';
import { fileName, isImagePath, isPdfPath } from '../../components/util.jsx';

const KINDS = [
  { value: 'sitePlan', label: 'Site plan' },
  { value: 'zoneDiagram', label: 'Zone diagram' },
  { value: 'techSheet', label: 'Tech sheet' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'policy', label: 'Policy' },
  { value: 'other', label: 'Other' },
];

export default function AttachmentsStep({ draft, setDraft }) {
  const atts = draft.attachments || [];
  const [thumbs, setThumbs] = useState({}); // file -> dataUrl
  const [picking, setPicking] = useState(false);

  const setAtts = (next) => setDraft((prev) => ({ ...prev, attachments: next }));
  const setAtt = (id, patch) => setAtts(atts.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  // Load image thumbnails.
  useEffect(() => {
    let alive = true;
    atts.forEach((a) => {
      if (!isImagePath(a.file) || thumbs[a.file] !== undefined) return;
      api.fileDataUrl(a.file)
        .then((url) => { if (alive) setThumbs((t) => ({ ...t, [a.file]: url })); })
        .catch(() => { if (alive) setThumbs((t) => ({ ...t, [a.file]: null })); });
    });
    return () => { alive = false; };
  }, [atts]);

  const addFiles = async () => {
    setPicking(true);
    try {
      const picked = await api.pickAttachments(draft.id);
      const items = (picked || []).map((p) => {
        const file = p.file || p.path || '';
        const image = isImagePath(file);
        // p.name is the original filename; the stored file carries a random prefix.
        const cleanName = p.name || fileName(file);
        return {
          id: p.id || crypto.randomUUID(),
          kind: p.kind || (image ? 'sitePlan' : 'other'),
          title: p.title || cleanName.replace(/\.[^.]+$/, ''),
          file,
          mode: image ? 'embed' : 'append',
        };
      }).filter((p) => p.file);
      if (items.length) setAtts([...atts, ...items]);
    } finally {
      setPicking(false);
    }
  };

  return (
    <>
      <div className="step-heading">
        <h2>Attachments</h2>
        <div className="step-desc">
          Event-specific documents: site plans, zone diagrams and anything a reviewer asked for.
        </div>
      </div>

      <Callout tone="info" title="Already handled for you">
        Tech sheets for the selected units, the insurance certificate and the H&S policy from
        Settings are appended automatically at export, so only add event-specific extras here.
        Images print as full-page figures in the body; PDFs are merged as appendices with
        continuous page numbers.
      </Callout>

      <section className="card">
        <div className="card-head-row">
          <div className="card-title">Files</div>
          <Button variant="primary" className="btn-sm" icon="plus" onClick={addFiles} disabled={picking}>
            {picking ? 'Choosing…' : 'Add files'}
          </Button>
        </div>

        {atts.length === 0 ? (
          <EmptyState icon="image" title="No attachments">
            Site plans and zone diagrams make approval much smoother, so add them if you have them.
          </EmptyState>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {atts.map((a) => (
              <div key={a.id} className="att-row">
                <div className="att-thumb">
                  {isImagePath(a.file) && thumbs[a.file]
                    ? <img src={thumbs[a.file]} alt="" />
                    : <Icon name={isPdfPath(a.file) ? 'file' : isImagePath(a.file) ? 'image' : 'file'} size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="att-fields">
                    <TextInput
                      value={a.title || ''}
                      aria-label="Attachment title"
                      placeholder="Title as printed in the document"
                      onChange={(e) => setAtt(a.id, { title: e.target.value })}
                    />
                    <Select
                      value={a.kind || 'other'}
                      aria-label="Attachment kind"
                      onChange={(e) => setAtt(a.id, { kind: e.target.value })}
                    >
                      {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </Select>
                    {/* Mode follows file type: images embed as figures, PDFs append
                        as appendices; a mismatch would print blank/broken pages. */}
                    <span className="att-mode-label" title={isImagePath(a.file)
                      ? 'Images print as full-page figures in the document body'
                      : 'PDFs are merged after the body as appendices'}>
                      {isImagePath(a.file) ? 'Embedded figure' : 'Appendix (merged)'}
                    </span>
                  </div>
                  <div className="att-file">
                    {fileName(a.file)}
                    {a._missing ? (
                      <span style={{ color: 'var(--error)', fontWeight: 600 }}> (file missing on disk)</span>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost" className="btn-icon" aria-label="Remove attachment"
                  onClick={() => setAtts(atts.filter((x) => x.id !== a.id))}
                >
                  <Icon name="trash" size={15} />
                </Button>
              </div>
            ))}
          </div>
        )}
        {atts.length > 0 ? (
          <div className="field-hint" style={{ marginTop: 12 }}>
            Images print as full-page figures in the document body; PDFs are merged after the
            body as appendices with continuous page numbering.
          </div>
        ) : null}
      </section>
    </>
  );
}
