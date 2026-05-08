import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { db } from "@/server/db";

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
});

async function nextNumber(tenantId: string) {
  const latest = await db.invoice.findFirst({
    where: { tenantId }, orderBy: { createdAt: "desc" }, select: { number: true },
  });
  return String((latest ? parseInt(latest.number.replace(/\D/g, ""), 10) : 0) + 1).padStart(4, "0");
}

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:read"); if (e) return e;

  const { skip, take, page, pageSize } = paginate(req);
  const status = req.nextUrl.searchParams.get("status");
  const clientId = req.nextUrl.searchParams.get("clientId");

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(status ? { status: status as never } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        animal: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take,
    }),
    db.invoice.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: invoices, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:write"); if (e) return e;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const client = await db.client.findFirst({ where: { id: parsed.data.clientId, tenantId: auth.tenantId } });
  if (!client) return apiError("Client not found", 404);

  const { lineItems, taxCents, ...rest } = parsed.data;
  const subtotalCents = lineItems.reduce((s, li) => s + li.quantity * li.unitCents, 0);
  const totalCents = subtotalCents + taxCents;
  const number = await nextNumber(auth.tenantId);

  const invoice = await db.invoice.create({
    data: {
      ...rest,
      tenantId: auth.tenantId,
      number,
      status: "DRAFT",
      lineItems: lineItems as never,
      subtotalCents,
      taxCents,
      totalCents,
    },
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}
