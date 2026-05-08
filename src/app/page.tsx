"use client";
import Link from "next/link";
import { useState } from "react";

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M3 8.5l3 3 7-7"/>
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 18 18" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M4 9h10M10 4l5 5-5 5"/>
  </svg>
);

const features = [
  {
    color: "b1",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
    title: "Calendar that thinks ahead",
    body: "Drag to reschedule. Color blocks by service. Buffer time between dogs auto-baked in. See your whole week without losing today.",
  },
  {
    color: "b6",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5c0 8 6 14 14 14l2-3-4-2-2 2c-2-1-4-3-5-5l2-2-2-4z"/></svg>,
    title: "AI Receptionist",
    body: "Picks up the phone, checks your real availability, books appointments, and texts confirmations. While you're elbow-deep in suds.",
  },
  {
    color: "b2",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M8 14h3"/></svg>,
    title: "n8n-ready API",
    body: "Connect any automation workflow. Tenant-scoped API keys, signed webhooks, and a full OpenAPI spec so n8n runs your bookings without touching the UI.",
  },
  {
    color: "b3",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>,
    title: "Re-booking on autopilot",
    body: "Knows that Bella is due every six weeks. Surfaces the dogs slipping past their cadence. One tap to text and book.",
  },
  {
    color: "b4",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>,
    title: "A real client memory",
    body: "Allergies, behaviors, the specific shampoo they like. Photos before and after. Every dog, every owner, every preference — right where you'd look first.",
  },
  {
    color: "b5",
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 4 8-8"/><path d="M14 8h6v6"/></svg>,
    title: "Money, plain and simple",
    body: "Today, this week, this month — what came in, what's outstanding, what your average ticket looks like. No spreadsheets, no surprises.",
  },
];

const faqs = [
  { q: "Do I need a separate phone for the AI receptionist?", a: "No. We forward your existing line so the AI picks up only when you can't. You keep your number." },
  { q: "Will it work with my Square reader?", a: "Yes. Connect your Square account in Settings and we'll route invoices through your existing reader, terminal, or Tap-to-Pay." },
  { q: "Can I import my clients from a spreadsheet?", a: "Drop in a CSV — owners on one tab, pets on another. We'll match them and let you fix anything weird before it lands." },
  { q: "What if a customer wants to reschedule themselves?", a: "The AI receptionist can move and cancel, with the same rules you'd give a human at the front desk. You're always the final say." },
  { q: "Does it work for multi-staff salons?", a: "Glasshound supports multiple staff calendars and role-based access. The Growth plan includes 2 staff members." },
];

export default function MarketingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", position: "relative" }}>
      {/* bg gradients */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(900px 500px at 110% -10%, rgba(255,210,180,0.6), transparent 60%), radial-gradient(700px 500px at -10% 110%, rgba(255,220,200,0.5), transparent 65%)" }} />

      {/* ── NAV ── */}
      <header className="mkt-nav">
        <div className="wrap mkt-nav-row">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/>
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-name">Nina&apos;s</span>
              <span className="brand-sub">Pet Salon</span>
            </span>
          </Link>
          <nav className="nav-links">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#pricing">Pricing</a>
            <a className="nav-link" href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <Link href="/login" className="btn btn-ghost">Sign in</Link>
            <Link href="/app/today" className="btn btn-primary">Open dashboard <ArrowIcon /></Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-tag">New</span>
              AI receptionist now answers your phone
            </span>
            <h1>Run your<br/>grooming salon<br/>like <em>clockwork.</em></h1>
            <p className="hero-lede">
              Booking, payments, client records, and an AI receptionist that picks up the phone while you&apos;re with the dog. Built for the solo owner who wears every apron.
            </p>
            <div className="hero-cta">
              <Link href="/register" className="btn btn-orange btn-lg">
                Start free trial <ArrowIcon />
              </Link>
              <Link href="/app/today" className="btn btn-lg">Open demo</Link>
            </div>
            <div className="hero-meta">
              <span className="hero-meta-item"><CheckIcon /> 14-day free trial</span>
              <span className="hero-meta-item"><CheckIcon /> No credit card</span>
              <span className="hero-meta-item"><CheckIcon /> Cancel any time</span>
            </div>
          </div>

          {/* Hero art */}
          <div className="hero-art">
            <div className="hero-card hero-card-1">
              <div className="hero-card-1-h">
                <div className="hero-card-1-title">Today · Thu May 7</div>
                <span className="hero-card-1-pill">On track</span>
              </div>
              {[
                { time: "9:00", emoji: "🐶", name: "Bella", svc: "Full groom", price: "$85", c: "b1" },
                { time: "10:30", emoji: "🐕", name: "Mochi", svc: "Bath & tidy", price: "$55", c: "b3" },
                { time: "12:30", emoji: "🐩", name: "Atlas", svc: "De-shed", price: "$95", c: "b4" },
                { time: "2:15", emoji: "🐾", name: "Pixel", svc: "Puppy cut", price: "$70", c: "b2" },
              ].map((row) => (
                <div className="hero-mini-row" key={row.time}>
                  <div className="hero-mini-time">{row.time}</div>
                  <div className={`hero-mini-pet ${row.c}`}>{row.emoji}</div>
                  <div>
                    <div className="hero-mini-name">{row.name}</div>
                    <div className="hero-mini-svc">{row.svc}</div>
                  </div>
                  <div className="hero-mini-price">{row.price}</div>
                </div>
              ))}
            </div>

            <div className="hero-card hero-card-2">
              <div className="hero-card-2-l">Today&apos;s revenue</div>
              <div className="hero-card-2-v">$842</div>
              <div className="hero-card-2-d">↑ 18% vs last Thu</div>
            </div>

            <div className="hero-card hero-card-3">
              <div className="hero-mini-pet b1" style={{ width: 38, height: 38, borderRadius: "50%" }}>🐶</div>
              <div>
                <div className="hero-card-3-name">Bella&apos;s mom</div>
                <div className="hero-card-3-msg">AI booked · 6 wk</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wrap logos">
          <div className="logos-l">Trusted by 1,200+ solo groomers</div>
          <div className="logos-row">
            <div className="logo-item">Pawsworth &amp; Co</div>
            <div className="logo-item sans">Muddy Boots</div>
            <div className="logo-item">The Wash House</div>
            <div className="logo-item sans">Tail &amp; Trim</div>
            <div className="logo-item">Glasshound Grooming</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="mkt-section">
        <div className="wrap">
          <div className="section-head">
            <span className="section-eyebrow">Features</span>
            <h2 className="section-h2">Everything for the chair, <em>nothing</em> for the meeting room.</h2>
            <p className="section-lede">Most salon software is built for chains with twelve stylists. This one&apos;s built for you, alone, between baths.</p>
          </div>
          <div className="features-grid">
            {features.map((f) => (
              <article key={f.title} className="feat-card">
                <div className={`feat-icon ${f.color}`}>{f.icon}</div>
                <h3 className="feat-h">{f.title}</h3>
                <p className="feat-p">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <span className="section-eyebrow">How it works</span>
            <h2 className="section-h2">From &quot;I should get organized&quot; to <em>booked solid for May.</em></h2>
          </div>
          <div className="steps-grid">
            {[
              { n: "01", h: "Bring your clients", p: "Drop in a CSV, type them in, or let the AI grab them off voicemails. Whatever's least painful." },
              { n: "02", h: "Set your week", p: "Hours, services, prices, time between dogs. Block off lunch and a real coffee break. The calendar respects all of it." },
              { n: "03", h: "Just groom", p: "Bookings come in. Reminders go out. Payments settle. You touch the app twice a day and it's still ahead of you." },
            ].map((s) => (
              <div key={s.n} className="step">
                <div className="step-num">{s.n}</div>
                <h3 className="step-h">{s.h}</h3>
                <p className="step-p">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="quote-card">
            <blockquote className="quote-body">
              I used to lose two dogs a week to missed callbacks. The AI receptionist alone paid for the whole thing in a month — and the calendar finally stopped lying to me.
            </blockquote>
            <div className="quote-foot">
              <div className="quote-avatar" />
              <div>
                <div className="quote-name">Nina Reyes</div>
                <div className="quote-role">Owner · Federal Way, WA</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="section-eyebrow">Pricing</span>
            <h2 className="section-h2">One plan. Priced for <em>one chair.</em></h2>
            <p className="section-lede">No per-stylist fees. No &quot;Pro tier&quot; gating the basics. The calendar, payments, and the AI receptionist are all in.</p>
          </div>
          <div className="pricing-grid">
            {/* Starter */}
            <article className="price-card">
              <div className="price-name">Starter</div>
              <div className="price-tagline">Just the calendar.</div>
              <div className="price-amount"><span className="price-amount-n">$0</span><span className="price-amount-u">/mo</span></div>
              <div className="price-billed">Free forever</div>
              <ul>
                {["Calendar & bookings", "Up to 50 clients", "Basic invoices"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <div className="price-cta">
                <Link href="/register" className="btn" style={{ width: "100%", justifyContent: "center" }}>Start free</Link>
              </div>
            </article>

            {/* Solo Pro */}
            <article className="price-card featured">
              <span className="price-tag">Most groomers pick this</span>
              <div className="price-name">Solo Pro</div>
              <div className="price-tagline">Everything you need to run the shop alone.</div>
              <div className="price-amount"><span className="price-amount-n">$39</span><span className="price-amount-u">/mo</span></div>
              <div className="price-billed">Billed monthly · 14-day free trial</div>
              <ul>
                {["Unlimited clients & pets", "AI Receptionist (200 calls/mo)", "Square payments & invoices", "Auto re-booking texts", "Photo notes & care history"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <div className="price-cta">
                <Link href="/register" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Try 14 days free</Link>
              </div>
            </article>

            {/* Growth */}
            <article className="price-card">
              <div className="price-name">Growth</div>
              <div className="price-tagline">For when you bring on a second pair of hands.</div>
              <div className="price-amount"><span className="price-amount-n">$79</span><span className="price-amount-u">/mo</span></div>
              <div className="price-billed">Billed monthly</div>
              <ul>
                {["Everything in Solo Pro", "2 staff calendars", "Unlimited AI calls", "n8n automation API", "Marketing automations"].map(f => (
                  <li key={f}><CheckIcon />{f}</li>
                ))}
              </ul>
              <div className="price-cta">
                <Link href="/register" className="btn" style={{ width: "100%", justifyContent: "center" }}>Choose Growth</Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head center">
            <span className="section-eyebrow">FAQ</span>
            <h2 className="section-h2">Questions, briefly answered.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className={`faq-item${openFaq === i ? " open" : ""}`}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span>
                  <span className="faq-q-icon">+</span>
                </button>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-band">
            <h2 className="cta-band-h">Open the dashboard. <em>Today.</em></h2>
            <p className="cta-band-p">Free for 14 days. No card. Cancel by closing the tab.</p>
            <div className="cta-band-btns">
              <Link href="/register" className="btn btn-orange btn-lg">Get started <ArrowIcon /></Link>
              <Link href="/developers" className="btn btn-lg">Developer API</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="mkt-footer">
        <div className="wrap">
          <div className="footer-row">
            <div>
              <Link href="/" className="brand">
                <span className="brand-mark">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="17" rx="4.5" ry="3.4"/><circle cx="6" cy="10.5" r="1.8"/><circle cx="12" cy="8" r="1.8"/><circle cx="18" cy="10.5" r="1.8"/>
                  </svg>
                </span>
                <span className="brand-text">
                  <span className="brand-name">Nina&apos;s</span>
                  <span className="brand-sub">Pet Salon</span>
                </span>
              </Link>
              <p className="footer-blurb">Software for the solo groomer. Built in Federal Way, WA, between the Goldendoodle and the Husky.</p>
            </div>
            <div className="footer-col">
              <div className="footer-col-h">Product</div>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><Link href="/app/today">Open demo</Link></li>
                <li><Link href="/developers">API docs</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-h">Company</div>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-h">Resources</div>
              <ul>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">Help center</a></li>
                <li><Link href="/developers">API docs</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Glasshound Software Inc.</span>
            <div className="footer-bottom-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
