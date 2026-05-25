"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";
import { requireStripe } from "@/lib/stripe";

const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCents: z.number().int().nonnegative(),
});

const CreateSchema = z.object({
  clientId: z.string().cuid(),
  animalId: z.string().cuid().optional(),
  appointmentId: z.string().cuid().optional(),
  lineItems: z.array(LineItemSchema).min(1),
  taxCents: z.number().int().nonnegative().default(0),
  dueAt: z.coerce.date().optional(),
  notes: z.string().max(1000).optional(),
});

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const latest = await db.invoice.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const lastNum = latest ? parseInt(latest.number.replace(/\D/g, ""), 10) : 0;
  return String(lastNum + 1).padStart(4, "0");
}

export async function createInvoice(raw: unknown) {
  const ctx = await requireTenantCtx();
  const data = CreateSchema.parse(raw);

  await db.client.findFirstOrThrow({ where: { id: data.clientId, tenantId: ctx.tenantId } });

  const subtotalCents = data.lineItems.reduce((s, li) => s + li.quantity * li.unitCents, 0);
  const totalCents = subtotalCents + data.taxCents;
  const number = await nextInvoiceNumber(ctx.tenantId);

  const invoice = await db.invoice.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: data.clientId,
      animalId: data.animalId,
      appointmentId: data.appointmentId,
      number,
      status: "DRAFT",
      lineItems: data.lineItems as never,
      subtotalCents,
      taxCents: data.taxCents,
      totalCents,
      dueAt: data.dueAt,
    },
  });

  revalidatePath("/app/money");
  await writeAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, source: "DASHBOARD", action: "invoice.created", entityType: "invoice", entityId: invoice.id });
  return invoice;
}

export async function sendInvoice(id: string) {
  const ctx = await requireTenantCtx();
  await db.invoice.updateMany({
    where: { id, tenantId: ctx.tenantId, status: { in: ["DRAFT", "UNPAID"] } },
    data: { status: "SENT", issuedAt: new Date() },
  });
  revalidatePath("/app/money");
}

export async function markInvoicePaid(id: string, externalRef?: string) {
  const ctx = await requireTenantCtx();
  await db.invoice.updateMany({
    where: { id, tenantId: ctx.tenantId, status: { notIn: ["VOID", "PAID"] } },
    data: { status: "PAID", paidAt: new Date(), externalPaymentRef: externalRef ?? null },
  });
  revalidatePath("/app/money");
  revalidatePath("/app/today");
  await writeAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, source: "DASHBOARD", action: "invoice.paid", entityType: "invoice", entityId: id });
}

export async function voidInvoice(id: string) {
  const ctx = await requireTenantCtx();
  await db.invoice.updateMany({
    where: { id, tenantId: ctx.tenantId, status: { not: "PAID" } },
    data: { status: "VOID" },
  });
  revalidatePath("/app/money");
}

// ─── T1.5 — Charge invoice via card on file ───────────────────────────────────

/**
 * Charges a saved card for the full invoice amount.
 * Creates a Stripe PaymentIntent and marks the invoice PAID on success.
 */
export async function chargeInvoice(invoiceId: string, paymentMethodId: string) {
  const ctx = await requireTenantCtx();
  const stripe = requireStripe();

  const invoice = await db.invoice.findFirstOrThrow({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: { client: { select: { id: true, stripeCustomerId: true } } },
  });

  if (invoice.status === "PAID") throw new Error("Invoice is already paid");
  if (!invoice.client.stripeCustomerId) throw new Error("Client does not have a Stripe account");

  // Verify the payment method belongs to this tenant (prevents cross-tenant charging)
  await db.savedCard.findFirstOrThrow({
    where: { stripePaymentMethodId: paymentMethodId, tenantId: ctx.tenantId, clientId: invoice.clientId },
  });

  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: invoice.totalCents,
      currency: "usd",
      customer: invoice.client.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { tenantId: ctx.tenantId, invoiceId: invoice.id },
    });
  } catch (err: unknown) {
    // Stripe throws StripeCardError for card declines
    const msg = err instanceof Error ? err.message : "Payment failed";
    throw new Error(msg);
  }

  if (pi.status !== "succeeded") {
    throw new Error(
      `Payment not completed (status: ${pi.status}). ${pi.last_payment_error?.message ?? ""}`.trim(),
    );
  }

  // Fetch the receipt URL from the charge
  let receiptUrl: string | null = null;
  if (pi.latest_charge) {
    const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge.id;
    const charge = await stripe.charges.retrieve(chargeId);
    receiptUrl = charge.receipt_url ?? null;
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: pi.id,
      stripeReceiptUrl: receiptUrl,
    },
  });

  revalidatePath("/app/money");
  revalidatePath("/app/today");

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    source: "DASHBOARD",
    action: "invoice.charged",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: { paymentIntentId: pi.id, amountCents: invoice.totalCents },
  });

  return { receiptUrl };
}

// ─── T1.6 — No-show / cancellation charge ─────────────────────────────────────

/**
 * Charges the client's default card a no-show fee.
 * Creates a PAID invoice and marks the appointment as NO_SHOW.
 */
export async function chargeNoShow(appointmentId: string, amountCents: number) {
  const ctx = await requireTenantCtx();
  const stripe = requireStripe();

  if (amountCents <= 0) throw new Error("Amount must be greater than zero");

  const appt = await db.appointment.findFirstOrThrow({
    where: { id: appointmentId, tenantId: ctx.tenantId },
    include: {
      client: { select: { id: true, name: true, stripeCustomerId: true } },
      service: { select: { name: true } },
      animal: { select: { name: true } },
    },
  });

  if (!appt.client.stripeCustomerId) {
    throw new Error("Client does not have a payment method on file");
  }

  const defaultCard = await db.savedCard.findFirst({
    where: { clientId: appt.clientId, tenantId: ctx.tenantId, isDefault: true },
  });

  if (!defaultCard) throw new Error("No default card on file for this client");

  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: appt.client.stripeCustomerId,
      payment_method: defaultCard.stripePaymentMethodId,
      confirm: true,
      off_session: true,
      description: `No-show fee — ${appt.service.name} (${appt.animal.name})`,
      metadata: { tenantId: ctx.tenantId, appointmentId, reason: "no_show_charge" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Charge failed";
    throw new Error(msg);
  }

  if (pi.status !== "succeeded") {
    throw new Error(`Charge failed (status: ${pi.status})`);
  }

  // Create a PAID invoice for this no-show charge
  const number = await nextInvoiceNumber(ctx.tenantId);
  const invoice = await db.invoice.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: appt.clientId,
      animalId: appt.animalId,
      appointmentId: appt.id,
      number,
      status: "PAID",
      lineItems: [
        {
          description: `No-show fee — ${appt.service.name} (${appt.animal.name})`,
          quantity: 1,
          unitCents: amountCents,
        },
      ] as never,
      subtotalCents: amountCents,
      taxCents: 0,
      totalCents: amountCents,
      paidAt: new Date(),
      stripePaymentIntentId: pi.id,
    },
  });

  // Mark appointment as NO_SHOW
  await db.appointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW" },
  });

  revalidatePath("/app/money");
  revalidatePath("/app/today");
  revalidatePath("/app/calendar");

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    source: "DASHBOARD",
    action: "no_show_charge",
    entityType: "appointment",
    entityId: appointmentId,
    metadata: { amountCents, invoiceId: invoice.id, paymentIntentId: pi.id },
  });

  return { invoiceId: invoice.id };
}

// ─── T1.7 — Manual cash / external payment ────────────────────────────────────

/**
 * Marks an invoice as paid without creating a Stripe charge.
 * Used for cash, check, or external payment methods.
 */
export async function markInvoicePaidManual(
  invoiceId: string,
  method: "cash" | "check" | "external",
  reference?: string,
) {
  const ctx = await requireTenantCtx();

  await db.invoice.updateMany({
    where: { id: invoiceId, tenantId: ctx.tenantId, status: { notIn: ["VOID", "PAID"] } },
    data: {
      status: "PAID",
      paidAt: new Date(),
      externalPaymentRef: reference ? `${method}:${reference}` : method,
    },
  });

  revalidatePath("/app/money");
  revalidatePath("/app/today");

  await writeAudit({
    tenantId: ctx.tenantId,
    actorUserId: ctx.userId,
    source: "DASHBOARD",
    action: "invoice.paid_manual",
    entityType: "invoice",
    entityId: invoiceId,
    metadata: { method, reference },
  });
}
