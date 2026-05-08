import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarNav } from "@/components/CalendarNav";

/* ── visual constants ─────────────────────────── */
const HOUR_START  = 8;    // 8 AM
const HOUR_END    = 19;   // 7 PM  (11 hours — covers all business hours)
const PX_PER_HOUR = 64;   // pixels per hour → 1.067 px/min
const PX_PER_MIN  = PX_PER_HOUR / 60;

/* ── per-animal colour palette — vibrant pastels matching prototype */
const PALETTE = [
  { bg: "#ffbcbc", text: "#8B2020" },   // salmon pink
  { bg: "#b8eec0", text: "#1a5c2e" },   // mint green
  { bg: "#cfc8f4", text: "#4a2d9e" },   // lavender
  { bg: "#ffe494", text: "#7a4800" },   // amber yellow
  { bg: "#aacff4", text: "#1a3d6e" },   // sky blue
  { bg: "#ffd4ac", text: "#7a3200" },   // peach coral
];

function animalColor(animalId: string) {
  const hash = animalId.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function fmt12(date: Date) {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "");  // "9:00 am" → "9:00am"
}

function getWeekStart(offset: number) {
  const now = new Date();
  const dow  = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const params     = await searchParams;
  const weekOffset = parseInt(params.week ?? "0", 10) || 0;

  const monday = getWeekStart(weekOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const services = await db.service.findMany({
    where:   { tenantId: ctx.tenantId, active: true },
    select:  { id: true, name: true, durationMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
    orderBy: { name: "asc" },
  });

  const appointments = await db.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      startsAt: { gte: monday, lte: sunday },
      status:   { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include:  { animal: true, client: true, service: true },
    orderBy:  { startsAt: "asc" },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const apptsByDay = days.map((d) =>
    appointments.filter((a) => {
      const ad = new Date(a.startsAt);
      return (
        ad.getFullYear() === d.getFullYear() &&
        ad.getMonth()    === d.getMonth()    &&
        ad.getDate()     === d.getDate()
      );
    })
  );

  const isToday = (d: Date) => {
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth()    === t.getMonth()    &&
      d.getDate()     === t.getDate()
    );
  };

  const dayNames   = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const hours      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const TOP_PAD    = 20;   // breathing room so "8 AM" label isn't clipped
  const gridH      = (HOUR_END - HOUR_START) * PX_PER_HOUR + TOP_PAD;

  /* month label for the nav (use midweek day) */
  const midWeek    = new Date(monday);
  midWeek.setDate(monday.getDate() + 3);
  const monthLabel = midWeek.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  /* now-line */
  const now     = new Date();
  const nowMin  = now.getHours() * 60 + now.getMinutes();
  const nowTop  = TOP_PAD + (nowMin - HOUR_START * 60) * PX_PER_MIN;
  const showNow = nowMin >= HOUR_START * 60 && nowMin <= HOUR_END * 60;

  /* helper: pixel offset for a given hour */
  const hourTop  = (h: number) => TOP_PAD + (h - HOUR_START) * PX_PER_HOUR;
  const minuteTop = (totalMin: number) => TOP_PAD + (totalMin - HOUR_START * 60) * PX_PER_MIN;

  return (
    <>
      {/* ── top bar ── */}
      <header className="topbar">
        <CalendarNav
          weekOffset={weekOffset}
          monthLabel={monthLabel}
          services={services}
        />
      </header>

      {/* ── calendar card ── */}
      <div className="dash-content" style={{ paddingBottom: 40 }}>
        <div style={{
          background: "#fff",
          borderRadius: 18,
          border: "1px solid var(--d-line-2)",
          boxShadow: "0 1px 3px oklch(0.22 0.02 60 / 0.06)",
          overflow: "hidden",
        }}>

          {/* Day header row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "56px repeat(7, 1fr)",
            borderBottom: "1px solid var(--d-line)",
          }}>
            <div /> {/* time gutter */}
            {days.map((day, i) => {
              const today = isToday(day);
              return (
                <div
                  key={i}
                  style={{
                    padding: "14px 0 12px",
                    textAlign: "center",
                    borderLeft: i === 0 ? "none" : "1px solid var(--d-line)",
                  }}
                >
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.09em",
                    color: today ? "var(--acc)" : "var(--d-ink-3)",
                    marginBottom: 6,
                  }}>
                    {dayNames[i]}
                  </div>
                  {today ? (
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "var(--acc)", color: "#fff",
                      fontFamily: "var(--dash-serif)", fontSize: 20, fontWeight: 400,
                      display: "grid", placeItems: "center", margin: "0 auto",
                    }}>
                      {day.getDate()}
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: "var(--dash-serif)", fontSize: 24, fontWeight: 400,
                      color: "var(--d-ink)", lineHeight: 1,
                    }}>
                      {day.getDate()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid — no scroll, fits the screen */}
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>

              {/* Hour label gutter */}
              <div style={{ position: "relative", height: gridH }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: hourTop(h) - 13,
                      right: 10, left: 0,
                      textAlign: "right",
                      fontSize: 11, fontWeight: 600,
                      color: "var(--d-ink-4)",
                      lineHeight: 1,
                    }}
                  >
                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, i) => {
                const today   = isToday(day);
                const dayAppts = apptsByDay[i];

                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      height: gridH,
                      borderLeft: "1px solid var(--d-line)",
                      background: today ? "rgba(255,90,31,0.03)" : "transparent",
                    }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{
                          position: "absolute",
                          top: hourTop(h),
                          left: 0, right: 0,
                          borderTop: "1px solid var(--d-line)",
                        }}
                      />
                    ))}

                    {/* Half-hour lines (dashed, lighter) */}
                    {hours.map((h) => (
                      <div
                        key={`${h}h`}
                        style={{
                          position: "absolute",
                          top: hourTop(h) + PX_PER_HOUR / 2,
                          left: 0, right: 0,
                          borderTop: "1px dashed var(--d-line)",
                          opacity: 0.5,
                        }}
                      />
                    ))}

                    {/* Current time line */}
                    {today && showNow && (
                      <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 4 }}>
                        <div style={{
                          position: "absolute", left: -4, top: -4,
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--acc)",
                        }} />
                        <div style={{ borderTop: "2px solid var(--acc)", marginLeft: 0 }} />
                      </div>
                    )}

                    {/* Appointment blocks */}
                    {dayAppts.map((a) => {
                      const start    = new Date(a.startsAt);
                      const startMin = start.getHours() * 60 + start.getMinutes();
                      const dur      = a.service.durationMinutes ?? 60;
                      const end      = new Date(start.getTime() + dur * 60_000);

                      const top    = minuteTop(startMin);
                      const height = Math.max(dur * PX_PER_MIN - 3, 28);

                      const color     = animalColor(a.animal.id);
                      const timeLabel = `${fmt12(start)} · ${fmt12(end)}`;

                      return (
                        <div
                          key={a.id}
                          style={{
                            position: "absolute",
                            top: top + 2,
                            left: 3, right: 3,
                            height,
                            background: color.bg,
                            borderRadius: 14,
                            padding: "7px 10px",
                            overflow: "hidden",
                            zIndex: 2,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                          }}
                        >
                          {/* Time range — small, slightly muted */}
                          <div style={{
                            fontSize: 10, fontWeight: 600,
                            color: color.text, opacity: 0.72,
                            lineHeight: 1.4, marginBottom: 1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {timeLabel}
                          </div>

                          {/* Animal name — bold, prominent */}
                          {height > 38 && (
                            <div style={{
                              fontSize: 14, fontWeight: 800, color: color.text,
                              lineHeight: 1.2, marginBottom: 1,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {a.animal.name}
                            </div>
                          )}

                          {/* Service — smaller, slightly muted */}
                          {height > 58 && (
                            <div style={{
                              fontSize: 11.5, color: color.text, opacity: 0.82,
                              lineHeight: 1.3,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {a.service.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
