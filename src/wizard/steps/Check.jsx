import React, { useState } from 'react';
import api from '../../api.js';
import { STEPS } from '../Wizard.jsx';
import {
  Badge, Button, Callout, Icon, Spinner,
} from '../../components/ui.jsx';
import { Modal } from '../../components/Modal.jsx';
import { exportFilename } from '../../components/util.jsx';

const stepLabel = (id) => STEPS.find((s) => s.id === id)?.label || id;

export default function CheckStep({
  draft, validation, goToStep, doExport, exporting, exportResult, buildHtml,
}) {
  const [preview, setPreview] = useState(null); // { html } | 'loading'
  const { errors, warnings } = validation;
  const hasErrors = errors.length > 0;

  const openPreview = async () => {
    setPreview('loading');
    try {
      const html = await buildHtml();
      setPreview({ html });
    } catch (e) {
      setPreview({ error: String(e?.message || e) });
    }
  };

  return (
    <>
      <div className="step-heading">
        <h2>Check & export</h2>
        <div className="step-desc">
          Every finding below is checked live against this draft. Errors block export, warnings don’t.
        </div>
      </div>

      {errors.length === 0 && warnings.length === 0 ? (
        <section className="card">
          <div className="allclear">
            <span className="allclear-ic"><Icon name="check" size={26} /></span>
            <h3>All clear</h3>
            <p>No errors and no warnings. This document is ready to export.</p>
          </div>
        </section>
      ) : (
        <>
          {errors.length > 0 ? (
            <section className="stack" style={{ gap: 8 }}>
              <div className="card-title" style={{ color: 'var(--error)' }}>
                {errors.length} error{errors.length === 1 ? '' : 's'} that must be fixed before export
              </div>
              {errors.map((f, i) => (
                <FindingRow key={`e${i}`} finding={f} onClick={() => goToStep(f.step)} />
              ))}
            </section>
          ) : null}
          {warnings.length > 0 ? (
            <section className="stack" style={{ gap: 8 }}>
              <div className="card-title" style={{ color: 'var(--warn)' }}>
                {warnings.length} warning{warnings.length === 1 ? '' : 's'} to review before issuing
              </div>
              {warnings.map((f, i) => (
                <FindingRow key={`w${i}`} finding={f} onClick={() => goToStep(f.step)} />
              ))}
            </section>
          ) : null}
        </>
      )}

      <section className="card">
        <div className="card-title">Export</div>
        <div className="card-sub">
          A4 PDF with the generated body, embedded figures and appended appendices, with
          continuous page numbers.
        </div>
        <div className="stack">
          <div className="export-filename">{exportFilename(draft)}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={exporting ? undefined : 'download'}
              disabled={hasErrors || exporting}
              title={hasErrors ? 'Fix the errors above first' : undefined}
              onClick={doExport}
            >
              {exporting ? (<><Spinner size={14} /> Exporting…</>) : 'Export PDF'}
            </Button>
            <Button variant="secondary" icon="eye" onClick={openPreview} disabled={preview === 'loading'}>
              {preview === 'loading' ? 'Building preview…' : 'Preview document'}
            </Button>
          </div>

          {exportResult?.path ? (
            <Callout tone="success" title="Exported">
              <div className="mono small" style={{ wordBreak: 'break-all', marginBottom: 8 }}>
                {exportResult.path}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="secondary" className="btn-sm" icon="folder"
                  onClick={() => api.revealPath(exportResult.path).catch(() => {})}>
                  Show in folder
                </Button>
                <Button variant="secondary" className="btn-sm" icon="external"
                  onClick={() => api.openPath(exportResult.path).catch(() => {})}>
                  Open
                </Button>
              </div>
              {(exportResult.warnings || []).length > 0 ? (
                <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                  {exportResult.warnings.map((w, i) => (
                    <li key={i} style={{ color: 'var(--warn)' }}>{String(w)}</li>
                  ))}
                </ul>
              ) : null}
            </Callout>
          ) : null}

          {exportResult?.canceled ? (
            <Callout tone="info">
              {exportResult.note || 'Export was cancelled.'}
            </Callout>
          ) : null}

          {exportResult?.error ? (
            <Callout tone="error" title="Export failed">{exportResult.error}</Callout>
          ) : null}
        </div>
      </section>

      {preview && preview !== 'loading' ? (
        preview.error ? (
          <Modal title="Preview failed" onClose={() => setPreview(null)}>
            <Callout tone="error">{preview.error}</Callout>
          </Modal>
        ) : (
          <Modal title="Document preview" className="modal-preview" onClose={() => setPreview(null)}>
            <iframe className="preview-frame" title="Document preview" srcDoc={preview.html} />
          </Modal>
        )
      ) : null}
    </>
  );
}

function FindingRow({ finding, onClick }) {
  return (
    <button type="button" className={`finding-row ${finding.level}`} onClick={onClick}>
      <span className="finding-ic"><Icon name="alert" size={16} /></span>
      <span className="finding-msg">{finding.message}</span>
      <span className="finding-step">
        <Badge tone={finding.level === 'error' ? 'red' : 'amber'}>{stepLabel(finding.step)}</Badge>
      </span>
    </button>
  );
}
