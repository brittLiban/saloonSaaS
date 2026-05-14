/**
 * One-off script to update services and add-ons to the final desired state:
 *
 * Main services: Full Grooming, Haircut, Nail Trim, Bath, Teeth Cleaning
 * Add-ons: Deshedding (+30 min), Dematting (+30 min), Gland Expression (+30 min)
 *
 * Run: npx tsx scripts/update-services.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tenant = await db.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");
  const tenantId = tenant.id;
  console.log("Tenant:", tenant.name, tenantId);

  // ── 1. Rename "Full Groom" → "Full Grooming" ──
  const fullGroom = await db.service.findFirst({ where: { tenantId, name: "Full Groom" } });
  if (fullGroom) {
    await db.service.update({ where: { id: fullGroom.id }, data: { name: "Full Grooming" } });
    console.log("✓ Renamed 'Full Groom' → 'Full Grooming'");
  } else {
    console.log("ℹ  'Full Groom' not found (may already be renamed)");
  }

  // ── 2. Ensure "Teeth Cleaning" service exists ──
  const teethCleaning = await db.service.findFirst({ where: { tenantId, name: "Teeth Cleaning" } });
  if (!teethCleaning) {
    await db.service.create({
      data: {
        tenantId,
        name: "Teeth Cleaning",
        durationMinutes: 20,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        priceCents: 1500,
        active: true,
      },
    });
    console.log("✓ Created 'Teeth Cleaning' service");
  } else {
    console.log("ℹ  'Teeth Cleaning' already exists");
  }

  // ── 3. Rename "Anal Gland Expression" → "Gland Expression" ──
  const analGland = await db.addOn.findFirst({ where: { tenantId, name: "Anal Gland Expression" } });
  if (analGland) {
    await db.addOn.update({ where: { id: analGland.id }, data: { name: "Gland Expression" } });
    console.log("✓ Renamed 'Anal Gland Expression' → 'Gland Expression'");
  } else {
    console.log("ℹ  'Anal Gland Expression' not found (may already be renamed)");
  }

  // ── 4. Set Deshedding, Dematting, Gland Expression to 30 min and activate ──
  const keepNames = ["Deshedding", "Dematting", "Gland Expression"];
  for (const name of keepNames) {
    const addOn = await db.addOn.findFirst({ where: { tenantId, name } });
    if (addOn) {
      await db.addOn.update({ where: { id: addOn.id }, data: { durationMinutes: 30, active: true } });
      console.log(`✓ Set '${name}' to 30 min, active`);
    } else {
      console.log(`⚠  Add-on '${name}' not found — create it in /app/services`);
    }
  }

  // ── 5. Deactivate all other add-ons ──
  const others = await db.addOn.findMany({
    where: { tenantId, name: { notIn: keepNames } },
  });
  for (const addOn of others) {
    await db.addOn.update({ where: { id: addOn.id }, data: { active: false } });
    console.log(`✓ Deactivated add-on '${addOn.name}'`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
