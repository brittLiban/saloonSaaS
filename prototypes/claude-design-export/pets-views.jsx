// pets-views.jsx — solo-operator views
// Glasshound: built for one groomer running their own shop.

const { useState, useMemo, useEffect, useRef } = React;

const fmtMoney = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoneyK = (n) => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + Math.round(n);
const fmtDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtDateShort = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = (t) => {
  const [h,m] = t.split(':').map(Number);
  const hh = ((h+11)%12)+1; const ap = h >= 12 ? 'pm' : 'am';
  return m === 0 ? `${hh}${ap}` : `${hh}:${m.toString().padStart(2,'0')}${ap}`;
};
const ageOf = (dob) => { const d = new Date(dob); const y = (Date.now() - d) / (365.25*24*3600*1000); return y < 1 ? `${Math.round(y*12)} mo` : `${y.toFixed(1)} yr`; };

// Days between two YYYY-MM-DD dates
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / (24*3600*1000));
const TODAY = '2026-05-05';

// Pets due for re-book (lastVisit + cadence < today)
const dueForRebook = () => window.PETS.map(p => {
  const overdue = daysBetween(p.lastVisit, TODAY) - p.cadence;
  return { pet: p, overdue };
}).filter(x => x.overdue >= -3) // include "due in next 3 days"
  .sort((a, b) => b.overdue - a.overdue);

// ─────────────────────────────────────────────────────────────────
// TODAY — the single screen the owner lives on
// ─────────────────────────────────────────────────────────────────
function Today({ goto, openAppt, openPet, openClient }) {
  const todayAppts = window.APPOINTMENTS.filter(a => a.date === TODAY).sort((a,b) => a.start.localeCompare(b.start));
  const completed = todayAppts.filter(a => a.status === 'completed').length;
  const remaining = todayAppts.filter(a => a.status !== 'completed').length;
  const expectedRevenue = todayAppts.reduce((s, a) => s + a.price, 0);
  const collected = todayAppts.filter(a => a.status === 'completed').reduce((s,a)=>s+a.price,0);

  const dueList = dueForRebook().slice(0, 4);
  const unpaid = window.INVOICES.filter(i => i.status !== 'paid');

  // Suggested SMS (auto-drafted) for the next pet on the list
  const nextAppt = todayAppts.find(a => a.status === 'confirmed');

  return (
    <div className="view" data-screen-label="01 Today">
      {/* Hero */}
      <Glass className="card hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">Tuesday · May 5, 2026</div>
            <h1 className="serif hero-title">Good morning, Lior.</h1>
            <p className="hero-deck">
              <span className="numeral big">{todayAppts.length}</span> pets on the books today.
              {' '}You'll close out around <span className="serif" style={{ fontStyle: 'italic' }}>4:30pm</span>
              {' '}with <span className="numeral big">{fmtMoneyK(expectedRevenue)}</span> in the till.
            </p>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={() => goto('schedule')}><Icon.calendar />See full day</button>
              <button className="btn"><Icon.plus />Quick book</button>
            </div>
          </div>
          <div className="hero-progress">
            <div className="ring">
              <svg viewBox="0 0 100 100" width="140" height="140">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line-2)" strokeWidth="6"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--oxblood)" strokeWidth="6"
                  strokeDasharray={`${(completed/todayAppts.length)*264} 264`}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                  style={{ filter: 'drop-shadow(0 0 6px oklch(from var(--oxblood) l c h / 0.4))' }}/>
              </svg>
              <div className="ring-text">
                <div className="numeral" style={{ fontSize: 32, lineHeight: 1 }}>{completed}<span className="dim" style={{ fontSize: 18 }}>/{todayAppts.length}</span></div>
                <div className="eyebrow" style={{ marginTop: 4 }}>finished</div>
              </div>
            </div>
            <div className="hero-coins">
              <div><div className="eyebrow">Collected</div><div className="numeral" style={{ fontSize: 22 }}>{fmtMoneyK(collected)}</div></div>
              <div><div className="eyebrow">Remaining</div><div className="numeral" style={{ fontSize: 22 }}>{fmtMoneyK(expectedRevenue - collected)}</div></div>
            </div>
          </div>
        </div>
      </Glass>

      {/* Two columns: Run-of-show · Things to do */}
      <div className="row responsive" style={{ alignItems: 'stretch' }}>
        {/* Run of show */}
        <Glass className="card" style={{ flex: 1.4 }}>
          <div className="card-head">
            <div className="h serif">Run of show</div>
            <div className="sub">{todayAppts.length} pets · {remaining} to go</div>
            <div className="right">
              <button className="btn btn-sm btn-ghost" onClick={() => goto('schedule')}>Calendar →</button>
            </div>
          </div>
          <div className="rundown">
            {todayAppts.map((a, i) => {
              const pet = window.PETS.find(p => p.id === a.petId);
              const client = window.CLIENTS.find(c => c.id === pet.ownerId);
              const svc = window.SERVICES.find(s => s.id === a.serviceId);
              const isCurrent = a.status === 'in-progress';
              return (
                <div key={a.id} className={`run ${isCurrent ? 'current' : ''} ${a.status === 'completed' ? 'done' : ''}`} onClick={() => openAppt(a)}>
                  <div className="run-time">
                    <div className="numeral big">{fmtTime(a.start).replace(/(am|pm)/, '')}</div>
                    <div className="mono dim">{fmtTime(a.start).match(/am|pm/)[0]}</div>
                    <div className="run-dur mono dim">{svc.dur}m</div>
                  </div>
                  <div className="run-spine">
                    <div className={`run-dot ${isCurrent ? 'pulse' : ''}`} />
                    {i < todayAppts.length - 1 && <div className="run-line"/>}
                  </div>
                  <div className="run-body">
                    <div className="flex gap-3 center">
                      <PetAvatar pet={pet} size={42} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="serif-tight" style={{ fontSize: 18 }}>{pet.name} <span className="muted" style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 400 }}>· {pet.breed}</span></div>
                        <div className="muted" style={{ fontSize: 12.5 }}>{svc.name} · {client.name}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="numeral" style={{ fontSize: 16 }}>${a.price}</div>
                        <StatusPill status={a.status} />
                      </div>
                    </div>
                    {pet.allergies.length > 0 && (
                      <div className="run-flag">
                        <Icon.sparkle /> Heads-up: avoid {pet.allergies.join(', ').toLowerCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Glass>

        {/* To-do column */}
        <div className="col" style={{ flex: 1, minWidth: 280 }}>
          {/* Suggested actions */}
          <Glass className="card">
            <div className="card-head">
              <div className="h serif">Suggested</div>
              <div className="sub">drafted for you</div>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {nextAppt && (() => {
                const pet = window.PETS.find(p => p.id === nextAppt.petId);
                const client = window.CLIENTS.find(c => c.id === pet.ownerId);
                return (
                  <div className="suggest">
                    <div className="suggest-icon"><Icon.sms /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>Send a heads-up to {client.name.split(' ')[0]}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>"Hi {client.name.split(' ')[0]} — {pet.name} is up at {fmtTime(nextAppt.start)}. See you soon ✂"</div>
                      <div className="flex gap-2 mt-2">
                        <button className="btn btn-xs btn-primary">Send SMS</button>
                        <button className="btn btn-xs btn-ghost">Edit</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="suggest">
                <div className="suggest-icon" style={{ background: 'oklch(from var(--brass) l c h / 0.14)', color: 'oklch(from var(--brass) calc(l - 0.20) c h)' }}><Icon.sparkle /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{dueList.length} clients are due to re-book</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>I drafted SMS for each. Review and send in one tap.</div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-xs btn-primary" onClick={() => goto('rebook')}>Review {dueList.length} →</button>
                  </div>
                </div>
              </div>
              <div className="suggest">
                <div className="suggest-icon" style={{ background: 'oklch(from var(--oxblood) l c h / 0.10)', color: 'var(--oxblood)' }}><Icon.invoices /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>1 invoice is overdue</div>
                  <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>Margaux · INV-2043 · 21 days late</div>
                  <div className="flex gap-2 mt-2">
                    <button className="btn btn-xs">Send polite nudge</button>
                  </div>
                </div>
              </div>
            </div>
          </Glass>

          {/* Re-book due */}
          <Glass className="card">
            <div className="card-head">
              <div className="h serif">Due to come back</div>
              <div className="sub">{dueList.length}</div>
              <div className="right"><button className="btn btn-xs btn-ghost" onClick={() => goto('rebook')}>All →</button></div>
            </div>
            <div>
              {dueList.map(({ pet, overdue }) => {
                const owner = window.CLIENTS.find(c => c.id === pet.ownerId);
                return (
                  <div key={pet.id} className="list-item" style={{ padding: '10px 0', cursor: 'default' }} onClick={() => openPet(pet)}>
                    <PetAvatar pet={pet} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name" style={{ fontSize: 13 }}>{pet.name} <span className="muted" style={{ fontWeight: 400, fontSize: 11.5 }}>· {owner.name.split(' ')[0]}</span></div>
                      <div className="sub" style={{ fontSize: 11 }}>Last visit {fmtDateShort(pet.lastVisit)}</div>
                    </div>
                    <Tag tone={overdue >= 0 ? 'oxblood' : 'brass'}>
                      {overdue >= 0 ? `${overdue}d late` : `in ${-overdue}d`}
                    </Tag>
                  </div>
                );
              })}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Schedule — calendar view, simplified for one calendar
// ─────────────────────────────────────────────────────────────────
function Schedule({ openAppt }) {
  const [view, setView] = useState('day'); // day | week
  const days = view === 'day' ? [TODAY] : ['2026-05-04','2026-05-05','2026-05-06','2026-05-07','2026-05-08','2026-05-09','2026-05-10'];
  const dayLabels = days.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return { date: d, dow: dt.toLocaleDateString('en-US', { weekday: 'short' }), num: dt.getDate(), today: d === TODAY };
  });
  const startHour = 8, endHour = 19;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const HOUR_PX = 64;

  const positionAppt = (a) => {
    const [sh, sm] = a.start.split(':').map(Number);
    const [eh, em] = a.end.split(':').map(Number);
    const top = ((sh - startHour) + sm/60) * HOUR_PX;
    const height = (((eh - sh) + (em - sm)/60) * HOUR_PX) - 2;
    return { top, height };
  };

  const apptsFor = (date) => window.APPOINTMENTS.filter(a => a.date === date);
  const nowTop = view === 'day' ? ((10 - startHour) + 35/60) * HOUR_PX : null;

  return (
    <div className="view" data-screen-label="02 Schedule">
      <div className="view-head">
        <div>
          <div className="eyebrow">Schedule</div>
          <h1 className="title serif" style={{ marginTop: 6 }}>{view === 'day' ? 'Tuesday, May 5' : 'Week of May 4'}</h1>
          <div className="deck mt-2">{view === 'day' ? `${apptsFor(TODAY).length} pets today · 7 hrs of grooming` : `12 appointments this week`}</div>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={view==='day'?'on':''} onClick={() => setView('day')}>Day</button>
            <button className={view==='week'?'on':''} onClick={() => setView('week')}>Week</button>
          </div>
          <button className="btn btn-icon"><Icon.chevronL /></button>
          <button className="btn btn-sm">Today</button>
          <button className="btn btn-icon"><Icon.chevronR /></button>
          <button className="btn btn-primary"><Icon.plus />Book</button>
        </div>
      </div>

      <div className="cal" style={{ '--cols': days.length, '--rows': hours.length, '--hour-px': `${HOUR_PX}px` }}>
        <div className="cal-head" style={{ display: 'contents' }}>
          <div></div>
          {dayLabels.map(d => (
            <div key={d.date} className={`day-cell ${d.today?'today':''}`}>
              <span className="day-num serif">{d.num}</span>
              <span>{d.dow}</span>
            </div>
          ))}
        </div>
        <div className="cal-time-col">
          {hours.map(h => (
            <div key={h} className="cal-time">{h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}</div>
          ))}
        </div>
        {days.map(date => (
          <div key={date} className="cal-col">
            {hours.map((h, i) => (
              <div key={h} className="hour-line" style={{ top: i * HOUR_PX }} />
            ))}
            {date === TODAY && view === 'day' && nowTop != null && (
              <div className="now-line" style={{ top: nowTop }}>
                <span className="now-label mono">10:35 · now</span>
              </div>
            )}
            {apptsFor(date).map(a => {
              const pet = window.PETS.find(p => p.id === a.petId);
              const svc = window.SERVICES.find(s => s.id === a.serviceId);
              const { top, height } = positionAppt(a);
              return (
                <div key={a.id} className="appt" data-status={a.status} style={{ top, height }} onClick={() => openAppt(a)}>
                  <div className="pet-name">{pet.name}</div>
                  <div className="svc">{svc.name}</div>
                  <div className="meta">
                    <span>{fmtTime(a.start)}–{fmtTime(a.end)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Re-book center — the AI-drafted batch nudges
// ─────────────────────────────────────────────────────────────────
function Rebook({ openPet }) {
  const due = dueForRebook();
  const [selected, setSelected] = useState(new Set(due.map(d => d.pet.id)));
  const toggle = (id) => {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  };
  const drafts = due.map(({ pet, overdue }) => {
    const owner = window.CLIENTS.find(c => c.id === pet.ownerId);
    const text = overdue >= 0
      ? `Hi ${owner.name.split(' ')[0]} — it's been ${daysBetween(pet.lastVisit, TODAY)} days since ${pet.name}'s last visit. Want me to find a slot this week? — Lior`
      : `Hi ${owner.name.split(' ')[0]} — ${pet.name}'s next groom is coming up soon. Reply BOOK and I'll get them in. — Lior`;
    return { pet, owner, overdue, text };
  });

  return (
    <div className="view" data-screen-label="03 Re-book">
      <div className="view-head">
        <div>
          <div className="eyebrow">Re-book center</div>
          <h1 className="title serif" style={{ marginTop: 6 }}>Bring them back.</h1>
          <div className="deck mt-2">{due.length} pets are due or coming due. Drafts are ready — review, edit, send in one batch.</div>
        </div>
        <div className="actions">
          <button className="btn">Cancel</button>
          <button className="btn btn-primary"><Icon.sms />Send {selected.size} drafts</button>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        {drafts.map(d => (
          <Glass key={d.pet.id} className="card draft" data-selected={selected.has(d.pet.id)}>
            <div className="flex gap-3 center">
              <label className="checkbox">
                <input type="checkbox" checked={selected.has(d.pet.id)} onChange={() => toggle(d.pet.id)} />
                <span/>
              </label>
              <PetAvatar pet={d.pet} size={44} />
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => openPet(d.pet)}>
                <div className="serif-tight" style={{ fontSize: 17 }}>{d.pet.name} <span className="muted" style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 400 }}>· {d.owner.name}</span></div>
                <div className="muted mono" style={{ fontSize: 11 }}>{d.owner.phone} · last visit {fmtDateShort(d.pet.lastVisit)}</div>
              </div>
              <Tag tone={d.overdue >= 0 ? 'oxblood' : 'brass'}>{d.overdue >= 0 ? `${d.overdue}d overdue` : `due in ${-d.overdue}d`}</Tag>
            </div>
            <div className="draft-msg">
              <div className="draft-channel"><Icon.sms />SMS draft</div>
              <div className="draft-text">{d.text}</div>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-xs btn-ghost"><Icon.edit />Edit</button>
                <button className="btn btn-xs btn-ghost"><Icon.sparkle />Try another tone</button>
              </div>
            </div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Directory — Clients-first, master-detail. Pets live inside their owner.
// ─────────────────────────────────────────────────────────────────
function Directory({ openPet, openClient }) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(window.CLIENTS[0].id);
  const [sort, setSort] = useState('recent'); // recent | name | tier

  const filterText = q.toLowerCase();
  const matches = (c) => {
    if (!filterText) return true;
    if (c.name.toLowerCase().includes(filterText)) return true;
    if (c.phone.toLowerCase().includes(filterText)) return true;
    if (c.email.toLowerCase().includes(filterText)) return true;
    const cPets = window.PETS.filter(p => c.pets.includes(p.id));
    return cPets.some(p => p.name.toLowerCase().includes(filterText) || p.breed.toLowerCase().includes(filterText));
  };

  const tierRank = { VIP: 0, Regular: 1, New: 2 };
  const lastVisitOf = (c) => {
    const cPets = window.PETS.filter(p => c.pets.includes(p.id));
    return cPets.reduce((acc, p) => p.lastVisit > acc ? p.lastVisit : acc, '0000-00-00');
  };
  const filtered = window.CLIENTS.filter(matches).sort((a, b) => {
    if (sort === 'name') return a.name.split(' ').slice(-1)[0].localeCompare(b.name.split(' ').slice(-1)[0]);
    if (sort === 'tier') return tierRank[a.tier] - tierRank[b.tier];
    return lastVisitOf(b).localeCompare(lastVisitOf(a));
  });

  // Group alphabetically when sorting by name
  const grouped = sort === 'name'
    ? filtered.reduce((acc, c) => {
        const k = c.name.split(' ').slice(-1)[0][0].toUpperCase();
        (acc[k] = acc[k] || []).push(c);
        return acc;
      }, {})
    : null;

  const selected = filtered.find(c => c.id === selectedId) || filtered[0];

  return (
    <div className="view" data-screen-label="04 Clients">
      <div className="view-head">
        <div>
          <div className="eyebrow">Roster</div>
          <h1 className="title serif" style={{ marginTop: 6 }}>Clients</h1>
          <div className="deck mt-2">{window.CLIENTS.length} households · {window.PETS.length} pets in regular care.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary"><Icon.plus />Add client</button>
        </div>
      </div>

      <div className="dir-split">
        {/* LEFT — searchable client list */}
        <Glass className="card dir-list" style={{ padding: 0 }}>
          <div className="dir-list-head">
            <div className="search" style={{ maxWidth: 'none', height: 34 }}>
              <Icon.search />
              <input placeholder="Search clients, pets, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="seg" style={{ marginTop: 10 }}>
              <button className={sort==='recent'?'on':''} onClick={() => setSort('recent')}>Recent</button>
              <button className={sort==='name'?'on':''} onClick={() => setSort('name')}>A–Z</button>
              <button className={sort==='tier'?'on':''} onClick={() => setSort('tier')}>Tier</button>
            </div>
          </div>
          <div className="dir-list-scroll">
            {grouped ? (
              Object.keys(grouped).sort().map(letter => (
                <div key={letter}>
                  <div className="dir-letter">{letter}</div>
                  {grouped[letter].map(c => (
                    <ClientRow key={c.id} client={c} active={selected?.id === c.id} onClick={() => setSelectedId(c.id)} />
                  ))}
                </div>
              ))
            ) : (
              filtered.map(c => (
                <ClientRow key={c.id} client={c} active={selected?.id === c.id} onClick={() => setSelectedId(c.id)} />
              ))
            )}
            {filtered.length === 0 && (
              <div className="dir-empty">
                <div className="serif-tight" style={{ fontSize: 18 }}>No matches</div>
                <div className="muted mt-2" style={{ fontSize: 12.5 }}>Try a different name, breed, or phone fragment.</div>
              </div>
            )}
          </div>
        </Glass>

        {/* RIGHT — detail */}
        <div className="dir-detail">
          {selected && (
            <ClientPanel client={selected} openPet={openPet} openClient={openClient} />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientRow({ client, active, onClick }) {
  const cPets = window.PETS.filter(p => client.pets.includes(p.id));
  const lastVisit = cPets.reduce((acc, p) => p.lastVisit > acc ? p.lastVisit : acc, '0000-00-00');
  const overdue = cPets.some(p => daysBetween(p.lastVisit, TODAY) - p.cadence >= 0);
  return (
    <div className={`dir-row ${active ? 'active' : ''}`} onClick={onClick}>
      <Initials name={client.name} color={client.tier === 'VIP' ? 'oxblood' : client.tier === 'Regular' ? 'brass' : 'sage'} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="dir-row-name">
          <span className="serif-tight" style={{ fontSize: 14.5 }}>{client.name}</span>
          {overdue && <span className="dir-row-flag" title="Has a pet due to re-book"/>}
        </div>
        <div className="dir-row-pets">
          {cPets.map((p, i) => (
            <span key={p.id}>{i > 0 && <span className="dim"> · </span>}{p.name}</span>
          ))}
        </div>
      </div>
      <div className="dir-row-meta">
        <Tag tone={client.tier === 'VIP' ? 'oxblood' : client.tier === 'Regular' ? 'brass' : 'sage'} size="md">{client.tier}</Tag>
        <span className="mono dim" style={{ fontSize: 10, marginTop: 4 }}>{lastVisit !== '0000-00-00' ? fmtDateShort(lastVisit) : '—'}</span>
      </div>
    </div>
  );
}

function ClientPanel({ client, openPet, openClient }) {
  const cPets = window.PETS.filter(p => client.pets.includes(p.id));
  const lifetime = window.INVOICES.filter(i => i.clientId === client.id && i.status === 'paid').reduce((s,i) => s + i.total, 0);
  const visits = window.APPOINTMENTS.filter(a => cPets.some(p => p.id === a.petId)).length;
  const upcoming = window.APPOINTMENTS.filter(a => cPets.some(p => p.id === a.petId) && a.date >= TODAY).sort((a,b) => a.date.localeCompare(b.date))[0];

  return (
    <>
      <Glass className="card" style={{ padding: 24 }}>
        <div className="flex gap-4 center">
          <Initials name={client.name} color={client.tier === 'VIP' ? 'oxblood' : 'brass'} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow">{client.tier} · since {fmtDateShort(client.since)}</div>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144", marginTop: 4, lineHeight: 1.05 }}>{client.name}</h2>
            <div className="flex gap-3 mt-2" style={{ flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ink-3)' }}>
              <span className="flex gap-2 center"><Icon.phone />{client.phone}</span>
              <span className="flex gap-2 center"><Icon.mail />{client.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm"><Icon.sms />Text</button>
            <button className="btn btn-sm"><Icon.phone />Call</button>
            <button className="btn btn-sm btn-primary"><Icon.plus />Book</button>
          </div>
        </div>

        <Hairline style={{ margin: '20px 0' }} />

        <div className="grid grid-4">
          <div><div className="eyebrow">Pets</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{cPets.length}</div></div>
          <div><div className="eyebrow">Visits</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{visits}</div></div>
          <div><div className="eyebrow">Lifetime</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{fmtMoneyK(lifetime)}</div></div>
          <div><div className="eyebrow">Next</div><div className="numeral mt-1" style={{ fontSize: 16 }}>{upcoming ? `${fmtDateShort(upcoming.date)} · ${fmtTime(upcoming.start)}` : '—'}</div></div>
        </div>

        {client.note && (
          <div className="note mt-4" style={{ borderLeftColor: 'var(--brass-2)' }}>
            <div className="eyebrow">House note</div>
            <div className="mt-1" style={{ fontSize: 13 }}>{client.note}</div>
          </div>
        )}
      </Glass>

      {/* Pets — nested inside their owner */}
      <Glass className="card">
        <div className="card-head">
          <div className="h serif">Pets in this household</div>
          <div className="sub">{cPets.length}</div>
          <div className="right"><button className="btn btn-xs btn-ghost"><Icon.plus />Add pet</button></div>
        </div>
        <div className="col" style={{ gap: 10 }}>
          {cPets.map(p => {
            const overdue = daysBetween(p.lastVisit, TODAY) - p.cadence;
            const lastNote = window.NOTES.filter(n => n.petId === p.id).slice(-1)[0];
            return (
              <div key={p.id} className="pet-row" onClick={() => openPet(p)}>
                <PetAvatar pet={p} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex gap-2 center" style={{ flexWrap: 'wrap' }}>
                    <span className="serif-tight" style={{ fontSize: 19 }}>{p.name}</span>
                    <span className="muted" style={{ fontSize: 12 }}>· {p.breed}</span>
                    <span className="mono dim" style={{ fontSize: 10.5 }}>{p.sex} · {ageOf(p.dob)} · {p.weight} lb</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{p.coat}</div>
                  {lastNote && <div className="dim" style={{ fontSize: 11.5, marginTop: 4, fontStyle: 'italic' }}>"{lastNote.text.slice(0, 84)}{lastNote.text.length > 84 ? '…' : ''}"</div>}
                </div>
                <div className="pet-row-side">
                  <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {p.allergies.map(a => <Tag key={a} tone="oxblood">⚠ {a}</Tag>)}
                    {overdue >= 0 ? <Tag tone="oxblood">{overdue}d overdue</Tag> : overdue >= -7 ? <Tag tone="brass">due in {-overdue}d</Tag> : <Tag tone="sage">on schedule</Tag>}
                  </div>
                  <div className="mono dim" style={{ fontSize: 10.5, marginTop: 6, textAlign: 'right' }}>last visit {fmtDateShort(p.lastVisit)}</div>
                </div>
                <Icon.chevronR />
              </div>
            );
          })}
        </div>
      </Glass>

      <Glass className="card">
        <div className="card-head"><div className="h serif">Recent invoices</div></div>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Pet</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th></tr></thead>
          <tbody>
            {window.INVOICES.filter(i => i.clientId === client.id).map(inv => {
              const pet = window.PETS.find(p => p.id === inv.petId);
              return (
                <tr key={inv.id}>
                  <td className="mono">{inv.id}</td>
                  <td>{fmtDateShort(inv.date)}</td>
                  <td>{pet?.name}</td>
                  <td className="numeral" style={{ textAlign: 'right' }}>{fmtMoney(inv.total)}</td>
                  <td><Tag tone={inv.status === 'paid' ? 'sage' : inv.status === 'overdue' ? 'oxblood' : 'brass'}>{inv.status}</Tag></td>
                </tr>
              );
            })}
            {window.INVOICES.filter(i => i.clientId === client.id).length === 0 && (
              <tr><td colSpan="5" className="dim" style={{ textAlign: 'center', padding: 24 }}>No invoices yet.</td></tr>
            )}
          </tbody>
        </table>
      </Glass>
    </>
  );
}

// ─── Pet Detail ───
function PetDetail({ pet, goto, openClient }) {
  if (!pet) return null;
  const owner = window.CLIENTS.find(c => c.id === pet.ownerId);
  const notes = window.NOTES.filter(n => n.petId === pet.id);
  const visits = window.APPOINTMENTS.filter(a => a.petId === pet.id);
  const overdue = daysBetween(pet.lastVisit, TODAY) - pet.cadence;
  return (
    <div className="view" data-screen-label="04b Pet Detail">
      <div className="flex gap-2 center">
        <button className="btn btn-ghost btn-sm" onClick={() => goto('directory')}><Icon.chevronL />All pets</button>
      </div>

      <Glass className="card" style={{ padding: 28 }}>
        <div className="flex gap-4 center">
          <PetAvatar pet={pet} size={92} />
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{pet.breed}</div>
            <h1 className="serif" style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-0.024em', fontVariationSettings: "'opsz' 144", marginTop: 4, lineHeight: 1 }}>{pet.name}</h1>
            <div className="flex gap-3 mt-2" style={{ fontSize: 13, color: 'var(--ink-3)', flexWrap: 'wrap' }}>
              <span>{pet.sex === 'F' ? 'Female' : 'Male'}</span><span>·</span>
              <span>{ageOf(pet.dob)}</span><span>·</span>
              <span>{pet.weight} lbs</span><span>·</span>
              <span>{(pet.coat || '').split('·')[0].trim()}</span>
            </div>
            <div className="mt-3 flex gap-2" style={{ flexWrap: 'wrap' }}>
              {pet.allergies.map(a => <Tag key={a} tone="oxblood">⚠ Allergy: {a}</Tag>)}
              <Tag tone="brass">{pet.temperament}</Tag>
              {overdue >= 0 ? <Tag tone="oxblood">{overdue}d overdue</Tag> : <Tag tone="sage">{-overdue}d until next</Tag>}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm"><Icon.edit />Edit</button>
            <button className="btn btn-sm btn-primary"><Icon.plus />Book</button>
          </div>
        </div>
      </Glass>

      <div className="row responsive">
        <Glass className="card" style={{ flex: 2 }}>
          <div className="card-head"><div className="h serif">Coat & styling plan</div></div>
          <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}><b>Coat:</b> {pet.coat}.</p>
            <p style={{ margin: '8px 0 0' }}>Reviewed {fmtDate(pet.lastVisit)}. Cadence {pet.cadence} days — bath {pet.species === 'cat' ? 'every 8 weeks' : 'every 4–6 weeks'}.</p>
          </div>

          <Hairline style={{ margin: '18px 0' }}/>

          <div className="card-head"><div className="h serif">Visit history</div><div className="sub">{visits.length} visits</div></div>
          <table className="table">
            <thead><tr><th>Date</th><th>Service</th><th style={{ textAlign:'right' }}>Spend</th></tr></thead>
            <tbody>
              {visits.slice(0,8).map(a => {
                const svc = window.SERVICES.find(s => s.id === a.serviceId);
                return (
                  <tr key={a.id}>
                    <td>{fmtDateShort(a.date)} <span className="mono dim">{a.start}</span></td>
                    <td>{svc.name}</td>
                    <td className="numeral" style={{ textAlign: 'right' }}>${a.price}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Glass>

        <div className="col" style={{ flex: 1, minWidth: 280 }}>
          <Glass className="card">
            <div className="card-head"><div className="h serif">Owner</div></div>
            <div className="flex gap-3 center" onClick={() => openClient(owner)} style={{ cursor: 'default' }}>
              <Initials name={owner.name} color="oxblood" size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{owner.name}</div>
                <div className="mono dim" style={{ fontSize: 11 }}>{owner.phone}</div>
              </div>
              <Icon.chevronR />
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-sm" style={{ flex: 1 }}><Icon.phone />Call</button>
              <button className="btn btn-sm" style={{ flex: 1 }}><Icon.sms />Text</button>
            </div>
          </Glass>

          <Glass className="card">
            <div className="card-head"><div className="h serif">Notes</div><div className="sub">{notes.length}</div></div>
            <div className="col" style={{ gap: 10 }}>
              {notes.map(n => (
                <div key={n.id} className="note" data-tag={n.tag}>
                  <div className="flex between center" style={{ marginBottom: 5 }}>
                    <span className="eyebrow">{n.tag}</span>
                    <span className="mono dim" style={{ fontSize: 10 }}>{fmtDateShort(n.date)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{n.text}</div>
                </div>
              ))}
              <button className="btn btn-sm btn-ghost"><Icon.plus />Add note</button>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

// ─── Client Detail ───
function ClientDetail({ client, goto, openPet }) {
  if (!client) return null;
  const pets = window.PETS.filter(p => client.pets.includes(p.id));
  const invoices = window.INVOICES.filter(i => i.clientId === client.id);
  const lifetime = invoices.filter(i => i.status === 'paid').reduce((s,i) => s + i.total, 0);
  const visits = window.APPOINTMENTS.filter(a => pets.some(p => p.id === a.petId)).length;

  return (
    <div className="view" data-screen-label="04c Client Detail">
      <div className="flex gap-2 center">
        <button className="btn btn-ghost btn-sm" onClick={() => goto('directory')}><Icon.chevronL />All clients</button>
      </div>

      <Glass className="card" style={{ padding: 28 }}>
        <div className="flex gap-4 center">
          <Initials name={client.name} color={client.tier === 'VIP' ? 'oxblood' : 'brass'} size={68} />
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{client.tier} · since {fmtDateShort(client.since)}</div>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144", marginTop: 4 }}>{client.name}</h1>
            <div className="flex gap-3 mt-2" style={{ flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)' }}>
              <span className="flex gap-2 center"><Icon.phone />{client.phone}</span>
              <span className="flex gap-2 center"><Icon.mail />{client.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-sm"><Icon.sms />Text</button>
            <button className="btn btn-sm btn-primary"><Icon.plus />Book</button>
          </div>
        </div>
        <Hairline style={{ margin: '20px 0' }} />
        <div className="grid grid-3">
          <div><div className="eyebrow">Total visits</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{visits}</div></div>
          <div><div className="eyebrow">Lifetime</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{fmtMoneyK(lifetime)}</div></div>
          <div><div className="eyebrow">Pets</div><div className="numeral mt-1" style={{ fontSize: 22 }}>{pets.length}</div></div>
        </div>
        {client.note && (
          <div className="note mt-4" data-tag="styling" style={{ borderLeftColor: 'var(--brass-2)' }}>
            <div className="eyebrow">Note</div>
            <div className="mt-1" style={{ fontSize: 13 }}>{client.note}</div>
          </div>
        )}
      </Glass>

      <Glass className="card">
        <div className="card-head"><div className="h serif">Pets</div></div>
        <div className="grid grid-2">
          {pets.map(p => (
            <div key={p.id} className="glass-2" style={{ padding: 16, cursor: 'default' }} onClick={() => openPet(p)}>
              <div className="flex gap-3 center">
                <PetAvatar pet={p} size={52} />
                <div style={{ flex: 1 }}>
                  <div className="serif-tight" style={{ fontSize: 18 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.breed} · {ageOf(p.dob)}</div>
                </div>
                <Icon.chevronR />
              </div>
            </div>
          ))}
        </div>
      </Glass>

      <Glass className="card">
        <div className="card-head"><div className="h serif">Invoice history</div></div>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Pet</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.map(inv => {
              const pet = window.PETS.find(p => p.id === inv.petId);
              return (
                <tr key={inv.id}>
                  <td className="mono">{inv.id}</td>
                  <td>{fmtDate(inv.date)}</td>
                  <td>{pet?.name}</td>
                  <td className="numeral" style={{ textAlign: 'right' }}>{fmtMoney(inv.total)}</td>
                  <td><Tag tone={inv.status === 'paid' ? 'sage' : inv.status === 'overdue' ? 'oxblood' : 'brass'}>{inv.status}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Glass>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Services
// ─────────────────────────────────────────────────────────────────
function Services() {
  return (
    <div className="view" data-screen-label="05 Services">
      <div className="view-head">
        <div>
          <div className="eyebrow">Menu</div>
          <h1 className="title serif" style={{ marginTop: 6 }}>Services & pricing</h1>
          <div className="deck mt-2">Your menu. Edit prices in place — no settings dive needed.</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary"><Icon.plus />New service</button>
        </div>
      </div>

      <Glass className="card" style={{ padding: 0 }}>
        <table className="table services-table">
          <thead><tr><th>Service</th><th>Description</th><th style={{ textAlign:'right' }}>Duration</th><th style={{ textAlign:'right' }}>Price</th><th></th></tr></thead>
          <tbody>
            {window.SERVICES.map(s => (
              <tr key={s.id}>
                <td><div className="serif-tight" style={{ fontSize: 16 }}>{s.name}</div></td>
                <td className="muted" style={{ fontSize: 12.5, maxWidth: 380 }}>{s.desc}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{s.dur} min</td>
                <td className="numeral" style={{ textAlign: 'right', fontSize: 18 }}>${s.price}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-xs btn-ghost"><Icon.edit /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Glass>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Money — invoices + reminders + reports rolled into one page
// ─────────────────────────────────────────────────────────────────
function Money() {
  const [tab, setTab] = useState('invoices');
  return (
    <div className="view" data-screen-label="06 Money">
      <div className="view-head">
        <div>
          <div className="eyebrow">Bookkeeping</div>
          <h1 className="title serif" style={{ marginTop: 6 }}>Money</h1>
          <div className="deck mt-2">Invoices, what you've earned, and where the month is going.</div>
        </div>
        <div className="actions">
          <div className="seg">
            <button className={tab==='invoices'?'on':''} onClick={() => setTab('invoices')}>Invoices</button>
            <button className={tab==='trends'?'on':''} onClick={() => setTab('trends')}>Trends</button>
          </div>
          <button className="btn"><Icon.download />Export</button>
        </div>
      </div>

      {tab === 'invoices' ? <InvoicesView /> : <TrendsView />}
    </div>
  );
}

function InvoicesView() {
  const totals = {
    paid: window.INVOICES.filter(i => i.status === 'paid').reduce((s,i) => s + i.total, 0),
    open: window.INVOICES.filter(i => i.status === 'unpaid').reduce((s,i) => s + i.total, 0),
    overdue: window.INVOICES.filter(i => i.status === 'overdue').reduce((s,i) => s + i.total, 0),
  };
  return (
    <>
      <div className="grid grid-3">
        <Glass className="card stat"><div className="eyebrow">Paid · April</div><div className="v">{fmtMoneyK(totals.paid)}</div><div className="delta up"><Icon.arrowUp />+12% MoM</div></Glass>
        <Glass className="card stat"><div className="eyebrow">Awaiting payment</div><div className="v">{fmtMoneyK(totals.open)}</div><div className="delta">1 invoice</div></Glass>
        <Glass className="card stat"><div className="eyebrow">Overdue</div><div className="v" style={{ color: 'var(--oxblood)' }}>{fmtMoneyK(totals.overdue)}</div><div className="delta dn">21 days late</div></Glass>
      </div>

      <Glass className="card">
        <div className="card-head"><div className="h serif">All invoices</div><div className="sub">{window.INVOICES.length} this month</div></div>
        <table className="table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Client</th><th>Pet</th><th>Items</th><th style={{ textAlign:'right' }}>Total</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>
            {window.INVOICES.map(inv => {
              const c = window.CLIENTS.find(x => x.id === inv.clientId);
              const pet = window.PETS.find(p => p.id === inv.petId);
              return (
                <tr key={inv.id}>
                  <td className="mono" style={{ fontWeight: 500 }}>{inv.id}</td>
                  <td>{fmtDateShort(inv.date)}</td>
                  <td>{c.name}</td>
                  <td><span className="flex gap-2 center"><PetAvatar pet={pet} size={22} /><span>{pet.name}</span></span></td>
                  <td className="muted" style={{ fontSize: 12 }}>{inv.items.map(i => i.desc).join(', ')}</td>
                  <td className="numeral" style={{ textAlign: 'right' }}>{fmtMoney(inv.total)}</td>
                  <td className="mono dim" style={{ fontSize: 11 }}>{inv.method}</td>
                  <td><Tag tone={inv.status === 'paid' ? 'sage' : inv.status === 'overdue' ? 'oxblood' : 'brass'}>{inv.status}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Glass>
    </>
  );
}

function TrendsView() {
  const monthly = [
    { m: 'Nov', v: 4200 }, { m: 'Dec', v: 4800 }, { m: 'Jan', v: 4100 },
    { m: 'Feb', v: 5300 }, { m: 'Mar', v: 6100 }, { m: 'Apr', v: 6800 },
  ];
  const max = Math.max(...monthly.map(m => m.v));
  return (
    <>
      <div className="grid grid-4">
        <Glass className="card stat"><div className="eyebrow">Revenue · April</div><div className="v">$6.8k</div><div className="delta up"><Icon.arrowUp />+11% MoM</div></Glass>
        <Glass className="card stat"><div className="eyebrow">Avg ticket</div><div className="v">$148</div><div className="delta up"><Icon.arrowUp />+$6 vs Q1</div></Glass>
        <Glass className="card stat"><div className="eyebrow">Re-book rate</div><div className="v">72%</div><div className="delta up"><Icon.arrowUp />+4 pts</div></Glass>
        <Glass className="card stat"><div className="eyebrow">Pets / week</div><div className="v">22</div><div className="delta">about right</div></Glass>
      </div>

      <Glass className="card">
        <div className="card-head"><div className="h serif">Monthly revenue</div><div className="sub">Nov 2025 — Apr 2026</div></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, padding: '20px 0 4px' }}>
          {monthly.map(m => (
            <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="numeral" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtMoneyK(m.v)}</div>
              <div style={{ width: '100%', maxWidth: 56, height: `${(m.v/max)*150}px`, background: 'linear-gradient(180deg, var(--oxblood-2), var(--oxblood))', borderRadius: '6px 6px 0 0', boxShadow: 'inset 0 1px 0 oklch(1 0 0 / 0.30)' }}/>
              <div className="mono dim" style={{ fontSize: 10.5 }}>{m.m}</div>
            </div>
          ))}
        </div>
      </Glass>

      <Glass className="card">
        <div className="card-head"><div className="h serif">What's selling · April</div></div>
        {[
          { n: 'Full Groom', v: 18, rev: 2970, p: 0.9 },
          { n: 'Bath & Brush', v: 14, rev: 1190, p: 0.7 },
          { n: 'De-shed Treatment', v: 6, rev: 750, p: 0.30 },
          { n: 'Show Clip', v: 3, rev: 855, p: 0.15 },
          { n: 'Feline Spa', v: 4, rev: 440, p: 0.20 },
        ].map(s => (
          <div key={s.n} style={{ marginTop: 12 }}>
            <div className="flex between" style={{ fontSize: 13, marginBottom: 5 }}>
              <span>{s.n}</span>
              <span className="mono dim">{s.v} · {fmtMoneyK(s.rev)}</span>
            </div>
            <div className="bar"><span style={{ width: `${s.p*100}%` }}/></div>
          </div>
        ))}
      </Glass>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Appointment Drawer — with status flow + auto-invoice
// ─────────────────────────────────────────────────────────────────
function ApptDrawer({ appt, onClose }) {
  if (!appt) return null;
  const pet = window.PETS.find(p => p.id === appt.petId);
  const owner = window.CLIENTS.find(c => c.id === pet.ownerId);
  const svc = window.SERVICES.find(s => s.id === appt.serviceId);
  const flow = ['confirmed','in-progress','ready','completed'];
  const currentIdx = flow.indexOf(appt.status === 'in-progress' ? 'in-progress' : appt.status === 'ready' ? 'ready' : appt.status === 'completed' ? 'completed' : 'confirmed');
  return (
    <>
      <div className="drawer-overlay" onClick={onClose}/>
      <div className="drawer">
        <div style={{ padding: '18px 20px', borderBottom: '0.5px solid var(--line)' }}>
          <div className="flex between center">
            <span className="eyebrow">{fmtDate(appt.date)} · {fmtTime(appt.start)}</span>
            <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}><Icon.x /></button>
          </div>
          <div className="flex gap-3 center mt-3">
            <PetAvatar pet={pet} size={56} />
            <div>
              <h2 className="serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', fontVariationSettings: "'opsz' 144" }}>{pet.name}</h2>
              <div className="muted" style={{ fontSize: 12.5 }}>{pet.breed} · {owner.name}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }} className="col">
          {/* Status stepper */}
          <div>
            <div className="eyebrow">Where are we?</div>
            <div className="stepper mt-2">
              {flow.map((s, i) => {
                const status = window.STATUSES.find(x => x.key === s);
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <React.Fragment key={s}>
                    <div className={`step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      <div className="step-dot">{done ? <Icon.check /> : i + 1}</div>
                      <div className="step-label">{status.label}</div>
                    </div>
                    {i < flow.length - 1 && <div className={`step-line ${i < currentIdx ? 'done' : ''}`}/>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="grid grid-2">
            <div><div className="eyebrow">Service</div><div className="mt-1" style={{ fontSize: 14, fontWeight: 500 }}>{svc.name}</div></div>
            <div><div className="eyebrow">Charge</div><div className="mt-1 numeral" style={{ fontSize: 18 }}>${appt.price}</div></div>
            <div><div className="eyebrow">Time</div><div className="mt-1 numeral" style={{ fontSize: 16 }}>{fmtTime(appt.start)} – {fmtTime(appt.end)}</div></div>
            <div><div className="eyebrow">Duration</div><div className="mt-1" style={{ fontSize: 14 }}>{svc.dur} min</div></div>
          </div>

          <Hairline />

          <div>
            <div className="eyebrow">Quick contact</div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-sm" style={{ flex: 1 }}><Icon.phone />Call {owner.name.split(' ')[0]}</button>
              <button className="btn btn-sm" style={{ flex: 1 }}><Icon.sms />Text</button>
            </div>
          </div>

          <div>
            <div className="eyebrow">What to remember</div>
            {window.NOTES.filter(n => n.petId === pet.id).slice(0, 2).map(n => (
              <div key={n.id} className="note mt-2" data-tag={n.tag}>
                <div className="flex between center" style={{ marginBottom: 5 }}>
                  <Tag tone={n.tag==='styling'?'brass':n.tag==='medical'?'oxblood':'lilac'}>{n.tag}</Tag>
                  <span className="mono dim" style={{ fontSize: 10.5 }}>{fmtDateShort(n.date)}</span>
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{n.text}</div>
              </div>
            ))}
            {pet.allergies.length > 0 && (
              <div className="glass-2 mt-2" style={{ padding: 12, borderLeft: '2px solid var(--oxblood)' }}>
                <div className="eyebrow" style={{ color: 'var(--oxblood)' }}>⚠ Allergies</div>
                <div className="mt-1" style={{ fontSize: 13 }}>{pet.allergies.join(', ')}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid var(--line)', display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }}>Reschedule</button>
          <button className="btn btn-primary" style={{ flex: 1.5 }}><Icon.check />Mark complete & invoice</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Today, Schedule, Rebook, Directory, PetDetail, ClientDetail, Services, Money, ApptDrawer });
