import { NextRequest, NextResponse } from "next/server";
import { computeAvailability } from "@/domain/availability";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slotMinutes = Number(searchParams.get("slotMinutes") ?? 60);
  const from = new Date(searchParams.get("from") ?? "2026-05-08T15:00:00.000Z");
  const to = new Date(searchParams.get("to") ?? "2026-05-08T23:00:00.000Z");

  const slots = computeAvailability({
    from,
    to,
    slotMinutes,
    stepMinutes: 30,
    openWindows: [
      {
        startsAt: new Date("2026-05-08T15:00:00.000Z"),
        endsAt: new Date("2026-05-08T23:00:00.000Z"),
      },
    ],
    busyWindows: [
      {
        startsAt: new Date("2026-05-08T16:30:00.000Z"),
        endsAt: new Date("2026-05-08T18:30:00.000Z"),
      },
    ],
  });

  return NextResponse.json({
    mode: "scaffold",
    message: "Demo availability is computed by the shared domain helper. Prisma-backed tenant availability lands in Sprint 4.",
    slots: slots.map((slot) => ({
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    })),
  });
}
