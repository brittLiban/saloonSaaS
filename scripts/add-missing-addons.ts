/**
 * One-off script: adds the 4 missing add-ons to every tenant in the database.
 * Safe to run multiple times — uses upsert so duplicates are skipped.
 * Run with: npx tsx scripts/add-missing-addons.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MISSING_ADDONS = [
  { name: "Dematting",                 durationMinutes: 20, priceCents: 1800, description: "Gentle mat removal before or during groom." },
  { name: "Ear Cleaning",              durationMinutes: 10, priceCents: 1000, description: "Ear canal cleaning and drying." },
  { name: "Anal Gland Expression",     durationMinutes: 10, priceCents: 1500, description: "External anal gland relief." },
  { name: "Face, Feet & Tail Grooming", durationMinutes: 15, priceCents: 1200, description: "Tidy trim of face, paws, and tail area." },
];

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  console.log(`Found ${tenants.length} tenant(s)`);

  for (const tenant of tenants) {
    console.log(`\nProcessing: ${tenant.name} (${tenant.id})`);

    const services = await prisma.service.findMany({
      where: { tenantId: tenant.id, active: true },
      select: { id: true, name: true },
    });
    console.log(`  Services: ${services.map((s) => s.name).join(", ")}`);

    for (const addon of MISSING_ADDONS) {
      const record = await prisma.addOn.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: addon.name } },
        update: {},
        create: {
          tenantId: tenant.id,
          name: addon.name,
          durationMinutes: addon.durationMinutes,
          priceCents: addon.priceCents,
          description: addon.description,
          active: true,
        },
      });

      // Link to all active services (no service restriction)
      await prisma.serviceAddOn.deleteMany({ where: { addOnId: record.id } });
      await prisma.serviceAddOn.createMany({
        data: services.map((s) => ({ serviceId: s.id, addOnId: record.id })),
        skipDuplicates: true,
      });

      console.log(`  + ${addon.name}`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
