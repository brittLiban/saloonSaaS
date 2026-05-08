// nina-app.jsx — Polished app shell with full sidebar + topbar

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "calendar"
}/*EDITMODE-END*/;

const NAV = [
  { id: 'calendar',  label: 'Calendar',  icon: 'cal' },
  { id: 'today',     label: 'Today',     icon: 'today' },
  { id: 'bookings',  label: 'Bookings',  icon: 'paw' },
  { id: 'rebooking', label: 'Rebooking', icon: 'rebook' },
  { id: 'clients',   label: 'Clients',   icon: 'clients' },
  { id: 'services',  label: 'Services',  icon: 'services' },
  { id: 'money',     label: 'Money',     icon: 'money' },
  { id: 'notes',     label: 'Notes',     icon: 'notes' },
];

const PAGE_META = {
  calendar:  { title: 'Calendar',  sub: 'Your week at a glance' },
  today:     { title: 'Today',     sub: "Thursday, May 7 · Here's what's on" },
  bookings:  { title: 'Bookings',  sub: 'Performance & trends' },
  rebooking: { title: 'Rebooking', sub: 'Lapsed regulars and overdue dogs' },
  clients:   { title: 'Clients',   sub: 'Owners & their pets' },
  services:  { title: 'Services',  sub: 'Menu & pricing' },
  money:     { title: 'Money',     sub: 'Income, invoices & payouts' },
  notes:     { title: 'Notes',     sub: 'Reminders & care notes' },
  settings:  { title: 'Settings',  sub: 'Integrations, AI receptionist & API keys' },
};

const App = () => {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState(t.view || 'calendar');
  const [openApptId, setOpenApptId] = React.useState(null);
  const [openPetId, setOpenPetId] = React.useState(null);

  const Body = {
    calendar:  () => <CalendarView openAppt={setOpenApptId}/>,
    today:     () => <TodayView    openPet={setOpenPetId} openAppt={setOpenApptId}/>,
    bookings:  () => <BookingsView/>,
    rebooking: () => <RebookingView/>,
    clients:   () => <ClientsView  openPet={setOpenPetId}/>,
    services:  () => <ServicesView/>,
    money:     () => <MoneyView/>,
    notes:     () => <NotesView/>,
    settings:  () => <SettingsView/>,
  }[view];

  const meta = PAGE_META[view] || {};

  return (
    <>
      <div className="shell">
        <aside className="sb">
          <a href="Home.html" className="sb-brand">
            <span className="sb-brand-mark">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/>
                <circle cx="6" cy="10.5" r="1.8"/>
                <circle cx="12" cy="8" r="1.8"/>
                <circle cx="18" cy="10.5" r="1.8"/>
              </svg>
            </span>
            <span className="sb-brand-text">
              <span className="sb-brand-name">Nina's</span>
              <span className="sb-brand-sub">Pet Salon</span>
            </span>
          </a>

          <div className="sb-section">Workspace</div>
          <nav className="sb-nav">
            {NAV.map(n => (
              <button key={n.id} className={`sb-link ${view === n.id ? 'is-active':''}`} onClick={() => { setView(n.id); setTweak('view', n.id); }}>
                <Icon name={n.icon} size={17}/>
                <span>{n.label}</span>
              </button>
            ))}
          </nav>

          <div className="sb-card">
            <div className="sb-card-row">
              <span className="sb-dot"></span>
              <span className="sb-card-title">Open today</span>
            </div>
            <div className="sb-card-time">9:00 am – 6:00 pm</div>
            <div className="sb-card-meta">Federal Way, WA</div>
          </div>

          <div className="sb-foot">
            <button className={`sb-link ${view === 'settings' ? 'is-active':''}`} onClick={() => { setView('settings'); setTweak('view', 'settings'); }}><Icon name="settings" size={17}/><span>Settings</span></button>
            <div className="sb-user">
              <div className="sb-avatar">N</div>
              <div className="sb-user-text">
                <div className="sb-user-name">Nina Reyes</div>
                <div className="sb-user-role">Owner</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <div className="crumb">
                <a href="Home.html" className="crumb-link">Nina's Pet Salon</a>
                <span className="crumb-sep">/</span>
                <span>{meta.title}</span>
              </div>
              <h1 className="topbar-h">{meta.title}</h1>
              <div className="topbar-sub">{meta.sub}</div>
            </div>
            <div className="topbar-actions">
              <div className="topbar-search">
                <Icon name="search" size={14}/>
                <input placeholder="Search clients, pets, invoices…"/>
                <kbd className="topbar-kbd">⌘K</kbd>
              </div>
              <button className="btn btn-icon btn-ghost" aria-label="Notifications">
                <Icon name="bell" size={16}/>
                <span className="topbar-badge"></span>
              </button>
              <button className="btn btn-primary"><Icon name="plus" size={14}/> New booking</button>
            </div>
          </header>
          <div className="main-inner"><Body/></div>
        </main>
      </div>

      {openApptId && <ApptDrawer id={openApptId} close={() => setOpenApptId(null)}/>}
      {openPetId && <PetDrawer id={openPetId} close={() => setOpenPetId(null)}/>}

      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="View"/>
        <window.TweakSelect label="Page" value={view}
          options={NAV.map(n => ({value:n.id, label:n.label}))}
          onChange={(v) => { setView(v); setTweak('view', v); }}/>
      </window.TweaksPanel>
    </>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
