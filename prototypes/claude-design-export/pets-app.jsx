// pets-app.jsx — solo-operator shell

const { useState: useStateApp, useEffect: useEffectApp } = React;

const NAV = [
  { key: 'today',     label: 'Today',           icon: Icon.dashboard },
  { key: 'schedule',  label: 'Schedule',        icon: Icon.calendar },
  { key: 'rebook',    label: 'Re-book',         icon: Icon.sparkle, badge: '4' },
  { key: 'directory', label: 'Clients',          icon: Icon.clients },
  { key: 'services',  label: 'Services',        icon: Icon.services },
  { key: 'money',     label: 'Money',           icon: Icon.invoices },
];

function Sidebar({ active, goto, collapsed, setCollapsed }) {
  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <div className="brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="9" r="1.6"/><circle cx="11" cy="6" r="1.6"/><circle cx="17" cy="9" r="1.6"/><circle cx="20" cy="14" r="1.3"/>
            <path d="M12 12c-3 0-6 3-6 6 0 1.5 1.5 2.5 3 2.5 1 0 1.5-.7 3-.7s2 .7 3 .7c1.5 0 3-1 3-2.5 0-3-3-6-6-6z"/>
          </svg>
        </div>
        <div className="brand-name">
          <b>Glasshound</b>
          <span>For solo groomers</span>
        </div>
      </div>

      <div className="nav-section">
        {NAV.map(item => {
          const Ico = item.icon;
          return (
            <div key={item.key} className="nav-item" data-active={active === item.key || (item.key === 'directory' && (active === 'pet-detail' || active === 'client-detail'))} onClick={() => goto(item.key)} title={item.label}>
              <Ico />
              <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </div>
          );
        })}
      </div>

      <div className="sidebar-foot">
        <div className="user-card">
          <Initials name={window.SHOP.owner} color="oxblood" size={32} />
          <div className="meta">
            <b>{window.SHOP.owner}</b>
            <span>{window.SHOP.name} · {window.SHOP.city}</span>
          </div>
          <button className="btn btn-icon btn-ghost btn-sm" style={{ width: 26, height: 26 }} onClick={() => setCollapsed(!collapsed)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ active, t, setTweak }) {
  return (
    <header className="topbar">
      <div className="crumbs">
        <span className="now serif">{window.SHOP.name}</span>
      </div>

      <div className="search">
        <Icon.search />
        <input placeholder="Search pets, clients, invoices…" />
        <kbd>⌘K</kbd>
      </div>

      <div className="topbar-tools">
        <button className="btn btn-icon btn-ghost" title={t.dark ? 'Light mode' : 'Dark mode'} onClick={() => setTweak('dark', !t.dark)}>
          {t.dark ? <Icon.sun /> : <Icon.moon />}
        </button>
        <button className="btn btn-icon btn-ghost" style={{ position: 'relative' }} title="Notifications">
          <Icon.bell />
          <span style={{ position: 'absolute', top: 7, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--oxblood)' }}/>
        </button>
        <Hairline vertical style={{ height: 22, margin: '0 4px' }}/>
        <button className="btn btn-primary"><Icon.plus />Quick book</button>
      </div>
    </header>
  );
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "density": "regular",
  "accent": "oxblood",
  "glassBlur": 22,
  "sidebarCollapsed": false,
  "fontPair": "fraunces-inter",
  "showBlobs": true
}/*EDITMODE-END*/;

const ACCENTS = {
  oxblood:  { primary: 'oklch(0.42 0.12 25)',  primary2: 'oklch(0.52 0.13 25)' },
  emerald:  { primary: 'oklch(0.42 0.10 160)', primary2: 'oklch(0.52 0.11 160)' },
  plum:     { primary: 'oklch(0.40 0.13 320)', primary2: 'oklch(0.50 0.14 320)' },
  ink:      { primary: 'oklch(0.32 0.06 260)', primary2: 'oklch(0.42 0.08 260)' },
};

const FONT_PAIRS = {
  'fraunces-inter':    { serif: "'Fraunces'",          sans: "'Inter Tight'" },
  'eb-grotesk':        { serif: "'EB Garamond'",       sans: "'Space Grotesk'" },
  'cormorant-jakarta': { serif: "'Cormorant Garamond'", sans: "'Plus Jakarta Sans'" },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [active, setActive] = useStateApp('today');
  const [activeAppt, setActiveAppt] = useStateApp(null);
  const [selectedPet, setSelectedPet] = useStateApp(null);
  const [selectedClient, setSelectedClient] = useStateApp(null);
  const [collapsed, setCollapsed] = useStateApp(t.sidebarCollapsed);

  useEffectApp(() => { setCollapsed(t.sidebarCollapsed); }, [t.sidebarCollapsed]);

  useEffectApp(() => {
    document.documentElement.dataset.theme = t.dark ? 'dark' : 'light';
    document.documentElement.dataset.density = t.density;
    const a = ACCENTS[t.accent] || ACCENTS.oxblood;
    document.documentElement.style.setProperty('--oxblood', a.primary);
    document.documentElement.style.setProperty('--oxblood-2', a.primary2);
    document.documentElement.style.setProperty('--glass-blur', `${t.glassBlur}px`);
    const fp = FONT_PAIRS[t.fontPair] || FONT_PAIRS['fraunces-inter'];
    document.documentElement.style.setProperty('--serif', `${fp.serif}, Georgia, serif`);
    document.documentElement.style.setProperty('--sans', `${fp.sans}, -apple-system, system-ui, sans-serif`);
  }, [t]);

  const goto = (key) => setActive(key);
  const openAppt = (a) => setActiveAppt(a);
  const openPet = (p) => { setSelectedPet(p); setActive('pet-detail'); };
  const openClient = (c) => { setSelectedClient(c); setActive('client-detail'); };

  let view;
  switch (active) {
    case 'today':         view = <Today goto={goto} openAppt={openAppt} openPet={openPet} openClient={openClient}/>; break;
    case 'schedule':      view = <Schedule openAppt={openAppt}/>; break;
    case 'rebook':        view = <Rebook openPet={openPet}/>; break;
    case 'directory':     view = <Directory openPet={openPet} openClient={openClient}/>; break;
    case 'pet-detail':    view = <PetDetail pet={selectedPet} goto={goto} openClient={openClient}/>; break;
    case 'client-detail': view = <ClientDetail client={selectedClient} goto={goto} openPet={openPet}/>; break;
    case 'services':      view = <Services/>; break;
    case 'money':         view = <Money/>; break;
    default:              view = <Today goto={goto} openAppt={openAppt} openPet={openPet} openClient={openClient}/>;
  }

  return (
    <>
      <div className="app-bg" style={{ display: t.showBlobs ? 'block' : 'none' }}>
        <div className="blob3"/>
      </div>
      <div className="app-noise"/>
      <div id="app">
        <Sidebar active={active} goto={goto} collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="main">
          <Topbar active={active} t={t} setTweak={setTweak} />
          <div className="content">{view}</div>
        </div>
      </div>

      {activeAppt && <ApptDrawer appt={activeAppt} onClose={() => setActiveAppt(null)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSelect label="Accent" value={t.accent}
          options={[
            { value: 'oxblood', label: 'Oxblood' },
            { value: 'emerald', label: 'Emerald' },
            { value: 'plum',    label: 'Plum' },
            { value: 'ink',     label: 'Ink blue' },
          ]}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakSelect label="Type pairing" value={t.fontPair}
          options={[
            { value: 'fraunces-inter',    label: 'Fraunces × Inter' },
            { value: 'eb-grotesk',        label: 'EB Garamond × Grotesk' },
            { value: 'cormorant-jakarta', label: 'Cormorant × Jakarta' },
          ]}
          onChange={(v) => setTweak('fontPair', v)}
        />

        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density}
          options={['compact','regular','comfy']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakToggle label="Collapse sidebar" value={t.sidebarCollapsed}
          onChange={(v) => setTweak('sidebarCollapsed', v)}
        />

        <TweakSection label="Glass" />
        <TweakSlider label="Blur intensity" value={t.glassBlur} min={0} max={40} unit="px"
          onChange={(v) => setTweak('glassBlur', v)} />
        <TweakToggle label="Color blobs" value={t.showBlobs}
          onChange={(v) => setTweak('showBlobs', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
