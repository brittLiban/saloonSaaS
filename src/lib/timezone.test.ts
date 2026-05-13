import { describe, expect, it } from "vitest";
import { getBusinessHourPeriods, minutesInZone, zonedDateTimeToUtc } from "./timezone";

describe("timezone helpers", () => {
  it("maps UTC instants to salon-local minutes", () => {
    const startsAt = new Date("2026-05-15T18:00:00.000Z");

    expect(minutesInZone(startsAt, "America/Los_Angeles")).toBe(11 * 60);
  });

  it("converts salon-local business hours to real UTC instants", () => {
    expect(zonedDateTimeToUtc("2026-05-13", "07:30", "America/Los_Angeles").toISOString())
      .toBe("2026-05-13T14:30:00.000Z");
  });

  it("supports both stored business-hours shapes", () => {
    expect(getBusinessHourPeriods({ monday: [{ opens: "07:30", closes: "18:00" }] }, 1))
      .toEqual([{ opens: "07:30", closes: "18:00" }]);
    expect(getBusinessHourPeriods({ "1": { open: "09:00", close: "17:00" } }, 1))
      .toEqual([{ opens: "09:00", closes: "17:00" }]);
  });
});
