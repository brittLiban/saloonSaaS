# Glasshound — Feature Roadmap
> **Purpose of this document:** Any AI or developer jumping into this codebase should be able to read this and immediately understand *what* we're building, *why* it matters, *how* it fits the existing architecture, and *what success looks like* for every task. No Slack, no Notion, no extra context needed.

---

## Stack context (read this first)
- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind
- **Database:** PostgreSQL via Prisma ORM (`prisma/schema.prisma`)
- **Queue/Worker:** BullMQ + Redis (`src/worker/index.ts`)
- **Storage:** MinIO (S3-compatible) for file uploads
- **Auth:** iron-session cookie auth (`src/lib/session.ts`)
- **Multi-tenant:** every DB query is scoped to `tenantId` — never skip this
- **Server actions:** live in `src/server/actions/` — use these for mutations, not raw API routes
- **Public API:** versioned REST at `src/app/api/v1/` with API key auth (`src/lib/api-auth.ts`)
- **Deployment:** Docker Compose on Hetzner, CD via GitHub Actions → ghcr.io

## Competitive reference
All features in this roadmap are benchmarked against **MoeGo** — the current market leader in pet grooming SaaS. The `moego_features_deep_dive.html` file in this repo contains the full breakdown of their feature set with UX notes. A full third-party assessment is in `MoeGo_assessment.md`. Use both as reference for design decisions.

### Competitor pricing (as of May 2026)
| Product | Starting price | Key weakness vs. us |
|---------|---------------|---------------------|
| **MoeGo** | $79/mo (Basic), $149/mo (Growth), $239/mo (Ultimate) | Expensive; desktop-centric for advanced settings; API only on Enterprise |
| DaySmart Pet | $29/mo | Less grooming-specific; fragmented feature tiers |
| Gingr | $105/mo (Spa) | Kennel/daycare first, grooming is secondary |
| Pawfinity | $55–$110/mo | Less modern UX; smaller community |
| KennelBooker | $49.99/mo | Boarding-centric; weaker grooming workflows |

### Our pricing strategy
MoeGo charges $149/mo for features that grooming shops actually need (Growth tier). Our target: **$79/mo** for a plan that matches MoeGo Growth in grooming-specific features. We win on price, not on being cheaper — we win because we're purpose-built and simpler. SaaS billing (charging our tenant customers) is covered in the CD pipeline and will be implemented with Stripe Billing after the core product is stable (post Sprint 7).

> **Key insight from the assessment:** MoeGo's biggest weaknesses are (1) premium pricing at the tiers shops actually want, (2) advanced settings requiring desktop, (3) a weak client-side app (3.2/5 App Store vs. 4.6/5 business app). These are our three design targets: mobile-first for everything, no desktop-only features, fair pricing.

---

## Priority matrix

| Sprint | Theme | Why now |
|--------|-------|---------|
| 1 | Stripe payments | Can't run a business without collecting money |
| 2 | Email/SMS notifications | No-shows kill grooming shops — reminders fix this |
| 3 | Public booking storefront | #1 requested feature; saves shops hours of phone calls |
| 4 | Grooming report card | Highest-ROI client retention tool per MoeGo data |
| 5 | Vaccine tracking | Safety + liability; required for insurance |
| 6 | Digital intake forms | Eliminates paper, captures digital consent |
| 7 | Packages & memberships | Converts one-time clients to recurring revenue |
| 8 | Business reporting | Shops need data to make staffing/pricing decisions |
| 9 | Abandoned booking recovery | Recover dropped bookings — $29.75M recovered by MoeGo users in 2024 |
| 10 | Two-way SMS + review booster | Communications layer + Google review automation |
| 11 | Smart scheduling | Recurring appointments, conflict detection, multi-staff view — saves 15+ min/day |
| 12 | Staff payroll & commission | Clock in/out, commission rules, tip splitting — replaces a separate HR tool |
| 13 | Retail & inventory | Sell products at checkout — adds an avg $12–18/visit revenue layer |
| 14 | Marketing integrations | Reserve with Google, QuickBooks, Google Analytics — closes the loop on acquisition + accounting |

---

# SPRINT 1 — Stripe Payments & Card on File
**Duration:** 2 weeks  
**Goal:** Clients can pay. Shops can charge no-shows. The full payment loop works.

### Why this sprint first
Invoices already exist in the DB (`Invoice` model with `status`, `lineItems`, `totalCents`) but there is zero payment processing. Every other feature builds on trust that money will move. This is the foundation.

### Background & design decisions
- Use **Stripe** (not Square, not PayPal) — it has the best API, webhooks, and Connect support for future SaaS billing
- Cards are **never stored raw** — Stripe tokenizes everything via `PaymentMethod` objects
- A **$0.50 pre-auth hold** is placed when a card is saved to verify it's real. This eliminates the failure mode where a client saves a fake/expired card and it only fails at the moment of a no-show charge
- Three Stripe products in play: **Payment Intents** (one-time charges), **Setup Intents** (card on file), **Customer objects** (per client)

### Schema changes needed
```prisma
// Add to Client model:
stripeCustomerId   String?   @unique

// Add to Invoice model:
stripePaymentIntentId  String?
stripeReceiptUrl       String?

// New model:
model SavedCard {
  id                 String   @id @default(cuid())
  tenantId           String
  clientId           String
  stripePaymentMethodId String @unique
  last4              String
  brand              String   // visa, mastercard, etc.
  expMonth           Int
  expYear            Int
  isDefault          Boolean  @default(false)
  createdAt          DateTime @default(now())
  tenant             Tenant   @relation(...)
  client             Client   @relation(...)
}
```

### Environment variables to add
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Technical tasks

#### T1.1 — Stripe setup & webhook handler
- Install `stripe` npm package
- Create `src/lib/stripe.ts` — singleton Stripe client initialized from `STRIPE_SECRET_KEY`
- Create `src/app/api/webhooks/stripe/route.ts` — raw body webhook receiver
  - Verify signature with `stripe.webhooks.constructEvent()`
  - Handle events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `setup_intent.succeeded`
  - Update Invoice status in DB on `payment_intent.succeeded`
- **Acceptance criteria:** Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe` receives and logs events with no errors

#### T1.2 — Stripe Customer creation
- In `src/server/actions/clients.ts`, when a client is created, also create a Stripe Customer with `stripe.customers.create({ email, name, metadata: { tenantId, clientId } })`
- Store returned `customer.id` in `Client.stripeCustomerId`
- Backfill script for existing clients (one-time migration)
- **Acceptance criteria:** Every `Client` row has a non-null `stripeCustomerId` after creation

#### T1.3 — Card on file: save flow
- Create `POST /api/v1/clients/[id]/cards` — creates a Stripe SetupIntent, returns `client_secret`
- Create `src/server/actions/cards.ts` with `saveCard(clientId, paymentMethodId)`:
  - Attaches PaymentMethod to Stripe Customer
  - Places $0.50 pre-auth hold via `stripe.paymentIntents.create({ amount: 50, confirm: true, capture_method: 'manual' })` — then immediately `stripe.paymentIntents.cancel()`
  - Saves card metadata to `SavedCard` table
- Build UI component: `CardOnFileModal` — uses Stripe.js `<CardElement>` to collect card securely
- **Acceptance criteria:** Card saved → appears in client profile → $0.50 hold visible in Stripe dashboard → hold released immediately

#### T1.4 — Card on file: list & delete
- `GET /api/v1/clients/[id]/cards` — returns saved cards for a client (last4, brand, expiry, isDefault)
- `DELETE /api/v1/clients/[id]/cards/[cardId]` — detaches from Stripe Customer, deletes from DB
- `PATCH /api/v1/clients/[id]/cards/[cardId]` with `{ isDefault: true }` — sets default card
- UI: Card list in client profile with trash icon and "set default" action
- **Acceptance criteria:** Cards appear, can be deleted, default can be set. Deleting the default card prompts confirmation.

#### T1.5 — Invoice checkout: charge card on file
- Create `src/server/actions/invoices.ts` action `chargeInvoice(invoiceId, paymentMethodId)`:
  - Creates PaymentIntent with `amount`, `currency: 'usd'`, `customer`, `payment_method`, `confirm: true`, `off_session: true`
  - On success: update `Invoice.status = 'PAID'`, `Invoice.paidAt`, `Invoice.stripePaymentIntentId`
  - On failure: surface Stripe error message to staff UI
- Checkout UI: show card selector + "Charge $X.XX" button on invoice detail page
- **Acceptance criteria:** Invoice charged → status becomes PAID → receipt URL stored → client visible in Stripe dashboard

#### T1.6 — No-show / cancellation charge
- Add `chargeNoShow(appointmentId, amountCents)` server action
- Pulls client's default card on file, creates PaymentIntent for `amountCents`
- Creates a new Invoice with status PAID, linked to the appointment
- Adds AuditLog entry: `action: 'no_show_charge'`
- **Acceptance criteria:** From appointment detail, clicking "Charge no-show fee" creates an invoice and charges the card. Staff sees confirmation. Client gets no notification (to avoid confrontation — notification is a later feature).

#### T1.7 — Manual cash/external payment
- `markPaid(invoiceId, method: 'cash' | 'check' | 'external', reference?: string)` server action
- Sets Invoice status to PAID without creating a Stripe charge
- Useful for clients who pay cash at the door
- **Acceptance criteria:** Invoice can be marked paid with cash. No Stripe charge created. AuditLog records the method.

---

# SPRINT 2 — Email & SMS Notifications
**Duration:** 2 weeks  
**Goal:** Clients receive booking confirmations, 24hr reminders, and rebook nudges automatically. Zero manual staff effort.

### Why this sprint second
No-shows are the #1 operational problem in pet grooming. A day-before reminder alone cuts no-show rate by ~40%. This also unblocks the public booking flow (Sprint 3) — clients need confirmation emails before self-serve booking makes sense.

### Background & design decisions
- **Email provider:** [Resend](https://resend.com) — best developer experience, generous free tier (3,000 emails/month), React Email for templates
- **SMS provider:** [Twilio](https://twilio.com) — industry standard, TCPA-compliant opt-out handling built in
- **Delivery mechanism:** All sends go through BullMQ jobs (`src/worker/index.ts`) — never send inline in a request
- **Template system:** Store templates in DB per tenant so shops can customize their own wording
- **TCPA compliance:** Every SMS must include opt-out language ("Reply STOP to unsubscribe"). Track opt-out status per client.

### Schema changes needed
```prisma
// Add to Client model:
smsOptedOut    Boolean   @default(false)
emailOptedOut  Boolean   @default(false)

// New model:
model NotificationTemplate {
  id        String   @id @default(cuid())
  tenantId  String
  type      String   // 'booking_confirmation', 'reminder_24h', 'reminder_2h', 'ready_for_pickup', 'rebook_nudge', 'review_request'
  channel   String   // 'email' | 'sms'
  subject   String?  // email only
  body      String   // merge field syntax: {{client_name}}, {{pet_name}}, {{date}}, {{time}}, {{service}}, {{groomer}}, {{booking_link}}
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(...)
}

model NotificationLog {
  id             String   @id @default(cuid())
  tenantId       String
  clientId       String
  appointmentId  String?
  type           String
  channel        String
  status         String   // 'sent' | 'failed' | 'opted_out'
  providerMsgId  String?
  sentAt         DateTime @default(now())
  tenant         Tenant   @relation(...)
}
```

### Environment variables to add
```
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

### Technical tasks

#### T2.1 — Resend + React Email setup
- Install `resend`, `@react-email/components`, `react-email`
- Create `src/lib/email.ts` — Resend client singleton
- Create `src/emails/` directory with React Email templates:
  - `BookingConfirmation.tsx` — appointment summary, date/time, pet name, add-to-calendar link
  - `Reminder24h.tsx` — friendly reminder with appointment details
  - `ReadyForPickup.tsx` — "your dog is ready!" with salon address/phone
  - `RebookNudge.tsx` — "it's been X weeks, time to book again" with booking link
- **Acceptance criteria:** `npx react-email dev` shows all templates rendering correctly. No broken layout on mobile.

#### T2.2 — Twilio SMS setup
- Install `twilio`
- Create `src/lib/sms.ts` — Twilio client singleton with `sendSms(to, body)` function
- Handle STOP/opt-out: create `POST /api/webhooks/twilio` that receives opt-out callbacks and sets `Client.smsOptedOut = true`
- **Acceptance criteria:** Test SMS delivered to a real phone. Replying STOP sets the client opt-out flag.

#### T2.3 — Notification BullMQ queue
- In `src/worker/index.ts`, add `notifications` queue
- Job types:
  - `send_email` — `{ clientId, type, appointmentId?, templateData }`
  - `send_sms` — `{ clientId, type, appointmentId?, message }`
  - `schedule_reminders` — `{ appointmentId }` — enqueues day-before and day-of jobs with `delay` calculated from `appointment.startsAt`
- All sends check opt-out status before firing
- Log every send to `NotificationLog`
- **Acceptance criteria:** Worker processes jobs from queue. Failed jobs retry 3 times with exponential backoff. NotificationLog has a record for every send attempt.

#### T2.4 — Booking confirmation trigger
- After `createAppointment()` server action succeeds, enqueue `schedule_reminders` job
- Immediately enqueue `send_email` for booking confirmation
- **Acceptance criteria:** Create a test appointment → confirmation email arrives within 30 seconds → reminder jobs appear scheduled in BullMQ dashboard.

#### T2.5 — Reminder sequence
- `schedule_reminders` job calculates and enqueues:
  - 24h reminder: `delay = startsAt - 24h - now`
  - 2h reminder: `delay = startsAt - 2h - now`
  - (SMS only) "on my way" for mobile groomers: `delay = startsAt - 30min - now` (optional, tenant setting)
- If appointment is cancelled, dequeue pending reminder jobs
- **Acceptance criteria:** Appointment created at 3pm for tomorrow 10am → reminder SMS arrives at tomorrow 10am-24h = today 10am. Cancelling the appointment stops the pending reminder.

#### T2.6 — Rebook nudge automation
- After appointment status → `COMPLETED`, enqueue rebook nudge job with delay based on service's typical cadence
- Default cadence: 6 weeks. Override per service (e.g. show trims = 4 weeks, doodle = 8 weeks)
- Message template: "Hi {{client_name}}, it's been {{weeks}} weeks since {{pet_name}}'s last groom — is it time to book again? {{booking_link}}"
- **Acceptance criteria:** Mark appointment as COMPLETED → rebook SMS arrives after configured delay (test with 1 minute delay in dev). Clicking link goes to booking page (Sprint 3 will build this, for now link to dashboard).

#### T2.7 — Notification settings UI
- Settings page section: "Notifications"
  - Toggle each notification type on/off (confirmation, reminder, rebook)
  - Configure reminder timing (24h vs 48h, SMS vs email vs both)
  - Edit message templates (textarea with merge field hints)
- Client profile: SMS/email opt-out toggle visible to staff
- **Acceptance criteria:** Disabling a notification type stops it from being enqueued. Template edits persist and use the saved template on next send.

---

# SPRINT 3 — Public Booking Storefront
**Duration:** 2 weeks  
**Goal:** Pet owners can book their own appointment at `pawreception.com/book/[tenant-slug]` without calling.

### Why this sprint third
This is the feature grooming shops sell themselves on — "my clients can book online." It's also the primary top-of-funnel driver for new clients. Requires Sprint 1 (payments for deposits) and Sprint 2 (confirmation emails) to be complete first.

### Background & design decisions
- Route: `/book/[slug]` — publicly accessible, no auth required
- **Step-by-step wizard** — single-purpose screens, not one long form. Each screen has one decision:
  1. Select service
  2. Select date + time (real-time availability from existing `availability.ts` engine)
  3. Enter pet info (or log in as returning client)
  4. Payment gate (deposit, card on file, or no gate — configured per tenant)
  5. Confirmation screen
- Returning clients: if phone number matches an existing client, skip intake and pre-fill
- New clients: create `Client` + `Animal` records from intake data
- **Booking request vs. instant confirm:** Tenant setting. "Instant" creates `CONFIRMED` appointment. "Request" creates `REQUESTED` appointment that appears in staff review queue.
- **Booking gates:** Tenant can require: nothing, card on file, deposit (fixed or %), or full prepayment

### Technical tasks

#### T3.1 — Public layout + tenant branding
- Create `src/app/book/[slug]/layout.tsx` — stripped layout (no sidebar, no auth)
- Fetch tenant by slug: logo, name, primary color from `Tenant.themeTokens`
- Apply tenant's brand color as CSS variable
- Show "Powered by Glasshound" footer (until white-label is a paid feature)
- **Acceptance criteria:** Visiting `/book/my-salon` shows the salon's logo and name. 404 if slug not found.

#### T3.2 — Service selection screen
- Fetch active services for tenant (`Service.active = true`)
- Group by species if tenant has multiple species
- Card per service: name, duration, price, description
- Selecting a service advances to step 2
- **Acceptance criteria:** Only active services appear. Selecting a service remembers the choice through subsequent steps.

#### T3.3 — Date + time picker
- Use existing `availability.ts` engine — it already handles business hours, buffer times, existing appointments
- Calendar: show available days (grayed out if no slots)
- Time slots: 30-min grid, only show available slots
- **Acceptance criteria:** Selecting a date shows real slots. A time slot that is booked in the dashboard does not appear here. Selecting time advances to step 3.

#### T3.4 — Client + pet intake
- Phone number field first (lookup if returning client)
  - If found: "Welcome back, [name]!" — show their pets to select from
  - If not found: show full intake form (name, email, phone) + pet form (name, species, breed, DOB)
- Returning client: one tap to select existing pet, or "add a new pet"
- **Acceptance criteria:** Existing client phone number auto-fills their info. New client creates records. No duplicate clients created if same phone submitted twice.

#### T3.5 — Payment gate
- Fetch tenant's `bookingRules.paymentGate` setting (`none` | `card_on_file` | `deposit` | `full_prepayment`)
- `none`: skip payment screen
- `card_on_file`: show Stripe card collection element (SetupIntent)
- `deposit`: show deposit amount, collect card, create PaymentIntent for deposit amount
- `full_prepayment`: collect full service price upfront
- **Acceptance criteria:** Each gate type works end-to-end. A deposit is visible in Stripe dashboard. Full prepayment creates a PAID invoice.

#### T3.6 — Booking confirmation + appointment creation
- On submit: call `createBookingRequest` server action
  - Creates `Appointment` with status `REQUESTED` or `CONFIRMED` per tenant setting
  - Creates `Client` + `Animal` if new
  - Enqueues confirmation email (T2.4)
- Show confirmation screen: appointment summary, "add to calendar" button (generates `.ics` file)
- **Acceptance criteria:** Appointment appears in staff dashboard. Confirmation email arrives. "Add to calendar" generates correct `.ics` with date/time/location.

#### T3.7 — Staff booking request review
- In staff dashboard: `REQUESTED` appointments appear in a "Pending requests" inbox
- Staff can: Confirm (→ `CONFIRMED` + send confirmation email) or Decline (→ `CANCELLED` + send decline SMS)
- Badge count on nav showing pending count
- **Acceptance criteria:** New online booking creates a pending request card. Staff confirms it → client gets confirmation email. Staff declines → client gets decline SMS.

#### T3.8 — Booking rules settings UI
- Settings page section: "Online Booking"
  - Toggle: online booking enabled/disabled
  - Payment gate selector: none / card on file / deposit / full prepayment
  - Deposit amount (if deposit selected): fixed $ or %
  - Booking lead time: minimum hours before appointment (e.g. "clients must book at least 24h in advance")
  - Instant confirm vs. require staff approval
  - Services visible online: toggle per service
- **Acceptance criteria:** Disabling online booking returns 503 on the booking page. Lead time blocks slots within the window. Payment gate setting is enforced.

---

# SPRINT 4 — Grooming Report Card
**Duration:** 2 weeks  
**Goal:** After every appointment, clients receive a branded digital report card with their dog's photo, groomer notes, and a rebook button.

### Why this sprint
MoeGo's single most-praised feature in reviews. It turns a back-office note into a client-facing moment that drives rebooks and Google reviews simultaneously. The rebook button in the report card is the highest-intent booking moment — right after a client sees their clean, happy dog.

### Background & design decisions
- Report card is a **public URL** (`/report/[appointmentId]/[token]`) — no auth required, accessible via SMS link
- Token is a signed, time-limited JWT so the link can't be guessed
- Delivered via SMS automatically when appointment status → `COMPLETED`
- **Review branch logic:** 5-star tap → opens Google review deep link. 1-4 star tap → opens internal feedback form. This is critical — low-rating reviews go to you privately, not public.

### Technical tasks

#### T4.1 — Report card public page
- Create `src/app/report/[appointmentId]/[token]/page.tsx`
- Verify token (JWT signed with `SESSION_SECRET`, contains `appointmentId`, expires 90 days)
- Fetch appointment with: client, pet, services, groomer, notes (where `visibility = CLIENT_VISIBLE`), photos
- Render: pet name, services performed, groomer name, notes, before/after photos
- Mobile-first design — this URL is opened from SMS on a phone
- **Acceptance criteria:** Valid link renders report card. Expired or invalid token shows "Link expired — contact the salon." Card looks good on iPhone Safari.

#### T4.2 — Photo attachment on appointments
- Add `photos` field to `GroomingNote` or create separate `AppointmentPhoto` model
- Upload to MinIO via presigned URL
- Photos tagged as `before` or `after`
- Staff can upload photos from appointment detail screen
- **Acceptance criteria:** Staff uploads photo → it appears in the appointment detail → it appears on the report card.

#### T4.3 — Review request with branch logic
- Below report card: "How was today's visit?" with 5 star buttons
- On tap: POST to `/api/report/[appointmentId]/rating` — saves rating to appointment metadata
- If 5 stars: show "Thanks! Leave us a Google review:" + direct link to Google Business Profile review page
- If 1-4 stars: show internal feedback form (textarea) — submit saves to `GroomingNote` with tag `client_feedback` and visibility `INTERNAL`
- **Acceptance criteria:** 5-star tap shows Google link (not internal form). 3-star tap shows feedback form (not Google link). Feedback form submission creates a GroomingNote visible in staff dashboard.

#### T4.4 — Rebook button
- At bottom of report card: "Book [pet name]'s next groom →"
- Links to `/book/[slug]?service=[serviceId]&pet=[petId]` — pre-fills the public booking flow
- **Acceptance criteria:** Rebook button appears. Clicking it opens the booking storefront with the same service pre-selected.

#### T4.5 — Auto-send on completion
- When appointment status → `COMPLETED` (via server action), enqueue report card SMS job
- SMS template: "Hi [name]! [pet]'s groom is complete 🐾 See their report card: [link]"
- Link contains signed token
- **Acceptance criteria:** Marking appointment COMPLETED → SMS arrives within 60 seconds → link opens report card.

#### T4.6 — Social sharing
- On report card: "Share [pet]'s look" button
- On iOS/Android: triggers native share sheet with the after-groom photo
- On desktop: shows shareable image download
- **Acceptance criteria:** Share button triggers Web Share API on mobile. Image downloaded on desktop.

---

# SPRINT 5 — Vaccine Tracking
**Duration:** 2 weeks  
**Goal:** Every pet's vaccine status is visible at a glance across the entire app. Expired vaccines block online booking for applicable services.

### Why this sprint
This is a safety and liability feature. Admitting an unvaccinated dog to a grooming session is a legal risk. MoeGo's 3-state icon (green/yellow/red) visible on every appointment card — not buried in a profile tab — is the design insight that makes this actually work.

### Schema changes needed
```prisma
model VaccineRecord {
  id           String    @id @default(cuid())
  tenantId     String
  animalId     String
  name         String    // 'Rabies', 'Bordetella', 'DHPP', custom
  administeredAt DateTime?
  expiresAt    DateTime?
  vetClinic    String?
  certificateUrl String? // MinIO file URL
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  tenant       Tenant    @relation(...)
  animal       Animal    @relation(...)
}

// Add to Service model:
requiredVaccines  String[]  @default([])  // vaccine names that are required
```

### Technical tasks

#### T5.1 — Vaccine record CRUD
- `src/server/actions/vaccines.ts`: `addVaccine`, `updateVaccine`, `deleteVaccine`
- Vaccine form: name (dropdown of common + custom), administered date, expiry date, vet clinic, certificate file upload
- Certificate upload to MinIO — same pattern as pet photos (T4.2)
- **Acceptance criteria:** Add/edit/delete vaccine records. Certificate photo uploads and is accessible via MinIO URL.

#### T5.2 — Vaccine status computation
- Create `src/lib/vaccine-status.ts` with `getVaccineStatus(animal): 'valid' | 'expiring_soon' | 'expired_or_missing'`
  - `valid`: all required vaccines (for tenant's services) are present and don't expire within 30 days
  - `expiring_soon`: at least one expires within 30 days
  - `expired_or_missing`: at least one is missing or expired
- Cache result on `Animal` model as `vaccineStatus` computed field (or compute on-the-fly)
- **Acceptance criteria:** Unit tests cover all 3 states. Status updates immediately when a vaccine is added/edited.

#### T5.3 — Status icon everywhere
- Create `<VaccineBadge status="valid|expiring_soon|expired_or_missing" />` component
  - Green syringe icon = valid
  - Yellow syringe icon = expiring soon
  - Red syringe icon = expired/missing
- Add badge to: appointment card on calendar, client profile pet list, search results, check-in screen
- Hover/tap shows tooltip: which specific vaccines are the problem
- **Acceptance criteria:** Badge appears on appointment card without opening the appointment. Tooltip shows "Bordetella expired Jan 1, 2026."

#### T5.4 — Service vaccine requirements
- In service settings: "Required vaccines" multi-select (Rabies, Bordetella, DHPP, custom)
- Saves to `Service.requiredVaccines`
- **Acceptance criteria:** Setting Bordetella as required for a service saves correctly and is used in validation.

#### T5.5 — Booking block for expired vaccines
- In public booking flow (Sprint 3) — after pet selection, check required vaccines for chosen service
- If missing/expired: show "This service requires [vaccine name]. Please bring an up-to-date certificate to your appointment or contact us." — allow booking but flag it
- Hard block mode (tenant setting): if enabled, prevent booking entirely
- **Acceptance criteria:** Pet with expired Bordetella trying to book a Bordetella-required service sees the warning. Hard block setting prevents submission.

#### T5.6 — Expiry reminder notifications
- BullMQ job: `vaccine_expiry_reminder` — scheduled 30 days before expiry
- Client SMS: "Hi [name], [pet]'s [vaccine] is expiring on [date]. Please bring updated records to your next appointment."
- **Acceptance criteria:** Adding a vaccine that expires in 30 days enqueues a reminder job. Test job fires correctly.

---

# SPRINT 6 — Digital Intake Forms
**Duration:** 2 weeks  
**Goal:** New clients complete a digital form before their appointment — including service agreement signature — with zero paper.

### Background & design decisions
- Forms are built by the tenant (custom questions per business)
- File upload for vaccine certificates is a first-class field type
- Digital signature is legally binding with timestamp
- Forms sent via SMS link or embedded in online booking flow

### Schema changes needed
```prisma
model IntakeForm {
  id        String   @id @default(cuid())
  tenantId  String
  name      String   // e.g. "New Client Intake", "Boarding Agreement"
  fields    Json     // array of field definitions
  agreement String?  // service agreement HTML text (for signature)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(...)
  submissions FormSubmission[]
}

model FormSubmission {
  id             String   @id @default(cuid())
  tenantId       String
  formId         String
  clientId       String?
  animalId       String?
  appointmentId  String?
  answers        Json     // field responses
  signatureName  String?
  signedAt       DateTime?
  ipAddress      String?
  createdAt      DateTime @default(now())
  form           IntakeForm @relation(...)
  tenant         Tenant   @relation(...)
}
```

### Technical tasks

#### T6.1 — Form builder UI
- Settings page: "Intake Forms" section
- Drag-and-drop field builder (or simpler: add/reorder fields with up/down arrows)
- Field types: short text, long text, dropdown, radio, checkbox group, file upload
- Service agreement section: rich text editor for the agreement text
- **Acceptance criteria:** Create a form with 5+ field types. Reorder fields. Add agreement text. Save and reload — form persists.

#### T6.2 — Public form page
- `src/app/form/[formId]/[token]/page.tsx` — publicly accessible, no auth
- Render all fields dynamically from `IntakeForm.fields`
- Signature field: canvas-based signature or typed name with checkbox ("I agree")
- File upload: photo/PDF of vaccine certificates → MinIO
- Submit: create `FormSubmission`, optionally create/update `Client` and `VaccineRecord`
- **Acceptance criteria:** Form renders all field types. File upload works. Submission saves to DB. Signature name and timestamp stored.

#### T6.3 — Auto-profile creation from submission
- When a form submission includes name + phone/email:
  - Check if `Client` exists with that phone/email
  - If not: create `Client` (and `Animal` if pet fields present)
  - If yes: update fields that are empty
- Link submission to the client record
- **Acceptance criteria:** Submitting form with new client info creates a Client row. Submitting with existing client phone links to existing client without creating duplicate.

#### T6.4 — Form delivery
- Staff can send a form link via SMS from: client profile, appointment detail
- Action: `sendIntakeForm(clientId, formId)` — generates signed token, sends SMS
- **Acceptance criteria:** Staff taps "Send intake form" → client receives SMS with link → completes form → submission appears in client record.

#### T6.5 — Submission viewer
- In client profile: "Forms" tab showing submitted forms with field answers
- Signature viewer: shows name, timestamp, IP
- Download as PDF (optional — use `@react-pdf/renderer`)
- **Acceptance criteria:** Completed form visible in client profile. All answers displayed correctly.

---

# SPRINT 7 — Packages & Memberships
**Duration:** 2 weeks  
**Goal:** Clients can prepay for bundles (6 grooms for the price of 5) or enroll in recurring memberships. Converts one-time clients into predictable recurring revenue.

### Background & design decisions
- **Packages:** prepaid credit bundles, each session deducts from remaining count
- **Memberships:** recurring Stripe Subscription, monthly billing, access to benefits (priority booking, discounts)
- Both are visible on client profile and appointment card at all times

### Schema changes needed
```prisma
model Package {
  id             String   @id @default(cuid())
  tenantId       String
  name           String   // "6-Groom Bundle"
  serviceId      String?  // null = applies to any service
  totalSessions  Int
  priceCents     Int
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  tenant         Tenant   @relation(...)
  purchases      PackagePurchase[]
}

model PackagePurchase {
  id              String   @id @default(cuid())
  tenantId        String
  clientId        String
  packageId       String
  sessionsTotal   Int
  sessionsUsed    Int      @default(0)
  paidCents       Int
  stripePaymentId String?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  tenant          Tenant   @relation(...)
  client          Client   @relation(...)
  package         Package  @relation(...)
}

model MembershipPlan {
  id                  String   @id @default(cuid())
  tenantId            String
  name                String   // "Monthly Member"
  priceCents          Int      // per month
  stripePriceId       String   // Stripe Price object ID
  benefits            Json     // { discountPct: 10, priorityBooking: true, freeAddOns: ['nail-trim'] }
  active              Boolean  @default(true)
  createdAt           DateTime @default(now())
  tenant              Tenant   @relation(...)
  subscriptions       ClientMembership[]
}

model ClientMembership {
  id                    String   @id @default(cuid())
  tenantId              String
  clientId              String
  planId                String
  stripeSubscriptionId  String   @unique
  status                String   // 'active' | 'cancelled' | 'past_due'
  currentPeriodEnd      DateTime
  createdAt             DateTime @default(now())
  tenant                Tenant   @relation(...)
  client                Client   @relation(...)
  plan                  MembershipPlan @relation(...)
}
```

### Technical tasks

#### T7.1 — Package definition + purchase
- Settings: create/edit packages (name, service, session count, price)
- Staff: "Sell Package" button on client profile → select package → charge via Stripe (card on file) → create `PackagePurchase`
- **Acceptance criteria:** Package purchased → `PackagePurchase` created with `sessionsUsed: 0` → charge visible in Stripe.

#### T7.2 — Package session redemption
- At checkout: if client has an active package for the service being performed, offer "Use package credit"
- Selecting it: sets `Invoice.totalCents = 0`, increments `PackagePurchase.sessionsUsed`
- Show remaining sessions on client profile and appointment card
- **Acceptance criteria:** Using package credit marks invoice as paid (no charge). Session count decrements. When sessions exhausted, package marked as used up.

#### T7.3 — Membership plan setup (Stripe)
- Settings: create membership plan → creates Stripe Product + Price
- Store `stripePriceId` in `MembershipPlan`
- **Acceptance criteria:** Creating a membership plan creates a Stripe Price. The price appears in Stripe dashboard.

#### T7.4 — Client membership enrollment
- Staff enrolls client: `stripe.subscriptions.create({ customer, items: [{ price: stripePriceId }] })`
- Store subscription in `ClientMembership`
- Webhook: `customer.subscription.updated` + `customer.subscription.deleted` → update `ClientMembership.status`
- **Acceptance criteria:** Client enrolled → Stripe Subscription active → monthly charge fires on renewal. Cancellation syncs back via webhook.

#### T7.5 — Membership badge + benefits
- `<MembershipBadge />` component — appears on client profile and appointment card
- At checkout: if client is a member and plan has `discountPct`, auto-apply discount to invoice total
- **Acceptance criteria:** Member client shows badge everywhere. Discount applied automatically at checkout.

---

# SPRINT 8 — Business Reporting & Analytics
**Duration:** 2 weeks  
**Goal:** Shop owners can see revenue, occupancy, staff performance, and client retention in one dashboard — without exporting to Excel.

### Background & design decisions
- All reports are **tenant-scoped** — always filter by `tenantId`
- No external analytics tool — compute from existing DB data using Prisma
- Date ranges: today, this week, this month, last 30 days, custom range
- Charts: use `recharts` (already popular in Next.js ecosystem, no server cost)

### Technical tasks

#### T8.1 — Revenue report
- Query: sum `Invoice.totalCents` where `status = 'PAID'` and `paidAt` in date range
- Break down by: service type, payment method, groomer
- Compare to prior period (e.g. this month vs. last month)
- Chart: line chart for daily revenue, bar chart for service breakdown
- **Acceptance criteria:** Revenue totals match what you'd calculate manually from invoice list. Prior period comparison is accurate.

#### T8.2 — Occupancy rate
- Available slots = sum of all slots in business hours for the period
- Filled slots = count of `CONFIRMED` + `COMPLETED` appointments
- Occupancy % = filled / available
- Break down by day of week and time of day (heatmap)
- **Acceptance criteria:** A day with 8 slots and 6 bookings shows 75%. Heatmap highlights Saturday as busiest.

#### T8.3 — Staff performance
- Per groomer: appointment count, revenue generated, average ticket, tips received, commission owed
- Date range selector
- **Acceptance criteria:** Each groomer's stats are correct. Commission calculation matches the percentage set in their profile.

#### T8.4 — Client retention
- New clients this period: `Client.createdAt` in range
- Returning clients: clients with 2+ appointments in range
- Lapsed clients: clients with last appointment >6 weeks ago (configurable)
- **Acceptance criteria:** "Lapsed clients" list is accurate. Clicking a lapsed client opens their profile.

#### T8.5 — Report UI
- New page: `/app/reports`
- Tab navigation: Revenue / Occupancy / Staff / Retention
- Date range picker (presets + custom)
- Export to CSV button per report
- **Acceptance criteria:** All 4 tabs render without error. CSV export downloads correctly. Date range filter updates all charts.

---

# SPRINT 9 — Abandoned Booking Recovery + Waitlist
**Duration:** 2 weeks  
**Goal:** Capture clients who started booking but didn't finish. Manage waitlists for full days.

### Why this matters
MoeGo users collectively recovered $29.75M in 2024 from abandoned booking recovery alone. This is abandoned cart recovery applied to service bookings — most pet software doesn't build it. Building it is a moat.

### Schema changes needed
```prisma
model AbandonedBooking {
  id            String   @id @default(cuid())
  tenantId      String
  sessionToken  String   @unique
  clientName    String?
  clientPhone   String?
  clientEmail   String?
  serviceId     String?
  lastStep      String   // 'service' | 'datetime' | 'client_info' | 'payment'
  recoveredAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tenant        Tenant   @relation(...)
}

model Waitlist {
  id            String   @id @default(cuid())
  tenantId      String
  clientId      String?
  clientName    String
  clientPhone   String
  serviceId     String?
  requestedDate DateTime?
  notes         String?
  status        String   @default("waiting") // 'waiting' | 'offered' | 'booked' | 'expired'
  createdAt     DateTime @default(now())
  expiresAt     DateTime?
  tenant        Tenant   @relation(...)
}
```

### Technical tasks

#### T9.1 — Abandoned booking tracking
- On each step of public booking flow: POST to `/api/booking/track` with `{ sessionToken, step, partialData }`
- Creates or updates `AbandonedBooking` record
- On completion: mark as recovered
- **Acceptance criteria:** Starting a booking and leaving after step 2 creates an AbandonedBooking with `lastStep: 'datetime'`.

#### T9.2 — Abandoned bookings inbox (staff)
- New section in dashboard: "Abandoned Bookings"
- Table: client name, service they were looking at, drop-off step, time elapsed, "contacted" flag
- Filter by date range
- **Acceptance criteria:** Incomplete booking appears in list with correct step and timestamp.

#### T9.3 — Recovery messaging
- From inbox: "Send recovery text" button → staff can send/edit templated SMS
- Template: "Hi [name], we noticed you didn't finish booking — want us to hold a spot for [pet]? Book here: [link]"
- Mark as contacted
- **Acceptance criteria:** Sending recovery text marks the row as contacted. SMS delivered.

#### T9.4 — Automated recovery (configurable)
- Tenant setting: "Auto-send recovery text after X hours of abandonment"
- BullMQ job: `abandoned_booking_recovery` — fires after configured delay
- Only fires if booking not completed and client gave phone number
- **Acceptance criteria:** 2-hour auto-recovery setting: booking abandoned at 2pm → recovery SMS at 4pm if not completed.

#### T9.5 — Waitlist: join from full booking page
- When booking storefront shows no available slots for a date: "Join the waitlist" button
- Captures name, phone, preferred service, flexible vs. specific date
- Creates `Waitlist` record
- Auto-expires after 7 days (configurable)
- **Acceptance criteria:** Fully booked day shows waitlist option. Joining creates record in staff dashboard.

#### T9.6 — Waitlist staff management
- Waitlist view in staff dashboard
- When a cancellation opens a slot: staff can tap a waitlisted client → send them the slot offer via SMS with a time-limited booking link (link expires in 2 hours)
- If they book: waitlist entry marked as `booked`
- **Acceptance criteria:** Staff sends slot offer → client gets SMS → booking link works for 2 hours → after booking, waitlist entry status updates.

---

# SPRINT 10 — Two-Way SMS & Review Booster
**Duration:** 2 weeks  
**Goal:** All client communication lives inside the app (not staff's personal phones). Reviews are automated with branch logic protecting public reputation.

### Technical tasks

#### T10.1 — Unified message center
- New page: `/app/messages`
- Inbound SMS (via Twilio webhook) creates a thread per client phone number
- List view: threads sorted by most recent, unread indicator
- Thread view: full SMS history (sent by system + sent by staff + received from client)
- **Acceptance criteria:** Client replies to a notification SMS → message appears in dashboard within 5 seconds. Thread shows full history.

#### T10.2 — Staff reply from dashboard
- Compose box in thread view → `sendSms(clientPhone, message)` → logged to thread
- Quick replies: saved templates ("On my way!", "Your dog is ready!", "Running 10 min behind")
- **Acceptance criteria:** Staff reply appears in thread and is delivered to client's phone.

#### T10.3 — Appointment context sidebar
- When viewing a message thread, sidebar shows: client info, upcoming appointment, last visit, pet info, vaccine status
- No switching screens to look up context
- **Acceptance criteria:** Opening a thread with a client who has a tomorrow appointment shows that appointment in the sidebar.

#### T10.4 — Mass text with filters
- "New campaign" button in messages
- Filter clients by: last appointment date range, service type, breed, lapsed status
- Preview recipient count before sending
- Send templated message with merge fields
- **Acceptance criteria:** Filter "clients with no appointment in 8+ weeks" returns correct count. Sending delivers to all matched clients. Opted-out clients are excluded.

#### T10.5 — Review booster automation
- After appointment → `COMPLETED`: enqueue review request job (fires 2h after completion, configurable)
- SMS: "How was [pet]'s visit today? Rate us: [link]"
- `/review/[appointmentId]/[token]` page: 5 star buttons
- 5-star → show Google review deep link (configurable per tenant in settings)
- 1-4 star → show "Tell us what happened" form → save as internal `GroomingNote`
- **Acceptance criteria:** 5-star tap opens Google review link. 3-star tap shows feedback form. Feedback saved as internal note visible in staff dashboard.

#### T10.6 — Review tracking dashboard
- In reports tab: "Reviews" section
- Total requests sent, response rate, average rating, per-groomer breakdown
- **Acceptance criteria:** Sending 10 review requests and receiving 7 responses shows 70% response rate.

---

# SPRINT 11 — Smart Scheduling
**Duration:** 2 weeks  
**Goal:** The calendar prevents double-bookings, supports recurring appointments, and gives a clear multi-staff view. Owners report going from 20+ min of manual scheduling per day to under 5 min after this feature.

### Why this sprint
MoeGo case studies consistently cite Smart Schedule as one of the top time-savers. Currently the app has a basic calendar but no conflict detection, no recurring appointment engine, and no "schedule from history" shortcut. These are daily frustrations for any shop with 2+ groomers.

### Background & design decisions
- **Conflict detection** must be server-side (not just UI) — two staff members could be scheduling simultaneously
- **Recurring appointments** store a `recurrenceRule` (RRULE format) and generate future `Appointment` rows up to 6 months ahead, checked for conflicts before placement
- **Multi-staff view**: color-coded columns per groomer, each card shows pet name, breed, service, duration, status, and behavior flags — no hover needed for critical info
- **Schedule from history**: one-click "rebook same" from any past appointment pre-fills the new appointment form

### Schema changes needed
```prisma
// Add to Appointment model:
recurrenceId    String?   // links recurring instances to a parent rule
recurrenceRule  String?   // RRULE string (e.g. "FREQ=WEEKLY;INTERVAL=4")
isRecurring     Boolean   @default(false)

model RecurrenceRule {
  id          String   @id @default(cuid())
  tenantId    String
  clientId    String
  animalId    String
  serviceId   String
  staffUserId String?
  rrule       String   // RRULE format
  startsAt    DateTime // time of day for the appointment
  durationMinutes Int
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(...)
  appointments Appointment[]
}
```

### Technical tasks

#### T11.1 — Server-side conflict detection
- Create `src/lib/conflict-detection.ts` with `checkConflict(tenantId, staffUserId, startsAt, endsAt, excludeAppointmentId?): boolean`
- Checks against existing `CONFIRMED` + `REQUESTED` appointments for the same staff member in the same time window
- Also checks `AvailabilityBlock` (blocked time)
- Call this in `createAppointment` and `updateAppointment` server actions — reject if conflict detected
- **Acceptance criteria:** Creating two appointments for the same groomer at 10am throws a validation error. Editing an appointment to overlap with another also fails. Unit tests for edge cases (back-to-back is OK, 1-minute overlap is not).

#### T11.2 — Buffer time enforcement
- `Service.bufferBeforeMinutes` and `Service.bufferAfterMinutes` already exist in schema
- Conflict detection must include buffer windows: effective slot = `startsAt - bufferBefore` to `endsAt + bufferAfter`
- Show buffer visually on calendar as a lighter shaded band around the appointment block
- **Acceptance criteria:** A 60-min service with 15-min buffer after blocks a 75-min window. Attempting to schedule during the buffer window fails conflict check.

#### T11.3 — Recurring appointment engine
- Create `createRecurringAppointment(rule: RecurrenceRule)` server action
- Uses `rrule` npm package to expand RRULE into future dates (up to 26 weeks / 6 months)
- For each date: run conflict check before inserting — skip conflicted dates and report them back to staff
- UI: "Make recurring" toggle on appointment form → recurrence picker (weekly, every 2/4/6/8 weeks, custom)
- **Acceptance criteria:** Setting "every 4 weeks" creates appointments at correct dates for 6 months. Any conflicted date is skipped and shown to staff as a warning. Deleting one instance asks "delete this only or all future?"

#### T11.4 — Multi-staff calendar columns
- Calendar page: toggle between "day view by groomer" (columns per groomer) and "week view"
- Each appointment card shows: pet name, breed, service badge, duration, status dot, behavior flag icon (if any)
- Color-coded per groomer (each groomer has a persistent color)
- Drag-to-reschedule (optional stretch goal — do not block sprint on this)
- **Acceptance criteria:** Day view shows one column per active staff member. Appointment cards show required info without expanding. Switching between day and week view is instant.

#### T11.5 — Schedule from history
- On any past `COMPLETED` appointment: "Rebook same" button
- Opens new appointment form pre-filled with: same client, pet, service, groomer, duration, price
- Date defaults to today + pet's preferred cadence days (`Animal.preferredCadenceDays`) or service interval
- **Acceptance criteria:** Clicking "Rebook same" on a past appointment opens the create form pre-filled. Staff only needs to pick a date.

#### T11.6 — Smart alerts for scheduling
- Overcapacity alert: if day's confirmed appointments > tenant-configured max daily capacity, show banner on calendar
- Duplicate booking alert: if same pet is already booked on the same day, warn before saving (not a hard block — staff can override)
- Behavioral flag alert at check-in: if pet has behavior notes (bite history, severe anxiety), show a forced acknowledgment modal at the check-in step — not just a passive note
- **Acceptance criteria:** Booking pet twice in one day shows warning. Checking in a bite-risk pet shows a modal that requires a "I acknowledge" click before proceeding.

---

# SPRINT 12 — Staff Payroll & Commission
**Duration:** 2 weeks  
**Goal:** Shop owners can track groomer hours, calculate commission, split tips, and generate a payroll report — all from Glasshound. Replaces a separate spreadsheet or HR tool.

### Why this sprint
MoeGo positions payroll/commission as a Growth-tier differentiator ($149/mo). Grooming shops with 2+ groomers spend significant time calculating commission manually. This feature is a direct retention driver — once a shop's payroll runs through us, switching cost is very high.

### Background & design decisions
- **Commission model:** percentage per service per groomer (e.g. Jane gets 45% on full grooms, 35% on baths). Flat rate per appointment is also supported.
- **Tip splitting:** tips entered at checkout are split according to configurable rules (e.g. groomer gets 100%, or groomer/bather split 70/30)
- **Clock in/out:** simple timestamp-based, not GPS. Staff clock in via the app. Hours calculated from clock records.
- **Payroll report:** not a full payroll processor (no tax filing) — a report that feeds into whatever payroll tool the owner uses (ADP, Gusto, manual checks)

### Schema changes needed
```prisma
model CommissionRule {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String   // the staff member
  serviceId   String?  // null = applies to all services
  type        String   // 'percentage' | 'flat'
  value       Decimal  // percentage (e.g. 45.00) or flat cents (e.g. 1500)
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(...)
}

model ClockEntry {
  id          String    @id @default(cuid())
  tenantId    String
  userId      String
  clockedInAt DateTime
  clockedOutAt DateTime?
  notes       String?
  createdAt   DateTime  @default(now())
  tenant      Tenant    @relation(...)
}

model TipSplitRule {
  id          String   @id @default(cuid())
  tenantId    String
  groomerPct  Decimal  @default(100)
  batherPct   Decimal  @default(0)
  createdAt   DateTime @default(now())
  tenant      Tenant   @relation(...)
}

// Add to Appointment model:
tipCents     Int   @default(0)
tipGroomerCents Int @default(0)
tipBatherCents  Int @default(0)
```

### Technical tasks

#### T12.1 — Commission rules setup
- Settings page: "Commission" section
- Per-staff, per-service commission rules (or a global default %)
- UI: table of staff × service with percentage input. "Default for all services" shortcut.
- **Acceptance criteria:** Setting 45% for Jane on full grooms saves correctly. Adding a global 40% default applies to all services with no override. Rules are per-tenant.

#### T12.2 — Commission calculation at checkout
- At checkout: after payment is processed, calculate commission earned per groomer
  - `commissionEarned = priceCents × (commissionPct / 100)`
  - If flat rate: `commissionEarned = flatCents`
- Store on invoice/appointment for reporting
- **Acceptance criteria:** Completing a $80 groom with 45% commission rule → $36 commission recorded. Visible in staff payroll report.

#### T12.3 — Tip capture + splitting
- At checkout: "Add tip" field (amount or %)
- Apply `TipSplitRule` to split between groomer and bather
- Store split amounts on appointment
- **Acceptance criteria:** $15 tip with 70/30 split → groomer gets $10.50, bather gets $4.50. Amounts stored on appointment record.

#### T12.4 — Clock in/out
- Staff app: prominent "Clock In" / "Clock Out" button on the Today view
- Creates `ClockEntry` with `clockedInAt` / `clockedOutAt`
- Admin can edit clock entries (for when staff forget to clock out)
- **Acceptance criteria:** Staff clocks in → entry created. Clocking out closes the entry. Admin can edit. Two open entries for same user on same day shows a warning.

#### T12.5 — Payroll report
- Report page "Payroll" tab: date range selector
- Per groomer: hours worked (from clock entries), appointments completed, services revenue, commission earned, tips received
- Summary row: total payout per groomer for the period
- Export to CSV
- **Acceptance criteria:** Report for a 2-week period matches manually calculated totals. CSV exports correctly. Only shows staff within the tenant.

#### T12.6 — Staff performance card
- Each groomer's profile page shows a performance summary: avg ticket, appointments/week, top services, avg tip, total commission YTD
- Admin-only view — individual groomers cannot see each other's stats (controlled by permissions)
- **Acceptance criteria:** Admin sees all groomers' stats. A groomer logged in can only see their own. Stats match the payroll report for the same period.

---

# SPRINT 13 — Retail & Inventory
**Duration:** 2 weeks  
**Goal:** Grooming shops can sell shampoos, treats, accessories, and retail products at checkout alongside services. Stock is tracked automatically.

### Why this sprint
MoeGo's assessment notes that retail adds an average $12–18/visit revenue layer for shops that enable it. It's also a stickiness feature — once a shop's product catalog and stock tracking lives in Glasshound, they don't switch platforms. Many grooming shops already sell products; they're just tracking inventory in a spreadsheet or not at all.

### Background & design decisions
- Products are sold **alongside services** in a unified checkout — one invoice, one payment
- Stock is tracked per product: current quantity, low-stock alert threshold
- No barcode scanner required for MVP — manual quantity entry is sufficient
- Promo codes / bundles are a stretch goal, not MVP
- No supplier ordering integration in MVP — just stock tracking and alerts

### Schema changes needed
```prisma
model Product {
  id            String   @id @default(cuid())
  tenantId      String
  name          String
  description   String?
  sku           String?
  priceCents    Int
  costCents     Int?     // for margin reporting
  stockQty      Int      @default(0)
  lowStockAlert Int      @default(5)
  active        Boolean  @default(true)
  imageUrl      String?
  category      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tenant        Tenant   @relation(...)
  invoiceLines  InvoiceProductLine[]
}

model InvoiceProductLine {
  id          String   @id @default(cuid())
  invoiceId   String
  productId   String
  name        String   // snapshot at time of sale
  qty         Int
  unitCents   Int
  totalCents  Int
  invoice     Invoice  @relation(...)
  product     Product  @relation(...)
}

// Add to Invoice model:
productLines  InvoiceProductLine[]
```

### Technical tasks

#### T13.1 — Product catalog management
- Settings: "Products" section — CRUD for products
- Fields: name, SKU, price, cost (optional), stock quantity, low-stock threshold, category, photo
- Photo upload to MinIO
- **Acceptance criteria:** Create a product. It appears in the product list. Edit price — invoice uses updated price for new sales only (not historical). Archive (soft delete) removes from checkout but preserves sales history.

#### T13.2 — Add products to checkout
- Checkout UI: "Add product" button opens a searchable product picker
- Each added product appears as a line item on the invoice
- Quantity input per product
- Invoice total updates live as products are added
- **Acceptance criteria:** Adding 2 units of a $15 shampoo adds $30 to the invoice. Checkout charges the correct total. Product appears on the invoice PDF/receipt.

#### T13.3 — Stock deduction on sale
- When invoice is marked PAID: decrement `Product.stockQty` by the quantity sold
- If stock would go negative: show warning (not a hard block — staff can override)
- **Acceptance criteria:** Selling 3 units of a product with 5 in stock → stock becomes 2. Selling 6 units with 5 in stock shows a warning but allows completion.

#### T13.4 — Low stock alerts
- BullMQ job: `check_low_stock` — runs nightly per tenant
- If any product's `stockQty <= lowStockAlert`: send email to tenant owner
- In dashboard: products with low stock show a warning badge in the product list
- **Acceptance criteria:** Product with stock = 4 and threshold = 5 shows warning badge. Owner receives email. Product with stock = 6 and threshold = 5 shows no warning.

#### T13.5 — Stock adjustment
- Staff (admin only) can manually adjust stock: "Receive inventory" (add qty) or "Write off" (remove qty, with reason)
- Creates an audit log entry for every adjustment
- **Acceptance criteria:** Adding 24 units via "Receive inventory" increments stock. AuditLog records who adjusted, when, how many, and why.

#### T13.6 — Retail sales report
- Reports tab: "Retail" section
- Top-selling products by revenue and quantity
- Margin per product (if cost is entered)
- Date range filter
- **Acceptance criteria:** Report shows correct revenue per product for the selected period. Margin column shows `(price - cost) / price × 100` where cost is entered.

---

# SPRINT 14 — Marketing Integrations
**Duration:** 2 weeks  
**Goal:** Glasshound connects to the tools grooming shops already use — Google for discovery, QuickBooks for accounting, Analytics for understanding traffic.

### Why this sprint
From the MoeGo assessment: "2 Princess Pet Grooming reported 300+ bookings in the first three months after enabling Reserve with Google." Reserve with Google puts a "Book online" button directly on the salon's Google Search and Maps listing — zero extra steps for a client who finds them on Google. This is a top-of-funnel acquisition channel that costs nothing to run. QuickBooks sync replaces manual bookkeeping. These integrations close the loop from acquisition to accounting.

### Background & design decisions
- **Reserve with Google:** requires Google Business Profile API + Google Maps Booking API. Tenant provides their Google Business Profile ID. The integration feeds availability data to Google and receives booking requests through the standard booking flow.
- **QuickBooks:** use QuickBooks Online API (OAuth 2.0). All PAID invoices sync as sales receipts. Refunds sync as credit memos. Revenue categories map to QuickBooks chart of accounts.
- **Google Analytics:** inject `gtag.js` on the public booking storefront (`/book/[slug]`) using the tenant's GA4 Measurement ID. Track key events: `begin_checkout`, `add_service`, `booking_completed`, `booking_abandoned`.
- **Google Ads:** conversion tracking for bookings completed — sends a conversion event to the tenant's Google Ads account when a booking is confirmed.

### Schema changes needed
```prisma
// Add to Tenant model:
googleBusinessProfileId  String?
googleAnalyticsMeasurementId String?
googleAdsConversionId    String?
quickbooksRealmId        String?
quickbooksAccessToken    String?  // encrypted
quickbooksRefreshToken   String?  // encrypted
quickbooksTokenExpiresAt DateTime?
reserveWithGoogleEnabled Boolean  @default(false)
```

### Technical tasks

#### T14.1 — Reserve with Google
- Tenant settings: "Reserve with Google" section — enter Google Business Profile URL/ID, enable toggle
- Implement Google Maps Booking API feed: expose availability endpoint in the format Google expects
- When a booking comes in via Google: create appointment with `source: 'GOOGLE_RESERVE'` and flow through standard booking request review
- **Acceptance criteria:** After setup, a "Book online" button appears on the salon's Google Maps listing (test with a real Google Business Profile). Booking via Google creates a correctly sourced appointment.

#### T14.2 — QuickBooks OAuth connection
- Settings: "Accounting" section — "Connect QuickBooks" button → OAuth 2.0 flow → stores tokens encrypted in DB
- Token refresh handled automatically (QuickBooks tokens expire in 1 hour, refresh tokens last 100 days)
- Disconnect button clears tokens
- **Acceptance criteria:** Clicking "Connect QuickBooks" redirects to QuickBooks auth, returns to Glasshound, and shows "Connected as [QuickBooks company name]."

#### T14.3 — QuickBooks invoice sync
- BullMQ job: `sync_invoice_to_quickbooks` — enqueued when `Invoice.status → PAID`
- Creates a QuickBooks Sales Receipt with line items matching the invoice
- Maps Glasshound service → QuickBooks income account (configurable per service category)
- Refunds: when invoice is refunded, create a QuickBooks Credit Memo
- **Acceptance criteria:** Marking an invoice paid → Sales Receipt appears in QuickBooks within 60 seconds. Line items match. Refund creates Credit Memo.

#### T14.4 — QuickBooks sync status UI
- In invoice detail: "Synced to QuickBooks ✓" badge with link to the QuickBooks record
- In settings: sync log showing last 20 sync events with status (success/failed) and error detail
- Manual "Retry sync" button for failed syncs
- **Acceptance criteria:** Synced invoices show badge. Failed syncs show error message. Retry button re-enqueues the sync job.

#### T14.5 — Google Analytics on booking storefront
- In `src/app/book/[slug]/layout.tsx`: if `tenant.googleAnalyticsMeasurementId` is set, inject `<Script>` tag with gtag.js
- Fire custom events:
  - `gtag('event', 'begin_checkout')` — on service selection (step 1)
  - `gtag('event', 'add_to_cart')` — on time slot selection (step 2)
  - `gtag('event', 'purchase')` — on booking confirmation
  - `gtag('event', 'booking_abandoned')` — on page unload after step 1+ without completing
- **Acceptance criteria:** With GA4 in debug mode, all 4 events fire at the correct steps. Events appear in GA4 DebugView.

#### T14.6 — Google Ads conversion tracking
- If `tenant.googleAdsConversionId` is set: fire a conversion event on booking confirmation page
- Use `gtag('event', 'conversion', { send_to: conversionId })` on the confirmation screen
- **Acceptance criteria:** Completing a booking fires the conversion event. Visible in Google Ads conversion tracking with a test conversion tag.

#### T14.7 — Integration settings UI
- Settings: "Integrations" page with cards for each integration
  - Google Analytics: input field for Measurement ID, test button
  - Google Ads: input for Conversion ID
  - QuickBooks: OAuth connect/disconnect, sync log
  - Reserve with Google: enable toggle, Google Business Profile ID input, setup guide link
- **Acceptance criteria:** Each integration card shows connected/disconnected status clearly. Disconnecting an integration stops all sync activity for that tenant.

---

## Definition of done (applies to every task)
- [ ] Feature works in production Docker environment (not just local)
- [ ] All DB queries include `tenantId` scope — no cross-tenant data leakage
- [ ] Server actions validate input with Zod
- [ ] Error states handled — no unhandled promise rejections, no blank screens on error
- [ ] Mobile responsive — tested at 375px width (iPhone SE)
- [ ] AuditLog entry created for all mutations (create/update/delete)
- [ ] No `console.log` left in production code

## How to pick up a sprint
1. Read the sprint section above — understand the *why* before the *what*
2. Check `prisma/schema.prisma` for any schema changes listed — run `npx prisma migrate dev` to apply
3. Look at existing patterns in `src/server/actions/` before writing new ones — follow the same structure
4. Add env vars to `.env.local` and to the server's `/opt/pawreception/.env`
5. After completing, push to `main` — CD pipeline will deploy automatically
