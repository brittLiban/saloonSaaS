import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarActions } from "@/components/CalendarActions";

const HOUR_START = 8;   // 8 AM
const HOUR_END   = 19;  // 7 PM
const PX_PER_MIN = 1.1; // pixels per minute

function serviceColor(name: string): { bg: string; border: string; text: string } {
  const n = name.toLowerCase();
  if (n.includes("full groom") || n.includes("groom"))
    return { bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" };
  if (n.includes("bath") || n.includes("brush"))
    return { bg: "#dcfce7", border: "#86efac", text: "#166534" };
  if (n.includes("nail") || n.includes("trim"))
    return { bg: "#fef9c3", border: "#fde047", text: "#713f12" };
  if (n.includes("deshed") || n.includes("de-shed"))
    return { bg: "#dbeafe", border: "#93c5fd", text: "#1e3a8a" };
  if (n.includes("puppy") || n.includes("kitten"))
    return { bg: "#ede9fe", border: "#c4b5fd", text: "#4c1d95" };
  if (n.includes("spa") || n.includes("luxury"))
    return { bg: "#fef3c7", border: "#fcd34d", text: "#78350f" };
  return { bg: "#ffedd5", border: "#fdba74", text: "#9a3412" };
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function CalendarPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const services = await db.service.findMany({
    where: { tenantId: ctx.tenantId, active: true },
    select: { id: true, name: true, durationMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const appointments = await db.appointment.findMany({
    where: {
      tenantId: ctx.tenantId,
      startsAt: { gte: monday, lte: sunday },
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: { animal: true, client: true, service: true },
    orderBy: { startsAt: "asc" },
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
        ad.getMonth() === d.getMonth() &&
        ad.getDate() === d.getDate()
      );
    })
  );

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totalMinutes = (HOUR_END - HOUR_START) * 60;
  const gridHeight = totalMinutes * PX_PER_MIN;

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowOffset = (nowMinutes - HOUR_START * 60) * PX_PER_MIN;
  const showNowLine = nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Calendar</div>
          <div className="topbar-sub">
            Week of {monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            {" – "}
            {sunday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="topbar-actions">
          <Link href="/developers#availability" className="d-btn">API availability</Link>
          <CalendarActions services={services} />
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 40 }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 700 }}>
            {/* Day header row */}
            <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", marginBottom: 0 }}>
              <div />
              {days.map((day, i) => {
                const today = isToday(day);
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 8px 10px",
                      textAlign: "center",
                      borderBottom: `2px solid ${today ? "var(--acc)" : "var(--d-line-2)"}`,
                    }}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: today ? "var(--acc)" : "var(--d-ink-3)",
                    }}>
                      {dayNames[i]}
                    </div>
                    <div style={{
                      fontSize: 22, fontFamily: "var(--dash-serif)", fontWeight: 400,
                      lineHeight: 1.2,
                      color: today ? "var(--acc)" : "var(--d-ink)",
                    }}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", position: "relative" }}>
              {/* Hour labels */}
              <div style={{ position: "relative", height: gridHeight }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: (h - HOUR_START) * 60 * PX_PER_MIN - 7,
                      right: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--d-ink-4)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((day, i) => {
                const today = isToday(day);
                const dayAppts = apptsByDay[i];
                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      height: gridHeight,
                      borderLeft: "1px solid var(--d-line)",
                      background: today ? "oklch(from var(--acc) 0.97 0.02 60 / 0.4)" : "transparent",
                    }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={h}
                        style={{
                          position: "absolute",
                          top: (h - HOUR_START) * 60 * PX_PER_MIN,
                          left: 0, right: 0,
                          borderTop: "1px solid var(--d-line)",
                        }}
                      />
                    ))}
                    {/* Half-hour grid lines */}
                    {hours.map((h) => (
                      <div
                        key={`${h}-half`}
                        style={{
                          position: "absolute",
                          top: (h - HOUR_START) * 60 * PX_PER_MIN + 30 * PX_PER_MIN,
                          left: 0, right: 0,
                          borderTop: "1px dashed var(--d-line)",
                          opacity: 0.6,
                        }}
                      />
                    ))}

                    {/* Now line */}
                    {today && showNowLine && (
                      <div style={{
                        position: "absolute",
                        top: nowOffset,
                        left: 0, right: 0,
                        borderTop: "2px solid var(--acc)",
                        zIndex: 3,
                      }}>
                        <div style={{
                          position: "absolute", left: -4, top: -4,
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--acc)",
                        }} />
                      </div>
                    )}

                    {/* Appointments */}
                    {dayAppts.map((a) => {
                      const startMin = new Date(a.startsAt).getHours() * 60 + new Date(a.startsAt).getMinutes();
                      const dur = a.service.durationMinutes ?? 60;
                      const top = (startMin - HOUR_START * 60) * PX_PER_MIN;
                      const height = Math.max(dur * PX_PER_MIN, 28);
                      const colors = serviceColor(a.service.name);
                      const timeStr = new Date(a.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

                      return (
                        <div
                          key={a.id}
                          style={{
                            position: "absolute",
                            top, left: 3, right: 3,
                            height,
                            background: colors.bg,
                            border: `1.5px solid ${colors.border}`,
                            borderRadius: 8,
                            padding: "4px 7px",
                            overflow: "hidden",
                            zIndex: 2,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontSize: 10, fontFamily: "var(--dash-mono)", color: colors.text, opacity: 0.75, lineHeight: 1.2 }}>
                            {timeStr}
                          </div>
                          {height > 36 && (
                            <div style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.3, marginTop: 1 }}>
                              {petEmoji(a.animal.species)} {a.animal.name}
                            </div>
                          )}
                          {height > 52 && (
                            <div style={{ fontSize: 10, color: colors.text, opacity: 0.8, lineHeight: 1.2 }}>
                              {a.service.name}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Empty state */}
                    {dayAppts.length === 0 && (
                      <div style={{
                        position: "absolute", top: "50%", left: 0, right: 0,
                        transform: "translateY(-50%)",
                        textAlign: "center", fontSize: 11,
                        color: "var(--d-ink-4)", fontStyle: "italic",
                      }}>
                        Free
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16, padding: "12px 0" }}>
          {[
            { label: "Full Groom", bg: "#fce7f3", border: "#f9a8d4", text: "#9d174d" },
            { label: "Bath & Brush", bg: "#dcfce7", border: "#86efac", text: "#166534" },
            { label: "Nail Trim", bg: "#fef9c3", border: "#fde047", text: "#713f12" },
            { label: "Deshedding", bg: "#dbeafe", border: "#93c5fd", text: "#1e3a8a" },
            { label: "Puppy/Kitten", bg: "#ede9fe", border: "#c4b5fd", text: "#4c1d95" },
            { label: "Other", bg: "#ffedd5", border: "#fdba74", text: "#9a3412" },
          ].map((l) => (
            <div key={l.label} style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 11, color: l.text,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1.5px solid ${l.border}` }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
