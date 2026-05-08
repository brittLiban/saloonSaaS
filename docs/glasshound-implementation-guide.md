# Glasshound SaaS — Complete Implementation Reference

> **AI-readable project guide.** Last updated: 2026-05-08.
> Any AI assistant can read this document and pick up the project from any sprint.
> Follow the checklists in order. Every architectural decision is documented with its WHY.

---

## Table of Contents

1. [Project Mission](#1-project-mission)
2. [Architecture Overview](#2-architecture-overview)
3. [Design System](#3-design-system)
4. [File Structure](#4-file-structure)
5. [Auth & Sessions](#5-auth--sessions)
6. [Multi-Tenancy Rules](#6-multi-tenancy-rules)
7. [Dashboard Tab Specs](#7-dashboard-tab-specs)
8. [n8n REST API — Complete Spec](#8-n8n-rest-api--complete-spec)
9. [Webhook System](#9-webhook-system)
10. [Availability Engine](#10-availability-engine)
11. [Docker Deployment](#11-docker-deployment)
12. [Sprint Checklist](#12-sprint-checklist)
13. [Seeded Demo Data](#13-seeded-demo-data)
14. [AI Pickup Prompt](#14-ai-pickup-prompt)

---

## 1. Project Mission

**Glasshound** is a multi-tenant SaaS platform for solo pet grooming salons. Each salon (tenant) gets:

- A branded dashboard to manage bookings, clients, animals, notes, and invoices.
- A public-facing REST API so they can connect n8n workflows for reminders, rebooking texts, and automation without touching the UI.
- A self-hosted Docker Compose deploy with Postgres, Redis, MinIO, and Caddy.

**Demo tenant:** Nina's Pet Salon · Federal Way, WA · `nina@example.com` / `demo-password`

**Product name:** Glasshound (the SaaS platform)
**Tenant brand:** Each salon configures its own name, logo, and accent color.

---

## 2. Architecture Overview

```
Browser
  │
  ▼
Caddy (reverse proxy, TLS termination)
  │
  ▼
Next.js 16 App Router (web container)
  ├── /                Marketing page
  ├── /login           Auth
  ├── /register        Signup + onboarding
  ├── /app/*           Dashboard (auth-required)
  │     ├── /today
  │     ├── /calendar
  │     ├── /clients[/:id]
  │     ├── /animals[/:id]
  │     ├── /services
  │     ├── /bookings
  │     ├── /money
  │     ├── /notes
  │     └── /rebooking
  ├── /api/auth/*      Session auth
  ├── /api/v1/*        Public REST API (Bearer token)
  └── /developers      Interactive API docs

BullMQ Worker (worker container)
  └── webhook delivery, rebooking reminder scheduling

Postgres    — Prisma ORM, all business data
Redis       — BullMQ queues, rate limits
MinIO       — Photos, attachments, CSV imports
```

### Service map (docker-compose.yml services)

| Service | Image | Purpose |
|---|---|---|
| `postgres` | postgres:17-alpine | Primary datastore |
| `redis` | redis:7-alpine | Queues + rate limits |
| `minio` | minio/minio | Object storage (S3-compat) |
| `minio-create-bucket` | minio/mc | One-shot bucket init |
| `web` | Built from Dockerfile | Next.js app + API |
| `worker` | Built from Dockerfile | BullMQ background jobs |
| `caddy` | caddy:2.10-alpine | Reverse proxy, TLS |

---

## 3. Design System

The app uses **two CSS surfaces** — one for marketing, one for the dashboard. Both share a warm parchment base.

### 3.1 Marketing Surface

```css
:root {
  --bg:        #fbeee4;   /* warm peach */
  --bg-2:      #f8e3d2;
  --surface:   #ffffff;
  --surface-2: #f7f5f1;
  --line:      #ececec;

  --ink:       #161616;
  --ink-2:     #3a3a3a;
  --ink-3:     #6e6e6e;
  --ink-4:     #a3a3a3;

  --acc:       #ff5a1f;   /* orange accent — primary CTA */
  --acc-2:     #e64a0e;

  --sans:    'Plus Jakarta Sans', system-ui, sans-serif;
  --serif:   'Instrument Serif', Georgia, serif;
  --mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

### 3.2 Dashboard Surface

```css
:root {
  /* CSS vars are prefixed --d- or --dash- in the dashboard */
  --dash-serif:  'Fraunces', Georgia, serif;          /* headings, numbers */
  --dash-sans:   'Inter Tight', system-ui, sans-serif;/* body */
  --dash-mono:   'JetBrains Mono', monospace;

  /* Parchment light palette */
  --bg-base:  oklch(0.965 0.012 75);
  --bg-tint:  oklch(0.94  0.018 70);
  --bg-deep:  oklch(0.90  0.022 65);

  --d-ink:   oklch(0.22 0.02 60);
  --d-ink-2: oklch(0.36 0.018 60);
  --d-ink-3: oklch(0.52 0.014 60);
  --d-ink-4: oklch(0.70 0.010 60);

  --d-line:  oklch(0.22 0.02 60 / 0.10);

  /* Glassmorphic card */
  --glass-bg:     oklch(1 0 0 / 0.55);
  --glass-shadow: 0 1px 0 oklch(1 0 0 / 0.6) inset,
                  0 12px 40px oklch(0.22 0.02 60 / 0.10);
  --glass-blur:   22px;

  /* Accent */
  --oxblood:   oklch(0.42 0.12 25);   /* deep terracotta red */
  --brass:     oklch(0.74 0.10 80);   /* warm gold */
  --sage:      oklch(0.62 0.07 155);  /* muted green */

  /* Layout */
  --sidebar-w: 232px;
  --topbar-h: 64px;
}
```

### 3.3 Component Patterns

**Glass card (dashboard):**
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid oklch(1 0 0 / 0.55);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  border-radius: 22px;
}
```

**Status pill color mapping:**

| Status | Class |
|---|---|
| CONFIRMED | `pill pill-brass` |
| CHECKED_IN | `pill pill-blue` |
| IN_PROGRESS | `pill pill-red` |
| READY | `pill pill-green` |
| COMPLETED | `pill pill-gray` |
| CANCELLED | `pill pill-red` |
| NO_SHOW | `pill pill-red` |
| REQUESTED | `pill pill-gray` |

**Input fields:** use className `d-input` — styled in `globals.css`.
**Buttons:** `d-btn` (ghost) and `d-btn d-btn-primary` (oxblood fill).

---

## 4. File Structure

```
glasshound-saas/
├── docs/
│   └── glasshound-implementation-guide.md  ← this file
├── ops/
│   └── Caddyfile
├── prisma/
│   ├── schema.prisma       ← COMPLETE, do not modify
│   └── seed.ts             ← Nina's Pet Salon demo data
├── prototypes/
│   └── claude-design-export/   ← reference only
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← root layout (fonts via @import in globals.css)
│   │   ├── globals.css             ← ALL design tokens + component classes
│   │   ├── page.tsx                ← full marketing page ("use client")
│   │   ├── login/page.tsx          ← login form (client, fetch to /api/auth/login)
│   │   ├── register/page.tsx       ← signup + salon onboarding
│   │   ├── developers/page.tsx     ← interactive API docs with sidebar nav
│   │   ├── app/
│   │   │   ├── layout.tsx          ← dashboard shell: DashSidebar + main ("use client")
│   │   │   ├── page.tsx            ← redirect → /app/today
│   │   │   ├── today/page.tsx      ← server component (KPIs, run-of-show, alerts)
│   │   │   ├── calendar/page.tsx   ← server component (week grid)
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx        ← searchable client list (server)
│   │   │   │   └── [id]/page.tsx   ← client detail (server)
│   │   │   ├── animals/
│   │   │   │   ├── page.tsx        ← card grid with allergy/behavior chips (server)
│   │   │   │   └── [id]/page.tsx   ← animal profile (server)
│   │   │   ├── services/page.tsx   ← static demo table + modal ("use client")
│   │   │   ├── bookings/page.tsx   ← paginated appointment list (server)
│   │   │   ├── money/page.tsx      ← invoice list + revenue KPIs (server)
│   │   │   ├── notes/page.tsx      ← filterable care note feed (server)
│   │   │   └── rebooking/page.tsx  ← overdue animals + due-this-week (server)
│   │   └── api/
│   │       ├── health/route.ts             ← GET, pings DB
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── register/route.ts
│   │       └── v1/
│   │           ├── me/route.ts
│   │           ├── clients/route.ts        ← GET, POST
│   │           ├── clients/[id]/route.ts   ← GET, PATCH, DELETE
│   │           ├── animals/route.ts        ← GET, POST
│   │           ├── animals/[id]/route.ts   ← GET, PATCH
│   │           ├── services/route.ts       ← GET
│   │           ├── appointments/route.ts   ← GET, POST (real Prisma + conflict check)
│   │           ├── appointments/[id]/
│   │           │   ├── route.ts            ← GET, PATCH
│   │           │   ├── cancel/route.ts     ← POST
│   │           │   ├── reschedule/route.ts ← POST (conflict check)
│   │           │   └── status/route.ts     ← PATCH
│   │           ├── availability/route.ts   ← GET (Prisma-backed, real business hours)
│   │           ├── notes/route.ts          ← GET, POST
│   │           ├── webhook-endpoints/route.ts ← GET, POST (HMAC signing secret)
│   │           └── openapi/route.ts        ← GET (OpenAPI JSON)
│   ├── domain/
│   │   ├── availability.ts     ← COMPLETE — slot computation engine
│   │   └── availability.test.ts
│   ├── lib/
│   │   ├── session.ts          ← iron-session config (uses SessionOptions, NOT IronSessionOptions)
│   │   ├── tenant.ts           ← getTenantCtx() + requireTenantCtx()
│   │   ├── api-auth.ts         ← resolveApiKey(), apiError(), requireScope(), paginate()
│   │   ├── openapi.ts          ← OpenAPI spec generator
│   │   ├── navigation.ts       ← dashboard tab definitions
│   │   └── demo-data.ts        ← legacy fallback constants (mostly unused now)
│   ├── server/
│   │   ├── db.ts               ← Prisma client singleton (exports both `prisma` AND `db`)
│   │   └── actions/
│   │       ├── appointments.ts ← createAppointment, updateAppointmentStatus
│   │       ├── clients.ts      ← upsertClient, deleteClient
│   │       ├── animals.ts      ← upsertAnimal
│   │       ├── services.ts     ← upsertService, toggleServiceActive
│   │       └── notes.ts        ← createNote, deleteNote
│   └── worker/
│       └── index.ts            ← BullMQ webhook delivery + rebooking check workers
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── package.json
├── prisma/schema.prisma
└── tsconfig.json
```

---

## 5. Auth & Sessions

### 5.1 Session library

**Package:** `iron-session` v8
**IMPORTANT:** iron-session v8 renamed `IronSessionOptions` → `SessionOptions`. Use `SessionOptions`.
**IMPORTANT:** The `/edge` sub-path (`iron-session/edge`) no longer exists in v8. Middleware uses `unsealData` directly.

```typescript
// src/lib/session.ts — correct v8 types
import type { SessionOptions } from "iron-session";  // ← NOT IronSessionOptions

export interface SessionData {
  userId:   string;
  tenantId: string;
  role:     "OWNER" | "MANAGER" | "STAFF" | "READONLY";
  name:     string;
  email:    string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "development-secret-please-change-in-production-32ch",
  cookieName: "gh_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};
```

### 5.2 Route protection (middleware.ts)

Iron-session v8 no longer has an edge-compatible `getIronSession`. Use `unsealData`:

```typescript
// src/middleware.ts
import { unsealData } from "iron-session";
import { sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/app")) {
    const cookieValue = request.cookies.get(sessionOptions.cookieName)?.value;
    if (!cookieValue) return redirect("/login");
    try {
      const session = await unsealData(cookieValue, { password: sessionOptions.password as string });
      if (!(session as any).userId) return redirect("/login");
    } catch { return redirect("/login"); }
  }
  return NextResponse.next();
}
```

### 5.3 Server component session access

```typescript
// src/lib/tenant.ts — used in every server component and action
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";  // ← fine in server context

export async function getTenantCtx(): Promise<TenantCtx | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.userId || !session.tenantId) return null;
  return { userId: session.userId, tenantId: session.tenantId, role: session.role, name: session.name, email: session.email };
}

export async function requireTenantCtx(): Promise<TenantCtx> {
  const ctx = await getTenantCtx();
  if (!ctx) throw new Error("Unauthenticated");
  return ctx;
}
```

---

## 6. Multi-Tenancy Rules

**CRITICAL:** Every database query must include `tenantId` from the session. Never trust client-provided tenant IDs.

```typescript
// ✅ Correct — tenantId always from session
const ctx = await getTenantCtx();
const clients = await db.client.findMany({ where: { tenantId: ctx.tenantId } });

// ❌ Wrong — never read tenantId from request body or URL
const clients = await db.client.findMany({ where: { tenantId: req.body.tenantId } });
```

**API v1 tenant resolver:** `resolveApiKey(request)` in `src/lib/api-auth.ts` — resolves tenant from Bearer token prefix/secret. The `db` singleton exports both `prisma` and `db` (same object) to support both naming conventions.

**Scope enforcement pattern:**
```typescript
// requireScope returns NextResponse | undefined — always check the return value
const err = requireScope(auth, "clients:read");
if (err) return err;
```

---

## 7. Dashboard Tab Specs

All routes are server components except `services/page.tsx` (client for modal state) and `layout.tsx` (client for `usePathname`).

### Pattern used in every server component

```typescript
const ctx = await getTenantCtx();
if (!ctx) redirect("/login");
// then query: db.modelName.findMany({ where: { tenantId: ctx.tenantId }, ... })
```

### Tab inventory

| Tab | Route | Server/Client | Data |
|---|---|---|---|
| Today | `/app/today` | Server | Appointments today, tenant KPIs, rebooking alerts, unpaid invoices |
| Calendar | `/app/calendar` | Server | Current week Mon–Sun, grouped by day |
| Bookings | `/app/bookings` | Server | Paginated appointment list, filter by status |
| Rebooking | `/app/rebooking` | Server | Animals past cadence, due this week |
| Clients | `/app/clients` | Server | Searchable list + tier badges |
| Clients detail | `/app/clients/[id]` | Server | Profile + animals + appointments + notes |
| Animals | `/app/animals` | Server | Card grid + allergy/behavior chips |
| Animals detail | `/app/animals/[id]` | Server | Full profile + history + care notes |
| Services | `/app/services` | Client | Hardcoded demo table + modal (not yet DB-backed) |
| Money | `/app/money` | Server | Invoice list + revenue KPIs |
| Notes | `/app/notes` | Server | Filterable note feed |

---

## 8. n8n REST API — Complete Spec

Base URL: `https://yourdomain.com/api/v1`
Authentication: `Authorization: Bearer <api_key_token>`
All responses: `{ data: ..., meta?: { page, pageSize, total, pages } }`
All errors: `{ error: "message", status: 4xx, details?: {...} }`

### Endpoints implemented

| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | `/api/v1/me` | any | Returns tenant info + scopes |
| GET | `/api/v1/availability` | any | Prisma-backed, real business hours |
| GET | `/api/v1/services` | `appointments:read` | Active services only |
| GET, POST | `/api/v1/appointments` | `appointments:read/write` | Real conflict check on POST |
| GET, PATCH | `/api/v1/appointments/:id` | `appointments:read/write` | |
| POST | `/api/v1/appointments/:id/cancel` | `appointments:write` | Sets CANCELLED |
| POST | `/api/v1/appointments/:id/reschedule` | `appointments:write` | Conflict check |
| PATCH | `/api/v1/appointments/:id/status` | `appointments:write` | CONFIRMED→COMPLETED flow |
| GET, POST | `/api/v1/clients` | `clients:read/write` | |
| GET, PATCH, DELETE | `/api/v1/clients/:id` | `clients:read/write` | |
| GET, POST | `/api/v1/animals` | `animals:read/write` | |
| GET, PATCH | `/api/v1/animals/:id` | `animals:read/write` | |
| GET, POST | `/api/v1/notes` | `appointments:read/write` | GroomingNote model |
| GET, POST | `/api/v1/webhook-endpoints` | `webhooks:read/write` | Returns one-time signingSecret on POST |
| GET | `/api/v1/openapi` | none | OpenAPI JSON spec |

### Availability endpoint

```
GET /api/v1/availability?serviceId=svc_abc&date=2025-06-15

Response:
{
  "data": {
    "date": "2025-06-15",
    "serviceId": "svc_abc",
    "timezone": "America/Los_Angeles",
    "slots": [
      { "startsAt": "2025-06-15T16:00:00.000Z", "endsAt": "2025-06-15T17:30:00.000Z" },
      ...
    ]
  }
}
```

Algorithm: reads `tenant.businessHours` (JSON field keyed by JS day-of-week 0–6) → fetches existing appointments + blocked windows → calls `computeAvailability()` in `src/domain/availability.ts`.

---

## 9. Webhook System

### 9.1 Event list

| Event | Triggered by |
|---|---|
| `appointment.created` | New appointment booked |
| `appointment.rescheduled` | Time changed |
| `appointment.cancelled` | Status → CANCELLED |
| `appointment.completed` | Status → COMPLETED |
| `rebooking.due` | Worker job: animal past cadence |

### 9.2 Payload format

```json
{
  "event": "appointment.created",
  "tenantId": "ten_...",
  "timestamp": "2026-05-08T22:15:00.000Z",
  "data": { "appointmentId": "...", "animalId": "...", "clientId": "...", "startsAt": "..." }
}
```

### 9.3 Signature

```
X-Glasshound-Signature: sha256=<HMAC-SHA256(timestamp + "." + rawBody, signingSecret)>
X-Glasshound-Timestamp: 1715000000000
```

### 9.4 Retry policy (BullMQ worker)

Delays: 1m → 5m → 15m → 1h → 4h → 24h (6 total attempts)

---

## 10. Availability Engine

Source: `src/domain/availability.ts` — **complete, do not rewrite.**

```typescript
export function computeAvailability(opts: {
  from: Date; to: Date;
  slotMinutes: number; stepMinutes: number;
  openWindows: { startsAt: Date; endsAt: Date }[];
  busyWindows:  { startsAt: Date; endsAt: Date }[];
}): { startsAt: Date; endsAt: Date }[]
```

The availability API route at `src/app/api/v1/availability/route.ts` wraps this with Prisma-backed business hours, appointments, and blocked time. Business hours are stored as:
```json
{ "1": {"open":"09:00","close":"17:00"}, "2": {...}, "0": null }
```
Where keys are JS day-of-week strings (0 = Sunday) and `null` = closed.

---

## 11. Docker Deployment

### One-command setup

```bash
cp .env.example .env
# Edit .env: SESSION_SECRET (32+ chars), POSTGRES_PASSWORD, APP_DOMAIN
docker compose up -d
docker compose exec web npx prisma migrate deploy
docker compose exec web npm run seed
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres URL |
| `REDIS_URL` | Yes | Redis URL |
| `SESSION_SECRET` | Yes | 32+ char random string |
| `APP_URL` | Yes | `https://app.yourdomain.com` |
| `APP_DOMAIN` | Yes | Domain for Caddy |
| `S3_ENDPOINT` | Compose | MinIO endpoint |
| `S3_BUCKET` | Compose | `glasshound-assets` |
| `S3_ACCESS_KEY_ID` | Compose | MinIO user |
| `S3_SECRET_ACCESS_KEY` | Compose | MinIO password |

---

## 12. Sprint Checklist

### Sprint 0: Foundation ✅ COMPLETE
- [x] Next.js 16 + TypeScript scaffold
- [x] Docker Compose: postgres, redis, minio, web, worker, caddy
- [x] Prisma schema (all 12 models)
- [x] Seed: Nina's Pet Salon demo tenant
- [x] Health route: `GET /api/health`
- [x] Availability engine: `src/domain/availability.ts`

### Sprint 1: Auth ✅ COMPLETE
- [x] `src/lib/session.ts` — iron-session v8 config (`SessionOptions`, not `IronSessionOptions`)
- [x] `src/middleware.ts` — protect /app/* with `unsealData` (not iron-session/edge)
- [x] `POST /api/auth/login`
- [x] `POST /api/auth/logout`
- [x] `POST /api/auth/register` — creates User + Tenant + Membership in transaction
- [x] `src/app/login/page.tsx`
- [x] `src/app/register/page.tsx`
- [x] `src/lib/tenant.ts` — `getTenantCtx()` + `requireTenantCtx()`

### Sprint 2: Design System + Dashboard Shell ✅ COMPLETE
- [x] `src/app/globals.css` — merged marketing + dashboard tokens, all component classes
- [x] `src/app/layout.tsx` — fonts loaded via @import
- [x] `src/app/page.tsx` — full marketing page matching prototype
- [x] `src/app/app/layout.tsx` — sidebar (9 tabs) + topbar, logout
- [x] `src/app/app/page.tsx` — redirect to /app/today

### Sprint 3: Clients, Animals, Services, Notes ✅ COMPLETE
- [x] `src/server/actions/clients.ts`
- [x] `src/server/actions/animals.ts`
- [x] `src/server/actions/services.ts`
- [x] `src/server/actions/notes.ts`
- [x] `/app/clients` — searchable list
- [x] `/app/clients/[id]` — full client detail
- [x] `/app/animals` — card grid with chips
- [x] `/app/animals/[id]` — animal profile + care notes
- [x] `/app/services` — table + new-service modal (client component, demo data — not yet DB-backed)
- [x] `/app/notes` — filterable feed

### Sprint 4: Calendar, Availability, Booking ✅ COMPLETE
- [x] `src/server/actions/appointments.ts`
- [x] `/app/today` — KPIs, run-of-show, rebooking alerts, invoice count
- [x] `/app/calendar` — 7-column week view, today highlighted
- [x] `/app/rebooking` — overdue animals + due-this-week panel
- [x] `GET /api/v1/availability` — real Prisma-backed route

### Sprint 5: n8n API + Webhooks ✅ COMPLETE
- [x] `src/lib/api-auth.ts` — `resolveApiKey()`, `apiError()`, `requireScope()`, `paginate()`
- [x] `GET /api/v1/me`
- [x] `GET+POST /api/v1/clients` + `/clients/[id]` (GET, PATCH, DELETE)
- [x] `GET+POST /api/v1/animals` + `/animals/[id]` (GET, PATCH)
- [x] `GET /api/v1/services`
- [x] `GET+POST /api/v1/appointments` + `[id]` (GET, PATCH, cancel, reschedule, status)
- [x] `GET+POST /api/v1/notes`
- [x] `GET+POST /api/v1/webhook-endpoints`
- [x] `GET /api/v1/openapi`
- [x] BullMQ webhook delivery worker (`src/worker/index.ts`)
- [x] HMAC signing on webhook delivery
- [x] `/developers` — interactive API docs page with n8n guide

### Sprint 6: Money + Invoices ✅ COMPLETE
- [x] `/app/money` — invoice list + monthly/yearly revenue KPIs (Prisma-backed)
- [x] `/app/bookings` — full appointment ledger (filter, paginate, source badges)
- [x] `src/server/actions/invoices.ts` — createInvoice, sendInvoice, markInvoicePaid, voidInvoice
- [x] `GET+POST /api/v1/invoices` + `/invoices/[id]` (GET, PATCH status/paidAt/issuedAt)
- [x] `src/server/actions/booking.ts` — fetchServicesForBooking, fetchClientsWithAnimals, fetchAvailableSlots
- [x] `src/components/BookingModal.tsx` — 4-step booking modal (service→slot→client→confirm)

### Sprint 7: Polish + Wiring 🔶 PARTIAL
- [x] Marketing page matching prototype aesthetic
- [x] `/developers` — full API reference with code copy, n8n guide
- [x] `/app/services` — Prisma-backed, toggle active, create/edit modal wired to upsertService
- [x] `/app/calendar` — "New booking" button opens BookingModal with real services + availability
- [x] `/app/today` — StatusChanger component for CONFIRMED→CHECKED_IN→IN_PROGRESS→READY→COMPLETED
- [x] `/app/settings` — API key management (generate, revoke, scopes selection, one-time token display)
- [x] `/app/money` — "New invoice" modal (client/animal/line-items/tax/due-date), Send / Mark paid / Void row actions
- [x] `/app/bookings` — weekly revenue bar chart (8-week CSS bars), "New booking" button wired to BookingModal
- [ ] Post-register onboarding wizard (set hours, add first service)
- [ ] Client-visible note email preview

### Sprint 8: Hardening 🔶 PARTIAL
- [x] Rate limiting on `/api/v1/*` — Redis sliding window, 100 req/min per API key (`src/lib/ratelimit.ts`), wired to appointments + clients routes; apply `const rl = await checkRateLimit(auth.keyId); if (rl) return rl;` to add to any other route
- [x] AuditLog writes — `src/lib/audit.ts` `writeAudit()` helper (best-effort, never throws); wired to appointment.created, appointment.status_changed, invoice.created, invoice.paid
- [x] CSP + security headers in `next.config.ts` — Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- [x] Redis singleton — `src/lib/redis.ts`, ioredis with lazy connect + fail-open on timeout
- [x] `/app/onboarding` — 3-step wizard: set business hours (interactive toggle grid), add first service, done screen; new accounts redirect here from register
- [x] businessHours format fixed in register route — now uses numeric keys `{"0": null, "1": {open,close}, ...}` matching the availability engine
- [x] DashSidebar extracted to `src/components/DashSidebar.tsx` — dynamic name/role from session, Settings link added
- [x] Layout refactored to server component — fetches session, passes name+role to DashSidebar
- [ ] Tenant-isolation integration tests
- [ ] Webhook retry tests
- [ ] Docker smoke test script
- [ ] Prisma migrations workflow

---

## 13. Seeded Demo Data

**Tenant:** Nina's Pet Salon
- Slug: `ninas-pet-salon`
- Timezone: `America/Los_Angeles`
- Business hours: Mon–Fri 09:00–17:00, Sat 09:00–14:00, Sun closed

**Login:** `nina@example.com` / `demo-password` (OWNER role)

**Services:**
| Name | Duration | Price | Buffer |
|---|---|---|---|
| Full Groom | 90 min | $75 | 15 min |
| Bath & Brush | 60 min | $55 | 10 min |
| Nail Trim | 20 min | $15 | 5 min |
| Cat Groom | 75 min | $85 | 15 min |

**Clients:** See `prisma/seed.ts` for full demo dataset including Atlas (Bernese Mountain Dog), Biscuit (Golden Retriever), and others.

---

## 14. AI Pickup Prompt

> **Copy-paste the block below into any new coding agent to onboard it instantly.**
> Keep it updated as sprints complete.

---

```
You are picking up development on Glasshound — a multi-tenant pet grooming SaaS.
Read this entire block before writing any code.

## Project
- Next.js 16 App Router + TypeScript + Prisma + PostgreSQL + Redis + BullMQ + MinIO + Caddy
- All in Docker Compose (docker-compose.yml at root)
- Working directory: the repo root (package.json at root)
- Build command: `npm run build` (runs `prisma generate && next build`)
- The build MUST pass with zero type errors before you finish. Run it and fix all errors.

## What exists and works (build passes, 38 routes)
Sprints 0–7 are largely complete:
- Auth: iron-session v8, login/logout/register, session middleware via unsealData
- Dashboard shell: sidebar (9 tabs + Settings), topbar, all page routes render
- All dashboard tabs implemented as server components with real Prisma queries
- Full REST API: /api/v1/* — me, availability, appointments (CRUD+cancel+reschedule+status),
  clients (CRUD), animals (CRUD), services, notes, webhook-endpoints, invoices (CRUD), openapi
- BullMQ worker for webhook delivery with HMAC signing
- Marketing page + Interactive /developers API docs page
- BookingModal (4-step: service→slot→client→confirm) wired to availability engine + createAppointment
- /app/services — Prisma-backed, toggle, create/edit modal via upsertService
- /app/calendar — "New booking" button opens BookingModal
- /app/today — StatusChanger component (CONFIRMED→CHECKED_IN→IN_PROGRESS→READY→COMPLETED)
- /app/settings — API key management (generate with scopes, revoke, one-time token display)
- Server actions: appointments, clients, animals, services, notes, invoices, booking, apikeys

## Known issues / things NOT wired up yet
- /app/money "New invoice" and "Mark paid" buttons exist but are not wired to server actions
- /app/bookings has no revenue chart (currently just a table)
- No post-register onboarding wizard
- No rate limiting on /api/v1/* (Sprint 8)
- No AuditLog writes (model exists in schema but no code writes to it — Sprint 8)
- /app/today and /app/calendar "New booking" button: works but doesn't pre-fill date from calendar cell

## Critical conventions — read before writing any code

### Database
- Always import: `import { db } from "@/server/db"` (NOT `prisma` — both are exported but `db` is the alias)
- Every query MUST include tenantId from session — NEVER from request body/URL params
- Prisma schema is at prisma/schema.prisma — do not modify it

### Auth
- Session library: iron-session v8. Import type is `SessionOptions` (NOT `IronSessionOptions`)
- Server components: `const ctx = await getTenantCtx(); if (!ctx) redirect("/login");`
- Server actions: `const ctx = await requireTenantCtx();` (throws if unauthenticated)
- Middleware: uses `unsealData` from iron-session (NOT `getIronSession` from iron-session/edge — that subpath doesn't exist)

### API routes
- `resolveApiKey(req)` returns `ApiCtx | null`
- `requireScope(auth, "scope")` returns `NextResponse | undefined` — check return: `const e = requireScope(auth, "scope"); if (e) return e;`
- `paginate(req)` returns `{ skip, take, page, pageSize }` from URL query params
- All error responses: `apiError("message", statusCode, optionalDetails?)`
- All success responses: `NextResponse.json({ data: ... })` or `{ data, meta }` for lists

### Client components that call server actions
- Use `useTransition` + `startTransition(async () => { await serverAction(); })` pattern
- After mutations that need fresh server data, call `router.refresh()` (from `useRouter`)
- "use client" components can be co-located with page.tsx or in src/components/
- Split pages into: page.tsx (server, fetches data) + XxxClient.tsx (client, handles state)

### API key format
- `src/server/actions/apikeys.ts` — createApiKey(name, scopes), revokeApiKey(id)
- Token format: `glas_<16hex>_<40hex>` — prefix stored, secret hashed with sha256
- resolveApiKey splits on last underscore to extract prefix + secret

### TypeScript gotchas in this codebase
- Prisma Json fields need `as never` cast: `{ lineItems: data.lineItems as never }`
- z.record requires 2 args: `z.record(z.string(), z.unknown())`
- Status enums passed to Prisma: use `as never` or cast to the exact Prisma type
- updateAppointmentStatus(raw: unknown) — pass object: `{ id, status, reason? }`

### Styling
- Dashboard components use inline styles with CSS vars (--oxblood, --d-ink, --d-line, --glass-bg, etc.)
- All CSS vars and component classes (.glass-card, .pill, .pill-*, .d-btn, .topbar, .sidebar, etc.) are defined in src/app/globals.css
- Do NOT create new CSS files — extend globals.css or use inline styles
- Fonts are loaded via @import in globals.css (not next/font)
- Dashboard serif: var(--dash-serif) = Fraunces, mono: var(--dash-mono) = JetBrains Mono

## What to work on next (Sprint 8)
Sprint 7 is essentially complete. Remaining items:
1. Post-register onboarding wizard (set business hours, add first service, generate first API key)
2. Client-visible note email preview
3. Sprint 8 hardening: rate limiting on /api/v1/* (Redis), AuditLog writes, tenant-isolation integration tests, CSP headers in next.config.ts, Prisma migrations workflow

## New components written (reference)
- src/components/BookingModal.tsx        — 4-step booking modal (service→slot→client→confirm)
- src/components/CalendarActions.tsx     — "New booking" button + modal (use in any server page)
- src/components/StatusChanger.tsx       — status advance buttons for today's run-of-show
- src/components/WeeklyRevenueChart.tsx  — 8-week CSS bar chart (receives { week, revenue }[] from server)
- src/app/app/services/ServicesClient.tsx  — toggle active, create/edit service modal
- src/app/app/money/MoneyClient.tsx        — new invoice modal + Send/Mark paid/Void row actions
- src/app/app/settings/SettingsClient.tsx  — generate API key (scopes), revoke, one-time token display

## Repo structure (key files)
src/lib/session.ts          — iron-session config
src/lib/tenant.ts           — getTenantCtx, requireTenantCtx
src/lib/api-auth.ts         — resolveApiKey, apiError, requireScope, paginate
src/server/db.ts            — Prisma singleton (exports `db` and `prisma`)
src/domain/availability.ts  — slot computation engine (DO NOT MODIFY)
prisma/schema.prisma        — complete schema (DO NOT MODIFY)
prisma/seed.ts              — Nina's Pet Salon demo data
src/app/globals.css         — all CSS tokens and component classes
docs/glasshound-implementation-guide.md — this document (update sprints when done)

## Demo credentials
URL: http://localhost:3000 (or Docker: http://localhost:8080)
Login: nina@example.com / demo-password
```

---

*End of Glasshound Implementation Reference.*
*Update Section 12 (Sprint Checklist) as each item is completed.*
*Update Section 14 (AI Pickup Prompt) to reflect current state before ending a session.*
