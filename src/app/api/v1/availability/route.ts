import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, apiError } from "@/lib/api-auth";
import { db } from "@/server/db";
import { addMinutes, computeAvailability } from "@/domain/availability";
import { resolveAppointmentComposition } from "@/server/appointment-composition";
import {
  dayOfWeekFromDateString,
  getBusinessHourPeriods,
  isValidDateString,
  nextZonedDayUtc,
  startOfZonedDayUtc,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

function listParam(req: NextRequest, name: string) {
  return req.nextUrl.searchParams
    .getAll(name)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);

  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const serviceIds = listParam(req, "serviceIds");
  const addOnIds = listParam(req, "addOnIds");
  const durationParam = req.nextUrl.searchParams.get("durationMinutes");
  const dateStr = req.nextUrl.searchParams.get("date");

  if (!serviceId && serviceIds.length === 0) return apiError("serviceId or serviceIds is required", 422);
  if (!dateStr) return apiError("date is required (YYYY-MM-DD)", 422);
  if (!isValidDateString(dateStr)) return apiError("date must be a valid YYYY-MM-DD value", 422);

  const parsedDurationMinutes = durationParam ? Number(durationParam) : undefined;
  if (parsedDurationMinutes !== undefined && (!Number.isInteger(parsedDurationMinutes) || parsedDurationMinutes <= 0)) {
    return apiError("durationMinutes must be a positive integer", 422);
  }

  const composition = await resolveAppointmentComposition({
    tenantId: auth.tenantId,
    serviceId: serviceId ?? undefined,
    serviceIds,
    addOnIds,
    durationMinutes: parsedDurationMinutes,
  }).catch((err) => err instanceof Error ? err : new Error("Invalid appointment services."));
  if (composition instanceof Error) return apiError(composition.message, 422);

  const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant) return apiError("Tenant not found", 404);

  const tz = tenant.timezone ?? "UTC";
  const dayOfWeek = dayOfWeekFromDateString(dateStr);
  const periods = getBusinessHourPeriods(tenant.businessHours, dayOfWeek);

  if (periods.length === 0) {
    return NextResponse.json({ data: { date: dateStr, serviceId, serviceIds: composition.services.map((s) => s.id), addOnIds: composition.addOns.map((a) => a.id), durationMinutes: composition.durationMinutes, slots: [], reason: "Closed" } });
  }

  const openWindows = periods
    .map((period) => ({
      startsAt: zonedDateTimeToUtc(dateStr, period.opens, tz),
      endsAt: zonedDateTimeToUtc(dateStr, period.closes, tz),
    }))
    .filter((window) => window.endsAt > window.startsAt);

  if (openWindows.length === 0) {
    return NextResponse.json({ data: { date: dateStr, serviceId, serviceIds: composition.services.map((s) => s.id), addOnIds: composition.addOns.map((a) => a.id), durationMinutes: composition.durationMinutes, slots: [], reason: "Closed" } });
  }

  const dayStart = startOfZonedDayUtc(dateStr, tz);
  const dayEnd = nextZonedDayUtc(dateStr, tz);

  // Existing appointments that day
  const existing = await db.appointment.findMany({
    where: {
      tenantId: auth.tenantId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
    },
    select: {
      startsAt: true,
      endsAt: true,
      service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } },
      services: { select: { service: { select: { bufferBeforeMinutes: true, bufferAfterMinutes: true } } } },
    },
  });

  // Blocked availability windows
  const blocked = await db.availabilityBlock.findMany({
    where: {
      tenantId: auth.tenantId,
      type: "blocked",
      AND: [{ startsAt: { lt: dayEnd } }, { endsAt: { gt: dayStart } }],
    },
    select: { startsAt: true, endsAt: true },
  });

  const busyAppointments = existing.map((appt) => {
    const bufferBefore = Math.max(
      appt.service.bufferBeforeMinutes,
      ...appt.services.map((line) => line.service.bufferBeforeMinutes),
    );
    const bufferAfter = Math.max(
      appt.service.bufferAfterMinutes,
      ...appt.services.map((line) => line.service.bufferAfterMinutes),
    );

    return {
      startsAt: addMinutes(appt.startsAt, -bufferBefore),
      endsAt: addMinutes(appt.endsAt, bufferAfter),
    };
  });

  const totalSlotMins = composition.durationMinutes + composition.bufferBeforeMinutes + composition.bufferAfterMinutes;

  const slots = computeAvailability({
    from: dayStart,
    to: dayEnd,
    slotMinutes: totalSlotMins,
    stepMinutes: 15,
    openWindows,
    busyWindows: [...busyAppointments, ...blocked],
  });

  return NextResponse.json({
    data: {
      date: dateStr,
      serviceId,
      serviceIds: composition.services.map((s) => s.id),
      addOnIds: composition.addOns.map((a) => a.id),
      durationMinutes: composition.durationMinutes,
      timezone: tz,
      slots: slots.map((s) => ({
        startsAt: addMinutes(s.startsAt, composition.bufferBeforeMinutes).toISOString(),
        endsAt: addMinutes(s.startsAt, composition.bufferBeforeMinutes + composition.durationMinutes).toISOString(),
      })),
    },
  });
}
