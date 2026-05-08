import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const Schema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED", "NO_SHOW"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:write"); if (e) return e;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const appt = await db.appointment.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!appt) return apiError("Not found", 404);
  if (appt.status === "CANCELLED") return apiError("Cannot update status of a cancelled appointment", 409);

  const updated = await db.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === "COMPLETED") {
    await db.animal.update({
      where: { id: appt.animalId },
      data: { lastVisitAt: appt.startsAt },
    });
  }

  return NextResponse.json({ data: updated });
}
