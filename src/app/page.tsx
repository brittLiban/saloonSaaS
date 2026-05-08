import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const features = [
  ["Calendar that thinks ahead", "Availability, buffers, booking, cancellation, and reschedule flows built around grooming operations."],
  ["Real animal records", "Allergies, behavior flags, grooming notes, cadence, photos, and care history per patient."],
  ["n8n-ready API", "Tenant-scoped API keys, OpenAPI docs, signed webhooks, and stable endpoints for automation."],
  ["Tenant theming", "Each salon gets its own logo, accent, density, and branded experience without hardcoded demo data."],
  ["Money basics", "Invoices, statuses, totals, exports, and clean seams for Square or Stripe after MVP."],
  ["Self-contained deploy", "Docker Compose for the app, worker, Postgres, Redis, MinIO, and reverse proxy."],
];

export default function MarketingPage() {
  return (
    <main className="page-shell">
      <header className="nav">
        <div className="wrap nav-row">
          <Link href="/" className="brand">
            <BrandMark />
            <span>Glasshound</span>
          </Link>
          <nav className="nav-links" aria-label="Marketing navigation">
            <a href="#features">Features</a>
            <a href="#automation">n8n API</a>
            <a href="#deployment">Docker</a>
          </nav>
          <div className="nav-actions">
            <Link href="/login" className="btn">Sign in</Link>
            <Link href="/app" className="btn btn-primary">Open demo</Link>
          </div>
        </div>
      </header>

      <section className="wrap hero">
        <div>
          <div className="eyebrow">Pet salon SaaS foundation</div>
          <h1 className="display">Run grooming like clockwork.</h1>
          <p>
            Booking, animal notes, client records, invoices, tenant theming, and an API designed for n8n automation.
            Built from the Claude prototype into a real self-contained SaaS.
          </p>
          <div className="hero-actions">
            <Link href="/app" className="btn btn-primary">Open dashboard</Link>
            <Link href="/developers" className="btn">Developer docs</Link>
          </div>
        </div>

        <div className="card hero-panel">
          <div className="schedule-card">
            <div className="schedule-head">
              <span>Time</span>
              <span>Patient</span>
              <span>Status</span>
            </div>
            {[
              ["8:00", "Bella | Full groom", "Done"],
              ["9:30", "Atlas | De-shed", "In chair"],
              ["12:30", "Mochi | Bath", "Confirmed"],
              ["2:15", "Juno | Puppy cut", "Confirmed"],
            ].map(([time, animal, status]) => (
              <div className="schedule-row" key={time}>
                <strong>{time}</strong>
                <span><span className="pet-dot">{animal[0]}</span> {animal}</span>
                <span className="pill">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section" id="features">
        <div className="section-head">
          <div className="eyebrow">MVP surface</div>
          <h2 className="display">From static mockup to tenant data.</h2>
          <p className="subtle">These are the first production capabilities being scaffolded from the prototype.</p>
        </div>
        <div className="feature-grid">
          {features.map(([title, body]) => (
            <article className="card feature" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section" id="automation">
        <div className="section-head">
          <div className="eyebrow">Automation</div>
          <h2 className="display">An API that n8n can actually use.</h2>
          <p className="subtle">
            The product will expose tenant-scoped REST endpoints for availability, appointments, clients, animals,
            notes, invoices, and webhook delivery.
          </p>
        </div>
        <Link href="/developers" className="btn btn-primary">View API plan</Link>
      </section>

      <section className="wrap section" id="deployment">
        <div className="section-head">
          <div className="eyebrow">Deployment</div>
          <h2 className="display">Docker-first and self-contained.</h2>
          <p className="subtle">App, worker, database, Redis, object storage, and reverse proxy are planned as one compose stack.</p>
        </div>
      </section>
    </main>
  );
}
