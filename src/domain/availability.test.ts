import { describe, expect, it } from "vitest";
import { computeAvailability } from "./availability";

describe("computeAvailability", () => {
  it("returns slots inside open windows and excludes overlapping busy windows", () => {
    const slots = computeAvailability({
      from: new Date("2026-05-08T16:00:00.000Z"),
      to: new Date("2026-05-08T20:00:00.000Z"),
      slotMinutes: 60,
      stepMinutes: 30,
      openWindows: [
        {
          startsAt: new Date("2026-05-08T16:00:00.000Z"),
          endsAt: new Date("2026-05-08T20:00:00.000Z"),
        },
      ],
      busyWindows: [
        {
          startsAt: new Date("2026-05-08T17:00:00.000Z"),
          endsAt: new Date("2026-05-08T18:00:00.000Z"),
        },
      ],
    });

    expect(slots.map((slot) => slot.startsAt.toISOString())).toEqual([
      "2026-05-08T16:00:00.000Z",
      "2026-05-08T18:00:00.000Z",
      "2026-05-08T18:30:00.000Z",
      "2026-05-08T19:00:00.000Z",
    ]);
  });
});
