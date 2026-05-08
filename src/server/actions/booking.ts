"use server";

import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { addMinutes, overlaps, type TimeWindow } from "@/domain/availability";

export type SlimService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number;
  species: string | null;
};

export type SlimClient = {
  id: string;
  name: string;
  animals: { id: string; name: string; species: string; breed: string | null }[];
};

export type TimeSlot = {
  startsAt: string;
  endsAt: string;
  available: boolean;
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DayPeriod = { opens: string; closes: string };
type BusinessHours = Record<string, DayPeriod[]>;

/**
 * Returns the UTC Date that corresponds to a given local time in a timezone.
 * e.g. "07:30" in "America/Los_Angeles" on "2026-05-08" → 14:30 UTC
 */
function toUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const midnightUTC = new Date(`${dateStr}T00:00:00Z`);

  // Get the timezone offset at that point in time
  const utcMs = new Date(midnightUTC.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  const tzMs  = new Date(midnightUTC.toLocaleString("en-US", { timeZone: timezone })).getTime();
  const offsetMs = utcMs - tzMs; // positive = west of UTC (e.g. PDT = +7h)

  const [h, m] = timeStr.split(":").map(Number);
  const timeMs = (h * 60 + m) * 60_000;

  return new Date(midnightUTC.getTime() + offsetMs + timeMs);
}

export async function fetchServicesForBooking(): Promise<SlimService[]> {
  const ctx = await requireTenantCtx();
  return db.service.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    select: { id: true, name: true, durationMinutes: true, bufferBeforeMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
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

  const timezone = tenant.timezone ?? "America/Los_Angeles";
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getDay(); // use noon UTC to avoid DST edge

  const bh = tenant.businessHours as BusinessHours;
  const dayName = DAY_NAMES[dayOfWeek];
  const periods = bh[dayName] ?? [];
  if (periods.length === 0) return [];

  const period = periods[0];
  const dayOpen  = toUTC(dateStr, period.opens,  timezone);
  const dayClose = toUTC(dateStr, period.closes, timezone);

  // Fetch existing appointments that touch this day
  const existing = await db.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      AND: [{ startsAt: { lt: dayClose } }, { endsAt: { gt: dayOpen } }],
    },
    select: {
      startsAt: true,
      endsAt: true,
      service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } },
    },
  });

  // Expand each existing appointment's busy window by its own buffer times
  const busyWindows: TimeWindow[] = [
    ...existing.map((a) => ({
      startsAt: addMinutes(a.startsAt, -a.service.bufferBeforeMinutes),
      endsAt:   addMinutes(a.endsAt,    a.service.bufferAfterMinutes),
    })),
    ...(await db.availabilityBlock.findMany({
      where: {
        tenantId: ctx.tenantId,
        AND: [{ startsAt: { lt: dayClose } }, { endsAt: { gt: dayOpen } }],
      },
      select: { startsAt: true, endsAt: true },
    })),
  ];

  // Total time a slot blocks = bufferBefore + duration + bufferAfter
  const slotMins = service.bufferBeforeMinutes + service.durationMinutes + service.bufferAfterMinutes;
  const stepMs = 15 * 60_000;

  const slots: TimeSlot[] = [];

  for (
    let blockStart = dayOpen;
    addMinutes(blockStart, slotMins) <= dayClose;
    blockStart = new Date(blockStart.getTime() + stepMs)
  ) {
    const blockEnd = addMinutes(blockStart, slotMins);
    const customerStart = addMinutes(blockStart, service.bufferBeforeMinutes);
    const customerEnd   = addMinutes(blockStart, service.bufferBeforeMinutes + service.durationMinutes);

    const busy = busyWindows.some((bw) => overlaps({ startsAt: blockStart, endsAt: blockEnd }, bw));

    slots.push({
      startsAt:  customerStart.toISOString(),
      endsAt:    customerEnd.toISOString(),
      available: !busy,
    });
  }

  return slots;
}
