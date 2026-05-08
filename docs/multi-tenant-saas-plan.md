# Multi-Tenant Pet Salon SaaS Plan

## Summary

Rebuild the Claude static prototype into a real self-contained SaaS while preserving the current Glasshound/Nina visual direction. Use a Docker Compose deployment with app/API, Postgres, Redis, worker, and local object storage. v1 supports one salon/location per tenant, tenant-specific branding/data, staff dashboard booking, and a high-quality n8n-ready REST API with webhooks.

Defaults for v1:

- Booking is dashboard + API first.
- n8n handles outbound messaging.
- Money starts with invoice tracking rather than live payment processing.
- Public pet-owner self-booking, direct SMS/email sending, Square/Stripe payments, and multi-location tenants are deferred.

## Architecture

- Build a new full-stack app using Next.js App Router, TypeScript, Tailwind/CSS modules adapted from the current theme, Postgres, Prisma, Redis, BullMQ, and S3-compatible local storage.
- Docker Compose services:
  - `web`: Next.js app and API.
  - `worker`: background jobs for reminders, webhook delivery, imports, audit jobs.
  - `postgres`: tenant/business data.
  - `redis`: queues, rate limits, webhook retry state.
  - `minio`: photos/documents, grooming images, imports.
  - `caddy` or `nginx`: reverse proxy/TLS-ready entrypoint.
- Use official self-hosting patterns:
  - Reverse proxy in front of Next.js.
  - Docker Compose-managed services and volumes.
  - Prisma production migrations via `prisma migrate deploy`.
- Route structure:
  - `/`: marketing page.
  - `/login`: authentication.
  - `/app`: tenant dashboard.
  - `/api/v1`: public API for n8n and external integrations.
  - `/developers`: OpenAPI docs and integration guide.
- Keep tenant-branded public booking pages reserved for v1.1.

## Data Model

Core tenancy:

- `Tenant`: salon name, slug, timezone, address, phone, logo, theme tokens, business hours, booking rules.
- `User`: auth identity.
- `Membership`: user-to-tenant role.
- Every business table must include `tenantId`.

Roles:

- `owner`: all settings, API keys, billing placeholders, user management.
- `manager`: calendar, clients, services, notes, invoices.
- `staff`: calendar, clients, notes, status changes.
- `readonly`: view only.

Salon operations:

- `Client`: owner/contact person.
- `Animal`: pet/patient profile with species, breed, weight, DOB, sex, notes, allergies, behavior flags, preferred cadence.
- `Service`: name, duration, price, active flag, optional species/size constraints.
- `Appointment`: animal, client, service, staff, date/time, status, source, cancellation/reschedule metadata.
- `AvailabilityBlock`: working hours, breaks, blocked time, one-off closures.
- `GroomingNote`: animal/client notes with tags, attachments, visibility, author.
- `Invoice`: line items, status, totals, external payment references for later integrations.
- `WebhookEndpoint`: outbound webhook destination, enabled events, signing secret.
- `ApiKey`: tenant-scoped integration key with hashed secret and scopes.
- `AuditLog`: who did what, when, from which source.
- `WebhookDelivery`: delivery attempts, status, response, retry timing.

Tenant isolation:

- Enforce tenant scoping in application services.
- Return 404/403 without leaking cross-tenant object existence.
- Add Postgres row-level-security policies where practical for defense in depth.

## Dashboard UX

Preserve the current dashboard tabs:

- `Calendar`: day/week calendar, create booking, cancel, status changes, and reschedule flow. Drag rescheduling can be added after the basic flow is stable.
- `Today`: current appointments, alerts, notes, revenue estimate, next actions.
- `Bookings`: range-based volume/revenue view.
- `Rebooking`: overdue/due-soon animals based on cadence and last visit.
- `Clients`: searchable client/animal directory.
- `Services`: CRUD for tenant-specific service menu.
- `Money`: invoices, status tracking, totals, exports.
- `Notes`: animal/client note feed.

Theme and data requirements:

- Replace all hardcoded `window.*` demo data with API-backed tenant data.
- Store theme tokens per tenant:
  - accent color,
  - typography preset,
  - logo,
  - compactness/density,
  - light/dark preference.
- Keep the current Glasshound-style defaults as the system theme.
- Seed Nina's Pet Salon as demo tenant data only, not hardcoded UI data.
- Remove `tweaks-panel.jsx` from production and convert useful controls into real tenant settings.

## Booking And Availability

Availability API must compute real bookable slots from:

- tenant timezone,
- business hours,
- service duration,
- staff working hours,
- existing appointments,
- blocked time,
- configurable buffer minutes before and after appointments.

Booking status flow:

- `requested`
- `confirmed`
- `checked_in`
- `in_progress`
- `ready`
- `completed`
- `cancelled`
- `no_show`

Calendar and API actions:

- Create appointment.
- Cancel appointment with reason.
- Reschedule appointment with conflict checking.
- Read availability for date range, service, and optional staff.
- Mark appointment status.

Appointment mutation rules:

- Reject overlapping appointments unless explicitly allowed by future booking rules.
- All appointment mutations create audit logs.
- All appointment mutations emit webhook events.
- API and dashboard must share the same service-layer validation.

## n8n API

API design goal: n8n can safely run the salon without scraping UI.

Authentication:

- Tenant-scoped API keys.
- Store only hashed API key secrets.
- Header auth: `Authorization: Bearer <key>`.
- Scopes:
  - `clients:read`
  - `clients:write`
  - `animals:read`
  - `animals:write`
  - `appointments:read`
  - `appointments:write`
  - `availability:read`
  - `notes:read`
  - `notes:write`
  - `invoices:read`
  - `invoices:write`
  - `webhooks:manage`

Public REST endpoints:

- `GET /api/v1/me`
- `GET /api/v1/tenants/current`
- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `GET /api/v1/clients/:id`
- `PATCH /api/v1/clients/:id`
- `DELETE /api/v1/clients/:id`
- `GET /api/v1/animals`
- `POST /api/v1/animals`
- `GET /api/v1/animals/:id`
- `PATCH /api/v1/animals/:id`
- `DELETE /api/v1/animals/:id`
- `GET /api/v1/services`
- `POST /api/v1/services`
- `GET /api/v1/services/:id`
- `PATCH /api/v1/services/:id`
- `GET /api/v1/availability`
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/:id`
- `PATCH /api/v1/appointments/:id`
- `POST /api/v1/appointments/:id/cancel`
- `POST /api/v1/appointments/:id/reschedule`
- `POST /api/v1/appointments/:id/status`
- `GET /api/v1/notes`
- `POST /api/v1/notes`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/webhook-endpoints`
- `POST /api/v1/webhook-endpoints`

Webhook events:

- `appointment.created`
- `appointment.rescheduled`
- `appointment.cancelled`
- `appointment.status_changed`
- `client.created`
- `animal.created`
- `note.created`
- `invoice.created`
- `invoice.status_changed`
- `rebooking.due`

Webhook behavior:

- HMAC signatures.
- Retry with exponential backoff.
- Delivery logs visible in Settings.
- Test webhook button.
- OpenAPI JSON served from the app for n8n HTTP Request node usage.

## Marketing Page

- Rebuild `prototypes/claude-design-export/Home.html` as a proper Next.js marketing route.
- Preserve current messaging:
  - grooming salon SaaS,
  - calendar,
  - payments/invoices,
  - client records,
  - rebooking,
  - AI/n8n automation.
- Add real CTAs:
  - `Start trial`: creates a tenant.
  - `Open demo`: loads seeded demo tenant.
  - `Developer docs`: opens n8n API docs.
- Keep pricing as content-managed constants in code for v1, not database-backed yet.

## Auth And SaaS Setup

- Email/password login for v1 with secure session cookies.
- Tenant onboarding:
  - create salon,
  - configure business hours,
  - add first services,
  - import clients/animals from CSV.
- Subscription/billing state:
  - add placeholders for subscription status,
  - do not block app usage in MVP,
  - real SaaS billing is post-MVP.

## Docker And Deployment

Provide:

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `scripts/bootstrap`
- `scripts/backup`
- `scripts/restore`
- `scripts/seed-demo`

One-command local/prod-ish deploy:

1. Copy `.env.example` to `.env`.
2. Set secrets and domains.
3. Run `docker compose up -d`.
4. Run migrations via a controlled startup job or documented one-shot command.

Deployment requirements:

- Persistent Docker volumes for Postgres, Redis, and MinIO.
- Health checks for web, worker, database, Redis, and storage.
- Reverse proxy is the public entrypoint.
- Backups must cover Postgres and object storage.

## Sprint Roadmap

Status markers:

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked

### Milestone Checklist

- [ ] Sprint 0: Project foundation
- [ ] Sprint 1: Multi-tenant auth and core data
- [ ] Sprint 2: Dashboard shell and theming
- [ ] Sprint 3: Clients, animals, services, and notes
- [ ] Sprint 4: Calendar, booking, cancel, reschedule, availability
- [ ] Sprint 5: n8n API and webhooks
- [ ] Sprint 6: Money, invoices, reporting basics
- [ ] Sprint 7: Marketing page and onboarding polish
- [ ] Sprint 8: Hardening and deploy readiness

### Sprint 0: Project Foundation

Goals:

- Scaffold Next.js/TypeScript app.
- Add Docker Compose, Postgres, Redis, MinIO, reverse proxy.
- Add Prisma, migrations, seed structure, lint/test tooling.
- Establish app folder structure for dashboard, marketing, API, workers, and shared domain services.

Deliverables:

- App boots locally.
- Docker Compose starts all infrastructure services.
- Prisma connects to Postgres.
- Initial health route exists.
- Demo route proves the app renders through the new stack.

Acceptance:

- App boots through Docker.
- Demo route works.
- `docker compose ps` shows expected services healthy.

Notes:

- Do not migrate every prototype screen in this sprint.
- Keep the static export available as visual reference.

### Sprint 1: Multi-Tenant Auth And Core Data

Goals:

- Implement `Tenant`, `User`, `Membership`, and role permissions.
- Add email/password login.
- Add tenant onboarding.
- Add tenant-scoped service layer.

Deliverables:

- Login/logout.
- Tenant creation.
- Membership roles.
- Tenant context resolver.
- Authorization helpers.
- Initial seed/demo tenant.

Acceptance:

- Multiple tenants can log in.
- Tenant A cannot access Tenant B data.
- Role checks are enforced in server-side actions/API handlers.

Notes:

- Prioritize tenant isolation correctness over UI polish.
- Add audit log scaffolding early.

### Sprint 2: Dashboard Shell And Theming

Goals:

- Port current Glasshound dashboard theme into production UI.
- Add dashboard tabs:
  - Calendar
  - Today
  - Bookings
  - Rebooking
  - Clients
  - Services
  - Money
  - Notes
- Add tenant-specific theme settings.
- Seed Nina's Pet Salon as demo tenant data.

Deliverables:

- Authenticated dashboard layout.
- Sidebar and topbar.
- Empty/loading/error states.
- Tenant theme token loading.
- Demo tenant visuals.

Acceptance:

- Dashboard renders with tenant data.
- No hardcoded `window.*` data remains in dashboard views.
- Tenant theme changes apply from stored settings.

Notes:

- Preserve the mood and layout language of the prototype.
- Remove the Claude tweak panel from production.

### Sprint 3: Clients, Animals, Services, And Notes

Goals:

- CRUD for clients.
- CRUD for animal/patient profiles.
- CRUD for services.
- CRUD for grooming notes.
- Searchable client/animal directory.

Deliverables:

- Client list/detail.
- Animal profile with allergies, behavior flags, cadence, care history.
- Service list/editor.
- Notes feed and animal-specific notes.
- Attachments ready for object storage.

Acceptance:

- Tenant can manage real client and animal records end to end.
- Notes persist and display on animal/client surfaces.
- Search finds clients, animals, phone, email, and breed.

Notes:

- Animal/patient notes are important to the end customer. Treat this as a core workflow, not a secondary feature.
- Avoid generic CRM language where animal care context matters.

### Sprint 4: Calendar, Booking, Cancel, Reschedule, Availability

Goals:

- Build availability engine.
- Add calendar create/cancel/reschedule/status flows.
- Add appointment audit logs.
- Emit appointment webhook events.

Availability inputs:

- business hours,
- service duration,
- staff hours,
- existing appointments,
- blocked time,
- buffers,
- tenant timezone.

Deliverables:

- `GET /api/v1/availability`.
- Appointment create flow.
- Appointment cancel flow with reason.
- Appointment reschedule flow with conflict checking.
- Appointment status updates.
- Calendar day/week views backed by real data.

Acceptance:

- API and dashboard can book, cancel, reschedule, and read availability safely.
- Conflicts are rejected.
- All appointment mutations are audited.
- Appointment webhook events are queued.

Notes:

- Use one shared domain service for dashboard and API booking logic.
- Avoid duplicated validation between UI actions and API routes.

### Sprint 5: n8n API And Webhooks

Goals:

- Add tenant-scoped API keys.
- Add API scopes.
- Add OpenAPI docs.
- Add REST endpoints for core objects.
- Add HMAC-signed webhooks and retries.

Deliverables:

- API key management UI in Settings.
- Public API routes under `/api/v1`.
- OpenAPI JSON.
- Developer docs page.
- Webhook endpoint CRUD.
- Webhook delivery worker.
- Webhook delivery logs.
- Test webhook button.

Acceptance:

- n8n can manage bookings via HTTP Request node without UI scraping.
- Invalid API key is rejected.
- Missing scope is rejected.
- Webhook signatures verify.
- Failed webhook delivery retries and logs the result.

Notes:

- The API should be "amazing for n8n": predictable JSON, clear errors, stable IDs, pagination, filtering, OpenAPI docs, and examples.
- Keep webhook payloads concise but complete enough for workflow automation.

### Sprint 6: Money, Invoices, Reporting Basics

Goals:

- Invoice CRUD.
- Invoice statuses.
- Revenue summaries.
- Dashboard Money tab backed by real tenant data.
- Booking/revenue reports for Today and Bookings views.

Deliverables:

- Invoice list/detail.
- Invoice line items.
- Status updates: draft, sent, paid, unpaid, overdue, void.
- Export-ready invoice/report data.
- Today revenue summary.
- Bookings trend summary.

Acceptance:

- Invoices and revenue summaries persist per tenant.
- Money tab no longer uses demo values.
- Invoice changes emit webhook events.

Notes:

- Square/Stripe processing is post-MVP.
- Store external payment references now so integrations can be added without a painful migration.

### Sprint 7: Marketing Page And Onboarding Polish

Goals:

- Rebuild marketing page as a Next.js route.
- Add real CTAs.
- Improve onboarding.

Deliverables:

- Marketing route at `/`.
- `Start trial` CTA.
- `Open demo` CTA.
- `Developer docs` CTA.
- Onboarding for salon setup, hours, services, and demo import.

Acceptance:

- New user can land, sign up, create tenant, and reach dashboard.
- Demo user can open seeded demo tenant.
- Developer docs are reachable from marketing and settings.

Notes:

- Keep the marketing page visually aligned with the product theme.
- Avoid marketing-only UI that does not connect to real onboarding flows.

### Sprint 8: Hardening And Deploy Readiness

Goals:

- Docker smoke tests.
- Backup/restore scripts.
- Health checks.
- API contract tests.
- Tenant-isolation tests.
- Webhook retry tests.
- Production deployment docs.

Deliverables:

- Fresh deploy checklist.
- `.env.example`.
- Backup script.
- Restore script.
- Seed-demo script.
- Docker health checks.
- CI test command set.

Acceptance:

- Fresh server can deploy with `docker compose up -d`.
- App, API docs, and demo tenant are reachable after deployment.
- Backups can be created and restored in a documented flow.

Notes:

- Treat deployment docs as part of the product.
- Verify self-contained deployment from a clean environment before calling MVP complete.

## Development Notes

### Decisions

- Use a single-location tenant model for v1.
- Use n8n as the outbound messaging automation layer for v1.
- Keep direct SMS/email integrations out of the MVP.
- Use invoice tracking before live payment processing.
- Preserve the Glasshound design language as the product default.
- Use Nina's Pet Salon as seeded demo tenant content.

### Deferred Items

- Public pet-owner self-booking is v1.1.
- Square/Stripe payment processing is post-MVP.
- Built-in SMS/email sending is deferred because n8n handles messaging in v1.
- Multi-location tenant support is deferred.
- Drag-and-drop calendar rescheduling can follow basic reschedule flow.
- Client portal is deferred.

### Risks

- Availability logic can become complex if service, staff, and animal rules are not centralized.
- Tenant isolation must be correct from the first database/API layer.
- Webhook retries need idempotency guidance for n8n workflows.
- The static prototype styling may need cleanup to become maintainable production CSS.
- Self-hosted Docker deployments need clear backup and restore instructions.

### Open Follow-Ups

- Decide whether to use Caddy or nginx as the default reverse proxy.
- Decide auth library after project scaffold.
- Decide whether API docs use Scalar, Swagger UI, or Redoc.
- Define CSV import format for clients and animals.
- Define production domain/subdomain strategy for tenant access.

### Progress Log

Use this section to track milestone notes during development.

| Date | Sprint | Status | Note |
| --- | --- | --- | --- |
| TBD | Sprint 0 | [ ] | Project foundation not started. |
| TBD | Sprint 1 | [ ] | Multi-tenant auth not started. |
| TBD | Sprint 2 | [ ] | Dashboard shell not started. |
| TBD | Sprint 3 | [ ] | Clients/animals/services/notes not started. |
| TBD | Sprint 4 | [ ] | Calendar and availability not started. |
| TBD | Sprint 5 | [ ] | n8n API and webhooks not started. |
| TBD | Sprint 6 | [ ] | Money and reporting not started. |
| TBD | Sprint 7 | [ ] | Marketing and onboarding not started. |
| TBD | Sprint 8 | [ ] | Hardening and deploy readiness not started. |

## Test Plan

Unit tests:

- Availability calculation.
- Appointment conflict detection.
- Tenant scoping.
- API key scope enforcement.
- Webhook signing.
- Webhook retry scheduling.

Integration tests:

- Create tenant.
- Create client.
- Create animal.
- Create service.
- Book appointment.
- Read availability.
- Reschedule appointment.
- Cancel appointment.
- Create note.
- Create invoice.

API contract tests:

- OpenAPI schema validates.
- n8n-style HTTP calls work with bearer keys.
- Missing scope returns a clear error.
- Forbidden cross-tenant access returns 404/403 without leaking data.
- Webhook payload signature verifies.

UI tests:

- Dashboard tabs render with tenant data.
- Calendar booking flow works.
- Cancel and reschedule flows work.
- Client/animal notes persist.
- Tenant theme changes apply.
- Marketing CTAs route to the right flows.

Docker smoke test:

- Fresh compose startup.
- Migration.
- Seed demo.
- App reachable.
- API docs reachable.
- Worker healthy.
- Postgres, Redis, and MinIO healthy.

## Assumptions

- v1 tenant model is one salon/location per tenant with optional staff.
- n8n is external; this app exposes REST APIs and webhooks for it.
- Messaging is handled through n8n workflows in v1.
- Money tab tracks invoices and payment state but does not process Square/Stripe payments yet.
- Public pet-owner self-booking is v1.1 unless it becomes a hard v1 requirement.
- Official references used for architecture defaults:
  - [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
  - [Docker Compose](https://docs.docker.com/compose/)
  - [n8n REST API](https://docs.n8n.io/api/)
  - [Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy)
  - [Postgres row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
