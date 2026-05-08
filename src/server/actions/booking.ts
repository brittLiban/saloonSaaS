"use server";

import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { computeAvailability } from "@/domain/availability";

export type SlimService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number;
  species: string | null;
};

export type SlimClient = {
  id: string;
  name: string;
  animals: { id: string; name: string; species: string; breed: string | null }[];
};

export type TimeSlot = { startsAt: string; endsAt: string };

export async function fetchServicesForBooking(): Promise<SlimService[]> {
  const ctx = await requireTenantCtx();
  return db.service.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    select: { id: true, name: true, durationMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
    orderBy: { name: "asc" },
  });
}

export async function fetchClientsWithAnimals(): Promise<SlimClient[]> {
  const ctx = await requireTenantCtx();
  const clients = await db.client.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      animals: {
        where: {},
        select: { id: true, name: true, species: true, breed: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return clients.filter((c) => c.animals.length > 0);
}

export async function fetchAvailableSlots(serviceId: string, dateStr: string): Promise<TimeSlot[]> {
  const ctx = await requireTenantCtx();

  const service = await db.service.findFirst({
    where: { id: serviceId, tenantId: ctx.tenantId, active: true },
  });
  if (!service) return [];

  const tenant = await db.tenant.findUnique({ where: { id: ctx.tenantId } });
  if (!tenant) return [];

  const date = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = date.getDay();
  const bh = tenant.businessHours as Record<string, { open: string; close: string } | null>;
  const dayHours = bh[String(dayOfWeek)];
  if (!dayHours) return [];

  const [openH, openM] = dayHours.open.split(":").map(Number);
  const [closeH, closeM] = dayHours.close.split(":").map(Number);
  const dayOpen = new Date(date);
  dayOpen.setHours(openH, openM, 0, 0);
  const dayClose = new Date(date);
  dayClose.setHours(closeH, closeM, 0, 0);

  const [existing, blocked] = await Promise.all([
    db.appointment.findMany({
      where: { tenantId: ctx.tenantId, status: { notIn: ["CANCELLED", "NO_SHOW"] }, startsAt: { gte: dayOpen, lt: dayClose } },
      select: { startsAt: true, endsAt: true },
    }),
    db.availabilityBlock.findMany({
      where: { tenantId: ctx.tenantId, startsAt: { gte: dayOpen }, endsAt: { lte: dayClose } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const totalMins = service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes;
  const slots = computeAvailability({
    from: dayOpen, to: dayClose,
    slotMinutes: totalMins, stepMinutes: 15,
    openWindows: [{ startsAt: dayOpen, endsAt: dayClose }],
    busyWindows: [...existing, ...blocked],
  });

  return slots.map((s) => ({ startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString() }));
}
