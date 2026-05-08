"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";

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
