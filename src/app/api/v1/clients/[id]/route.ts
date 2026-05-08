import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  tier: z.enum(["Regular", "VIP", "New"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e1 = requireScope(auth, "clients:read"); if (e1) return e1;

  const { id } = await params;
  const client = await db.client.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { animals: true, _count: { select: { appointments: true } } },
  });

  if (!client) return apiError("Not found", 404);
  return NextResponse.json({ data: client });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e2 = requireScope(auth, "clients:write"); if (e2) return e2;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const existing = await db.client.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return apiError("Not found", 404);

  const client = await db.client.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ data: client });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e3 = requireScope(auth, "clients:write"); if (e3) return e3;

  const { id } = await params;
  const existing = await db.client.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return apiError("Not found", 404);

  await db.client.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
