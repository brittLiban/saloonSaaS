"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const UpsertSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120).default(0),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120).default(0),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
  species: z.string().max(40).optional().or(z.literal("")),
  applyWeightAdjustment: z.boolean().optional(),
});

const UpsertAddOnSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).max(480),
  priceCents: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
  species: z.string().max(40).optional().or(z.literal("")),
  serviceIds: z.array(z.string().min(1)).default([]),
});

export async function upsertService(raw: unknown) {
  try {
    const ctx = await requireTenantCtx();
    const { id, applyWeightAdjustment, ...data } = UpsertSchema.parse(raw);

    const clean = {
      name: data.name,
      description: data.description || null,
      durationMinutes: data.durationMinutes,
      bufferBeforeMinutes: data.bufferBeforeMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      priceCents: data.priceCents,
      active: data.active,
      species: data.species || null,
      sizeRules: applyWeightAdjustment ? { applyWeightAdjustment: true } : Prisma.JsonNull,
    };

    if (id) {
      await db.service.updateMany({ where: { id, tenantId: ctx.tenantId }, data: clean });
    } else {
      await db.service.create({ data: { ...clean, tenantId: ctx.tenantId } });
    }

    revalidatePath("/app/services");
  } catch (err) {
    console.error("[upsertService]", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    throw new Error(msg.includes("Unique constraint") ? `A service named "${(raw as Record<string, unknown>)?.name}" already exists.` : msg);
  }
}

export async function toggleServiceActive(id: string, active: boolean) {
  const ctx = await requireTenantCtx();
  await db.service.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { active } });
  revalidatePath("/app/services");
}

export async function upsertAddOn(raw: unknown) {
  const ctx = await requireTenantCtx();
  const { id, serviceIds, ...data } = UpsertAddOnSchema.parse(raw);

  const clean = {
    name: data.name,
    description: data.description || null,
    durationMinutes: data.durationMinutes,
    priceCents: data.priceCents,
    active: data.active,
    species: data.species || null,
  };

  const uniqueServiceIds = Array.from(new Set(serviceIds));
  if (uniqueServiceIds.length > 0) {
    const validServices = await db.service.findMany({
      where: { tenantId: ctx.tenantId, id: { in: uniqueServiceIds } },
      select: { id: true },
    });
    if (validServices.length !== uniqueServiceIds.length) {
      throw new Error("One or more selected services were not found.");
    }
  }

  try {
    await db.$transaction(async (tx) => {
      let addOnId = id;

      if (id) {
        const existing = await tx.addOn.findFirst({ where: { id, tenantId: ctx.tenantId }, select: { id: true } });
        if (!existing) throw new Error("Add-on not found.");
        await tx.addOn.update({ where: { id }, data: clean });
      } else {
        const created = await tx.addOn.create({ data: { ...clean, tenantId: ctx.tenantId } });
        addOnId = created.id;
      }

      if (!addOnId) throw new Error("Add-on could not be saved.");

      await tx.serviceAddOn.deleteMany({ where: { addOnId } });
      if (uniqueServiceIds.length > 0) {
        await tx.serviceAddOn.createMany({
          data: uniqueServiceIds.map((serviceId) => ({ addOnId, serviceId })),
          skipDuplicates: true,
        });
      }
    });
  } catch (err) {
    console.error("[upsertAddOn]", err);
    throw err instanceof Error ? err : new Error("Failed to save add-on.");
  }

  revalidatePath("/app/services");
  revalidatePath("/app/calendar");
  revalidatePath("/app/bookings");
}

export async function toggleAddOnActive(id: string, active: boolean) {
  const ctx = await requireTenantCtx();
  await db.addOn.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { active } });
  revalidatePath("/app/services");
  revalidatePath("/app/calendar");
  revalidatePath("/app/bookings");
}

export async function deleteService(id: string) {
  const ctx = await requireTenantCtx();
  const apptCount = await db.appointment.count({ where: { serviceId: id, tenantId: ctx.tenantId } });
  if (apptCount > 0) {
    // Has booking history — soft delete so past records stay intact
    await db.service.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { active: false } });
  } else {
    await db.service.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  }
  revalidatePath("/app/services");
}

export async function deleteAddOn(id: string) {
  const ctx = await requireTenantCtx();
  await db.addOn.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidatePath("/app/services");
  revalidatePath("/app/calendar");
}
