import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  species: z.string().min(1).max(40).optional(),
  breed: z.string().max(80).optional().nullable(),
  sex: z.enum(["male", "female", "unknown"]).optional().nullable(),
  dateOfBirth: z.coerce.date().optional().nullable(),
  weightLbs: z.coerce.number().positive().optional().nullable(),
  allergies: z.array(z.string()).optional(),
  behaviorFlags: z.array(z.string()).optional(),
  preferredCadenceDays: z.coerce.number().int().positive().optional().nullable(),
  careSummary: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "animals:read"); if (_se) return _se;

  const { id } = await params;
  const animal = await db.animal.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      _count: { select: { appointments: true } },
    },
  });

  if (!animal) return apiError("Not found", 404);
  return NextResponse.json({ data: animal });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "animals:write"); if (_se) return _se;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const existing = await db.animal.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return apiError("Not found", 404);

  const animal = await db.animal.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ data: animal });
}
