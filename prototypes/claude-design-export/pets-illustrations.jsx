// pets-illustrations.jsx — elegant line-work pet silhouettes
// Each is a viewBox-ed SVG that takes a `size` prop. They use currentColor for stroke.

const Dog = ({ size = 64, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M10 38c0-3 1-5 2-7l1-2c0-3 1-6 3-7 2-1 4 0 5 2l1 2 4-1c4 0 8 0 12 1 4 1 7 3 9 6l3 5c1 2 3 3 5 3l3 1-2 3-3 1-1 4c-1 2-3 3-5 3l-2-1v3c0 1-1 2-2 2h-2c-1 0-2-1-2-2v-4l-7 1-3 1v3c0 1-1 2-2 2h-2c-1 0-2-1-2-2v-4l-3-2c-3-2-5-5-6-8l-1-3z"/>
    <path d="M19 27l1-3M22 28l1-3"/>
    <circle cx="46" cy="32" r=".9" fill="currentColor" stroke="none"/>
    <path d="M52 36l3 .5"/>
  </svg>
);

const Cat = ({ size = 64, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M16 22l3-9 7 6c3-1 6-1 9-1s6 0 9 1l7-6 3 9c1 3 1 6 0 9-1 4-4 7-8 9-3 2-7 2-11 2s-8 0-11-2c-4-2-7-5-8-9-1-3-1-6 0-9z"/>
    <path d="M28 30l-2-1M36 30l2-1"/>
    <path d="M32 34v2M30 38c1 1 3 1 4 0"/>
    <path d="M14 44c-3 2-5 5-6 9M50 44c3 2 5 5 6 9"/>
  </svg>
);

const Poodle = ({ size = 64, style }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="20" cy="20" r="6"/>
    <circle cx="14" cy="26" r="4"/>
    <circle cx="22" cy="28" r="4"/>
    <path d="M24 28c4-1 8-1 12 0 6 2 10 6 12 11l3 6-3 1-2 4-3-1v3h-3v-4l-7 1v3h-3v-4c-3-1-6-3-7-6z"/>
    <circle cx="42" cy="36" r=".9" fill="currentColor" stroke="none"/>
    <circle cx="56" cy="48" r="3"/>
  </svg>
);

const Paw = ({ size = 16, style, filled }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <ellipse cx="6" cy="9" rx="2" ry="2.6"/>
    <ellipse cx="11" cy="6" rx="2" ry="2.6"/>
    <ellipse cx="17" cy="9" rx="2" ry="2.6"/>
    <ellipse cx="20" cy="14" rx="1.6" ry="2"/>
    <path d="M12 11c-3 0-6 3-6 6 0 2 2 3 4 3 1 0 1-1 2-1s1 1 2 1c2 0 4-1 4-3 0-3-3-6-6-6z"/>
  </svg>
);

const PetAvatar = ({ pet, size = 44 }) => {
  const Component = pet.species === 'cat' ? Cat : pet.breed?.toLowerCase().includes('poodle') ? Poodle : Dog;
  return (
    <div className="pet-avatar" style={{ width: size, height: size }}>
      <Component size={size * 0.7} />
    </div>
  );
};

// — UI primitives —

const Glass = ({ children, className = '', style, as: As = 'div', ...rest }) => (
  <As className={`glass ${className}`} style={style} {...rest}>{children}</As>
);

const Hairline = ({ vertical, style }) => (
  <div className={`hairline ${vertical ? 'v' : 'h'}`} style={style} />
);

const Tag = ({ children, tone = 'ink', size = 'md' }) => (
  <span className={`tag tag-${tone} tag-${size}`}>{children}</span>
);

const StatusDot = ({ status }) => {
  const tone = (window.STATUSES.find(s => s.key === status) || {}).tone || 'ink';
  return <span className={`status-dot dot-${tone}`} />;
};

const StatusPill = ({ status }) => {
  const s = window.STATUSES.find(x => x.key === status) || { key: status, label: status, tone: 'ink' };
  return (
    <span className={`status-pill tone-${s.tone}`}>
      <span className={`status-dot dot-${s.tone}`} />
      {s.label}
    </span>
  );
};

const Initials = ({ name, color = 'ink', size = 28 }) => {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('');
  return (
    <span className={`initials initials-${color}`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  );
};

// — Icons (1.25px stroke, 24x24) —
const I = (props) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props} />;
const Icon = {
  dashboard:  () => <I><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></I>,
  calendar:   () => <I><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></I>,
  clients:    () => <I><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14.5c1-.3 1.7-.5 2-.5 2.8 0 5 2.2 5 5"/></I>,
  pets:       () => <I><circle cx="6" cy="9" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="17" cy="9" r="2"/><circle cx="20" cy="14" r="1.5"/><path d="M12 12c-3 0-6 3-6 6 0 1.5 1.5 2.5 3 2.5 1 0 1.5-.7 3-.7s2 .7 3 .7c1.5 0 3-1 3-2.5 0-3-3-6-6-6z"/></I>,
  notes:      () => <I><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 4v5h5M8 12h8M8 16h6"/></I>,
  services:   () => <I><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/></I>,
  invoices:   () => <I><path d="M6 3h9l3 3v15l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></I>,
  status:     () => <I><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></I>,
  reminders:  () => <I><path d="M6 8a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7zM10 19a2 2 0 0 0 4 0"/></I>,
  reports:    () => <I><path d="M4 19V5M4 19h16"/><path d="M8 15v-3M12 15V8M16 15v-6"/></I>,
  search:     () => <I><circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/></I>,
  bell:       () => <I><path d="M6 8a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7zM10 19a2 2 0 0 0 4 0"/></I>,
  plus:       () => <I><path d="M12 5v14M5 12h14"/></I>,
  chevronL:   () => <I><path d="M14 6l-6 6 6 6"/></I>,
  chevronR:   () => <I><path d="M10 6l6 6-6 6"/></I>,
  chevronD:   () => <I><path d="M6 9l6 6 6-6"/></I>,
  arrowUp:    () => <I><path d="M12 19V5M5 12l7-7 7 7"/></I>,
  arrowDown:  () => <I><path d="M12 5v14M5 12l7 7 7-7"/></I>,
  more:       () => <I><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></I>,
  filter:     () => <I><path d="M3 5h18M6 12h12M10 19h4"/></I>,
  check:      () => <I><path d="M5 12l5 5 9-11"/></I>,
  x:          () => <I><path d="M6 6l12 12M18 6l-12 12"/></I>,
  phone:      () => <I><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/></I>,
  mail:       () => <I><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></I>,
  pin:        () => <I><path d="M12 22s7-7 7-13a7 7 0 0 0-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></I>,
  sparkle:    () => <I><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></I>,
  scissors:   () => <I><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 8l12 12M8 16L20 4"/></I>,
  drop:       () => <I><path d="M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></I>,
  moon:       () => <I><path d="M21 13a8 8 0 1 1-10-10 6 6 0 0 0 10 10z"/></I>,
  sun:        () => <I><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></I>,
  download:   () => <I><path d="M12 4v12M6 12l6 6 6-6M5 20h14"/></I>,
  edit:       () => <I><path d="M14 4l6 6-10 10H4v-6L14 4z"/></I>,
  trash:      () => <I><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></I>,
  sms:        () => <I><path d="M21 12a8 8 0 1 1-3.4-6.5L21 5l-1 4a8 8 0 0 1 1 3z"/></I>,
  paw:        () => <I><circle cx="6" cy="9" r="1.6"/><circle cx="11" cy="6" r="1.6"/><circle cx="17" cy="9" r="1.6"/><circle cx="20" cy="14" r="1.3"/><path d="M12 12c-3 0-6 3-6 6 0 1.5 1.5 2.5 3 2.5 1 0 1.5-.7 3-.7s2 .7 3 .7c1.5 0 3-1 3-2.5 0-3-3-6-6-6z"/></I>,
};

Object.assign(window, { Dog, Cat, Poodle, Paw, PetAvatar, Glass, Hairline, Tag, StatusDot, StatusPill, Initials, Icon });
