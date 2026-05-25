"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { stripe } from "@/lib/stripe";

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
    // Update existing client
    await db.client.updateMany({ where: { id, tenantId: ctx.tenantId }, data: clean });
  } else {
    // Create new client
    const client = await db.client.create({
      data: { ...clean, tenantId: ctx.tenantId },
    });

    // Create Stripe Customer (best-effort — never blocks client creation)
    if (stripe) {
      try {
        const customer = await stripe.customers.create({
          name: clean.name,
          email: clean.email ?? undefined,
          phone: clean.phone ?? undefined,
          metadata: { tenantId: ctx.tenantId, clientId: client.id },
        });
        await db.client.update({
          where: { id: client.id },
          data: { stripeCustomerId: customer.id },
        });
      } catch (err) {
        console.error("[stripe] Failed to create customer for new client", client.id, err);
      }
    }
  }

  revalidatePath("/app/clients");
}

export async function deleteClient(id: string) {
  const ctx = await requireTenantCtx();
  await db.client.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidatePath("/app/clients");
}
