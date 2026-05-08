// nina-views.jsx — MoeGo-inspired calendar-first views

const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const hr = h % 12 || 12;
  const ap = h < 12 ? 'AM' : 'PM';
  return `${hr}:${m.toString().padStart(2,'0')} ${ap}`;
};
const petById = (id) => PETS.find(p => p.id === id);
const clientById = (id) => CLIENTS.find(c => c.id === id);
const svcById = (id) => SERVICES.find(s => s.id === id);
const ageOf = (dob) => `${new Date().getFullYear() - new Date(dob).getFullYear()}y`;
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / (1000*60*60*24));
const dueRebook = () => PETS.map(p => {
  const due = new Date(p.lastVisit);
  due.setDate(due.getDate() + p.cadence);
  return { pet: p, daysUntil: daysBetween(TODAY, due.toISOString().slice(0,10)), dueDate: due };
}).filter(r => r.daysUntil <= 14).sort((a,b) => a.daysUntil - b.daysUntil);

const COLORS = ['evt-blue','evt-mint','evt-yellow','evt-pink','evt-lilac','evt-coral'];
const colorFor = (id) => COLORS[(id.charCodeAt(id.length-1)) % COLORS.length];

// =========================================================================
// CALENDAR (Today / Week)
// =========================================================================
const CalendarView = ({ openAppt }) => {
  const [vmode, setVmode] = React.useState('week');
  const days = ['MON','TUE','WED','THU','FRI','SAT'];
  const dates = [4, 5, 6, 7, 8, 9];
  const todayIdx = 2;
  const HOURS = [8,9,10,11,12,13,14,15,16,17];
  const hLbl = (h) => h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`;

  const weekAppts = [
    [{t:'09:00',e:'10:15',pet:'p2',svc:'s5'},{t:'11:00',e:'13:00',pet:'p9',svc:'s2'},{t:'14:00',e:'15:00',pet:'p4',svc:'s1'}],
    [{t:'08:00',e:'10:00',pet:'p1',svc:'s2'},{t:'10:30',e:'11:30',pet:'p7',svc:'s1'},{t:'13:00',e:'14:30',pet:'p3',svc:'s4'},{t:'15:30',e:'16:30',pet:'p6',svc:'s1'}],
    APPOINTMENTS.filter(a => a.date === TODAY).map(a => ({t:a.start, e:a.end, pet:a.petId, svc:a.serviceId, id:a.id, status:a.status})),
    [{t:'09:00',e:'10:15',pet:'p5',svc:'s5'},{t:'11:00',e:'12:15',pet:'p2',svc:'s5'},{t:'13:30',e:'15:30',pet:'p8',svc:'s2'}],
    [{t:'08:30',e:'10:00',pet:'p9',svc:'s4'},{t:'10:30',e:'12:30',pet:'p1',svc:'s2'},{t:'13:00',e:'14:00',pet:'p4',svc:'s1'},{t:'14:30',e:'15:30',pet:'p6',svc:'s1'}],
    [{t:'09:00',e:'11:00',pet:'p3',svc:'s2'},{t:'11:30',e:'12:30',pet:'p8',svc:'s1'}],
  ];

  const yPos = (t) => {
    const [h, m] = t.split(':').map(Number);
    return ((h - 8) + m / 60) * 64;
  };

  return (
    <>
      <div className="cal">
        <div className="cal-toolbar">
          <div className="cal-toolbar-left">
            <button className="btn btn-icon"><Icon name="chev" size={14} style={{transform:'rotate(180deg)'}}/></button>
            <span className="cal-month">May 2026</span>
            <button className="btn btn-icon"><Icon name="chev" size={14}/></button>
            <button className="btn">Today</button>
          </div>
          <div className="cal-toolbar-right">
            <div className="seg">
              <button className={`seg-tab ${vmode==='day'?'is-active':''}`} onClick={()=>setVmode('day')}>Day</button>
              <button className={`seg-tab ${vmode==='week'?'is-active':''}`} onClick={()=>setVmode('week')}>Week</button>
              <button className={`seg-tab ${vmode==='month'?'is-active':''}`} onClick={()=>setVmode('month')}>Month</button>
            </div>
            <button className="btn btn-primary"><Icon name="plus" size={14}/> New</button>
          </div>
        </div>

        <div className="cal-head">
          <div className="cal-head-spacer"></div>
          {days.map((d, i) => (
            <div key={d} className={`cal-head-day ${i===todayIdx?'is-today':''}`}>
              <div className="cal-head-dow">{d}</div>
              <div className="cal-head-num">{dates[i]}</div>
            </div>
          ))}
        </div>

        <div className="cal-body">
          <div className="cal-times">
            {HOURS.map(h => <div key={h} className="cal-row">{hLbl(h)}</div>)}
          </div>
          {weekAppts.map((day, di) => (
            <div key={di} className={`cal-col ${di===todayIdx?'is-today':''}`}>
              {HOURS.map(h => <div key={h} className="cal-col-row"></div>)}
              {di === todayIdx && <div className="cal-now-line" style={{top: yPos('10:30')}}></div>}
              {day.map((a, ai) => {
                const pet = petById(a.pet);
                const svc = svcById(a.svc);
                const top = yPos(a.t);
                const height = yPos(a.e) - top - 4;
                return (
                  <div key={ai} onClick={() => a.id && openAppt(a.id)}
                       className={`cal-evt ${colorFor(a.pet)}`}
                       style={{top, height}}>
                    <div className="cal-evt-time">{fmtTime(a.t).replace(' ','').toLowerCase()} · {fmtTime(a.e).replace(' ','').toLowerCase()}</div>
                    <div className="cal-evt-name">{pet.name}</div>
                    <div className="cal-evt-svc">{svc.name}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// =========================================================================
// TODAY — quick stats + schedule list
// =========================================================================
const TodayView = ({ openPet, openAppt }) => {
  const todayAppts = APPOINTMENTS.filter(a => a.date === TODAY).sort((a,b) => a.start.localeCompare(b.start));
  const completed = todayAppts.filter(a => a.status === 'completed').length;
  const total = todayAppts.length;
  const revenue = todayAppts.reduce((s, a) => s + svcById(a.serviceId).price, 0);
  const due = dueRebook().slice(0, 3);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-l">Today's revenue</div>
          <div className="kpi-v">${revenue}</div>
          <div className="kpi-d"><span className="kpi-trend">+12%</span><span>vs avg Wed</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Done / booked</div>
          <div className="kpi-v">{completed}<span style={{color:'var(--ink-4)'}}>/{total}</span></div>
          <div className="kpi-d"><span>1 in chair · 2 upcoming</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-l">Chair time</div>
          <div className="kpi-v">5h 15m</div>
          <div className="kpi-d"><span>Open: 7:30a–6:00p</span></div>
        </div>
      </div>

      <div className="section-h">
        <h2>Today's schedule</h2>
        <div className="section-h-sub">{total} appointments</div>
      </div>
      <div className="card" style={{marginBottom:32}}>
        {todayAppts.map(a => {
          const pet = petById(a.petId);
          const owner = clientById(pet.ownerId);
          const svc = svcById(a.serviceId);
          const pillCls = a.status === 'completed' ? 'pill-done' : a.status === 'progress' ? 'pill-now' : 'pill-soon';
          const pillTxt = a.status === 'completed' ? 'Done' : a.status === 'progress' ? 'In chair' : 'Upcoming';
          return (
            <div className="appt" key={a.id} onClick={() => openAppt(a.id)}>
              <div className="appt-time">
                <div>{fmtTime(a.start)}</div>
                <div className="appt-time-end">{fmtTime(a.end)}</div>
              </div>
              <div className="appt-avatar"><Pet pet={pet} size={28}/></div>
              <div style={{minWidth:0}}>
                <div className="appt-name">{pet.name}</div>
                <div className="appt-meta">{owner.name} · {pet.breed}</div>
              </div>
              <div className="appt-svc">{svc.name}</div>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <span className={`pill ${pillCls}`}><span className="pill-dot"></span>{pillTxt}</span>
                <span className="appt-price">${svc.price}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-h">
        <h2>Time to re-book</h2>
        <div className="section-h-sub">Regulars due soon</div>
      </div>
      <div className="card card-pad">
        {due.map(({pet, daysUntil}) => {
          const owner = clientById(pet.ownerId);
          const overdue = daysUntil < 0;
          const dueLabel = overdue
            ? <strong>{Math.abs(daysUntil)} days overdue</strong>
            : daysUntil === 0 ? <strong>Due today</strong>
            : `Due in ${daysUntil} day${daysUntil===1?'':'s'}`;
          return (
            <div className="due" key={pet.id}>
              <div className="due-avatar"><Pet pet={pet} size={26}/></div>
              <div style={{minWidth:0}}>
                <div className="due-name">{pet.name}</div>
                <div className="due-meta">{owner.name} · {dueLabel}</div>
              </div>
              <button className="btn btn-primary btn-pill">Book</button>
            </div>
          );
        })}
      </div>
    </>
  );
};

// =========================================================================
// BOOKINGS
// =========================================================================
const BookingsView = () => {
  const [range, setRange] = React.useState('month');
  const data = BOOKINGS[range];
  const series = TREND_SERIES[range];
  const max = Math.max(...series) * 1.1;
  const W = 800, H = 200;
  const stepX = W / (series.length - 1);
  const pts = series.map((v, i) => [i * stepX, H - (v / max) * H]);
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;
  const ranges = [
    { id: 'today', label: 'Today' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' },
    { id: '3month', label: '3 mo' }, { id: '6month', label: '6 mo' }, { id: 'year', label: 'Year' },
  ];

  return (
    <>
      <div className="range-row">
        <div className="range-tabs">
          {ranges.map(r => (
            <button key={r.id} className={`range-tab ${range === r.id ? 'is-active':''}`} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-l">Appointments</div><div className="kpi-v">{data.count.toLocaleString()}</div><div className="kpi-d"><span className="kpi-trend">{data.trend}</span><span>vs prior</span></div></div>
        <div className="kpi"><div className="kpi-l">Revenue</div><div className="kpi-v">${data.revenue.toLocaleString()}</div><div className="kpi-d"><span className="kpi-trend">+18%</span><span>vs prior</span></div></div>
        <div className="kpi"><div className="kpi-l">Avg ticket</div><div className="kpi-v">${Math.round(data.revenue / data.count)}</div><div className="kpi-d"><span className="kpi-trend">+$3</span><span>vs prior</span></div></div>
      </div>

      <div className="card card-pad">
        <div className="section-h" style={{marginBottom:18}}>
          <h2>Booking volume</h2>
          <div className="section-h-sub">Last 14 periods</div>
        </div>
        <div className="chart" style={{paddingLeft:36}}>
          <div className="chart-y">
            <span>{Math.round(max)}</span><span>{Math.round(max*0.66)}</span><span>{Math.round(max*0.33)}</span><span>0</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{height: H, marginLeft: 8}}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,90,31,0.28)"/>
                <stop offset="100%" stopColor="rgba(255,90,31,0)"/>
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((g, i) => <line key={i} x1="0" x2={W} y1={H*g} y2={H*g} stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4"/>)}
            <path d={area} fill="url(#grad)"/>
            <path d={path} fill="none" stroke="#ff5a1f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 2.6} fill="#ff5a1f" stroke="#fff" strokeWidth={i === pts.length - 1 ? 2 : 1.2}/>)}
          </svg>
        </div>
      </div>
    </>
  );
};

// =========================================================================
// CLIENTS
// =========================================================================
const ClientsView = ({ openPet }) => {
  const [q, setQ] = React.useState('');
  const filtered = CLIENTS.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.pets.some(pid => petById(pid).name.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="card tbl-card">
        <div className="tbl-head">
          <div className="tbl-search">
            <Icon name="search" size={14}/>
            <input placeholder="Search by owner or pet..." value={q} onChange={e => setQ(e.target.value)}/>
          </div>
          <div style={{fontSize:12,color:'var(--ink-3)'}}>{filtered.length} shown</div>
        </div>
        <div className="tbl">
          <div className="tbl-h"><div>Owner</div><div>Pets</div><div>Phone</div><div>Tier</div><div></div></div>
          {filtered.map((c, i) => (
            <div className={`tbl-r ${i === filtered.length-1 ? 'is-last':''}`} key={c.id} onClick={() => c.pets[0] && openPet(c.pets[0])}>
              <div className="tbl-name">{c.name}</div>
              <div className="tbl-pets">
                {c.pets.map(pid => {
                  const p = petById(pid);
                  return <span className="tbl-pet-chip" key={pid}>{p.name}</span>;
                })}
              </div>
              <div className="tbl-mono">{c.phone}</div>
              <div><span className={`pill ${c.tier === 'VIP' ? 'pill-vip' : c.tier === 'New' ? 'pill-new' : 'pill-reg'}`}><span className="pill-dot"></span>{c.tier}</span></div>
              <div className="tbl-action"><Icon name="chev" size={14}/></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// =========================================================================
// SERVICES
// =========================================================================
const ServicesView = () => (
  <>
    <div className="svc-grid">
      {SERVICES.map(s => (
        <div className="svc" key={s.id}>
          <div className="svc-name">{s.name}</div>
          <div className="svc-meta">
            <div className="svc-price">${s.price}</div>
            <div className="svc-dur">· {s.dur} min</div>
          </div>
          <div className="svc-foot">
            <span>Booked {Math.round(20 + Math.random()*60)}× this month</span>
            <button className="btn btn-ghost" style={{padding:'4px 8px'}}><Icon name="edit" size={13}/></button>
          </div>
        </div>
      ))}
    </div>
  </>
);

// =========================================================================
// MONEY
// =========================================================================
const MoneyView = () => {
  const totals = INVOICES.reduce((acc, i) => { acc[i.status] = (acc[i.status]||0) + i.total; return acc; }, {});
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-l">Paid this month</div><div className="kpi-v">${(totals.paid||0)+7690}</div><div className="kpi-d"><span className="kpi-trend">+12%</span></div></div>
        <div className="kpi"><div className="kpi-l">Outstanding</div><div className="kpi-v" style={{color:'var(--acc-2)'}}>${totals.unpaid||0}</div><div className="kpi-d"><span>1 unpaid</span></div></div>
        <div className="kpi"><div className="kpi-l">Overdue</div><div className="kpi-v" style={{color:'var(--bad)'}}>${totals.overdue||0}</div><div className="kpi-d"><span>1 over 14 days</span></div></div>
      </div>
      <div className="card tbl-card">
        <div className="tbl-head"><div style={{fontWeight:700,fontSize:16}}>Recent invoices</div></div>
        {INVOICES.map(inv => {
          const c = clientById(inv.clientId), p = petById(inv.petId);
          return (
            <div className="money-row" key={inv.id}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div className="due-avatar" style={{width:34,height:34,borderRadius:9}}><Pet pet={p} size={26}/></div>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>{c.name} <span style={{color:'var(--ink-4)',fontWeight:400}}>· {p.name}</span></div>
                  <div className="mono">{inv.id} · {new Date(inv.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                </div>
              </div>
              <div className="money-amt">${inv.total}</div>
              <div><span className={`pill pill-${inv.status}`}><span className="pill-dot"></span>{inv.status[0].toUpperCase()+inv.status.slice(1)}</span></div>
              <button className="btn btn-icon btn-ghost"><Icon name="dots" size={14}/></button>
            </div>
          );
        })}
      </div>
    </>
  );
};

// =========================================================================
// NOTES
// =========================================================================
const NotesView = () => (
  <>
    <div className="notes-list">
      {NOTES.map(n => {
        const pet = petById(n.petId), owner = clientById(pet.ownerId);
        return (
          <div className="note" key={n.id}>
            <div className="note-head">
              <span className="note-pet">{pet.name} <span style={{color:'var(--ink-4)',fontWeight:400}}>· {owner.name}</span></span>
              <span className="note-date">{new Date(n.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
            </div>
            {n.text}
          </div>
        );
      })}
    </div>
  </>
);

// =========================================================================
// Drawers
// =========================================================================
const ApptDrawer = ({ id, close }) => {
  const a = APPOINTMENTS.find(x => x.id === id);
  if (!a) return null;
  const pet = petById(a.petId), owner = clientById(pet.ownerId), svc = svcById(a.serviceId);
  return (
    <>
      <div className="drawer-mask" onClick={close}></div>
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div style={{fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--acc)',marginBottom:6,fontWeight:700}}>Appointment</div>
            <h3>{pet.name} · {svc.name}</h3>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={close}><Icon name="close" size={14}/></button>
        </div>
        <div className="drawer-body">
          <dl className="kv">
            <dt>When</dt><dd>Wed May 6 · {fmtTime(a.start)}–{fmtTime(a.end)}</dd>
            <dt>Service</dt><dd>{svc.name} · {svc.dur} min · ${svc.price}</dd>
            <dt>Owner</dt><dd>{owner.name}</dd>
            <dt>Phone</dt><dd style={{fontFamily:'var(--mono)'}}>{owner.phone}</dd>
            {pet.allergies.length > 0 && <><dt>Allergies</dt><dd style={{color:'var(--bad)'}}>{pet.allergies.join(', ')}</dd></>}
          </dl>
          <div style={{display:'flex',gap:8,marginTop:24}}>
            <button className="btn"><Icon name="phone" size={14}/> Call</button>
            <button className="btn"><Icon name="msg" size={14}/> Text</button>
            <button className="btn btn-primary" style={{marginLeft:'auto'}}><Icon name="check" size={14}/> Complete</button>
          </div>
        </div>
      </aside>
    </>
  );
};

const PetDrawer = ({ id, close }) => {
  const pet = petById(id);
  if (!pet) return null;
  const owner = clientById(pet.ownerId);
  return (
    <>
      <div className="drawer-mask" onClick={close}></div>
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div style={{fontSize:11,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--acc)',marginBottom:6,fontWeight:700}}>Pet</div>
            <h3>{pet.name}</h3>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={close}><Icon name="close" size={14}/></button>
        </div>
        <div className="drawer-body">
          <dl className="kv">
            <dt>Breed</dt><dd>{pet.breed}</dd>
            <dt>Owner</dt><dd>{owner.name}</dd>
            <dt>Phone</dt><dd style={{fontFamily:'var(--mono)'}}>{owner.phone}</dd>
            <dt>Age</dt><dd>{ageOf(pet.dob)} · {pet.weight} lb</dd>
            <dt>Cadence</dt><dd>Every {pet.cadence} days</dd>
            {pet.allergies.length > 0 && <><dt>Allergies</dt><dd style={{color:'var(--bad)'}}>{pet.allergies.join(', ')}</dd></>}
          </dl>
        </div>
      </aside>
    </>
  );
};

// =========================================================================
// REBOOKING — lapsed clients, due soon, overdue
// =========================================================================
const RebookingView = () => {
  const [tab, setTab] = React.useState('overdue');
  const all = PETS.map(p => {
    const due = new Date(p.lastVisit);
    due.setDate(due.getDate() + p.cadence);
    return { pet: p, daysUntil: daysBetween(TODAY, due.toISOString().slice(0,10)), dueDate: due };
  });
  const overdue = all.filter(r => r.daysUntil < 0).sort((a,b) => a.daysUntil - b.daysUntil);
  const dueSoon = all.filter(r => r.daysUntil >= 0 && r.daysUntil <= 14).sort((a,b) => a.daysUntil - b.daysUntil);
  const lapsed  = all.filter(r => r.daysUntil < -30).sort((a,b) => a.daysUntil - b.daysUntil);
  const list = tab === 'overdue' ? overdue : tab === 'due' ? dueSoon : lapsed;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-l">Overdue</div><div className="kpi-v" style={{color:'var(--bad)'}}>{overdue.length}</div><div className="kpi-d"><span>past their cadence</span></div></div>
        <div className="kpi"><div className="kpi-l">Due in 14 days</div><div className="kpi-v" style={{color:'var(--acc-2)'}}>{dueSoon.length}</div><div className="kpi-d"><span>book before they slip</span></div></div>
        <div className="kpi"><div className="kpi-l">Lapsed (30d+)</div><div className="kpi-v">{lapsed.length}</div><div className="kpi-d"><span>haven't been in a while</span></div></div>
      </div>
      <div className="card tbl-card">
        <div className="tbl-head">
          <div className="seg">
            <button className={`seg-tab ${tab==='overdue'?'is-active':''}`} onClick={()=>setTab('overdue')}>Overdue ({overdue.length})</button>
            <button className={`seg-tab ${tab==='due'?'is-active':''}`} onClick={()=>setTab('due')}>Due soon ({dueSoon.length})</button>
            <button className={`seg-tab ${tab==='lapsed'?'is-active':''}`} onClick={()=>setTab('lapsed')}>Lapsed ({lapsed.length})</button>
          </div>
          <button className="btn btn-primary"><Icon name="msg" size={14}/> Text all</button>
        </div>
        {list.length === 0 ? <div className="empty">Nothing here. Nice work.</div> : list.map(({pet, daysUntil}, i) => {
          const owner = clientById(pet.ownerId);
          const overdueLbl = daysUntil < 0;
          const lbl = overdueLbl ? <strong>{Math.abs(daysUntil)} days overdue</strong>
                    : daysUntil === 0 ? <strong>Due today</strong>
                    : `Due in ${daysUntil} days`;
          return (
            <div className="due" key={pet.id} style={{padding:'14px 22px',display:'grid',gridTemplateColumns:'36px 1fr 1fr auto auto',gap:14}}>
              <div className="due-avatar"><Pet pet={pet} size={26}/></div>
              <div style={{minWidth:0}}>
                <div className="due-name">{pet.name}</div>
                <div className="due-meta">{owner.name} · {pet.breed}</div>
              </div>
              <div style={{fontSize:13, color:'var(--ink-3)'}}>
                Last visit {new Date(pet.lastVisit).toLocaleDateString('en-US',{month:'short',day:'numeric'})}<br/>
                <span style={{color: overdueLbl ? 'var(--bad)' : 'var(--ink-3)'}}>{lbl}</span>
              </div>
              <button className="btn btn-icon" title="Text"><Icon name="msg" size={14}/></button>
              <button className="btn btn-primary btn-pill">Book</button>
            </div>
          );
        })}
      </div>
    </>
  );
};

// =========================================================================
// SETTINGS — Square integration + AI receptionist API key
// =========================================================================
const SettingsView = () => {
  const [showKey, setShowKey] = React.useState(false);
  const [apiKey] = React.useState('sk_live_npr_4f8e2a1c9b7d6e3f5a8c2b1d9e4f7a3c');
  const [squareConnected, setSquareConnected] = React.useState(true);
  const [aiEnabled, setAiEnabled] = React.useState(true);
  const masked = '•'.repeat(28) + apiKey.slice(-4);

  const copyKey = () => { navigator.clipboard?.writeText(apiKey); };

  return (
    <>
      <div style={{display:'flex',flexDirection:'column',gap:18}}>

        {/* Square */}
        <div className="card card-pad">
          <div style={{display:'flex',alignItems:'flex-start',gap:18}}>
            <div style={{width:54,height:54,borderRadius:14,background:'#000',color:'#fff',display:'grid',placeItems:'center',flexShrink:0,fontFamily:'var(--display)',fontWeight:800,fontSize:22,letterSpacing:'-0.04em'}}>□</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <h3 style={{fontFamily:'var(--display)',fontWeight:800,fontSize:20,margin:0,letterSpacing:'-0.015em'}}>Square</h3>
                {squareConnected
                  ? <span className="pill pill-done"><span className="pill-dot"></span>Connected</span>
                  : <span className="pill pill-soon"><span className="pill-dot"></span>Not connected</span>}
              </div>
              <p style={{margin:'0 0 14px',fontSize:13.5,color:'var(--ink-3)',maxWidth:560}}>
                Process payments and auto-generate invoices through your Square account. Tap-to-Pay, terminal, or hardware reader — all supported.
              </p>
              {squareConnected && (
                <dl className="kv" style={{maxWidth:420,marginBottom:14}}>
                  <dt>Account</dt><dd>Nina's Pet Salon LLC</dd>
                  <dt>Location</dt><dd>Federal Way, WA</dd>
                  <dt>Last sync</dt><dd>2 minutes ago</dd>
                </dl>
              )}
              <div style={{display:'flex',gap:8}}>
                {squareConnected
                  ? <><button className="btn">Sync now</button>
                      <button className="btn" onClick={()=>setSquareConnected(false)}>Disconnect</button></>
                  : <button className="btn btn-primary" onClick={()=>setSquareConnected(true)}>Connect Square</button>}
              </div>
            </div>
          </div>
        </div>

        {/* AI Receptionist */}
        <div className="card card-pad">
          <div style={{display:'flex',alignItems:'flex-start',gap:18}}>
            <div style={{width:54,height:54,borderRadius:14,background:'linear-gradient(135deg,#ff5a1f,#ff8e6a)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5c0 8 6 14 14 14l2-3-4-2-2 2c-2-1-4-3-5-5l2-2-2-4z"/>
              </svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <h3 style={{fontFamily:'var(--display)',fontWeight:800,fontSize:20,margin:0,letterSpacing:'-0.015em'}}>AI Receptionist</h3>
                <span className="pill pill-done"><span className="pill-dot"></span>{aiEnabled ? 'Active' : 'Off'}</span>
              </div>
              <p style={{margin:'0 0 18px',fontSize:13.5,color:'var(--ink-3)',maxWidth:560}}>
                Connect your AI receptionist with the secret key below. It can check availability, book, reschedule, and cancel appointments — using your real calendar.
              </p>

              <div style={{padding:'14px 16px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:12,marginBottom:14}}>
                <div style={{fontSize:11.5,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--ink-3)',fontWeight:700,marginBottom:8}}>Secret API key</div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <code style={{flex:1,fontFamily:'var(--mono)',fontSize:13,color:'var(--ink)',background:'var(--surface)',padding:'8px 12px',borderRadius:8,border:'1px solid var(--line)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {showKey ? apiKey : masked}
                  </code>
                  <button className="btn" onClick={()=>setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button>
                  <button className="btn" onClick={copyKey}>Copy</button>
                </div>
                <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:8}}>
                  ⚠️ Keep this secret. Anyone with this key can book and cancel for your shop.
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div style={{padding:12,border:'1px solid var(--line)',borderRadius:10}}>
                  <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase'}}>Calls this month</div>
                  <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:24,letterSpacing:'-0.02em',marginTop:4}}>147</div>
                </div>
                <div style={{padding:12,border:'1px solid var(--line)',borderRadius:10}}>
                  <div style={{fontSize:11.5,color:'var(--ink-3)',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase'}}>Bookings made</div>
                  <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:24,letterSpacing:'-0.02em',marginTop:4}}>89</div>
                </div>
              </div>

              <div style={{fontSize:12.5,color:'var(--ink-3)',marginBottom:10,fontWeight:600}}>Permissions granted to your AI</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>
                {['Check availability','Book appointments','Reschedule','Cancel','Read client info'].map(p => (
                  <span key={p} className="pill pill-done"><Icon name="check" size={11}/>{p}</span>
                ))}
              </div>

              <div style={{display:'flex',gap:8}}>
                <button className="btn">Regenerate key</button>
                <button className="btn" onClick={()=>setAiEnabled(!aiEnabled)}>{aiEnabled ? 'Pause AI' : 'Enable AI'}</button>
                <a href="#" className="btn btn-ghost" style={{marginLeft:'auto'}}>Read API docs →</a>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook */}
        <div className="card card-pad">
          <h3 style={{fontFamily:'var(--display)',fontWeight:800,fontSize:18,margin:'0 0 4px',letterSpacing:'-0.015em'}}>Webhook endpoint</h3>
          <p style={{margin:'0 0 12px',fontSize:13.5,color:'var(--ink-3)'}}>Point your AI receptionist at this URL to push call events.</p>
          <code style={{display:'block',fontFamily:'var(--mono)',fontSize:12.5,padding:'10px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:8}}>
            https://api.ninas-pet-salon.com/v1/hooks/calls
          </code>
        </div>

      </div>
    </>
  );
};

// Schedule view = Calendar view (alias for nav)
const ScheduleView = CalendarView;

Object.assign(window, {
  CalendarView, TodayView, BookingsView, ScheduleView, ClientsView, ServicesView, MoneyView, NotesView,
  RebookingView, SettingsView,
  ApptDrawer, PetDrawer,
});
