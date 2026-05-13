import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { db } from "@/server/db";

const CreateSchema = z.object({
  serviceId: z.string().cuid(),
  animalId: z.string().cuid(),
  clientId: z.string().cuid(),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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
        animal: { select: { id: true, name: true, species: true, breed: true } },
        client: { select: { id: true, name: true, email: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true, priceCents: true } },
      },
      orderBy: { startsAt: "desc" },
      skip,
      take,
    }),
    db.appointment.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: appointments, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e2 = requireScope(auth, "appointments:write"); if (e2) return e2;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  // Verify all related records belong to this tenant
  const [service, animal, client] = await Promise.all([
    db.service.findFirst({ where: { id: parsed.data.serviceId, tenantId: auth.tenantId, active: true } }),
    db.animal.findFirst({ where: { id: parsed.data.animalId, tenantId: auth.tenantId } }),
    db.client.findFirst({ where: { id: parsed.data.clientId, tenantId: auth.tenantId } }),
  ]);

  if (!service) return apiError("Service not found or inactive", 404);
  if (!animal) return apiError("Animal not found", 404);
  if (!client) return apiError("Client not found", 404);

  const endsAt = new Date(
    parsed.data.startsAt.getTime() + 
    (parsed.data.durationMinutes ?? service.durationMinutes) * 60_000
  );

  // Conflict check
  const conflict = await db.appointment.findFirst({
    where: {
      tenantId: auth.tenantId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      OR: [
        { startsAt: { lt: endsAt }, endsAt: { gt: parsed.data.startsAt } },
      ],
    },
  });

  if (conflict) return apiError("Time slot is not available", 409);

  const appointment = await db.appointment.create({
    data: {
      tenantId: auth.tenantId,
      clientId: parsed.data.clientId,
      animalId: parsed.data.animalId,
      serviceId: parsed.data.serviceId,
      startsAt: parsed.data.startsAt,
      endsAt,
      priceCents: service.priceCents,
      source: "API",
      status: "CONFIRMED",
      ...(parsed.data.metadata ? { metadata: parsed.data.metadata as never } : {}),
    },
    include: {
      animal: { select: { id: true, name: true, species: true } },
      client: { select: { id: true, name: true, email: true } },
      service: { select: { id: true, name: true, durationMinutes: true } },
    },
  });

  return NextResponse.json({ data: appointment }, { status: 201 });
}
