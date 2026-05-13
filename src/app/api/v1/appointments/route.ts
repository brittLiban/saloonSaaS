import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { db } from "@/server/db";
import { appointmentDurationMinutes } from "@/lib/appointment-summary";
import { appointmentLineCreates, resolveAppointmentComposition } from "@/server/appointment-composition";

const CreateSchema = z.object({
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
  addOnIds: z.array(z.string().min(1)).default([]),
  addOns: z.array(z.string().min(1)).default([]),
  animalId: z.string().cuid(),
  clientId: z.string().cuid(),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().positive().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function serializeAppointment(appt: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  priceCents: number;
  status: string;
  service: { id: string; name: string; durationMinutes: number; priceCents: number };
  services?: { serviceId: string; name: string; durationMinutes: number; priceCents: number }[];
  addOns?: { addOnId: string | null; name: string; durationMinutes: number; priceCents: number }[];
}) {
  const services = appt.services && appt.services.length > 0
    ? appt.services.map((line) => ({
        id: line.serviceId,
        name: line.name,
        durationMinutes: line.durationMinutes,
        priceCents: line.priceCents,
      }))
    : [{
        id: appt.service.id,
        name: appt.service.name,
        durationMinutes: appt.service.durationMinutes,
        priceCents: appt.service.priceCents,
      }];

  return {
    ...appt,
    appointmentId: appt.id,
    startsAt: appt.startsAt.toISOString(),
    endsAt: appt.endsAt.toISOString(),
    durationMinutes: appointmentDurationMinutes(appt),
    services,
    addOns: (appt.addOns ?? []).map((line) => ({
      id: line.addOnId,
      name: line.name,
      durationMinutes: line.durationMinutes,
      priceCents: line.priceCents,
    })),
  };
}

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const rl = await checkRateLimit(auth.keyId); if (rl) return rl;
  const e1 = requireScope(auth, "appointments:read"); if (e1) return e1;

  const { skip, take, page, pageSize } = paginate(req);
  const status = req.nextUrl.searchParams.get("status");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(status ? { status: status as never } : {}),
        ...(from || to ? { startsAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      include: {
        animal: { select: { id: true, name: true, species: true, breed: true, vaccinated: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
        services: { orderBy: { sortOrder: "asc" } },
        addOns: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { startsAt: "desc" },
      skip,
      take,
    }),
    db.appointment.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: appointments.map(serializeAppointment), meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e2 = requireScope(auth, "appointments:write"); if (e2) return e2;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const [composition, animal, client] = await Promise.all([
    resolveAppointmentComposition({
      tenantId: auth.tenantId,
      serviceId: parsed.data.serviceId,
      serviceIds: parsed.data.serviceIds,
      addOnIds: parsed.data.addOnIds,
      addOns: parsed.data.addOns,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents,
    }).catch((err) => err instanceof Error ? err : new Error("Invalid appointment services.")),
    db.animal.findFirst({ where: { id: parsed.data.animalId, tenantId: auth.tenantId } }),
    db.client.findFirst({ where: { id: parsed.data.clientId, tenantId: auth.tenantId } }),
  ]);

  if (composition instanceof Error) return apiError(composition.message, 422);
  if (!animal) return apiError("Animal not found", 404);
  if (!client) return apiError("Client not found", 404);

  const endsAt = new Date(parsed.data.startsAt.getTime() + composition.durationMinutes * 60_000);
  const effectiveStart = new Date(parsed.data.startsAt.getTime() - composition.bufferBeforeMinutes * 60_000);
  const effectiveEnd = new Date(endsAt.getTime() + composition.bufferAfterMinutes * 60_000);

  // Conflict check
  const conflict = await db.appointment.findFirst({
    where: {
      tenantId: auth.tenantId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      OR: [
        { startsAt: { lt: effectiveEnd }, endsAt: { gt: effectiveStart } },
      ],
    },
  });

  if (conflict) return apiError("Time slot is not available", 409);

  const appointment = await db.appointment.create({
    data: {
      tenantId: auth.tenantId,
      clientId: parsed.data.clientId,
      animalId: parsed.data.animalId,
      serviceId: composition.primaryService.id,
      startsAt: parsed.data.startsAt,
      endsAt,
      durationMinutes: composition.durationMinutes,
      priceCents: composition.priceCents,
      source: "API",
      status: "CONFIRMED",
      ...(parsed.data.metadata ? { metadata: parsed.data.metadata as never } : {}),
      ...appointmentLineCreates(composition),
    },
    include: {
      animal: { select: { id: true, name: true, species: true, vaccinated: true } },
      client: { select: { id: true, name: true, email: true } },
      service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      services: { orderBy: { sortOrder: "asc" } },
      addOns: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ data: serializeAppointment(appointment) }, { status: 201 });
}
