import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";
import { appointmentDurationMinutes } from "@/lib/appointment-summary";

const Schema = z.object({
  newStartsAt: z.coerce.date(),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:write"); if (e) return e;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const appt = await db.appointment.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: { service: true },
  });
  if (!appt) return apiError("Not found", 404);
  if (appt.status === "CANCELLED") return apiError("Cannot reschedule a cancelled appointment", 409);
  if (appt.status === "COMPLETED") return apiError("Cannot reschedule a completed appointment", 409);

  const { newStartsAt, reason } = parsed.data;
  const duration = appointmentDurationMinutes(appt);
  const newEndsAt = new Date(newStartsAt.getTime() + duration * 60_000);

  // Conflict check (excluding this appointment)
  const conflict = await db.appointment.findFirst({
    where: {
      tenantId: auth.tenantId,
      id: { not: id },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: newEndsAt },
      endsAt: { gt: newStartsAt },
    },
  });
  if (conflict) return apiError("Time slot is not available", 409);

  const updated = await db.appointment.update({
    where: { id },
    data: { startsAt: newStartsAt, endsAt: newEndsAt, rescheduleReason: reason },
  });

  return NextResponse.json({ data: updated });
}
