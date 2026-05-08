import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const PatchSchema = z.object({
  status: z.enum(["SENT", "PAID", "UNPAID", "VOID"]).optional(),
  paidAt: z.coerce.date().optional(),
  externalPaymentRef: z.string().max(200).optional(),
  dueAt: z.coerce.date().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:read"); if (e) return e;

  const { id } = await params;
  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      animal: { select: { id: true, name: true, species: true } },
      appointment: { select: { id: true, startsAt: true, service: { select: { name: true } } } },
    },
  });

  if (!invoice) return apiError("Not found", 404);
  return NextResponse.json({ data: invoice });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:write"); if (e) return e;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const existing = await db.invoice.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return apiError("Not found", 404);

  const data: Record<string, unknown> = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (parsed.data.paidAt) data.paidAt = parsed.data.paidAt;
  if (parsed.data.externalPaymentRef) data.externalPaymentRef = parsed.data.externalPaymentRef;
  if (parsed.data.dueAt !== undefined) data.dueAt = parsed.data.dueAt;
  if (parsed.data.status === "PAID" && !parsed.data.paidAt) data.paidAt = new Date();
  if (parsed.data.status === "SENT" && !existing.issuedAt) data.issuedAt = new Date();

  const invoice = await db.invoice.update({ where: { id }, data: data as never });
  return NextResponse.json({ data: invoice });
}
