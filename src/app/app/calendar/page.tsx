import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarNav } from "@/components/CalendarNav";
import { TimeGridColWrapper } from "@/components/TimeGridColWrapper";
import {
  addDaysToDateString,
  addMonthsToMonthStartDateString,
  currentDateStringInZone,
  dateStringToUtcDate,
  formatDateInZone,
  formatLocalDateString,
  formatTimeInZone,
  minutesInZone,
  nextZonedDayUtc,
  startOfZonedDayUtc,
} from "@/lib/timezone";

/* ── constants ──────────────────────────────────── */
const HOUR_START  = 8;
const HOUR_END_DEFAULT = 19;
const PX_PER_HOUR = 64;
const PX_PER_MIN  = PX_PER_HOUR / 60;
const TOP_PAD     = 20;

const PALETTE = [
  { bg: "#ffbcbc", text: "#8B2020" },
  { bg: "#b8eec0", text: "#1a5c2e" },
  { bg: "#cfc8f4", text: "#4a2d9e" },
  { bg: "#ffe494", text: "#7a4800" },
  { bg: "#aacff4", text: "#1a3d6e" },
  { bg: "#ffd4ac", text: "#7a3200" },
];

function animalColor(animalId: string) {
  const hash = animalId.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}
function fmt12(date: Date, timezone: string) {
  return formatTimeInZone(date, timezone, true);
}
function isTodayDateString(dateStr: string, timezone: string) {
  return dateStr === currentDateStringInZone(timezone);
}
function dayNumber(dateStr: string) {
  return dateStringToUtcDate(dateStr).getUTCDate();
}
function hourTop(h: number) { return TOP_PAD + (h - HOUR_START) * PX_PER_HOUR; }

/* ── date helpers ─────────────────────────────── */
function getWeekStartDateString(offset: number, timezone: string) {
  const today = currentDateStringInZone(timezone);
  const dow = dateStringToUtcDate(today).getUTCDay();
  return addDaysToDateString(today, -(dow === 0 ? 6 : dow - 1) + offset * 7);
}
function getDayDateString(offset: number, timezone: string) {
  return addDaysToDateString(currentDateStringInZone(timezone), offset);
}
function getMonthStartDateString(offset: number, timezone: string) {
  const today = currentDateStringInZone(timezone);
  const currentMonth = dateStringToUtcDate(today);
  currentMonth.setUTCDate(1);
  return addMonthsToMonthStartDateString(currentMonth.toISOString().slice(0, 10), offset);
}

function gridConfig(appts: Appt[], timezone: string) {
  const latestEndMin = appts.reduce(
    (latest, appt) => Math.max(latest, minutesInZone(appt.endsAt, timezone)),
    HOUR_END_DEFAULT * 60,
  );
  const hourEnd = Math.max(HOUR_END_DEFAULT, Math.ceil(latestEndMin / 60));
  const nowMin = minutesInZone(new Date(), timezone);

  return {
    hours: Array.from({ length: hourEnd - HOUR_START + 1 }, (_, i) => HOUR_START + i),
    gridH: (hourEnd - HOUR_START) * PX_PER_HOUR + TOP_PAD,
    nowTop: TOP_PAD + (nowMin - HOUR_START * 60) * PX_PER_MIN,
    showNow: nowMin >= HOUR_START * 60 && nowMin <= hourEnd * 60,
  };
}

type Appt = Awaited<ReturnType<typeof fetchAppts>>[0];
async function fetchAppts(tenantId: string, from: Date, to: Date) {
  const { db } = await import("@/server/db");
  return db.appointment.findMany({
    where: { tenantId, startsAt: { gte: from, lt: to }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    include: {
      animal: true,
      client: true,
      service: true,
      services: { orderBy: { sortOrder: "asc" } },
      addOns: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { startsAt: "asc" },
  });
}

/* ── shared time-grid column ─────────────────── */
// Note: TimeGridCol is now a client component in CalendarInteractive.tsx

/* ═══════════════════════════════════════════════ */
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const params      = await searchParams;
  const view        = (params.view === "day" || params.view === "month") ? params.view : "week";
  const weekOffset  = parseInt(params.week  ?? "0", 10) || 0;
  const dayOffset   = parseInt(params.day   ?? "0", 10) || 0;
  const monthOffset = parseInt(params.month ?? "0", 10) || 0;

  const [tenant, services, addOnRows] = await Promise.all([
    db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { timezone: true } }),
    db.service.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      select: { id: true, name: true, durationMinutes: true, bufferBeforeMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
      orderBy: { name: "asc" },
    }),
    db.addOn.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      select: { id: true, name: true, durationMinutes: true, priceCents: true, species: true, serviceLinks: { select: { serviceId: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const timezone = tenant?.timezone ?? "UTC";
  const addOns = addOnRows.map(({ serviceLinks, ...addOn }) => ({
    ...addOn,
    serviceIds: serviceLinks.map((link) => link.serviceId),
  }));

  /* ── WEEK view ── */
  if (view === "week") {
    const monday = getWeekStartDateString(weekOffset, timezone);
    const nextMonday = addDaysToDateString(monday, 7);
    const appointments = await fetchAppts(ctx.tenantId, startOfZonedDayUtc(monday, timezone), startOfZonedDayUtc(nextMonday, timezone));
    const { hours, gridH, nowTop, showNow } = gridConfig(appointments, timezone);
    const days = Array.from({ length: 7 }, (_, i) => addDaysToDateString(monday, i));
    const apptsByDay = days.map((d) => appointments.filter((a) => formatDateInZone(a.startsAt, timezone) === d));
    const midWeek = addDaysToDateString(monday, 3);
    const label = formatLocalDateString(midWeek, { month: "long", year: "numeric" });
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    return (
      <>
        <header className="topbar">
          <CalendarNav view="week" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} addOns={addOns} />
        </header>
        <div className="dash-content" style={{ paddingBottom: 40 }}>
          <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560, background: "#fff", borderRadius: 18, border: "1px solid var(--d-line-2)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--d-line)" }}>
              <div />
              {days.map((day, i) => {
                const today = isTodayDateString(day, timezone);
                return (
                  <div key={i} style={{ padding: "14px 0 12px", textAlign: "center", borderLeft: i === 0 ? "none" : "1px solid var(--d-line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: today ? "var(--acc)" : "var(--d-ink-3)", marginBottom: 6 }}>{dayNames[i]}</div>
                    {today ? (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--acc)", color: "#fff", fontFamily: "var(--dash-serif)", fontSize: 20, fontWeight: 400, display: "grid", placeItems: "center", margin: "0 auto" }}>{dayNumber(day)}</div>
                    ) : (
                      <div style={{ fontFamily: "var(--dash-serif)", fontSize: 24, fontWeight: 400, color: "var(--d-ink)", lineHeight: 1 }}>{dayNumber(day)}</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>
              <div style={{ position: "relative", height: gridH }}>
                {hours.map((h) => (
                  <div key={h} style={{ position: "absolute", top: hourTop(h) - 13, right: 10, left: 0, textAlign: "right", fontSize: 11, fontWeight: 600, color: "var(--d-ink-4)", lineHeight: 1 }}>
                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </div>
                ))}
              </div>
              {days.map((day, i) => (
                <TimeGridColWrapper key={i} appts={apptsByDay[i]} today={isTodayDateString(day, timezone)} nowTop={nowTop} showNow={showNow} gridH={gridH} hours={hours} timezone={timezone} />
              ))}
            </div>
          </div>
          </div>
        </div>
      </>
    );
  }

  /* ── DAY view ── */
  if (view === "day") {
    const day = getDayDateString(dayOffset, timezone);
    const appointments = await fetchAppts(ctx.tenantId, startOfZonedDayUtc(day, timezone), nextZonedDayUtc(day, timezone));
    const { hours, gridH, nowTop, showNow } = gridConfig(appointments, timezone);
    const label = formatLocalDateString(day, { weekday: "short", month: "long", day: "numeric" });
    const today = isTodayDateString(day, timezone);

    return (
      <>
        <header className="topbar">
          <CalendarNav view="day" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} addOns={addOns} />
        </header>
        <div className="dash-content" style={{ paddingBottom: 40 }}>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--d-line-2)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", borderBottom: "1px solid var(--d-line)" }}>
              <div />
              <div style={{ padding: "14px 0 12px", textAlign: "center", borderLeft: "1px solid var(--d-line)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: today ? "var(--acc)" : "var(--d-ink-3)", marginBottom: 6 }}>
                  {formatLocalDateString(day, { weekday: "short" }).toUpperCase()}
                </div>
                {today ? (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--acc)", color: "#fff", fontFamily: "var(--dash-serif)", fontSize: 24, fontWeight: 400, display: "grid", placeItems: "center", margin: "0 auto" }}>{dayNumber(day)}</div>
                ) : (
                  <div style={{ fontFamily: "var(--dash-serif)", fontSize: 32, fontWeight: 400, color: "var(--d-ink)", lineHeight: 1 }}>{dayNumber(day)}</div>
                )}
              </div>
            </div>
            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", position: "relative" }}>
              <div style={{ position: "relative", height: gridH }}>
                {hours.map((h) => (
                  <div key={h} style={{ position: "absolute", top: hourTop(h) - 13, right: 10, left: 0, textAlign: "right", fontSize: 11, fontWeight: 600, color: "var(--d-ink-4)", lineHeight: 1 }}>
                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </div>
                ))}
              </div>
              <TimeGridColWrapper appts={appointments} today={today} nowTop={nowTop} showNow={showNow} gridH={gridH} hours={hours} timezone={timezone} />
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── MONTH view ── */
  const monthStart = getMonthStartDateString(monthOffset, timezone);
  const nextMonthStart = addMonthsToMonthStartDateString(monthStart, 1);
  const appointments = await fetchAppts(ctx.tenantId, startOfZonedDayUtc(monthStart, timezone), startOfZonedDayUtc(nextMonthStart, timezone));
  const label = formatLocalDateString(monthStart, { month: "long", year: "numeric" });

  // Build calendar grid: start from the Monday of the week containing the 1st
  const firstDow = dateStringToUtcDate(monthStart).getUTCDay(); // 0=Sun
  const gridStart = addDaysToDateString(monthStart, -(firstDow === 0 ? 6 : firstDow - 1));

  const cells: string[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDaysToDateString(gridStart, i));
  }
  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <>
      <header className="topbar">
        <CalendarNav view="month" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} addOns={addOns} />
      </header>
      <div className="dash-content" style={{ paddingBottom: 40 }}>
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--d-line-2)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {/* Day name headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--d-line)" }}>
            {dayNames.map((d, i) => (
              <div key={d} style={{
                padding: "10px 0", textAlign: "center",
                fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: "var(--d-ink-4)",
                borderLeft: i === 0 ? "none" : "1px solid var(--d-line)",
              }}>{d}</div>
            ))}
          </div>

          {/* 6-row grid */}
          {Array.from({ length: 6 }, (_, row) => (
            <div key={row} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: row === 5 ? "none" : "1px solid var(--d-line)" }}>
              {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                const inMonth = cell.slice(0, 7) === monthStart.slice(0, 7);
                const today = isTodayDateString(cell, timezone);
                const dayAppts = appointments.filter((a) => formatDateInZone(a.startsAt, timezone) === cell);

                return (
                  <div key={col} style={{
                    minHeight: 100, padding: "8px 10px",
                    borderLeft: col === 0 ? "none" : "1px solid var(--d-line)",
                    background: today ? "rgba(255,90,31,0.03)" : "transparent",
                  }}>
                    {/* Date number */}
                    <div style={{ marginBottom: 6 }}>
                      {today ? (
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "var(--acc)", color: "#fff",
                          fontSize: 13, fontWeight: 700,
                          display: "grid", placeItems: "center",
                        }}>{dayNumber(cell)}</div>
                      ) : (
                        <div style={{
                          fontSize: 13, fontWeight: inMonth ? 700 : 400,
                          color: inMonth ? "var(--d-ink)" : "var(--d-ink-4)",
                          width: 28, height: 28, display: "grid", placeItems: "center",
                        }}>{dayNumber(cell)}</div>
                      )}
                    </div>

                    {/* Appointment pills */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {dayAppts.slice(0, 3).map((a) => {
                        const color = animalColor(a.animal.id);
                        return (
                          <div key={a.id} style={{
                            background: color.bg, color: color.text,
                            borderRadius: 6, padding: "2px 7px",
                            fontSize: 11, fontWeight: 600,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {fmt12(new Date(a.startsAt), timezone)} {a.animal.name}
                          </div>
                        );
                      })}
                      {dayAppts.length > 3 && (
                        <div style={{ fontSize: 11, color: "var(--d-ink-4)", paddingLeft: 4 }}>
                          +{dayAppts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
