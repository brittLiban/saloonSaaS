import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, apiError } from "@/lib/api-auth";
import { db } from "@/server/db";
import { computeAvailability } from "@/domain/availability";

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);

  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const dateStr = req.nextUrl.searchParams.get("date");

  if (!serviceId) return apiError("serviceId is required", 422);
  if (!dateStr) return apiError("date is required (YYYY-MM-DD)", 422);

  const service = await db.service.findFirst({
    where: { id: serviceId, tenantId: auth.tenantId, active: true },
  });
  if (!service) return apiError("Service not found", 404);

  const tenant = await db.tenant.findUnique({ where: { id: auth.tenantId } });
  if (!tenant) return apiError("Tenant not found", 404);

  const tz = tenant.timezone ?? "UTC";
  const date = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = date.getDay();

  // businessHours shape: { monday: [{ opens: "07:30", closes: "18:00" }], sunday: [], ... }
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const bh = tenant.businessHours as Record<string, Array<{ opens: string; closes: string }>>;
  const dayWindows = bh[DAY_NAMES[dayOfWeek]];

  if (!dayWindows || dayWindows.length === 0) {
    return NextResponse.json({ data: { date: dateStr, serviceId, slots: [], reason: "Closed" } });
  }

  const [openH, openM] = dayWindows[0].opens.split(":").map(Number);
  const [closeH, closeM] = dayWindows[0].closes.split(":").map(Number);

  const dayOpen = new Date(date);
  dayOpen.setHours(openH, openM, 0, 0);
  const dayClose = new Date(date);
  dayClose.setHours(closeH, closeM, 0, 0);

  // Existing appointments that day
  const existing = await db.appointment.findMany({
    where: {
      tenantId: auth.tenantId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { gte: dayOpen, lt: dayClose },
    },
    select: { startsAt: true, endsAt: true },
  });

  // Blocked availability windows
  const blocked = await db.availabilityBlock.findMany({
    where: {
      tenantId: auth.tenantId,
      type: "blocked",
      startsAt: { gte: dayOpen },
      endsAt: { lte: dayClose },
    },
    select: { startsAt: true, endsAt: true },
  });

  const totalSlotMins = service.durationMinutes + service.bufferBeforeMinutes + service.bufferAfterMinutes;

  const slots = computeAvailability({
    from: dayOpen,
    to: dayClose,
    slotMinutes: totalSlotMins,
    stepMinutes: 15,
    openWindows: [{ startsAt: dayOpen, endsAt: dayClose }],
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
