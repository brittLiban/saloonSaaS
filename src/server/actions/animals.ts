"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const UpsertSchema = z.object({
  id: z.string().cuid().optional(),
  clientId: z.string().cuid(),
  name: z.string().min(1).max(80),
  species: z.string().min(1).max(40),
  breed: z.string().max(80).optional().or(z.literal("")),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
  weightLbs: z.coerce.number().positive().optional(),
  allergies: z.array(z.string()).default([]),
  behaviorFlags: z.array(z.string()).default([]),
  preferredCadenceDays: z.coerce.number().int().positive().optional(),
  careSummary: z.string().max(2000).optional().or(z.literal("")),
});

export async function upsertAnimal(raw: unknown) {
  const ctx = await requireTenantCtx();
  const { id, clientId, ...data } = UpsertSchema.parse(raw);

  // Verify client belongs to this tenant
  await db.client.findFirstOrThrow({ where: { id: clientId, tenantId: ctx.tenantId } });

  const clean = {
    clientId,
    name: data.name,
    species: data.species,
    breed: data.breed || null,
    sex: data.sex ?? null,
    dateOfBirth: data.dateOfBirth ?? null,
    weightLbs: data.weightLbs ?? null,
    allergies: data.allergies,
    behaviorFlags: data.behaviorFlags,
    preferredCadenceDays: data.preferredCadenceDays ?? null,
    careSummary: data.careSummary || null,
  };

  if (id) {
    await db.animal.updateMany({ where: { id, tenantId: ctx.tenantId }, data: clean });
  } else {
    await db.animal.create({ data: { ...clean, tenantId: ctx.tenantId } });
  }

  revalidatePath("/app/animals");
  revalidatePath(`/app/clients/${clientId}`);
}
