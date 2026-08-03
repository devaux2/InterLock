import React, { useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import { Badge, Button, EmptyState, Icon, Menu, Spinner, TextInput } from '../components/ui.jsx';
import { ConfirmModal } from '../components/Modal.jsx';
import { fmtDate } from '../components/util.jsx';

export default function Home({ onNew, onOpen, onDuplicate }) {
  const [events, setEvents] = useState(null);
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // event

  const reload = async () => {
    try { setEvents(await api.listEvents() || []); } catch { setEvents([]); }
  };
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? events.filter((ev) => {
          const d = ev.details || {};
          return [d.eventName, d.client, d.venue].some((v) => (v || '').toLowerCase().includes(q));
        })
      : events;
    return [...list].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }, [events, query]);

  const doDelete = async () => {
    const ev = confirmDelete;
    setConfirmDelete(null);
    await api.deleteEvent(ev.id).catch(() => {});
    reload();
  };

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h1>Events</h1>
          <div className="screen-sub">Laser Safety RAMS documents: create, duplicate and export</div>
        </div>
        <div className="screen-head-actions">
          <div className="search-box">
            <span className="search-ic"><Icon name="search" size={15} /></span>
            <TextInput
              placeholder="Search name, client, venue…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search events"
            />
          </div>
          <Button variant="primary" icon="plus" onClick={onNew}>New RAMS</Button>
        </div>
      </div>

      {events === null ? (
        <div className="app-loading" style={{ height: 220 }}><Spinner size={17} /> Loading events…</div>
      ) : filtered.length === 0 ? (
        query ? (
          <EmptyState icon="search" title="No matches">
            No events match “{query}”. Try a different search.
          </EmptyState>
        ) : (
          <EmptyState
            icon="zap"
            title="No RAMS documents yet"
            action={<Button variant="primary" icon="plus" onClick={onNew}>Create your first RAMS</Button>}
          >
            Answer the wizard’s questions once and the whole Laser Safety RAMS is generated
            for you. Then duplicate it for the next show and just review each step.
          </EmptyState>
        )
      ) : (
        <div className="event-grid">
          {filtered.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onOpen={() => onOpen(ev.id)}
              onDuplicate={() => onDuplicate(ev.id)}
              onExport={() => onOpen(ev.id, { initialStep: 'check' })}
              onDelete={() => setConfirmDelete(ev)}
            />
          ))}
        </div>
      )}

      {confirmDelete ? (
        <ConfirmModal
          title="Delete this RAMS?"
          message={(
            <>
              <p><b>{confirmDelete.details?.eventName || 'Untitled event'}</b> and its attachments
              will be removed. This cannot be undone.</p>
            </>
          )}
          confirmLabel="Delete event"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}

function EventCard({ event, onOpen, onDuplicate, onExport, onDelete }) {
  const d = event.details || {};
  const exported = (event.exportHistory || []).length > 0;
  const status = event.docMeta?.status || 'Draft';
  return (
    <div
      className="event-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <div className="event-card-top">
        <h3>{d.eventName || <span className="muted">Untitled event</span>}</h3>
        <Menu
          items={[
            { label: 'Open', onClick: onOpen },
            { label: 'New from this event', onClick: onDuplicate },
            { label: 'Export PDF', onClick: onExport },
            { divider: true },
            { label: 'Delete', danger: true, onClick: onDelete },
          ]}
        />
      </div>
      <div className="event-meta">
        {d.client ? <div className="meta-row"><span>{d.client}</span></div> : null}
        {d.venue ? <div className="meta-row"><span>{d.venue}</span></div> : null}
        {d.eventDateStart ? (
          <div className="meta-row">
            <span className="event-date">
              {fmtDate(d.eventDateStart)}
              {d.eventDateEnd && d.eventDateEnd !== d.eventDateStart ? ` – ${fmtDate(d.eventDateEnd)}` : ''}
            </span>
          </div>
        ) : null}
      </div>
      <div className="event-card-badges">
        {d.indoorOutdoor ? (
          <Badge tone="neutral">{d.indoorOutdoor === 'outdoor' ? 'Outdoor' : 'Indoor'}</Badge>
        ) : null}
        <Badge tone={status === 'Issued' ? 'blue' : 'neutral'}>{status}</Badge>
        {exported ? <Badge tone="green">Exported</Badge> : null}
      </div>
    </div>
  );
}
