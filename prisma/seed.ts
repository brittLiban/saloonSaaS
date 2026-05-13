import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function appt(
  tenantId: string,
  id: string,
  clientId: string,
  animalId: string,
  serviceId: string,
  priceCents: number,
  durationMinutes: number,
  isoStart: string,
  status: string,
  source = "DASHBOARD",
) {
  const startsAt = new Date(isoStart);
  const endsAt   = new Date(startsAt.getTime() + durationMinutes * 60_000);
  return prisma.appointment.upsert({
    where: { id },
    update: { status: status as never, startsAt, endsAt, durationMinutes, priceCents },
    create: { id, tenantId, clientId, animalId, serviceId, priceCents, startsAt, endsAt, durationMinutes, status: status as never, source: source as never },
  });
}

function invoice(
  tenantId: string,
  id: string,
  number: string,
  clientId: string,
  animalId: string,
  appointmentId: string | null,
  lineName: string,
  unitCents: number,
  status: string,
  issuedAt: string | null,
  paidAt: string | null,
) {
  const lineItems = [{ description: lineName, quantity: 1, unitCents }];
  return prisma.invoice.upsert({
    where: { id },
    update: {},
    create: {
      id, tenantId, clientId, animalId, appointmentId,
      number, status: status as never,
      lineItems: lineItems as never,
      subtotalCents: unitCents, taxCents: 0, totalCents: unitCents,
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      paidAt:   paidAt   ? new Date(paidAt)   : null,
    },
  });
}

async function note(
  tenantId: string,
  id: string,
  clientId: string,
  animalId: string,
  authorUserId: string,
  tag: string,
  body: string,
) {
  return prisma.groomingNote.upsert({
    where: { id },
    update: {},
    create: { id, tenantId, clientId, animalId, authorUserId, tag, body },
  });
}

async function upsertService(
  tenantId: string,
  name: string,
  durationMinutes: number,
  bufferAfterMinutes: number,
  priceCents: number,
  description: string,
  species?: string,
) {
  return prisma.service.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { durationMinutes, priceCents, description, active: true, bufferAfterMinutes, species: species ?? null },
    create: { tenantId, name, durationMinutes, bufferAfterMinutes, priceCents, description, species: species ?? null },
  });
}

async function upsertAddOn(
  tenantId: string,
  name: string,
  durationMinutes: number,
  priceCents: number,
  description: string,
  serviceIds: string[],
  species?: string,
) {
  const addOn = await prisma.addOn.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { durationMinutes, priceCents, description, active: true, species: species ?? null },
    create: { tenantId, name, durationMinutes, priceCents, description, species: species ?? null },
  });

  await prisma.serviceAddOn.deleteMany({ where: { addOnId: addOn.id } });
  if (serviceIds.length > 0) {
    await prisma.serviceAddOn.createMany({
      data: serviceIds.map((serviceId) => ({ serviceId, addOnId: addOn.id })),
      skipDuplicates: true,
    });
  }

  return addOn;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const passwordHash = await bcrypt.hash("demo-password", 12);

  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "ninas-pet-salon" },
    update: {
      businessHours: {
        sunday:    [],
        monday:    [{ opens: "07:30", closes: "18:00" }],
        tuesday:   [{ opens: "07:30", closes: "18:00" }],
        wednesday: [{ opens: "07:30", closes: "18:00" }],
        thursday:  [{ opens: "07:30", closes: "18:00" }],
        friday:    [{ opens: "07:30", closes: "18:00" }],
        saturday:  [{ opens: "08:00", closes: "16:00" }],
      },
    },
    create: {
      name: "Nina's Pet Salon",
      slug: "ninas-pet-salon",
      timezone: "America/Los_Angeles",
      address: "1648 S 310th St, Ste 4A, Federal Way, WA",
      phone: "(206) 651-7746",
      email: "ninaspetsalon@example.com",
      themeTokens: { accent: "#7c2f24", typography: "fraunces-inter", density: "regular", mode: "light" },
      businessHours: {
        sunday:    [],
        monday:    [{ opens: "07:30", closes: "18:00" }],
        tuesday:   [{ opens: "07:30", closes: "18:00" }],
        wednesday: [{ opens: "07:30", closes: "18:00" }],
        thursday:  [{ opens: "07:30", closes: "18:00" }],
        friday:    [{ opens: "07:30", closes: "18:00" }],
        saturday:  [{ opens: "08:00", closes: "16:00" }],
      },
      bookingRules: { defaultBufferBeforeMinutes: 0, defaultBufferAfterMinutes: 15, allowOverlap: false },
    },
  });

  // ── Owner ────────────────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: "nina@example.com" },
    update: { passwordHash },
    create: { email: "nina@example.com", name: "Nina Reyes", passwordHash },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: "OWNER" },
    create: { tenantId: tenant.id, userId: owner.id, role: "OWNER" },
  });

  // ── Services ─────────────────────────────────────────────────────────────────
  const [bathBrush, fullGroom, deShed, nailTrim, catGroom, puppyGroom] = await Promise.all([
    upsertService(tenant.id, "Bath & Brush",        60,  15, 6500, "Hydration bath, blow-out, brush, ears, and nails."),
    upsertService(tenant.id, "Full Groom",          120, 15, 9500, "Bath, cut, sanitary trim, paw pads, nails, and ears."),
    upsertService(tenant.id, "De-shed Treatment",   90,  15, 8500, "Undercoat removal with conditioning rinse."),
    upsertService(tenant.id, "Nail Trim",           20,  5,  1800, "Quick nail trim. Walk-in or add-on."),
    upsertService(tenant.id, "Cat Groom",           75,  15, 7500, "Low-stress lion cut or sanitary trim for cats.", "Cat"),
    upsertService(tenant.id, "Puppy First Groom",   45,  10, 5500, "Gentle intro groom for puppies under 1 year.", "Dog"),
  ]);

  await Promise.all([
    upsertAddOn(tenant.id, "Deshedding",               30, 2500, "Extra undercoat removal and carding.",             [bathBrush.id, fullGroom.id, deShed.id, puppyGroom.id], "Dog"),
    upsertAddOn(tenant.id, "Teeth Brushing",           10, 1200, "Tooth brushing with pet-safe toothpaste.",         [bathBrush.id, fullGroom.id, catGroom.id, puppyGroom.id]),
    upsertAddOn(tenant.id, "Flea Treatment",           20, 2000, "Flea shampoo and coat treatment.",                 [bathBrush.id, fullGroom.id, puppyGroom.id], "Dog"),
    upsertAddOn(tenant.id, "Nail Grinding",            15, 1500, "Dremel finish after nail trim.",                   [bathBrush.id, fullGroom.id, nailTrim.id, puppyGroom.id]),
    upsertAddOn(tenant.id, "Dematting",                20, 1800, "Gentle mat removal before or during groom.",       [bathBrush.id, fullGroom.id, deShed.id, puppyGroom.id]),
    upsertAddOn(tenant.id, "Ear Cleaning",             10, 1000, "Ear canal cleaning and drying.",                   [bathBrush.id, fullGroom.id, catGroom.id, puppyGroom.id]),
    upsertAddOn(tenant.id, "Anal Gland Expression",    10, 1500, "External anal gland relief.",                      [bathBrush.id, fullGroom.id, puppyGroom.id]),
    upsertAddOn(tenant.id, "Face, Feet & Tail Grooming", 15, 1200, "Tidy trim of face, paws, and tail area.",       [bathBrush.id, fullGroom.id, puppyGroom.id]),
  ]);

  // ── Clients ──────────────────────────────────────────────────────────────────
  const [cMarcus, cPriya, cJames, cDelia, cKevin, cSarah, cTom, cFiona] = await Promise.all([
    prisma.client.upsert({
      where: { id: "demo_client_marcus" }, update: {},
      create: { id: "demo_client_marcus", tenantId: tenant.id, name: "Marcus Holloway", phone: "(253) 555-0190", email: "marcus@example.com", tier: "Regular", notes: "Atlas is calmer if Marcus stays nearby during nail trim." },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_priya" }, update: {},
      create: { id: "demo_client_priya", tenantId: tenant.id, name: "Priya Sharma", phone: "(206) 555-0312", email: "priya@example.com", tier: "VIP", notes: "Monthly standing appointment. Prefers early morning slots." },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_james" }, update: {},
      create: { id: "demo_client_james", tenantId: tenant.id, name: "James & Rosa Chen", phone: "(253) 555-0477", email: "jrchen@example.com", tier: "Regular" },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_delia" }, update: {},
      create: { id: "demo_client_delia", tenantId: tenant.id, name: "Delia Park", phone: "(206) 555-0581", email: "delia@example.com", tier: "VIP", notes: "Cosmo has reactivity around other dogs. Schedule first slot of the morning." },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_kevin" }, update: {},
      create: { id: "demo_client_kevin", tenantId: tenant.id, name: "Kevin Tran", phone: "(253) 555-0629", email: "kevin@example.com", tier: "New" },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_sarah" }, update: {},
      create: { id: "demo_client_sarah", tenantId: tenant.id, name: "Sarah Okafor", phone: "(206) 555-0743", email: "sarah@example.com", tier: "Regular" },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_tom" }, update: {},
      create: { id: "demo_client_tom", tenantId: tenant.id, name: "Tom Nakamura", phone: "(253) 555-0864", email: "tom@example.com", tier: "VIP", notes: "Redwood needs de-shed every 6 weeks minimum. Very heavy shedder." },
    }),
    prisma.client.upsert({
      where: { id: "demo_client_fiona" }, update: {},
      create: { id: "demo_client_fiona", tenantId: tenant.id, name: "Fiona Walsh", phone: "(206) 555-0951", email: "fiona@example.com", tier: "Regular" },
    }),
  ]);

  // ── Animals ──────────────────────────────────────────────────────────────────
  const [
    aAtlas, aBiscuit, aLuna, aMochi, aCosmo, aPickles, aDuchess, aBean, aRedwood, aNoodle
  ] = await Promise.all([
    // Atlas - Marcus's Bernese Mountain Dog
    prisma.animal.upsert({
      where: { id: "demo_animal_atlas" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-22T17:00:00Z") },
      create: { id: "demo_animal_atlas", tenantId: tenant.id, clientId: cMarcus.id, name: "Atlas", species: "Dog", breed: "Bernese Mountain Dog", sex: "M", dateOfBirth: new Date("2020-06-22"), weightLbs: "92.00", vaccinated: true, allergies: ["Tea-tree oil"], behaviorFlags: ["Gentle giant", "Owner nearby for nail trim"], preferredCadenceDays: 35, lastVisitAt: new Date("2026-04-22T17:00:00Z"), careSummary: "Long double coat. Use low-stress dryer ramp-up. Avoid tea-tree." },
    }),
    // Biscuit - Priya's Golden Retriever
    prisma.animal.upsert({
      where: { id: "demo_animal_biscuit" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-28T10:00:00Z") },
      create: { id: "demo_animal_biscuit", tenantId: tenant.id, clientId: cPriya.id, name: "Biscuit", species: "Dog", breed: "Golden Retriever", sex: "F", dateOfBirth: new Date("2019-03-14"), weightLbs: "68.00", vaccinated: true, allergies: ["Oatmeal shampoo"], behaviorFlags: ["Mouthy when nervous", "Loves water"], preferredCadenceDays: 28, lastVisitAt: new Date("2026-04-28T10:00:00Z"), careSummary: "Feathering on ears and tail needs extra attention. Avoid oatmeal shampoo." },
    }),
    // Luna - Priya's cat
    prisma.animal.upsert({
      where: { id: "demo_animal_luna" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-01T11:00:00Z") },
      create: { id: "demo_animal_luna", tenantId: tenant.id, clientId: cPriya.id, name: "Luna", species: "Cat", breed: "Domestic Shorthair", sex: "F", dateOfBirth: new Date("2021-11-02"), weightLbs: "9.50", vaccinated: true, allergies: [], behaviorFlags: ["Fear of dryers", "Prefers towel-dry"], preferredCadenceDays: 60, lastVisitAt: new Date("2026-04-01T11:00:00Z"), careSummary: "Towel dry only — very fearful of forced air. Low-stress handling protocol." },
    }),
    // Mochi - James & Rosa's Shih Tzu
    prisma.animal.upsert({
      where: { id: "demo_animal_mochi" }, update: { vaccinated: true, lastVisitAt: new Date("2026-05-01T09:00:00Z") },
      create: { id: "demo_animal_mochi", tenantId: tenant.id, clientId: cJames.id, name: "Mochi", species: "Dog", breed: "Shih Tzu", sex: "M", dateOfBirth: new Date("2022-08-18"), weightLbs: "12.00", vaccinated: true, allergies: [], behaviorFlags: ["Mat-prone coat", "Wriggles during face trim"], preferredCadenceDays: 28, lastVisitAt: new Date("2026-05-01T09:00:00Z"), careSummary: "Prone to matting behind ears. Recommend 4-week cadence." },
    }),
    // Cosmo - Delia's German Shepherd
    prisma.animal.upsert({
      where: { id: "demo_animal_cosmo" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-07T07:30:00Z") },
      create: { id: "demo_animal_cosmo", tenantId: tenant.id, clientId: cDelia.id, name: "Cosmo", species: "Dog", breed: "German Shepherd", sex: "M", dateOfBirth: new Date("2021-01-30"), weightLbs: "78.00", vaccinated: true, allergies: [], behaviorFlags: ["Dog-reactive", "First appointment of day only", "High anxiety"], preferredCadenceDays: 45, lastVisitAt: new Date("2026-04-07T07:30:00Z"), careSummary: "Must be first dog in. Reactive to other dogs — no lobby wait. Delia stays close." },
    }),
    // Pickles - Kevin's Corgi
    prisma.animal.upsert({
      where: { id: "demo_animal_pickles" }, update: { vaccinated: true, lastVisitAt: new Date("2026-05-06T10:00:00Z") },
      create: { id: "demo_animal_pickles", tenantId: tenant.id, clientId: cKevin.id, name: "Pickles", species: "Dog", breed: "Pembroke Welsh Corgi", sex: "M", dateOfBirth: new Date("2025-08-05"), weightLbs: "18.50", vaccinated: true, allergies: [], behaviorFlags: ["Puppy — first groom"], preferredCadenceDays: 42, lastVisitAt: new Date("2026-05-06T10:00:00Z"), careSummary: "First groom was May 6. Very wiggly but no aggression. Positive reinforcement works well." },
    }),
    // Duchess - Sarah's Standard Poodle
    prisma.animal.upsert({
      where: { id: "demo_animal_duchess" }, update: { vaccinated: true, lastVisitAt: new Date("2026-05-05T08:00:00Z") },
      create: { id: "demo_animal_duchess", tenantId: tenant.id, clientId: cSarah.id, name: "Duchess", species: "Dog", breed: "Standard Poodle", sex: "F", dateOfBirth: new Date("2018-05-12"), weightLbs: "55.00", vaccinated: true, allergies: [], behaviorFlags: ["Show cut monthly"], preferredCadenceDays: 28, lastVisitAt: new Date("2026-05-05T08:00:00Z"), careSummary: "Monthly show cut. Dutch braid on topknot. Owner provides pattern photo each visit." },
    }),
    // Bean - Sarah's cat
    prisma.animal.upsert({
      where: { id: "demo_animal_bean" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-07T11:00:00Z") },
      create: { id: "demo_animal_bean", tenantId: tenant.id, clientId: cSarah.id, name: "Bean", species: "Cat", breed: "Tabby", sex: "M", dateOfBirth: new Date("2020-02-14"), weightLbs: "13.00", vaccinated: true, allergies: [], behaviorFlags: ["Occasional bath only", "Tolerates handling well"], preferredCadenceDays: 90, lastVisitAt: new Date("2026-04-07T11:00:00Z"), careSummary: "Easy cat — no issues. Just a bath and blow-out a couple times a year." },
    }),
    // Redwood - Tom's Alaskan Malamute
    prisma.animal.upsert({
      where: { id: "demo_animal_redwood" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-28T13:00:00Z") },
      create: { id: "demo_animal_redwood", tenantId: tenant.id, clientId: cTom.id, name: "Redwood", species: "Dog", breed: "Alaskan Malamute", sex: "M", dateOfBirth: new Date("2019-10-03"), weightLbs: "110.00", vaccinated: true, allergies: [], behaviorFlags: ["Heavy double coat", "Blows coat twice a year"], preferredCadenceDays: 42, lastVisitAt: new Date("2026-04-28T13:00:00Z"), careSummary: "Extreme undercoat — takes 90 min minimum de-shed. Two HV dryer passes. Bring extra towels." },
    }),
    // Noodle - Fiona's Dachshund
    prisma.animal.upsert({
      where: { id: "demo_animal_noodle" }, update: { vaccinated: true, lastVisitAt: new Date("2026-04-14T10:00:00Z") },
      create: { id: "demo_animal_noodle", tenantId: tenant.id, clientId: cFiona.id, name: "Noodle", species: "Dog", breed: "Miniature Dachshund", sex: "F", dateOfBirth: new Date("2023-03-22"), weightLbs: "10.00", vaccinated: true, allergies: [], behaviorFlags: ["Squirmy — use grooming loop"], preferredCadenceDays: 42, lastVisitAt: new Date("2026-04-14T10:00:00Z"), careSummary: "Long-hair variant. Feathering on ears and chest. Very squirmy — use loop." },
    }),
  ]);

  // ── Appointments ─────────────────────────────────────────────────────────────
  // Past completed (spread over 8+ weeks for the revenue chart)
  await Promise.all([
    // Week of Mar 16
    appt(tenant.id, "a_biscuit_mar16",  cPriya.id,  aBiscuit.id, fullGroom.id, 9500, 120, "2026-03-16T08:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_noodle_mar17",   cFiona.id,  aNoodle.id,  bathBrush.id, 6500, 60,  "2026-03-17T10:00:00Z", "COMPLETED"),
    // Week of Mar 23
    appt(tenant.id, "a_atlas_mar23",    cMarcus.id, aAtlas.id,   deShed.id,    8500, 90,  "2026-03-24T09:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_mochi_mar25",    cJames.id,  aMochi.id,   fullGroom.id, 9500, 120, "2026-03-25T14:00:00Z", "COMPLETED"),
    // Week of Mar 30
    appt(tenant.id, "a_cosmo_apr1",     cDelia.id,  aCosmo.id,   fullGroom.id, 9500, 120, "2026-04-01T07:30:00Z", "COMPLETED"),
    appt(tenant.id, "a_luna_apr2",      cPriya.id,  aLuna.id,    catGroom.id,  7500, 75,  "2026-04-02T11:00:00Z", "COMPLETED"),
    // Week of Apr 7
    appt(tenant.id, "a_duchess_apr7",   cSarah.id,  aDuchess.id, fullGroom.id, 9500, 120, "2026-04-07T08:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_bean_apr7",      cSarah.id,  aBean.id,    catGroom.id,  7500, 75,  "2026-04-07T11:00:00Z", "COMPLETED"),
    // Week of Apr 14
    appt(tenant.id, "a_redwood_apr14",  cTom.id,    aRedwood.id, deShed.id,    8500, 90,  "2026-04-14T13:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_noodle_apr14",   cFiona.id,  aNoodle.id,  bathBrush.id, 6500, 60,  "2026-04-14T10:00:00Z", "COMPLETED"),
    // Week of Apr 21
    appt(tenant.id, "demo_appt_atlas",  cMarcus.id, aAtlas.id,   fullGroom.id, 9500, 120, "2026-04-22T17:00:00Z", "COMPLETED"), // existing id
    appt(tenant.id, "a_pickles_apr24",  cKevin.id,  aPickles.id, puppyGroom.id,5500, 45,  "2026-04-24T10:00:00Z", "COMPLETED"),
    // Week of Apr 28
    appt(tenant.id, "a_redwood_apr28",  cTom.id,    aRedwood.id, deShed.id,    8500, 90,  "2026-04-28T13:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_biscuit_apr28",  cPriya.id,  aBiscuit.id, bathBrush.id, 6500, 60,  "2026-04-28T10:00:00Z", "COMPLETED"),
    // Week of May 5
    appt(tenant.id, "a_mochi_may1",     cJames.id,  aMochi.id,   fullGroom.id, 9500, 120, "2026-05-01T09:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_duchess_may5",   cSarah.id,  aDuchess.id, nailTrim.id,  1800, 20,  "2026-05-05T08:00:00Z", "COMPLETED"),
    appt(tenant.id, "a_pickles_may6",   cKevin.id,  aPickles.id, puppyGroom.id,5500, 45,  "2026-05-06T10:00:00Z", "COMPLETED"),
    // Cancelled
    appt(tenant.id, "a_luna_may7_x",   cPriya.id,  aLuna.id,    catGroom.id,  7500, 75,  "2026-05-07T11:00:00Z", "CANCELLED"),
    // TODAY (2026-05-08) — active run of show
    appt(tenant.id, "a_noodle_today",   cFiona.id,  aNoodle.id,  bathBrush.id, 6500, 60,  "2026-05-08T09:00:00Z", "CHECKED_IN"),
    appt(tenant.id, "a_redwood_today",  cTom.id,    aRedwood.id, deShed.id,    8500, 90,  "2026-05-08T11:30:00Z", "IN_PROGRESS"),
    appt(tenant.id, "a_cosmo_today",    cDelia.id,  aCosmo.id,   fullGroom.id, 9500, 120, "2026-05-08T14:00:00Z", "CONFIRMED"),
    appt(tenant.id, "a_atlas_today",    cMarcus.id, aAtlas.id,   fullGroom.id, 9500, 120, "2026-05-08T16:30:00Z", "CONFIRMED"),
    // Upcoming this week
    appt(tenant.id, "a_biscuit_may12",  cPriya.id,  aBiscuit.id, fullGroom.id, 9500, 120, "2026-05-12T08:00:00Z", "CONFIRMED"),
    appt(tenant.id, "a_luna_may13",     cPriya.id,  aLuna.id,    catGroom.id,  7500, 75,  "2026-05-13T11:00:00Z", "CONFIRMED"),
    appt(tenant.id, "a_mochi_may15",    cJames.id,  aMochi.id,   bathBrush.id, 6500, 60,  "2026-05-15T09:00:00Z", "CONFIRMED"),
    appt(tenant.id, "a_noodle_may19",   cFiona.id,  aNoodle.id,  bathBrush.id, 6500, 60,  "2026-05-19T10:00:00Z", "CONFIRMED"),
  ]);

  // ── Invoices ─────────────────────────────────────────────────────────────────
  await Promise.all([
    // Paid — matching past completed appointments
    invoice(tenant.id, "inv_001", "0001", cPriya.id,  aBiscuit.id, "a_biscuit_mar16",  "Full Groom — Biscuit",             9500, "PAID", "2026-03-16", "2026-03-17"),
    invoice(tenant.id, "inv_002", "0002", cFiona.id,  aNoodle.id,  "a_noodle_mar17",   "Bath & Brush — Noodle",            6500, "PAID", "2026-03-17", "2026-03-17"),
    invoice(tenant.id, "inv_003", "0003", cMarcus.id, aAtlas.id,   "a_atlas_mar23",    "De-shed Treatment — Atlas",        8500, "PAID", "2026-03-24", "2026-03-25"),
    invoice(tenant.id, "inv_004", "0004", cJames.id,  aMochi.id,   "a_mochi_mar25",    "Full Groom — Mochi",               9500, "PAID", "2026-03-25", "2026-03-26"),
    invoice(tenant.id, "inv_005", "0005", cDelia.id,  aCosmo.id,   "a_cosmo_apr1",     "Full Groom — Cosmo",               9500, "PAID", "2026-04-01", "2026-04-02"),
    invoice(tenant.id, "inv_006", "0006", cPriya.id,  aLuna.id,    "a_luna_apr2",      "Cat Groom — Luna",                 7500, "PAID", "2026-04-02", "2026-04-03"),
    invoice(tenant.id, "inv_007", "0007", cSarah.id,  aDuchess.id, "a_duchess_apr7",   "Full Groom — Duchess",             9500, "PAID", "2026-04-07", "2026-04-08"),
    invoice(tenant.id, "inv_008", "0008", cSarah.id,  aBean.id,    "a_bean_apr7",      "Cat Groom — Bean",                 7500, "PAID", "2026-04-07", "2026-04-07"),
    invoice(tenant.id, "inv_009", "0009", cTom.id,    aRedwood.id, "a_redwood_apr14",  "De-shed Treatment — Redwood",      8500, "PAID", "2026-04-14", "2026-04-16"),
    invoice(tenant.id, "inv_010", "0010", cMarcus.id, aAtlas.id,   "demo_appt_atlas",  "Full Groom — Atlas",               9500, "PAID", "2026-04-22", "2026-04-23"),
    // Sent / Unpaid — recent completed, awaiting payment
    invoice(tenant.id, "inv_011", "0011", cTom.id,    aRedwood.id, "a_redwood_apr28",  "De-shed Treatment — Redwood",      8500, "SENT", "2026-04-28", null),
    invoice(tenant.id, "inv_012", "0012", cPriya.id,  aBiscuit.id, "a_biscuit_apr28",  "Bath & Brush — Biscuit",           6500, "UNPAID", "2026-04-29", null),
    invoice(tenant.id, "inv_013", "0013", cJames.id,  aMochi.id,   "a_mochi_may1",     "Full Groom — Mochi",               9500, "SENT", "2026-05-01", null),
    // Draft — just created
    invoice(tenant.id, "inv_014", "0014", cSarah.id,  aDuchess.id, "a_duchess_may5",   "Nail Trim — Duchess",              1800, "DRAFT", null, null),
    invoice(tenant.id, "inv_015", "0015", cKevin.id,  aPickles.id, "a_pickles_may6",   "Puppy First Groom — Pickles",      5500, "DRAFT", null, null),
  ]);

  // ── Grooming Notes ────────────────────────────────────────────────────────────
  await Promise.all([
    note(tenant.id, "demo_note_atlas",    cMarcus.id, aAtlas.id,   owner.id, "temperament", "Calmer when Marcus stays in the lounge. Avoid tea-tree — causes skin irritation. Use the low-stress dryer setting and ramp up slowly."),
    note(tenant.id, "note_atlas_coat",    cMarcus.id, aAtlas.id,   owner.id, "coat",        "Double coat takes 90 mins to dry fully. Needs two HV passes before finishing. Check between toes for matting."),
    note(tenant.id, "note_biscuit_allrg", cPriya.id,  aBiscuit.id, owner.id, "health",      "Confirmed oatmeal shampoo allergy — switched to hypoallergenic. No reaction with current product. Owner aware."),
    note(tenant.id, "note_biscuit_mouth", cPriya.id,  aBiscuit.id, owner.id, "temperament", "Mouthy when nervous, especially during nail trim. Goes through treat bag quickly. Counter-conditioning working — improved over last 3 visits."),
    note(tenant.id, "note_luna_dryer",    cPriya.id,  aLuna.id,    owner.id, "temperament", "Extreme dryer phobia. Towel-dry only, then let sit in kennel to air dry. Forced air causes vocalization and thrashing."),
    note(tenant.id, "note_cosmo_react",   cDelia.id,  aCosmo.id,   owner.id, "temperament", "Dog-reactive in lobby. Must be first dog in — schedule 7:30 AM only. Delia stays in the salon during groom. Muzzle not needed but leash always on in common areas."),
    note(tenant.id, "note_mochi_mat",     cJames.id,  aMochi.id,   owner.id, "coat",        "Heavy matting behind ears and in armpits on Apr visit. Brushed out without shaving — took 20 extra minutes. Strongly recommended 4-week cadence to owners."),
    note(tenant.id, "note_duchess_cut",   cSarah.id,  aDuchess.id, owner.id, "style",       "May cut: continental clip, 1-inch body, 2-inch legs. Sarah brought reference photo. Topknot banded with red elastic. She loved it — do same next month."),
    note(tenant.id, "note_redwood_coat",  cTom.id,    aRedwood.id, owner.id, "coat",        "Blowing coat badly — pulled out approx 2 lbs of undercoat. Two HV passes plus carding brush. Bring extra towels and clear the drain filter after."),
    note(tenant.id, "note_pickles_first", cKevin.id,  aPickles.id, owner.id, "temperament", "First groom May 6 — very wiggly but no aggression or fear. Lots of treat breaks. Kevin stayed the whole time. Great experience. Will be a great client."),
    note(tenant.id, "note_noodle_loop",   cFiona.id,  aNoodle.id,  owner.id, "temperament", "Squirmy — use the grooming loop on the table or she slides everywhere. Loves ear scratches as distraction during nail trim. No issues."),
    note(tenant.id, "note_bean_easy",     cSarah.id,  aBean.id,    owner.id, "temperament", "Easiest cat we see. Sits still, doesn't vocalize, allows full handling. Occasional bath only — 2-3x per year. No issues to note."),
  ]);

  console.log("✅ Seeded Nina's Pet Salon — 8 clients, 10 animals, 26 appointments, 15 invoices, 12 notes.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
