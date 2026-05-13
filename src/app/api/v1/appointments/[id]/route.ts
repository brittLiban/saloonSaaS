import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";
import { appointmentDurationMinutes } from "@/lib/appointment-summary";

const PatchSchema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function serializeAppointment(appt: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceCents: number;
  service: { id: string; name: string; durationMinutes: number; priceCents: number };
  services?: { serviceId: string; name: string; durationMinutes: number; priceCents: number }[];
  addOns?: { addOnId: string | null; name: string; durationMinutes: number; priceCents: number }[];
}) {
  return {
    ...appt,
    appointmentId: appt.id,
    startsAt: appt.startsAt.toISOString(),
    endsAt: appt.endsAt.toISOString(),
    durationMinutes: appointmentDurationMinutes(appt),
    services: appt.services && appt.services.length > 0
      ? appt.services.map((line) => ({ id: line.serviceId, name: line.name, durationMinutes: line.durationMinutes, priceCents: line.priceCents }))
      : [{ id: appt.service.id, name: appt.service.name, durationMinutes: appt.service.durationMinutes, priceCents: appt.service.priceCents }],
    addOns: (appt.addOns ?? []).map((line) => ({ id: line.addOnId, name: line.name, durationMinutes: line.durationMinutes, priceCents: line.priceCents })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:read"); if (_se) return _se;

  const { id } = await params;
  const appt = await db.appointment.findFirst({
    where: { id, tenantId: auth.tenantId },
    include: {
      animal: { select: { id: true, name: true, species: true, breed: true, vaccinated: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      services: { orderBy: { sortOrder: "asc" } },
      addOns: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!appt) return apiError("Not found", 404);
  return NextResponse.json({ data: serializeAppointment(appt) });
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
    include: {
      animal: { select: { id: true, name: true, species: true, breed: true, vaccinated: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      services: { orderBy: { sortOrder: "asc" } },
      addOns: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (parsed.data.status === "COMPLETED") {
    await db.animal.update({ where: { id: existing.animalId }, data: { lastVisitAt: existing.startsAt } });
  }

  return NextResponse.json({ data: serializeAppointment(appt) });
}
