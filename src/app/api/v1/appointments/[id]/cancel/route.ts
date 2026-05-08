import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const Schema = z.object({ reason: z.string().max(500).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e = requireScope(auth, "appointments:write"); if (e) return e;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = Schema.parse(body);

  const appt = await db.appointment.findFirst({ where: { id, tenantId: auth.tenantId } });
  if (!appt) return apiError("Not found", 404);
  if (appt.status === "CANCELLED") return apiError("Already cancelled", 409);
  if (appt.status === "COMPLETED") return apiError("Cannot cancel a completed appointment", 409);

  const updated = await db.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancellationReason: reason },
  });

  return NextResponse.json({ data: updated });
}
