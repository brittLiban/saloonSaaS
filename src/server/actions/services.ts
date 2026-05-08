"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const UpsertSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120).default(0),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120).default(0),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
  species: z.string().max(40).optional().or(z.literal("")),
});

export async function upsertService(raw: unknown) {
  const ctx = await requireTenantCtx();
  const { id, ...data } = UpsertSchema.parse(raw);

  const clean = {
    name: data.name,
    description: data.description || null,
    durationMinutes: data.durationMinutes,
    bufferBeforeMinutes: data.bufferBeforeMinutes,
    bufferAfterMinutes: data.bufferAfterMinutes,
    priceCents: data.priceCents,
    active: data.active,
    species: data.species || null,
  };

  if (id) {
    await db.service.updateMany({ where: { id, tenantId: ctx.tenantId }, data: clean });
  } else {
    await db.service.create({ data: { ...clean, tenantId: ctx.tenantId } });
  }

  revalidatePath("/app/services");
}

export async function toggleServiceActive(id: string, active: boolean) {
  const ctx = await requireTenantCtx();
  await db.service.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { active } });
  revalidatePath("/app/services");
}
