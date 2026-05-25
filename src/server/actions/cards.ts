"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { requireStripe } from "@/lib/stripe";
import { writeAudit } from "@/lib/audit";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the Stripe customer ID for a client, creating one if it doesn't exist.
 * This handles clients that existed before Sprint 1 (no stripeCustomerId).
 */
async function getOrCreateStripeCustomerId(
  clientId: string,
  tenantId: string,
): Promise<string> {
  const stripe = requireStripe();

  const client = await db.client.findFirstOrThrow({
    where: { id: clientId, tenantId },
    select: { id: true, name: true, email: true, phone: true, stripeCustomerId: true },
  });

  if (client.stripeCustomerId) return client.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: client.name,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    metadata: { tenantId, clientId: client.id },
  });

  await db.client.update({
    where: { id: client.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// ─── T1.3 — Card on file: setup intent ────────────────────────────────────────

/**
 * Creates a Stripe SetupIntent for the given client.
 * Returns the clientSecret to pass to Stripe.js on the frontend.
 */
export async function createSetupIntent(clientId: string) {
  const ctx = await requireTenantCtx();
  const stripe = requireStripe();

  // Verify client belongs to this tenant
  await db.client.findFirstOrThrow({
    where: { id: clientId, tenantId: ctx.tenantId },
    select: { id: true },
  });

  const customerId = await getOrCreateStripeCustomerId(clientId, ctx.tenantId);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return { clientSecret: setupIntent.client_secret! };
}

// ─── T1.3 — Card on file: save ────────────────────────────────────────────────

const SaveCardSchema = z.object({
  clientId: z.string().cuid(),
  paymentMethodId: z.string().min(1),
});

/**
 * Called after Stripe.js confirms the SetupIntent on the frontend.
 * Attaches the PaymentMethod to the customer, places+cancels a $0.50 hold
 * to verify the card is real, then saves card metadata to the DB.
 */
export async function saveCard(raw: unknown) {
  const ctx = await requireTenantCtx();
  const stripe = requireStripe();
  const { clientId, paymentMethodId } = SaveCardSchema.parse(raw);

  const customerId = await getOrCreateStripeCustomerId(clientId, ctx.tenantId);

  // Attach PaymentMethod to Stripe Customer (idempotent if already attached)
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

  // Retrieve card details
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (!pm.card) throw new Error("Payment method is not a card");

  // $0.50 pre-auth hold — verifies the card is real and not expired
  // We immediately cancel so no money is actually charged
  try {
    const preAuth = await stripe.paymentIntents.create({
      amount: 50, // $0.50
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true,
      capture_method: "manual",
      off_session: true,
    });

    if (preAuth.status === "requires_capture") {
      await stripe.paymentIntents.cancel(preAuth.id);
    }
  } catch (err) {
    // Pre-auth failed = card is invalid/expired. Detach and surface the error.
    await stripe.paymentMethods.detach(paymentMethodId).catch(() => {});
    throw new Error(
      `Card verification failed: ${err instanceof Error ? err.message : "Card declined"}`,
    );
  }

  // First card for this client becomes the default automatically
  const existingCount = await db.savedCard.count({
    where: { clientId, tenantId: ctx.tenantId },
  });

  const card = await db.savedCard.create({
    data: {
      tenantId: ctx.tenantId,
      clientId,
      stripePaymentMethodId: paymentMethodId,
      last4: pm.card.last4,
      brand: pm.card.brand,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
      isDefault: existingCount === 0,
    },
  });

  revalidatePath(`/app/clients/${clientId}`);

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    source: "DASHBOARD",
    action: "card.saved",
    entityType: "saved_card",
    entityId: card.id,
    metadata: { last4: pm.card.last4, brand: pm.card.brand },
  });

  return card;
}

// ─── T1.4 — Card on file: delete ─────────────────────────────────────────────

export async function deleteCard(cardId: string) {
  const ctx = await requireTenantCtx();
  const stripe = requireStripe();

  const card = await db.savedCard.findFirstOrThrow({
    where: { id: cardId, tenantId: ctx.tenantId },
  });

  // Detach from Stripe (best-effort — if PM already detached, that's fine)
  try {
    await stripe.paymentMethods.detach(card.stripePaymentMethodId);
  } catch {
    // Silent — might already be detached
  }

  await db.savedCard.delete({ where: { id: cardId } });

  // If deleted card was default, promote the next oldest card
  if (card.isDefault) {
    const next = await db.savedCard.findFirst({
      where: { clientId: card.clientId, tenantId: ctx.tenantId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await db.savedCard.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  revalidatePath(`/app/clients/${card.clientId}`);

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    source: "DASHBOARD",
    action: "card.deleted",
    entityType: "saved_card",
    entityId: cardId,
    metadata: { last4: card.last4, brand: card.brand },
  });
}

// ─── T1.4 — Card on file: set default ────────────────────────────────────────

export async function setDefaultCard(cardId: string) {
  const ctx = await requireTenantCtx();

  const card = await db.savedCard.findFirstOrThrow({
    where: { id: cardId, tenantId: ctx.tenantId },
    select: { clientId: true },
  });

  // Clear all defaults for this client, then set the new one
  await db.$transaction([
    db.savedCard.updateMany({
      where: { clientId: card.clientId, tenantId: ctx.tenantId },
      data: { isDefault: false },
    }),
    db.savedCard.update({
      where: { id: cardId },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath(`/app/clients/${card.clientId}`);
}
