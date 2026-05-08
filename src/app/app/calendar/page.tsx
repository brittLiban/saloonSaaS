import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  CONFIRMED:   { cls: "pill pill-brass",  label: "Confirmed" },
  CHECKED_IN:  { cls: "pill pill-blue",   label: "Checked in" },
  IN_PROGRESS: { cls: "pill pill-red",    label: "● In chair" },
  READY:       { cls: "pill pill-green",  label: "Ready" },
  COMPLETED:   { cls: "pill pill-gray",   label: "Done" },
  CANCELLED:   { cls: "pill pill-red",    label: "Cancelled" },
  NO_SHOW:     { cls: "pill pill-red",    label: "No show" },
  REQUESTED:   { cls: "pill pill-gray",   label: "Requested" },
};

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function CalendarPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

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
      return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth() && ad.getDate() === d.getDate();
    })
  );

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Calendar</div>
          <div className="topbar-sub">
            Week of {monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – {sunday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="topbar-actions">
          <Link href="/developers#availability" className="d-btn">API availability</Link>
          <button className="d-btn d-btn-primary" type="button" onClick={undefined}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New booking
          </button>
        </div>
      </header>

      <div className="dash-content">
        {/* Week grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
          {days.map((day, i) => {
            const dayAppts = apptsByDay[i];
            const today = isToday(day);
            return (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: 14,
                  background: today ? "oklch(from var(--oxblood) l c h / 0.07)" : undefined,
                  borderColor: today ? "var(--oxblood)" : undefined,
                  minHeight: 180,
                }}
              >
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: today ? "var(--oxblood)" : "var(--d-ink-3)"
                  }}>
                    {dayNames[i]}
                  </div>
                  <div style={{
                    fontSize: 24, fontFamily: "var(--dash-serif)", fontWeight: 400,
                    color: today ? "var(--oxblood)" : "var(--d-ink)", lineHeight: 1.2
                  }}>
                    {day.getDate()}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {dayAppts.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--d-ink-4)", fontStyle: "italic" }}>Free</div>
                  ) : (
                    dayAppts.map((a) => {
                      const { cls, label } = STATUS_PILL[a.status] ?? { cls: "pill pill-gray", label: a.status };
                      const time = a.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                      return (
                        <div
                          key={a.id}
                          style={{
                            background: "oklch(1 0 0 / 0.5)", borderRadius: 8,
                            padding: "7px 9px", border: "1px solid var(--d-line)",
                          }}
                        >
                          <div style={{ fontSize: 10, fontFamily: "var(--dash-mono)", color: "var(--d-ink-3)", marginBottom: 2 }}>{time}</div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{petEmoji(a.animal.species)} {a.animal.name}</div>
                          <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>{a.service.name}</div>
                          <div style={{ marginTop: 4 }}>
                            <span className={cls} style={{ fontSize: 10 }}>{label}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Booking via API note */}
        <div className="glass-card" style={{ marginTop: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ fontSize: 28 }}>🔌</div>
            <div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 6 }}>Book via the n8n API</div>
              <div style={{ color: "var(--d-ink-3)", fontSize: 13, lineHeight: 1.6, maxWidth: 600 }}>
                Use <code style={{ background: "var(--bg-deep)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>GET /api/v1/availability?serviceId=&amp;date=</code> to find open slots,
                then <code style={{ background: "var(--bg-deep)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>POST /api/v1/appointments</code> to book.
                Your n8n workflow can automate the full booking flow with webhooks.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link href="/developers" className="d-btn d-btn-primary">API documentation →</Link>
                <Link href="/developers#availability" className="d-btn">Availability endpoint</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
