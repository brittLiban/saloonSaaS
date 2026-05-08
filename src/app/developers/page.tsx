import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { webhookEvents } from "@/lib/openapi";

const endpoints = [
  "GET /api/v1/me",
  "GET /api/v1/availability",
  "POST /api/v1/appointments",
  "POST /api/v1/appointments/:id/cancel",
  "POST /api/v1/appointments/:id/reschedule",
  "POST /api/v1/appointments/:id/status",
  "GET /api/v1/clients",
  "GET /api/v1/animals",
  "GET /api/v1/notes",
  "GET /api/v1/invoices",
];

export default function DevelopersPage() {
  return (
    <main className="page-shell">
      <header className="nav">
        <div className="wrap nav-row">
          <Link href="/" className="brand">
            <BrandMark />
            <span>Glasshound Developers</span>
          </Link>
          <div className="nav-actions">
            <Link href="/api/v1/openapi" className="btn">OpenAPI JSON</Link>
            <Link href="/app" className="btn btn-primary">Dashboard</Link>
          </div>
        </div>
      </header>

      <section className="wrap section">
        <div className="section-head">
          <div className="eyebrow">n8n-ready API</div>
          <h1 className="display">Automation without scraping the UI.</h1>
          <p className="subtle">
            Sprint 0 exposes the planned API contract and health routes. Sprint 5 will back these endpoints with scoped API keys,
            OpenAPI docs, signed webhooks, and delivery logs.
          </p>
        </div>

        <div className="developer-grid">
          <article className="card developer-card">
            <h3>Authentication</h3>
            <p>Tenant-scoped bearer keys with granular scopes like appointments:write and availability:read.</p>
          </article>
          <article className="card developer-card">
            <h3>Booking</h3>
            <p>Availability lookup, create, cancel, reschedule, and status mutation endpoints.</p>
          </article>
          <article className="card developer-card">
            <h3>Webhooks</h3>
            <p>HMAC signatures, retries, delivery logs, and a test webhook button for n8n workflows.</p>
          </article>
        </div>

        <h2 className="display">Core endpoints</h2>
        <pre>{endpoints.join("\n")}</pre>

        <h2 className="display">Webhook events</h2>
        <pre>{webhookEvents.join("\n")}</pre>
      </section>
    </main>
  );
}
