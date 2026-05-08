# Glasshound SaaS — Complete Implementation Reference

> **AI-readable project guide.** Last updated: 2026-05-08.
> Any AI assistant can pick up this document and continue the project from any sprint.
> Follow the checklists in order. Every architectural decision is documented with its WHY.

---

## Table of Contents

1. [Project Mission](#1-project-mission)
2. [Architecture Overview](#2-architecture-overview)
3. [Design System](#3-design-system)
4. [File Structure](#4-file-structure)
5. [Auth & Sessions](#5-auth--sessions)
6. [Multi-Tenancy Rules](#6-multi-tenancy-rules)
7. [Dashboard: Tab Specs](#7-dashboard-tab-specs)
8. [n8n REST API — Complete Spec](#8-n8n-rest-api--complete-spec)
9. [Webhook System](#9-webhook-system)
10. [Availability Engine](#10-availability-engine)
11. [Docker Deployment](#11-docker-deployment)
12. [Sprint Checklist](#12-sprint-checklist)
13. [Seeded Demo Data](#13-seeded-demo-data)

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
  └── /developers      API docs

BullMQ Worker (worker container)
  └── webhook delivery, reminder scheduling

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

### 3.1 Marketing Surface (`home-styles.css` reference)

```css
:root {
  --bg:        #fbeee4;   /* warm peach */
  --bg-2:      #f8e3d2;
  --surface:   #ffffff;
  --surface-2: #f7f5f1;
  --line:      #ececec;
  --line-2:    #dedede;

  --ink:       #161616;
  --ink-2:     #3a3a3a;
  --ink-3:     #6e6e6e;
  --ink-4:     #a3a3a3;

  --acc:       #ff5a1f;   /* orange accent — primary CTA */
  --acc-2:     #e64a0e;
  --acc-soft:  #ffe9dd;
  --acc-tint:  #fff4ec;

  /* Pet color chips */
  --c-blue:    #b9e3f5;
  --c-mint:    #c5e8c8;
  --c-yellow:  #ffe6a8;
  --c-pink:    #f9c8c8;
  --c-lilac:   #d8c8ec;
  --c-coral:   #ffd0bb;

  --ok:        #2f6b3a;   /* success green */

  --sans:    'Plus Jakarta Sans', system-ui, sans-serif;
  --display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --serif:   'Instrument Serif', Georgia, serif;
  --mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

### 3.2 Dashboard Surface (`pets-styles.css` reference)

```css
:root {
  --serif:  'Fraunces', Georgia, serif;          /* headings */
  --sans:   'Inter Tight', system-ui, sans-serif;/* body */
  --mono:   'JetBrains Mono', monospace;

  /* Parchment light palette */
  --bg-base:  oklch(0.965 0.012 75);
  --bg-tint:  oklch(0.94  0.018 70);
  --bg-deep:  oklch(0.90  0.022 65);

  --ink:   oklch(0.22 0.02 60);
  --ink-2: oklch(0.36 0.018 60);
  --ink-3: oklch(0.52 0.014 60);
  --ink-4: oklch(0.70 0.010 60);

  --line:  oklch(0.22 0.02 60 / 0.10);
  --line-2:oklch(0.22 0.02 60 / 0.18);

  /* Glassmorphic card style */
  --glass-bg:     oklch(1 0 0 / 0.55);
  --glass-stroke: oklch(1 0 0 / 0.55);
  --glass-shadow: 0 1px 0 oklch(1 0 0 / 0.6) inset,
                  0 12px 40px oklch(0.22 0.02 60 / 0.10),
                  0 1px 2px  oklch(0.22 0.02 60 / 0.05);
  --glass-blur:   22px;

  /* Accent */
  --oxblood:   oklch(0.42 0.12 25);   /* deep terracotta red */
  --oxblood-2: oklch(0.52 0.13 25);
  --brass:     oklch(0.74 0.10 80);   /* warm gold */
  --sage:      oklch(0.62 0.07 155);  /* muted green */

  /* Layout */
  --radius: 14px;
  --radius-sm: 10px;
  --radius-lg: 22px;
  --sidebar-w: 232px;
  --topbar-h: 64px;
}
```

### 3.3 Typography

| Role | Font | Weight | Usage |
|---|---|---|---|
| Display / headings | Plus Jakarta Sans (mkt) / Fraunces (dash) | 700–800 | H1, H2, card titles |
| Body | Plus Jakarta Sans (mkt) / Inter Tight (dash) | 400–600 | All body copy |
| Serif emphasis | Instrument Serif (mkt) | 400 italic | `<em>` in headlines |
| Mono | JetBrains Mono | 400–500 | Code, times, IDs |

### 3.4 Component Patterns

**Glass card (dashboard):**
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-stroke);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius-lg);
  padding: var(--pad-card, 20px);
}
```

**Pill / status badge:**
```css
.pill { border-radius: 999px; padding: 3px 10px; font-size: 11.5px; font-weight: 700; }
.pill-green  { background: oklch(0.62 0.07 155 / 0.15); color: oklch(0.40 0.09 155); }
.pill-red    { background: oklch(0.42 0.12 25  / 0.12); color: var(--oxblood); }
.pill-brass  { background: oklch(0.74 0.10 80  / 0.15); color: oklch(0.50 0.10 80);  }
.pill-gray   { background: var(--line); color: var(--ink-3); }
```

**Appointment status → pill color mapping:**
| Status | Color |
|---|---|
| CONFIRMED | brass |
| CHECKED_IN | blue |
| IN_PROGRESS | oxblood (active) |
| READY | green |
| COMPLETED | gray |
| CANCELLED | red |
| NO_SHOW | red |
| REQUESTED | gray |

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
│   └── claude-design-export/   ← reference only, not in Docker build
├── scripts/
│   ├── bootstrap           ← first-run setup
│   ├── seed-demo           ← re-seed demo tenant
│   ├── backup              ← Postgres + MinIO backup
│   └── restore             ← restore from backup
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← root layout, Google Fonts
│   │   ├── globals.css             ← shared design tokens
│   │   ├── page.tsx                ← marketing page
│   │   ├── login/page.tsx          ← login form
│   │   ├── register/page.tsx       ← signup + salon onboarding
│   │   ├── developers/page.tsx     ← API docs, OpenAPI viewer
│   │   ├── app/
│   │   │   ├── layout.tsx          ← dashboard shell (sidebar + topbar)
│   │   │   ├── page.tsx            ← redirect → /app/today
│   │   │   ├── today/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx        ← client list + search
│   │   │   │   └── [id]/page.tsx   ← client detail
│   │   │   ├── animals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── money/page.tsx
│   │   │   ├── notes/page.tsx
│   │   │   └── rebooking/page.tsx
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   └── register/route.ts
│   │       └── v1/
│   │           ├── me/route.ts
│   │           ├── clients/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── animals/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── services/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           ├── appointments/
│   │           │   ├── route.ts
│   │           │   ├── [id]/
│   │           │   │   ├── route.ts
│   │           │   │   ├── cancel/route.ts
│   │           │   │   ├── reschedule/route.ts
│   │           │   │   └── status/route.ts
│   │           ├── availability/route.ts
│   │           ├── notes/route.ts
│   │           ├── invoices/route.ts
│   │           └── webhook-endpoints/route.ts
│   ├── components/
│   │   ├── BrandMark.tsx
│   │   └── StatusPill.tsx
│   ├── domain/
│   │   ├── availability.ts     ← COMPLETE: slot computation engine
│   │   └── availability.test.ts
│   ├── lib/
│   │   ├── session.ts          ← iron-session config
│   │   ├── tenant.ts           ← tenant context resolver
│   │   ├── api-auth.ts         ← Bearer token validation
│   │   ├── openapi.ts          ← OpenAPI spec generator
│   │   ├── navigation.ts       ← dashboard tab list
│   │   └── demo-data.ts        ← fallback demo constants
│   ├── server/
│   │   ├── db.ts               ← Prisma client singleton
│   │   └── actions/
│   │       ├── appointments.ts
│   │       ├── clients.ts
│   │       ├── animals.ts
│   │       ├── services.ts
│   │       ├── notes.ts
│   │       └── invoices.ts
│   └── worker/
│       └── index.ts            ← BullMQ worker (webhook delivery)
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

Uses **iron-session** v8 with HTTP-only signed cookies.

**Package:** `iron-session`
**Secret:** `SESSION_SECRET` env var (32+ chars, in `.env`)

```typescript
// src/lib/session.ts
import { IronSessionOptions } from "iron-session";

export interface SessionData {
  userId:   string;
  tenantId: string;
  role:     "OWNER" | "MANAGER" | "STAFF" | "READONLY";
  name:     string;
  email:    string;
}

export const sessionOptions: IronSessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "gh_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,  // 7 days
  },
};
```

### 5.2 Login flow

1. `POST /api/auth/login` with `{ email, password }`
2. Look up `User` by email
3. `bcrypt.compare(password, user.passwordHash)`
4. Find `Membership` for the user (first one for v1 single-tenant users)
5. Create iron-session with `{ userId, tenantId, role, name, email }`
6. Return `{ ok: true }` — client redirects to `/app`

### 5.3 Register flow

1. `POST /api/auth/register` with `{ name, email, password, salonName, timezone }`
2. Check email uniqueness
3. Create `User` with bcrypt-hashed password (cost 12)
4. Create `Tenant` with slug derived from salonName, default theme tokens and business hours
5. Create `Membership` with role `OWNER`
6. Create iron-session → redirect to `/app`

### 5.4 Route protection (middleware.ts)

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session/edge";
import { sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/app")) {
    const session = await getIronSession(request, NextResponse.next(), sessionOptions);
    if (!session.userId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
```

---

## 6. Multi-Tenancy Rules

**CRITICAL:** Every database query must include `tenantId` from the session. Never trust client-provided tenant IDs.

```typescript
// ✅ Correct
const clients = await db.client.findMany({
  where: { tenantId: session.tenantId },
});

// ❌ Wrong — never use a tenantId from the request body or query params
const clients = await db.client.findMany({
  where: { tenantId: req.body.tenantId },
});
```

**Tenant resolver pattern:**
```typescript
// src/lib/tenant.ts
export async function getTenantContext(request: NextRequest): Promise<TenantCtx | null> {
  const session = await getIronSession<SessionData>(request, ...);
  if (!session.userId) return null;
  return { tenantId: session.tenantId, userId: session.userId, role: session.role };
}
```

**API v1 tenant resolver:**
```typescript
// src/lib/api-auth.ts — resolves from Bearer token
export async function resolveApiKey(request: NextRequest): Promise<ApiCtx | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  // token format: gh_<prefix>_<secret>
  const parts = token.split("_");
  if (parts.length < 3) return null;
  const prefix = parts.slice(0, 2).join("_");  // gh_<prefix>
  const secret = parts.slice(2).join("_");
  const key = await db.apiKey.findUnique({ where: { prefix } });
  if (!key || key.revokedAt || (key.expiresAt && key.expiresAt < new Date())) return null;
  const hash = sha256(secret);
  if (hash !== key.hashedSecret) return null;
  return { tenantId: key.tenantId, scopes: key.scopes };
}
```

**Scope enforcement pattern:**
```typescript
function requireScope(ctx: ApiCtx, scope: string) {
  if (!ctx.scopes.includes(scope)) {
    return apiError("forbidden", `Requires scope: ${scope}`, 403);
  }
}
```

---

## 7. Dashboard Tab Specs

All dashboard routes live under `/app/*` and use a shared layout (`src/app/app/layout.tsx`) that renders the sidebar + topbar.

### 7.1 Sidebar navigation

```typescript
const tabs = [
  { key: "today",     label: "Today",     icon: "sun",      href: "/app/today" },
  { key: "calendar",  label: "Calendar",  icon: "calendar", href: "/app/calendar" },
  { key: "bookings",  label: "Bookings",  icon: "chart",    href: "/app/bookings" },
  { key: "rebooking", label: "Rebooking", icon: "refresh",  href: "/app/rebooking", badge: true },
  { key: "clients",   label: "Clients",   icon: "users",    href: "/app/clients" },
  { key: "animals",   label: "Animals",   icon: "paw",      href: "/app/animals" },
  { key: "services",  label: "Services",  icon: "scissors", href: "/app/services" },
  { key: "money",     label: "Money",     icon: "dollar",   href: "/app/money" },
  { key: "notes",     label: "Notes",     icon: "note",     href: "/app/notes" },
];
```

### 7.2 Today tab

Query: `SELECT appointments WHERE tenantId = ? AND DATE(startsAt) = TODAY ORDER BY startsAt`

Panels:
1. **Hero card** — greeting, total pets today, expected revenue, ring progress (completed / total)
2. **Run of show** — sorted appointment rows with status, pet name, service, price, quick status-change buttons
3. **Rebooking alerts** — top 4 animals past cadence, sorted by days overdue
4. **Outstanding invoices** — unpaid invoice count + total

### 7.3 Calendar tab

Default view: 7-day week starting from Monday of current week.
Show appointment blocks in time slots. Click slot → "New booking" side panel.
"New booking" flow: select date → select service → shows available slots (calls availability engine) → select slot → select client → select animal → confirm.

### 7.4 Clients tab

- Searchable by name, phone, email
- List: name, phone, # animals, last visit, tier badge
- Detail page: client info + linked animals + recent appointments + notes

### 7.5 Animals tab

- Searchable by name, breed, owner name
- Cards with: name, species, breed, age, weight, allergy chips, behavior chips, last visit, cadence badge
- Detail page: full profile + grooming history + note feed + attachment gallery

### 7.6 Services tab

- Table: name, duration, price, buffer, active toggle
- Inline edit or modal form
- New service button

### 7.7 Bookings tab

- Weekly bar chart (revenue per day, 8-week lookback)
- Summary table: date, appointment count, revenue, avg ticket
- Filter by service or date range

### 7.8 Money tab

- Invoice list with status pills: DRAFT / SENT / PAID / UNPAID / OVERDUE / VOID
- Summary row: total outstanding, total paid this month
- Click invoice → detail with line items, mark paid / send

### 7.9 Notes tab

- Chronological feed
- Filter by tag: temperament / care / health / general / followup
- Filter by animal or client
- New note button (inline form)

### 7.10 Rebooking tab

- All animals where `(today - lastVisitAt) > preferredCadenceDays`
- Sort by days overdue descending
- Each row: animal name, breed, owner, days overdue, cadence, "Book now" button

---

## 8. n8n REST API — Complete Spec

Base URL: `https://yourdomain.com/api/v1`

Authentication: `Authorization: Bearer gh_<prefix>_<secret>`

All responses are JSON. All errors follow:
```json
{ "error": "error_code", "message": "Human-readable detail" }
```

All list endpoints support `?limit=50&cursor=<id>` pagination.

---

### 8.1 Identity

#### `GET /api/v1/me`
Returns the tenant and API key context.

**Response:**
```json
{
  "tenant": {
    "id": "cld_...",
    "name": "Nina's Pet Salon",
    "slug": "ninas-pet-salon",
    "timezone": "America/Los_Angeles"
  },
  "scopes": ["appointments:read", "appointments:write", "clients:read"]
}
```

---

### 8.2 Clients

#### `GET /api/v1/clients`
**Scope:** `clients:read`
**Query:** `?q=<search>&limit=50&cursor=<id>`

**Response:**
```json
{
  "clients": [
    {
      "id": "cld_...",
      "name": "Marcus Holloway",
      "phone": "(253) 555-0190",
      "email": "marcus@example.com",
      "tier": "Regular",
      "animalCount": 1,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### `POST /api/v1/clients`
**Scope:** `clients:write`

**Body:**
```json
{
  "name": "Sarah Kim",
  "phone": "(206) 555-1234",
  "email": "sarah@example.com",
  "address": "123 Main St, Seattle WA",
  "notes": "Prefers morning slots"
}
```

#### `GET /api/v1/clients/:id`
**Scope:** `clients:read`

#### `PATCH /api/v1/clients/:id`
**Scope:** `clients:write`
Partial update. Returns updated client.

#### `DELETE /api/v1/clients/:id`
**Scope:** `clients:write`
Returns `204 No Content`. Fails with 409 if client has active appointments.

---

### 8.3 Animals

#### `GET /api/v1/animals`
**Scope:** `animals:read`
**Query:** `?clientId=<id>&q=<search>&limit=50&cursor=<id>`

**Response:**
```json
{
  "animals": [
    {
      "id": "anim_...",
      "clientId": "cld_...",
      "name": "Atlas",
      "species": "dog",
      "breed": "Bernese Mountain Dog",
      "sex": "M",
      "dateOfBirth": "2020-06-22",
      "weightLbs": "92.00",
      "allergies": ["Tea-tree"],
      "behaviorFlags": ["Gentle giant", "Owner nearby for nail trim"],
      "preferredCadenceDays": 35,
      "lastVisitAt": "2026-04-22T17:00:00.000Z",
      "careSummary": "Long double coat. Use low-stress dryer ramp-up.",
      "daysSinceLastVisit": 16,
      "dueForRebookIn": 19
    }
  ]
}
```

#### `POST /api/v1/animals`
**Scope:** `animals:write`

**Body:**
```json
{
  "clientId": "cld_...",
  "name": "Mochi",
  "species": "dog",
  "breed": "Shih Tzu",
  "sex": "F",
  "dateOfBirth": "2022-03-15",
  "weightLbs": 12.5,
  "allergies": [],
  "behaviorFlags": ["Anxious around loud dryers"],
  "preferredCadenceDays": 42,
  "careSummary": "Soft coat, needs gentle detangling."
}
```

#### `GET /api/v1/animals/:id`
**Scope:** `animals:read`

#### `PATCH /api/v1/animals/:id`
**Scope:** `animals:write`

---

### 8.4 Services

#### `GET /api/v1/services`
**Scope:** `clients:read` (no dedicated scope — services are public catalog)
**Query:** `?active=true`

**Response:**
```json
{
  "services": [
    {
      "id": "svc_...",
      "name": "Full Groom",
      "description": "Bath, cut, sanitary trim, paw pads, nails, and ears.",
      "durationMinutes": 120,
      "bufferBeforeMinutes": 0,
      "bufferAfterMinutes": 15,
      "priceCents": 9500,
      "priceFormatted": "$95.00",
      "active": true
    }
  ]
}
```

---

### 8.5 Availability

#### `GET /api/v1/availability`
**Scope:** `availability:read`

**Query parameters:**

| Param | Required | Description |
|---|---|---|
| `serviceId` | Yes | Service to book (determines slot duration + buffers) |
| `date` | Yes | Date to check: `YYYY-MM-DD` |
| `staffUserId` | No | Filter by specific staff member |
| `stepMinutes` | No | Slot step size. Default: 15 |

**Response:**
```json
{
  "date": "2026-05-10",
  "timezone": "America/Los_Angeles",
  "service": {
    "id": "svc_...",
    "name": "Full Groom",
    "durationMinutes": 120
  },
  "slots": [
    { "startsAt": "2026-05-10T15:00:00.000Z", "endsAt": "2026-05-10T17:00:00.000Z" },
    { "startsAt": "2026-05-10T15:15:00.000Z", "endsAt": "2026-05-10T17:15:00.000Z" }
  ]
}
```

**Algorithm:** (implemented in `src/domain/availability.ts`)
1. Fetch tenant business hours for the given day (convert from local time to UTC)
2. Fetch all confirmed/in-progress appointments that overlap the day
3. Fetch all AvailabilityBlock records (blocked time, breaks)
4. Build `openWindows` from business hours
5. Build `busyWindows` from appointments + blocks (accounting for service buffer times)
6. Call `computeAvailability({ slotMinutes: service.durationMinutes + service.bufferAfterMinutes, ... })`
7. Return slots in tenant timezone

---

### 8.6 Appointments

#### `GET /api/v1/appointments`
**Scope:** `appointments:read`
**Query:** `?date=YYYY-MM-DD&status=CONFIRMED&animalId=<id>&limit=50&cursor=<id>`

**Response:**
```json
{
  "appointments": [
    {
      "id": "appt_...",
      "tenantId": "ten_...",
      "client": { "id": "...", "name": "Marcus Holloway", "phone": "(253) 555-0190" },
      "animal": { "id": "...", "name": "Atlas", "breed": "Bernese Mountain Dog" },
      "service": { "id": "...", "name": "Full Groom", "durationMinutes": 120, "priceCents": 9500 },
      "staffUserId": null,
      "startsAt": "2026-05-08T16:30:00.000Z",
      "endsAt": "2026-05-08T18:30:00.000Z",
      "status": "CONFIRMED",
      "source": "DASHBOARD",
      "priceCents": 9500,
      "createdAt": "2026-05-01T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### `POST /api/v1/appointments`
**Scope:** `appointments:write`

**Body:**
```json
{
  "clientId": "cld_...",
  "animalId": "anim_...",
  "serviceId": "svc_...",
  "startsAt": "2026-05-10T15:00:00.000Z",
  "staffUserId": null,
  "notes": "Owner will wait in lobby"
}
```

**Validation:**
- `clientId` and `animalId` must belong to the same tenant
- `animalId.clientId` must match `clientId`
- `startsAt` must be a bookable slot (run availability check)
- Reject overlapping appointments unless `bookingRules.allowOverlap = true`
- `endsAt` is computed: `startsAt + service.durationMinutes minutes`

**Side effects:**
- Creates `AuditLog` record
- Queues `appointment.created` webhook event

#### `GET /api/v1/appointments/:id`
**Scope:** `appointments:read`

#### `PATCH /api/v1/appointments/:id`
**Scope:** `appointments:write`
Allowed fields: `startsAt`, `staffUserId`, `priceCents`
Side effects: audit log + webhook `appointment.rescheduled` (if time changes)

#### `POST /api/v1/appointments/:id/cancel`
**Scope:** `appointments:write`

**Body:**
```json
{ "reason": "Client requested cancellation" }
```

- Sets `status = CANCELLED`, `cancellationReason = reason`
- Creates audit log
- Queues `appointment.cancelled` webhook

#### `POST /api/v1/appointments/:id/reschedule`
**Scope:** `appointments:write`

**Body:**
```json
{
  "startsAt": "2026-05-12T14:00:00.000Z",
  "reason": "Client asked to move to Tuesday"
}
```

- Validates the new slot is available
- Updates `startsAt`, `endsAt`, `rescheduleReason`
- Creates audit log
- Queues `appointment.rescheduled` webhook

#### `POST /api/v1/appointments/:id/status`
**Scope:** `appointments:write`

**Body:**
```json
{ "status": "CHECKED_IN" }
```

Valid transitions:
```
CONFIRMED    → CHECKED_IN, CANCELLED, NO_SHOW
CHECKED_IN   → IN_PROGRESS, CANCELLED
IN_PROGRESS  → READY, CANCELLED
READY        → COMPLETED
COMPLETED    → (terminal)
CANCELLED    → (terminal)
NO_SHOW      → (terminal)
```

- Creates audit log
- Queues `appointment.status_changed` webhook
- If `COMPLETED`: updates `animal.lastVisitAt`

---

### 8.7 Grooming Notes

#### `GET /api/v1/notes`
**Scope:** `notes:read`
**Query:** `?animalId=<id>&clientId=<id>&tag=temperament&limit=50&cursor=<id>`

**Response:**
```json
{
  "notes": [
    {
      "id": "note_...",
      "animalId": "anim_...",
      "clientId": "cld_...",
      "appointmentId": null,
      "tag": "temperament",
      "body": "Atlas is calmer when Marcus stays in the lounge.",
      "visibility": "INTERNAL",
      "author": { "id": "usr_...", "name": "Nina Reyes" },
      "createdAt": "2026-04-22T17:30:00.000Z"
    }
  ]
}
```

#### `POST /api/v1/notes`
**Scope:** `notes:write`

**Body:**
```json
{
  "animalId": "anim_...",
  "clientId": "cld_...",
  "appointmentId": null,
  "tag": "care",
  "body": "Used Earthbath shampoo, no reaction.",
  "visibility": "INTERNAL"
}
```

---

### 8.8 Invoices

#### `GET /api/v1/invoices`
**Scope:** `invoices:read`
**Query:** `?status=UNPAID&clientId=<id>&limit=50&cursor=<id>`

#### `POST /api/v1/invoices`
**Scope:** `invoices:write`

**Body:**
```json
{
  "clientId": "cld_...",
  "animalId": "anim_...",
  "appointmentId": "appt_...",
  "lineItems": [
    { "description": "Full Groom", "quantity": 1, "unitCents": 9500 }
  ],
  "taxCents": 0,
  "dueAt": "2026-05-15T00:00:00.000Z"
}
```

---

### 8.9 Webhook Endpoints

#### `GET /api/v1/webhook-endpoints`
**Scope:** `webhooks:manage`

#### `POST /api/v1/webhook-endpoints`
**Scope:** `webhooks:manage`

**Body:**
```json
{
  "url": "https://n8n.yourdomain.com/webhook/glasshound",
  "description": "n8n booking automation",
  "events": [
    "appointment.created",
    "appointment.cancelled",
    "appointment.rescheduled",
    "appointment.status_changed",
    "rebooking.due"
  ]
}
```

**Response includes** a one-time `signingSecret` for HMAC verification. Store it in n8n.

---

## 9. Webhook System

### 9.1 Event list

| Event | Triggered by |
|---|---|
| `appointment.created` | New appointment booked (API or dashboard) |
| `appointment.rescheduled` | Time or date changed |
| `appointment.cancelled` | Status set to CANCELLED |
| `appointment.status_changed` | Any status transition |
| `client.created` | New client added |
| `animal.created` | New animal profile |
| `note.created` | New grooming note |
| `invoice.created` | Invoice created |
| `invoice.status_changed` | Invoice status updated |
| `rebooking.due` | Worker job: animal past cadence (daily check) |

### 9.2 Payload format

```json
{
  "id": "evt_01jhzx...",
  "event": "appointment.created",
  "tenantId": "ten_...",
  "timestamp": "2026-05-08T22:15:00.000Z",
  "data": {
    "appointment": { ... }
  }
}
```

### 9.3 Signature verification

```
X-Glasshound-Signature: sha256=<HMAC-SHA256(signingSecret, rawBody)>
```

**n8n verification (Code node):**
```javascript
const crypto = require('crypto');
const secret = $env.GLASSHOUND_WEBHOOK_SECRET;
const sig = $input.headers['x-glasshound-signature'].replace('sha256=', '');
const computed = crypto.createHmac('sha256', secret).update($input.rawBody).digest('hex');
if (sig !== computed) throw new Error('Invalid signature');
return $input.all();
```

### 9.4 Retry policy

- Immediate attempt on event creation
- Retry on non-2xx: 1m → 5m → 15m → 1h → 4h → 24h (6 total attempts)
- `WebhookDelivery` record updated after each attempt with `responseStatus` and `responseBody`

---

## 10. Availability Engine

Source: `src/domain/availability.ts` — **already complete, do not rewrite.**

### Integration in `/api/v1/availability`

```typescript
// Pseudocode for the Prisma-backed availability route
const service = await db.service.findUnique({ where: { id: serviceId, tenantId } });
const tenant = await db.tenant.findUnique({ where: { id: tenantId } });

// Convert business hours to UTC windows for the requested date
const openWindows = businessHoursToUtcWindows(tenant.businessHours, date, tenant.timezone);

// Fetch busy windows: confirmed/in-progress appointments + blocked time
const appointments = await db.appointment.findMany({
  where: { tenantId, startsAt: { gte: dayStart }, endsAt: { lte: dayEnd },
           status: { notIn: ['CANCELLED', 'NO_SHOW'] } }
});

const blocks = await db.availabilityBlock.findMany({
  where: { tenantId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } }
});

const busyWindows = [
  ...appointments.map(a => ({
    startsAt: subMinutes(a.startsAt, service.bufferBeforeMinutes),
    endsAt: addMinutes(a.endsAt, service.bufferAfterMinutes),
  })),
  ...blocks.map(b => ({ startsAt: b.startsAt, endsAt: b.endsAt })),
];

const slots = computeAvailability({
  from: dayStart, to: dayEnd,
  slotMinutes: service.durationMinutes,
  stepMinutes: stepMinutes ?? 15,
  openWindows,
  busyWindows,
});
```

---

## 11. Docker Deployment

### One-command setup

```bash
cp .env.example .env
# Edit .env: set SESSION_SECRET, POSTGRES_PASSWORD, APP_DOMAIN
docker compose up -d
# Wait for health checks to pass, then:
docker compose exec web npm run prisma:deploy
docker compose exec web npm run seed
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string (set by compose) |
| `REDIS_URL` | Yes | Redis URL (set by compose) |
| `SESSION_SECRET` | Yes | 32+ char random string for iron-session |
| `APP_URL` | Yes | Public URL e.g. `https://app.yourdomain.com` |
| `APP_DOMAIN` | Yes | Domain for Caddy, e.g. `app.yourdomain.com` |
| `S3_ENDPOINT` | Compose default | MinIO URL |
| `S3_BUCKET` | Compose default | `glasshound-assets` |
| `S3_ACCESS_KEY_ID` | Compose default | MinIO root user |
| `S3_SECRET_ACCESS_KEY` | Compose default | MinIO root password |
| `NEXT_TELEMETRY_DISABLED` | Yes (compose sets) | `1` |

---

## 12. Sprint Checklist

### Sprint 0: Foundation ✅ DONE
- [x] Next.js 16 + TypeScript scaffold
- [x] Docker Compose: postgres, redis, minio, web, worker, caddy
- [x] Prisma schema (all 11 models)
- [x] Seed: Nina's Pet Salon demo tenant
- [x] Health route: `GET /api/health`
- [x] Availability engine: `src/domain/availability.ts`
- [x] Static stubs: login, dashboard, marketing, developers

### Sprint 1: Auth
- [ ] `src/lib/session.ts` — iron-session config
- [ ] `src/middleware.ts` — protect /app/* routes
- [ ] `POST /api/auth/login` — working email/password auth
- [ ] `POST /api/auth/logout` — clear session
- [ ] `POST /api/auth/register` — create user + tenant + membership
- [ ] `src/app/login/page.tsx` — functional form
- [ ] `src/app/register/page.tsx` — salon onboarding form
- [ ] `src/lib/tenant.ts` — tenant context from session

### Sprint 2: Design System + Dashboard Shell
- [ ] `src/app/globals.css` — merged marketing + dashboard tokens
- [ ] `src/app/layout.tsx` — Plus Jakarta Sans + Instrument Serif + Fraunces
- [ ] `src/app/page.tsx` — full marketing page (Home.html faithful)
- [ ] `src/app/app/layout.tsx` — sidebar (8 tabs) + topbar
- [ ] `src/app/app/page.tsx` — redirect to /app/today

### Sprint 3: Clients, Animals, Services, Notes
- [ ] `src/server/actions/clients.ts`
- [ ] `src/server/actions/animals.ts`
- [ ] `src/server/actions/services.ts`
- [ ] `src/server/actions/notes.ts`
- [ ] Dashboard: Clients list + detail
- [ ] Dashboard: Animals list + detail
- [ ] Dashboard: Services CRUD
- [ ] Dashboard: Notes feed

### Sprint 4: Calendar, Availability, Booking
- [ ] `src/server/actions/appointments.ts`
- [ ] Dashboard: Today tab (hero, run-of-show, rebooking alerts)
- [ ] Dashboard: Calendar tab (week view + booking modal)
- [ ] Dashboard: Rebooking tab
- [ ] Availability: Prisma-backed GET /api/v1/availability

### Sprint 5: n8n API + Webhooks
- [ ] `src/lib/api-auth.ts` — Bearer token validation
- [ ] `GET /api/v1/me`
- [ ] `GET+POST /api/v1/clients` + `[id]`
- [ ] `GET+POST /api/v1/animals` + `[id]`
- [ ] `GET /api/v1/services`
- [ ] `GET+POST /api/v1/appointments` + `[id]/cancel|reschedule|status`
- [ ] `GET /api/v1/availability`
- [ ] `GET+POST /api/v1/notes`
- [ ] `GET+POST /api/v1/invoices`
- [ ] `GET+POST /api/v1/webhook-endpoints`
- [ ] Webhook delivery worker (BullMQ job)
- [ ] HMAC signature on webhook delivery
- [ ] `src/app/api/v1/openapi/route.ts` — serve OpenAPI JSON

### Sprint 6: Money + Reporting
- [ ] `src/server/actions/invoices.ts`
- [ ] Dashboard: Money tab (invoice list, status, totals)
- [ ] Dashboard: Bookings tab (weekly revenue + chart)

### Sprint 7: Marketing + Onboarding
- [ ] Marketing page polish
- [ ] Onboarding: after register → setup wizard (hours, first services, import)
- [ ] Developer docs page with OpenAPI viewer

### Sprint 8: Hardening
- [ ] Docker smoke tests
- [ ] Tenant-isolation integration tests
- [ ] Webhook retry tests
- [ ] Fresh-deploy checklist

---

## 13. Seeded Demo Data

**Tenant:** Nina's Pet Salon
- Slug: `ninas-pet-salon`
- Timezone: `America/Los_Angeles`
- Hours: Mon–Fri 7:30–18:00, Sat 8:00–16:00

**Users:**
- `nina@example.com` / `demo-password` — OWNER role

**Services:**
| Name | Duration | Price | Buffer after |
|---|---|---|---|
| Bath & Brush | 60 min | $65 | 15 min |
| Full Groom | 120 min | $95 | 15 min |
| De-shed Treatment | 90 min | $85 | 15 min |
| Nail Trim | 15 min | $18 | 15 min |

**Clients:** Marcus Holloway — (253) 555-0190 — `marcus@example.com`
**Animals:** Atlas — Bernese Mountain Dog — M — 92 lbs — DOB 2020-06-22
- Allergies: Tea-tree
- Behavior: Gentle giant, Owner nearby for nail trim
- Cadence: 35 days
- Last visit: 2026-04-22

**Appointments:** Atlas Full Groom — 2026-05-08 16:30–18:30 — CONFIRMED

---

*End of Glasshound Implementation Reference.*
*Any AI assistant continuing this project: read Section 12 (Sprint Checklist) first to understand what's done and what's next.*
