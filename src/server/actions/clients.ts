"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const UpsertSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  tier: z.enum(["Regular", "VIP", "New"]).default("Regular"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export async function upsertClient(raw: unknown) {
  const ctx = await requireTenantCtx();
  const { id, ...data } = UpsertSchema.parse(raw);

  const clean = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    tier: data.tier,
    notes: data.notes || null,
  };

  if (id) {
    await db.client.updateMany({ where: { id, tenantId: ctx.tenantId }, data: clean });
  } else {
    await db.client.create({ data: { ...clean, tenantId: ctx.tenantId } });
  }

  revalidatePath("/app/clients");
}

export async function deleteClient(id: string) {
  const ctx = await requireTenantCtx();
  await db.client.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidatePath("/app/clients");
}
