"use server";

import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { addMinutes, overlaps, type TimeWindow } from "@/domain/availability";
import { dayOfWeekFromDateString, getBusinessHourPeriods, zonedDateTimeToUtc } from "@/lib/timezone";
import { resolveAppointmentComposition } from "@/server/appointment-composition";

export type SlimAddOn = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  species: string | null;
  serviceIds: string[];
};

export type SlimService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number;
  species: string | null;
  addOns?: SlimAddOn[];
};

export type SlimClient = {
  id: string;
  name: string;
  animals: { id: string; name: string; species: string; breed: string | null; vaccinated: boolean | null }[];
};

export type TimeSlot = {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  available: boolean;
};

export type AvailabilityRequest = {
  serviceId?: string;
  serviceIds?: string[];
  addOnIds?: string[];
  durationMinutes?: number;
  date: string;
};

export async function fetchServicesForBooking(): Promise<SlimService[]> {
  const ctx = await requireTenantCtx();
  const services = await db.service.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true,
      priceCents: true,
      species: true,
      addOnLinks: {
        select: {
          addOn: {
            select: { id: true, name: true, durationMinutes: true, priceCents: true, species: true, serviceLinks: { select: { serviceId: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return services.map(({ addOnLinks, ...service }) => ({
    ...service,
    addOns: addOnLinks.map((link) => ({
      id: link.addOn.id,
      name: link.addOn.name,
      durationMinutes: link.addOn.durationMinutes,
      priceCents: link.addOn.priceCents,
      species: link.addOn.species,
      serviceIds: link.addOn.serviceLinks.map((serviceLink) => serviceLink.serviceId),
    })),
  }));
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
        select: { id: true, name: true, species: true, breed: true, vaccinated: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return clients.filter((c) => c.animals.length > 0);
}

export async function fetchAvailableSlots(input: string | AvailabilityRequest, dateArg?: string): Promise<TimeSlot[]> {
  const ctx = await requireTenantCtx();
  const request = typeof input === "string"
    ? { serviceId: input, date: dateArg ?? "" }
    : input;

  if (!request.date) return [];

  const composition = await resolveAppointmentComposition({
    tenantId: ctx.tenantId,
    serviceId: request.serviceId,
    serviceIds: request.serviceIds,
    addOnIds: request.addOnIds,
    durationMinutes: request.durationMinutes,
  }).catch(() => null);
  if (!composition) return [];

  const tenant = await db.tenant.findUnique({ where: { id: ctx.tenantId } });
  if (!tenant) return [];

  const timezone = tenant.timezone ?? "America/Los_Angeles";
  const dayOfWeek = dayOfWeekFromDateString(request.date);
  const periods = getBusinessHourPeriods(tenant.businessHours, dayOfWeek);
  if (periods.length === 0) return [];

  const period = periods[0];
  const dayOpen  = zonedDateTimeToUtc(request.date, period.opens,  timezone);
  const dayClose = zonedDateTimeToUtc(request.date, period.closes, timezone);

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
      services: { select: { service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } } } },
    },
  });

  // Expand each existing appointment's busy window by its own buffer times
  const busyWindows: TimeWindow[] = [
    ...existing.map((a) => {
      const bufferBefore = Math.max(
        a.service.bufferBeforeMinutes,
        ...a.services.map((line) => line.service.bufferBeforeMinutes),
      );
      const bufferAfter = Math.max(
        a.service.bufferAfterMinutes,
        ...a.services.map((line) => line.service.bufferAfterMinutes),
      );

      return {
        startsAt: addMinutes(a.startsAt, -bufferBefore),
        endsAt:   addMinutes(a.endsAt,    bufferAfter),
      };
    }),
    ...(await db.availabilityBlock.findMany({
      where: {
        tenantId: ctx.tenantId,
        AND: [{ startsAt: { lt: dayClose } }, { endsAt: { gt: dayOpen } }],
      },
      select: { startsAt: true, endsAt: true },
    })),
  ];

  // Total time a slot blocks = bufferBefore + duration + bufferAfter
  const slotMins = composition.bufferBeforeMinutes + composition.durationMinutes + composition.bufferAfterMinutes;
  const stepMs = 15 * 60_000;

  const slots: TimeSlot[] = [];

  for (
    let blockStart = dayOpen;
    addMinutes(blockStart, slotMins) <= dayClose;
    blockStart = new Date(blockStart.getTime() + stepMs)
  ) {
    const blockEnd = addMinutes(blockStart, slotMins);
    const customerStart = addMinutes(blockStart, composition.bufferBeforeMinutes);
    const customerEnd   = addMinutes(blockStart, composition.bufferBeforeMinutes + composition.durationMinutes);

    const busy = busyWindows.some((bw) => overlaps({ startsAt: blockStart, endsAt: blockEnd }, bw));

    slots.push({
      startsAt:  customerStart.toISOString(),
      endsAt:    customerEnd.toISOString(),
      durationMinutes: composition.durationMinutes,
      available: !busy,
    });
  }

  return slots;
}
