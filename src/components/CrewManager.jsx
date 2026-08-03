import React, { useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { Badge, Button } from './ui.jsx';
import { ConfirmModal } from './Modal.jsx';
import { PersonEditModal } from './editors.jsx';

/**
 * Crew CMS: list, add, edit and delete crew members (library.personnel).
 * Lives on the Settings screen; the wizard's Personnel step reads the same list.
 */
export default function CrewManager({ library, updateLibrary }) {
  const [editing, setEditing] = useState(null); // person | 'new'
  const [deleting, setDeleting] = useState(null);
  const [events, setEvents] = useState([]);
  const people = library.personnel || [];

  useEffect(() => {
    api.listEvents().then((evs) => setEvents(evs || [])).catch(() => {});
  }, []);

  const usageCount = useMemo(() => (id) => events.filter((ev) => {
    const p = ev.personnel || {};
    return p.lsoId === id || (p.operatorIds || []).includes(id) || (p.assistantIds || []).includes(id);
  }).length, [events]);

  const save = (person) => {
    const isNew = editing === 'new';
    const next = isNew
      ? [...people, { ...person, id: crypto.randomUUID() }]
      : people.map((p) => (p.id === editing.id ? { ...editing, ...person } : p));
    updateLibrary({ ...library, personnel: next });
    setEditing(null);
  };

  const remove = () => {
    updateLibrary({ ...library, personnel: people.filter((p) => p.id !== deleting.id) });
    setDeleting(null);
  };

  return (
    <>
      <div className="card-head-row">
        <div className="muted small">{people.length} {people.length === 1 ? 'person' : 'people'}</div>
        <Button variant="primary" className="btn-sm" icon="plus" onClick={() => setEditing('new')}>
          Add crew member
        </Button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Roles</th><th>Phone</th><th>Competence</th><th></th></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td className="td-main">{p.name}</td>
                <td>
                  <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
                    {(p.roles || []).map((r) => (
                      <Badge key={r} tone={r === 'LSO' ? 'green' : 'neutral'}>{r}</Badge>
                    ))}
                  </span>
                </td>
                <td className="td-sub">{p.phone || '—'}</td>
                <td className="td-sub" style={{ maxWidth: 320 }}>{p.competence}</td>
                <td className="td-actions">
                  <Button variant="ghost" className="btn-sm" onClick={() => setEditing(p)}>Edit</Button>
                  <Button variant="ghost" className="btn-sm" onClick={() => setDeleting(p)}>Delete</Button>
                </td>
              </tr>
            ))}
            {people.length === 0 ? (
              <tr><td colSpan={5} className="muted">No crew yet. Add your operators and LSO here.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {editing ? (
        <PersonEditModal
          initial={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmModal
          title="Delete crew member?"
          message={(
            <>
              <p><b>{deleting.name}</b> will be removed from the crew list.</p>
              {usageCount(deleting.id) > 0 ? (
                <p style={{ color: 'var(--warn)' }}>
                  They are named on {usageCount(deleting.id)} event{usageCount(deleting.id) === 1 ? '' : 's'}.
                  Those events will flag them as missing on their Check step until you pick a replacement.
                </p>
              ) : (
                <p className="muted">No events currently reference them.</p>
              )}
            </>
          )}
          confirmLabel="Delete crew member"
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}
