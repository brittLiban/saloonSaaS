import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const PatchSchema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:read"); if (_se) return _se;

  const { id } = await params;
  const appt = await db.appointment.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      animal: { select: { id: true, name: true, species: true, breed: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
    },
  });

  if (!appt) return apiError("Not found", 404);
  return NextResponse.json({ data: appt });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:write"); if (_se) return _se;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const existing = await db.appointment.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!existing) return apiError("Not found", 404);

  const appt = await db.appointment.update({
    where: { id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.metadata ? { metadata: parsed.data.metadata as never } : {}),
    },
  });

  if (parsed.data.status === "COMPLETED") {
    await db.animal.update({ where: { id: existing.animalId }, data: { lastVisitAt: existing.startsAt } });
  }

  return NextResponse.json({ data: appt });
}
