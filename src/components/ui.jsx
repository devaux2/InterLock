// Shared UI primitives: icons, buttons, form controls, badges, callouts, menus.
import React, { useEffect, useRef, useState } from 'react';
import { riskScore, riskBand, BAND_LABEL } from '../validation.js';

/* ------------------------------- Icons ---------------------------------- */

const ICON_PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></>),
  trash: (<><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></>),
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  chevronRight: <polyline points="9 6 15 12 9 18" />,
  chevronLeft: <polyline points="15 6 9 12 15 18" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <polyline points="4 12.5 9.5 18 20 6.5" />,
  dots: (<g fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></g>),
  alert: (<><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>),
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" />,
  file: (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><polyline points="14 2 14 8 20 8" /></>),
  image: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>),
  external: (<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>),
  copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  edit: (<><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>),
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  building: (<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4" /><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M16 15h.01" /></>),
  users: (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  shield: (<><path d="M12 2 4 5.5v5.6c0 5 3.4 8.6 8 10.4 4.6-1.8 8-5.4 8-10.4V5.5Z" /><polyline points="8.5 12 11 14.5 15.5 9.5" /></>),
  palette: (<><circle cx="12" cy="12" r="9.5" /><circle cx="8" cy="9" r="1.1" /><circle cx="12" cy="6.8" r="1.1" /><circle cx="16" cy="9" r="1.1" /><path d="M21.5 12a9.5 9.5 0 0 1-9.5 9.5c-1.6 0-2.2-1-1.6-2.2.7-1.3.2-2.8-1.4-2.8H7.4" /></>),
  book: (<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
  grid: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>),
  download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
  eye: (<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>),
  loader: <path d="M21 12a9 9 0 1 1-6.2-8.56" />,
};

export function Icon({ name, size = 16, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}
    >
      {ICON_PATHS[name] || null}
    </svg>
  );
}

export const Spinner = ({ size = 15 }) => (
  <span className="spin"><Icon name="loader" size={size} /></span>
);

/* ------------------------------ Buttons ---------------------------------- */

export function Button({ variant = 'secondary', icon, children, className = '', ...props }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...props}>
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

/* ------------------------------ Form bits -------------------------------- */

export function Field({ label, hint, required, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      {label ? (
        <span className="field-label">
          {label}
          {required ? <span className="req">*</span> : null}
        </span>
      ) : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export const TextInput = React.forwardRef(function TextInput(props, ref) {
  return <input ref={ref} type="text" className="input" {...props} />;
});

export function TextArea({ rows = 4, ...props }) {
  return <textarea className="input textarea" rows={rows} {...props} />;
}

export function Select({ children, ...props }) {
  return <select className="input select" {...props}>{children}</select>;
}

export function DateInput(props) {
  return <input type="date" className="input" {...props} />;
}

export function TimeInput(props) {
  return <input type="time" className="input" {...props} />;
}

export function Toggle({ checked, onChange, label, sub, disabled, title }) {
  return (
    <label className={`toggle${disabled ? ' disabled' : ''}`} title={title}>
      <input
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
      />
      <span className="track"><span className="knob" /></span>
      {label ? (
        <span className="toggle-label">
          {label}
          {sub ? <span className="toggle-sub">{sub}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`seg-btn${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Yes / No segmented bound to a boolean. */
export function YesNo({ value, onChange }) {
  return (
    <Segmented
      value={!!value}
      onChange={onChange}
      options={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]}
    />
  );
}

export function ChipSelect({ options, values = [], onToggle }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            className={`chip${on ? ' on' : ''}`}
            aria-pressed={on}
            title={o.title}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }) {
  const v = Number(value) || min;
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" disabled={v <= min} onClick={() => onChange(Math.max(min, v - 1))}>−</button>
      <span className="stepper-val">{v}</span>
      <button type="button" aria-label="Increase" disabled={v >= max} onClick={() => onChange(Math.min(max, v + 1))}>+</button>
    </div>
  );
}

/* --------------------------- Badges & callouts ---------------------------- */

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Callout({ tone = 'info', title, children }) {
  const icon = tone === 'success' ? 'check' : tone === 'info' ? 'info' : 'alert';
  return (
    <div className={`callout callout-${tone}`}>
      <span className="callout-icon"><Icon name={icon} size={17} /></span>
      <div>
        {title ? <div className="callout-title">{title}</div> : null}
        <div className="callout-body">{children}</div>
      </div>
    </div>
  );
}

export function ScoreChip({ l, s, showBand = false }) {
  const score = riskScore(l, s);
  const band = riskBand(score);
  return (
    <span
      className={`score-chip band-${band}`}
      title={`${l || '—'} × ${s || '—'} = ${score || '—'} (${BAND_LABEL[band]})`}
    >
      {score || '—'}
      {showBand && score ? <span className="score-band">{BAND_LABEL[band]}</span> : null}
    </span>
  );
}

/* ------------------------------ Menu ------------------------------------- */

export function Menu({ items, align = 'right', buttonLabel = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <Icon name="dots" size={17} />
      </button>
      {open ? (
        <div className={`menu ${align}`} role="menu">
          {items.filter(Boolean).map((it, i) =>
            it.divider ? (
              <div key={`d${i}`} className="menu-div" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={`menu-item${it.danger ? ' danger' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------- Empty state --------------------------------- */

export function EmptyState({ icon = 'zap', title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-ic"><Icon name={icon} size={34} /></span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action || null}
    </div>
  );
}

/* --------------------------- Persons picker ------------------------------- */

export const PERSON_CODES = [
  { code: 'E', label: 'Employees' },
  { code: 'C', label: 'Contractors / crew' },
  { code: 'P', label: 'Public / audience' },
  { code: 'V', label: 'Visitors / venue staff' },
  { code: 'A', label: 'Aircrew' },
];

export function parsePersons(str) {
  const found = [];
  const s = String(str || '');
  PERSON_CODES.forEach(({ code }) => {
    if (new RegExp(`(^|[^A-Za-z])${code}([^A-Za-z]|$)`).test(s)) found.push(code);
  });
  return found;
}

export function PersonsPicker({ value, onChange }) {
  const selected = parsePersons(value);
  const toggle = (code) => {
    const next = selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    const ordered = PERSON_CODES.map((p) => p.code).filter((c) => next.includes(c));
    onChange(ordered.join(', '));
  };
  return (
    <ChipSelect
      options={PERSON_CODES.map((p) => ({ value: p.code, label: p.code, title: p.label }))}
      values={selected}
      onToggle={toggle}
    />
  );
}
