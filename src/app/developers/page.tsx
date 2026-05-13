"use client";

import Link from "next/link";
import { useState } from "react";

const BASE = "https://yoursalon.glasshound.app";

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", marginTop: 8 }}>
      <pre style={{
        background: "oklch(0.16 0.01 60)", color: "#e8dfc4",
        borderRadius: 10, padding: "16px 20px", fontSize: 12,
        fontFamily: "var(--dash-mono)", lineHeight: 1.7,
        overflowX: "auto", margin: 0,
      }}>
        <code>{children}</code>
      </pre>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(children);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        style={{
          position: "absolute", top: 10, right: 10, background: "oklch(0.3 0.02 60)",
          border: "none", borderRadius: 6, color: "#c8b89a", fontSize: 11,
          padding: "3px 10px", cursor: "pointer",
        }}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <div style={{ fontFamily: "var(--dash-serif)", fontSize: 22, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid var(--d-line)" }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function EndpointBadge({ method, path }: { method: string; path: string }) {
  const colors: Record<string, string> = {
    GET: "#22c55e", POST: "#3b82f6", PATCH: "#f59e0b", DELETE: "#ef4444",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, marginTop: 16 }}>
      <span style={{
        background: colors[method] ?? "#888", color: "#fff",
        fontFamily: "var(--dash-mono)", fontSize: 12, fontWeight: 700,
        padding: "3px 10px", borderRadius: 6,
      }}>{method}</span>
      <code style={{ fontFamily: "var(--dash-mono)", fontSize: 13 }}>{path}</code>
    </div>
  );
}

export default function DevelopersPage() {
  const [activeSection, setActiveSection] = useState("overview");

  const nav = [
    { id: "overview", label: "Overview" },
    { id: "auth", label: "Authentication" },
    { id: "availability", label: "Availability" },
    { id: "appointments", label: "Appointments" },
    { id: "clients", label: "Clients" },
    { id: "animals", label: "Animals" },
    { id: "services", label: "Services" },
    { id: "notes", label: "Notes" },
    { id: "webhooks", label: "Webhooks" },
    { id: "n8n", label: "n8n Guide" },
    { id: "errors", label: "Errors" },
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Developer API</div>
          <div className="topbar-sub">n8n integration · REST · Webhooks</div>
        </div>
        <div className="topbar-actions">
          <Link href="/api/v1/openapi" className="d-btn" target="_blank">OpenAPI JSON</Link>
          <Link href="/app/today" className="d-btn">← Dashboard</Link>
        </div>
      </header>

      <div className="dash-content">
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>
          {/* Sticky sidebar nav */}
          <div className="glass-card" style={{ padding: "16px 0", position: "sticky", top: 20 }}>
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                style={{
                  display: "block", padding: "8px 20px", fontSize: 13,
                  color: activeSection === item.id ? "var(--oxblood)" : "var(--d-ink-2)",
                  textDecoration: "none", fontWeight: activeSection === item.id ? 600 : 400,
                  borderLeft: activeSection === item.id ? "3px solid var(--oxblood)" : "3px solid transparent",
                  transition: "color 0.15s",
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Docs content */}
          <div>
            <Section id="overview" title="Overview">
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--d-ink-2)", marginBottom: 12 }}>
                The Glasshound REST API lets you automate bookings, check availability, and receive real-time webhook events.
                It integrates directly with <strong>n8n</strong>, Zapier, or any HTTP client.
              </p>
              <div className="glass-card" style={{ padding: 16, marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Base URL</div>
                <code style={{ fontFamily: "var(--dash-mono)", fontSize: 13 }}>{BASE}/api/v1</code>
              </div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🔑", title: "API Key auth", desc: "Bearer tokens with per-scope control" },
                  { icon: "📅", title: "Booking API", desc: "Availability, create, cancel, reschedule" },
                  { icon: "🪝", title: "Webhooks", desc: "HMAC-signed events pushed to your n8n" },
                ].map((f) => (
                  <div key={f.title} className="glass-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="auth" title="Authentication">
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--d-ink-2)", marginBottom: 12 }}>
                All API requests require a Bearer token. Generate keys from Settings → API Keys in your dashboard.
              </p>
              <Code>{`curl -H "Authorization: Bearer gh_live_abc123..." \\
  ${BASE}/api/v1/me

// Response
{ "tenantId": "ten_...", "salonName": "Nina's Pet Salon", "scopes": ["appointments:read", "appointments:write"] }`}</Code>
              <p style={{ fontSize: 13, color: "var(--d-ink-3)", marginTop: 14, lineHeight: 1.6 }}>
                Available scopes: <code>appointments:read</code> <code>appointments:write</code>{" "}
                <code>clients:read</code> <code>clients:write</code> <code>animals:read</code>{" "}
                <code>animals:write</code> <code>webhooks:read</code> <code>webhooks:write</code>
              </p>
            </Section>

            <Section id="availability" title="Availability">
              <EndpointBadge method="GET" path="/api/v1/availability" />
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--d-ink-2)", marginBottom: 8 }}>
                Returns open time slots for a service on a given date. Always call this before booking.
              </p>
              <Code>{`GET /api/v1/availability?serviceIds=svc_full,svc_nails&addOnIds=add_deshed&durationMinutes=270&date=2025-06-15

{
  "data": {
    "date": "2025-06-15",
    "serviceIds": ["svc_full", "svc_nails"],
    "addOnIds": ["add_deshed"],
    "durationMinutes": 270,
    "timezone": "America/Los_Angeles",
    "slots": [
      { "startsAt": "2025-06-15T16:00:00.000Z", "endsAt": "2025-06-15T20:30:00.000Z" }
    ]
  }
}`}</Code>
            </Section>

            <Section id="appointments" title="Appointments">
              <EndpointBadge method="POST" path="/api/v1/appointments" />
              <Code>{`POST /api/v1/appointments
Authorization: Bearer gh_live_...

{
  "serviceIds": ["svc_full_groom", "svc_nail_trim"],
  "addOnIds": ["add_deshedding"],
  "animalId": "ani_xyz789",
  "clientId": "cli_def456",
  "startsAt": "2025-06-15T16:00:00.000Z",
  "durationMinutes": 270
}

// 201 Response
{
  "data": {
    "appointmentId": "apt_...",
    "status": "CONFIRMED",
    "startsAt": "2025-06-15T16:00:00.000Z",
    "endsAt": "2025-06-15T20:30:00.000Z",
    "durationMinutes": 270,
    "services": [{ "id": "svc_full_groom", "name": "Full Groom" }],
    "addOns": [{ "id": "add_deshedding", "name": "Deshedding" }],
    "priceCents": 12000
  }
}`}</Code>

              <EndpointBadge method="POST" path="/api/v1/appointments/{id}/cancel" />
              <Code>{`POST /api/v1/appointments/apt_abc/cancel
{ "reason": "Client requested cancellation" }

// Response
{ "data": { "id": "apt_abc", "status": "CANCELLED" } }`}</Code>

              <EndpointBadge method="POST" path="/api/v1/appointments/{id}/reschedule" />
              <Code>{`POST /api/v1/appointments/apt_abc/reschedule
{ "newStartsAt": "2025-06-20T10:00:00Z", "reason": "Client requested new time" }

// Response
{ "data": { "id": "apt_abc", "status": "CONFIRMED", "startsAt": "2025-06-20T10:00:00Z" } }`}</Code>

              <EndpointBadge method="PATCH" path="/api/v1/appointments/{id}/status" />
              <Code>{`PATCH /api/v1/appointments/apt_abc/status
{ "status": "CHECKED_IN" }

// Flow: CONFIRMED → CHECKED_IN → IN_PROGRESS → READY → COMPLETED`}</Code>
            </Section>

            <Section id="clients" title="Clients">
              <EndpointBadge method="GET" path="/api/v1/clients" />
              <Code>{`GET /api/v1/clients?q=nina&page=1&pageSize=20

{
  "data": [{ "id": "cli_...", "name": "Nina Reyes", "email": "nina@example.com", "tier": "VIP" }],
  "meta": { "page": 1, "pageSize": 20, "total": 42, "pages": 3 }
}`}</Code>

              <EndpointBadge method="POST" path="/api/v1/clients" />
              <Code>{`POST /api/v1/clients
{ "name": "Jane Smith", "email": "jane@example.com", "phone": "555-0100", "tier": "New" }`}</Code>

              <EndpointBadge method="PATCH" path="/api/v1/clients/{id}" />
              <Code>{`PATCH /api/v1/clients/cli_abc
{ "tier": "VIP", "notes": "Prefers morning appointments." }`}</Code>
            </Section>

            <Section id="animals" title="Animals">
              <EndpointBadge method="GET" path="/api/v1/animals" />
              <Code>{`GET /api/v1/animals?clientId=cli_abc&species=dog

{
  "data": [{
    "id": "ani_...", "name": "Biscuit", "species": "dog",
    "breed": "Golden Retriever", "weightLbs": "34.5",
    "allergies": ["lavender"], "behaviorFlags": ["anxious"],
    "preferredCadenceDays": 42, "lastVisitAt": "2025-04-30T00:00:00Z"
  }]
}`}</Code>

              <EndpointBadge method="POST" path="/api/v1/animals" />
              <Code>{`POST /api/v1/animals
{
  "clientId": "cli_abc",
  "name": "Biscuit",
  "species": "dog",
  "breed": "Golden Retriever",
  "allergies": ["lavender"],
  "preferredCadenceDays": 42
}`}</Code>
            </Section>

            <Section id="services" title="Services">
              <EndpointBadge method="GET" path="/api/v1/services" />
              <Code>{`GET /api/v1/services?species=dog

{
  "data": [
    {
      "id": "svc_abc",
      "name": "Full Groom",
      "durationMinutes": 120,
      "priceCents": 9500,
      "species": "Dog",
      "addOns": [
        { "id": "add_deshed", "name": "Deshedding", "durationMinutes": 30, "priceCents": 2500 }
      ]
    }
  ]
}`}</Code>
            </Section>

            <Section id="notes" title="Grooming Notes">
              <EndpointBadge method="POST" path="/api/v1/notes" />
              <Code>{`POST /api/v1/notes
{
  "animalId": "ani_abc",
  "appointmentId": "apt_xyz",
  "tag": "behavior",
  "body": "Biscuit was anxious near clippers. Used slow approach. Completed successfully.",
  "visibility": "INTERNAL"
}

// Tags: general · allergy · behavior · grooming · medical · followup`}</Code>
            </Section>

            <Section id="webhooks" title="Webhooks">
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--d-ink-2)", marginBottom: 12 }}>
                Receive real-time push notifications when appointments change. Payloads are signed with HMAC-SHA256.
              </p>

              <EndpointBadge method="POST" path="/api/v1/webhook-endpoints" />
              <Code>{`POST /api/v1/webhook-endpoints
{
  "url": "https://your-n8n.example.com/webhook/glasshound",
  "events": ["appointment.created", "appointment.completed", "rebooking.due"],
  "description": "n8n booking automation"
}

// Response — save signingSecret, shown only once!
{
  "data": { "id": "whe_...", "url": "...", "events": [...] },
  "signingSecret": "whsec_abc123...",
  "warning": "Save this signing secret — it will not be shown again."
}`}</Code>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 10 }}>Verify signatures in n8n</div>
                <Code>{`// In a Code node before processing the webhook:
const crypto = require("crypto");
const ts = $input.first().headers["x-glasshound-timestamp"];
const sig = $input.first().headers["x-glasshound-signature"];
const body = JSON.stringify($input.first().body);

const expected = "sha256=" + crypto
  .createHmac("sha256", $env.GLASSHOUND_WEBHOOK_SECRET)
  .update(\`\${ts}.\${body}\`)
  .digest("hex");

if (sig !== expected) throw new Error("Invalid webhook signature");
return $input.all();`}</Code>
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 10 }}>Event payload shapes</div>
                <Code>{`// appointment.created / appointment.completed / appointment.cancelled
{
  "event": "appointment.created",
  "tenantId": "ten_...",
  "timestamp": "2025-06-15T09:00:00Z",
  "data": {
    "appointmentId": "apt_...", "animalId": "ani_...",
    "clientId": "cli_...",
    "services": [{ "id": "svc_...", "name": "Full Groom" }],
    "addOns": [{ "id": "add_...", "name": "Deshedding" }],
    "durationMinutes": 270,
    "startsAt": "2025-06-20T10:00:00Z", "status": "CONFIRMED"
  }
}

// rebooking.due
{
  "event": "rebooking.due",
  "tenantId": "ten_...",
  "data": {
    "animalId": "ani_...", "animalName": "Biscuit",
    "clientId": "cli_...", "clientName": "Jane Smith",
    "clientEmail": "jane@example.com",
    "daysSinceLastVisit": 45, "preferredCadenceDays": 42
  }
}`}</Code>
              </div>
            </Section>

            <Section id="n8n" title="n8n Integration Guide">
              <div className="glass-card" style={{ padding: 20, marginBottom: 20, background: "oklch(from var(--oxblood) l c h / 0.05)", borderColor: "var(--oxblood)" }}>
                <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 8 }}>Full booking automation in 4 nodes</div>
                <p style={{ fontSize: 13, color: "var(--d-ink-2)", lineHeight: 1.6, margin: 0 }}>
                  Webhook trigger → HTTP Request (check availability) → Set node (pick slot) → HTTP Request (create booking).
                  No code required — just configure the HTTP Request nodes with your API key.
                </p>
              </div>

              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 10 }}>Workflow: New booking from form</div>
              <Code>{`// 1. Webhook trigger receives form data:
{
  "petName": "Biscuit",
  "clientEmail": "jane@example.com",
  "serviceIds": ["svc_full_groom"],
  "addOnIds": ["add_deshedding"],
  "durationMinutes": 270,
  "preferredDate": "2025-06-20"
}

// 2. HTTP Request — GET /api/v1/availability
//    URL: ${BASE}/api/v1/availability?serviceIds={{ $json.serviceIds.join(',') }}&addOnIds={{ $json.addOnIds.join(',') }}&durationMinutes={{ $json.durationMinutes }}&date={{ $json.preferredDate }}
//    Auth: Header Auth → Authorization: Bearer {{ $env.GLASSHOUND_KEY }}

// 3. Set node — pick first slot
//    startsAt: {{ $json.data.slots[0].startsAt }}

// 4. HTTP Request — POST /api/v1/appointments
{
  "serviceIds": {{ JSON.stringify($('Webhook').item.json.serviceIds) }},
  "addOnIds": {{ JSON.stringify($('Webhook').item.json.addOnIds) }},
  "animalId": "{{ $('Lookup Animal').item.json.data[0].id }}",
  "clientId": "{{ $('Lookup Client').item.json.data[0].id }}",
  "startsAt": "{{ $('Pick Slot').item.json.startsAt }}",
  "durationMinutes": {{ $('Webhook').item.json.durationMinutes }}
}`}</Code>

              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 10, marginTop: 24 }}>Workflow: Rebooking reminders</div>
              <Code>{`// 1. Glasshound fires "rebooking.due" webhook to your n8n URL
// 2. Webhook trigger node receives it
// 3. Code node verifies the HMAC signature (see above)
// 4. Send Email node → "Time to book {{ $json.data.animalName }}'s next groom!"
// 5. Optional: HTTP Request → POST /api/v1/appointments (auto-book next open slot)`}</Code>

              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 10, marginTop: 24 }}>Quick-start steps</div>
              <ol style={{ paddingLeft: 20, fontSize: 14, lineHeight: 2.2, color: "var(--d-ink-2)" }}>
                <li>In n8n, create a <strong>Header Auth credential</strong> → name: <code>Authorization</code>, value: <code>Bearer gh_live_…</code></li>
                <li>Call <code>POST /api/v1/webhook-endpoints</code> with your n8n webhook URL</li>
                <li>Save the <code>signingSecret</code> as an n8n env var: <code>GLASSHOUND_WEBHOOK_SECRET</code></li>
                <li>Build your workflows using the HTTP Request node with the credential above</li>
                <li>Activate your n8n workflow — bookings flow automatically!</li>
              </ol>
            </Section>

            <Section id="errors" title="Error Reference">
              <div className="glass-card" style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                      {["HTTP Status", "Meaning", "Common cause"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["401", "Unauthorized", "Missing or invalid API key"],
                      ["403", "Forbidden", "Key lacks required scope for this operation"],
                      ["404", "Not found", "Resource doesn't exist in your tenant"],
                      ["409", "Conflict", "Slot is no longer available"],
                      ["422", "Validation error", "Request body failed schema validation"],
                      ["429", "Rate limited", "Slow down — retry after Retry-After header"],
                      ["503", "Service unavailable", "Database connection failed"],
                    ].map(([status, meaning, cause]) => (
                      <tr key={status} className="table-row">
                        <td style={{ padding: "10px 16px", fontFamily: "var(--dash-mono)", fontSize: 13 }}>{status}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13 }}>{meaning}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--d-ink-3)" }}>{cause}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14 }}>
                <Code>{`// All errors share this envelope:
{
  "error": "Validation error",
  "status": 422,
  "details": {
    "fieldErrors": { "startsAt": ["Required"] },
    "formErrors": []
  }
}`}</Code>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );
}
