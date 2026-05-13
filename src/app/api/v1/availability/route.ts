import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, apiError } from "@/lib/api-auth";
import { db } from "@/server/db";
import { computeAvailability } from "@/domain/availability";
import {
  dayOfWeekFromDateString,
  getBusinessHourPeriods,
  isValidDateString,
  nextZonedDayUtc,
  startOfZonedDayUtc,
  zonedDateTimeToUtc,
} from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);

  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const dateStr = req.nextUrl.searchParams.get("date");

  if (!serviceId) return apiError("serviceId is required", 422);
  if (!dateStr) return apiError("date is required (YYYY-MM-DD)", 422);
  if (!isValidDateString(dateStr)) return apiError("date must be a valid YYYY-MM-DD value", 422);

  const service = await db.service.findFirst({
    where: { id: serviceId, tenantId: auth.tenantId, active: true },
  });
  if (!service) return apiError("Service not found", 404);

  const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant) return apiError("Tenant not found", 404);

  const tz = tenant.timezone ?? "UTC";
  const dayOfWeek = dayOfWeekFromDateString(dateStr);
  const periods = getBusinessHourPeriods(tenant.businessHours, dayOfWeek);

  if (periods.length === 0) {
    return NextResponse.json({ data: { date: dateStr, serviceId, slots: [], reason: "Closed" } });
  }

  const openWindows = periods
    .map((period) => ({
      startsAt: zonedDateTimeToUtc(dateStr, period.opens, tz),
      endsAt: zonedDateTimeToUtc(dateStr, period.closes, tz),
    }))
    .filter((window) => window.endsAt > window.startsAt);

  if (openWindows.length === 0) {
    return NextResponse.json({ data: { date: dateStr, serviceId, slots: [], reason: "Closed" } });
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
    select: { startsAt: true, endsAt: true },
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

  const totalSlotMins = service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes;

  const slots = computeAvailability({
    from: dayStart,
    to: dayEnd,
    slotMinutes: totalSlotMins,
    stepMinutes: 15,
    openWindows,
    busyWindows: [...existing, ...blocked],
  });

  return NextResponse.json({
    data: {
      date: dateStr,
      serviceId,
      timezone: tz,
      slots: slots.map((s) => ({
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
      })),
    },
  });
}
