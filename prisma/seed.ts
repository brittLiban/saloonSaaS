import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo-password", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "ninas-pet-salon" },
    update: {},
    create: {
      name: "Nina's Pet Salon",
      slug: "ninas-pet-salon",
      timezone: "America/Los_Angeles",
      address: "1648 S 310th St, Ste 4A, Federal Way, WA",
      phone: "(206) 651-7746",
      email: "ninaspetsalon@example.com",
      themeTokens: {
        accent: "#7c2f24",
        typography: "fraunces-inter",
        density: "regular",
        mode: "light",
      },
      businessHours: {
        monday: [{ opens: "07:30", closes: "18:00" }],
        tuesday: [{ opens: "07:30", closes: "18:00" }],
        wednesday: [{ opens: "07:30", closes: "18:00" }],
        thursday: [{ opens: "07:30", closes: "18:00" }],
        friday: [{ opens: "07:30", closes: "18:00" }],
        saturday: [{ opens: "08:00", closes: "16:00" }],
        sunday: [],
      },
      bookingRules: {
        defaultBufferBeforeMinutes: 0,
        defaultBufferAfterMinutes: 15,
        allowOverlap: false,
      },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "nina@example.com" },
    update: { passwordHash },
    create: {
      email: "nina@example.com",
      name: "Nina Reyes",
      passwordHash,
    },
  });

  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: owner.id } },
    update: { role: "OWNER" },
    create: {
      tenantId: tenant.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  const services = await Promise.all([
    upsertService(tenant.id, "Bath & Brush", 60, 6500, "Hydration bath, blow-out, brush, ears, and nails."),
    upsertService(tenant.id, "Full Groom", 120, 9500, "Bath, cut, sanitary trim, paw pads, nails, and ears."),
    upsertService(tenant.id, "De-shed Treatment", 90, 8500, "Undercoat removal with conditioning rinse."),
    upsertService(tenant.id, "Nail Trim", 15, 1800, "Quick nail trim appointment."),
  ]);

  const client = await prisma.client.upsert({
    where: { id: "demo_client_marcus" },
    update: {},
    create: {
      id: "demo_client_marcus",
      tenantId: tenant.id,
      name: "Marcus Holloway",
      phone: "(253) 555-0190",
      email: "marcus@example.com",
      tier: "Regular",
      notes: "Atlas is calmer if Marcus waits nearby during nail trim.",
    },
  });

  const animal = await prisma.animal.upsert({
    where: { id: "demo_animal_atlas" },
    update: {},
    create: {
      id: "demo_animal_atlas",
      tenantId: tenant.id,
      clientId: client.id,
      name: "Atlas",
      species: "dog",
      breed: "Bernese Mountain Dog",
      sex: "M",
      dateOfBirth: new Date("2020-06-22T00:00:00.000Z"),
      weightLbs: "92.00",
      allergies: ["Tea-tree"],
      behaviorFlags: ["Gentle giant", "Owner nearby for nail trim"],
      preferredCadenceDays: 35,
      lastVisitAt: new Date("2026-04-22T17:00:00.000Z"),
      careSummary: "Long double coat. Use low-stress dryer ramp-up.",
    },
  });

  const fullGroom = services.find((service) => service.name === "Full Groom");

  if (fullGroom) {
    await prisma.appointment.upsert({
      where: { id: "demo_appt_atlas" },
      update: {},
      create: {
        id: "demo_appt_atlas",
        tenantId: tenant.id,
        clientId: client.id,
        animalId: animal.id,
        serviceId: fullGroom.id,
        startsAt: new Date("2026-05-08T16:30:00.000Z"),
        endsAt: new Date("2026-05-08T18:30:00.000Z"),
        status: "CONFIRMED",
        source: "DASHBOARD",
        priceCents: fullGroom.priceCents,
      },
    });
  }

  await prisma.groomingNote.upsert({
    where: { id: "demo_note_atlas" },
    update: {},
    create: {
      id: "demo_note_atlas",
      tenantId: tenant.id,
      clientId: client.id,
      animalId: animal.id,
      authorUserId: owner.id,
      tag: "temperament",
      body: "Atlas is calmer when Marcus stays in the lounge. Avoid tea-tree products.",
    },
  });

  console.log("Seeded Nina's Pet Salon demo tenant.");
}

async function upsertService(
  tenantId: string,
  name: string,
  durationMinutes: number,
  priceCents: number,
  description: string,
) {
  return prisma.service.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {
      durationMinutes,
      priceCents,
      description,
      active: true,
    },
    create: {
      tenantId,
      name,
      durationMinutes,
      bufferAfterMinutes: 15,
      priceCents,
      description,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
