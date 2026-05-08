import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarNav } from "@/components/CalendarNav";

/* ── constants ──────────────────────────────────── */
const HOUR_START  = 8;
const HOUR_END    = 19;
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
function fmt12(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
}
function isToday(d: Date) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function hourTop(h: number) { return TOP_PAD + (h - HOUR_START) * PX_PER_HOUR; }
function minuteTop(totalMin: number) { return TOP_PAD + (totalMin - HOUR_START * 60) * PX_PER_MIN; }

/* ── date helpers ─────────────────────────────── */
function getWeekStart(offset: number) {
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function getDayStart(offset: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return d;
}
function getMonthStart(offset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

type Appt = Awaited<ReturnType<typeof fetchAppts>>[0];
async function fetchAppts(tenantId: string, from: Date, to: Date) {
  const { db } = await import("@/server/db");
  return db.appointment.findMany({
    where: { tenantId, startsAt: { gte: from, lte: to }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
    include: { animal: true, client: true, service: true },
    orderBy: { startsAt: "asc" },
  });
}

/* ── shared time-grid column ─────────────────── */
function TimeGridCol({
  appts,
  today,
  nowTop,
  showNow,
  gridH,
  hours,
}: {
  appts: Appt[];
  today: boolean;
  nowTop: number;
  showNow: boolean;
  gridH: number;
  hours: number[];
}) {
  return (
    <div style={{
      position: "relative", height: gridH,
      borderLeft: "1px solid var(--d-line)",
      background: today ? "rgba(255,90,31,0.03)" : "transparent",
    }}>
      {hours.map((h) => (
        <div key={h} style={{ position: "absolute", top: hourTop(h), left: 0, right: 0, borderTop: "1px solid var(--d-line)" }} />
      ))}
      {hours.map((h) => (
        <div key={`${h}h`} style={{ position: "absolute", top: hourTop(h) + PX_PER_HOUR / 2, left: 0, right: 0, borderTop: "1px dashed var(--d-line)", opacity: 0.5 }} />
      ))}
      {today && showNow && (
        <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 4 }}>
          <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--acc)" }} />
          <div style={{ borderTop: "2px solid var(--acc)" }} />
        </div>
      )}
      {appts.map((a) => {
        const start = new Date(a.startsAt);
        const startMin = start.getHours() * 60 + start.getMinutes();
        const dur = a.service.durationMinutes ?? 60;
        const end = new Date(start.getTime() + dur * 60_000);
        const top = minuteTop(startMin);
        const height = Math.max(dur * PX_PER_MIN - 3, 28);
        const color = animalColor(a.animal.id);
        return (
          <div key={a.id} style={{
            position: "absolute", top: top + 2, left: 3, right: 3, height,
            background: color.bg, borderRadius: 14, padding: "7px 10px",
            overflow: "hidden", zIndex: 2, cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: color.text, opacity: 0.72, lineHeight: 1.4, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fmt12(start)} · {fmt12(end)}
            </div>
            {height > 38 && (
              <div style={{ fontSize: 14, fontWeight: 800, color: color.text, lineHeight: 1.2, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.animal.name}
              </div>
            )}
            {height > 58 && (
              <div style={{ fontSize: 11.5, color: color.text, opacity: 0.82, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.service.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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

  const services = await db.service.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    select: { id: true, name: true, durationMinutes: true, bufferBeforeMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
    orderBy: { name: "asc" },
  });

  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = TOP_PAD + (nowMin - HOUR_START * 60) * PX_PER_MIN;
  const showNow = nowMin >= HOUR_START * 60 && nowMin <= HOUR_END * 60;
  const hours  = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const gridH  = (HOUR_END - HOUR_START) * PX_PER_HOUR + TOP_PAD;

  /* ── WEEK view ── */
  if (view === "week") {
    const monday = getWeekStart(weekOffset);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    const appointments = await fetchAppts(ctx.tenantId, monday, sunday);
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
    const apptsByDay = days.map((d) => appointments.filter((a) => isSameDay(new Date(a.startsAt), d)));
    const midWeek = new Date(monday); midWeek.setDate(monday.getDate() + 3);
    const label = midWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    return (
      <>
        <header className="topbar">
          <CalendarNav view="week" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} />
        </header>
        <div className="dash-content" style={{ paddingBottom: 40 }}>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--d-line-2)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", borderBottom: "1px solid var(--d-line)" }}>
              <div />
              {days.map((day, i) => {
                const today = isToday(day);
                return (
                  <div key={i} style={{ padding: "14px 0 12px", textAlign: "center", borderLeft: i === 0 ? "none" : "1px solid var(--d-line)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: today ? "var(--acc)" : "var(--d-ink-3)", marginBottom: 6 }}>{dayNames[i]}</div>
                    {today ? (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--acc)", color: "#fff", fontFamily: "var(--dash-serif)", fontSize: 20, fontWeight: 400, display: "grid", placeItems: "center", margin: "0 auto" }}>{day.getDate()}</div>
                    ) : (
                      <div style={{ fontFamily: "var(--dash-serif)", fontSize: 24, fontWeight: 400, color: "var(--d-ink)", lineHeight: 1 }}>{day.getDate()}</div>
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
                <TimeGridCol key={i} appts={apptsByDay[i]} today={isToday(day)} nowTop={nowTop} showNow={showNow} gridH={gridH} hours={hours} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── DAY view ── */
  if (view === "day") {
    const day = getDayStart(dayOffset);
    const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
    const appointments = await fetchAppts(ctx.tenantId, day, dayEnd);
    const label = day.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" });
    const today = isToday(day);

    return (
      <>
        <header className="topbar">
          <CalendarNav view="day" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} />
        </header>
        <div className="dash-content" style={{ paddingBottom: 40 }}>
          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid var(--d-line-2)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", borderBottom: "1px solid var(--d-line)" }}>
              <div />
              <div style={{ padding: "14px 0 12px", textAlign: "center", borderLeft: "1px solid var(--d-line)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.09em", color: today ? "var(--acc)" : "var(--d-ink-3)", marginBottom: 6 }}>
                  {day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </div>
                {today ? (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--acc)", color: "#fff", fontFamily: "var(--dash-serif)", fontSize: 24, fontWeight: 400, display: "grid", placeItems: "center", margin: "0 auto" }}>{day.getDate()}</div>
                ) : (
                  <div style={{ fontFamily: "var(--dash-serif)", fontSize: 32, fontWeight: 400, color: "var(--d-ink)", lineHeight: 1 }}>{day.getDate()}</div>
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
              <TimeGridCol appts={appointments} today={today} nowTop={nowTop} showNow={showNow} gridH={gridH} hours={hours} />
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── MONTH view ── */
  const monthStart = getMonthStart(monthOffset);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
  const appointments = await fetchAppts(ctx.tenantId, monthStart, monthEnd);
  const label = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build calendar grid: start from the Monday of the week containing the 1st
  const firstDow = monthStart.getDay(); // 0=Sun
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - (firstDow === 0 ? 6 : firstDow - 1));

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <>
      <header className="topbar">
        <CalendarNav view="month" weekOffset={weekOffset} dayOffset={dayOffset} monthOffset={monthOffset} label={label} services={services} />
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
                const inMonth = cell.getMonth() === monthStart.getMonth();
                const today   = isToday(cell);
                const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startsAt), cell));

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
                        }}>{cell.getDate()}</div>
                      ) : (
                        <div style={{
                          fontSize: 13, fontWeight: inMonth ? 700 : 400,
                          color: inMonth ? "var(--d-ink)" : "var(--d-ink-4)",
                          width: 28, height: 28, display: "grid", placeItems: "center",
                        }}>{cell.getDate()}</div>
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
                            {fmt12(new Date(a.startsAt))} {a.animal.name}
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
