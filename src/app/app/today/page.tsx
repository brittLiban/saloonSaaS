import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { TodayApptRow } from "@/components/TodayApptRow";
import { TopbarSearch } from "@/components/TopbarSearch";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmt12(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function TodayPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const today    = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  // Last week same day for revenue delta
  const lastWkStart = new Date(dayStart); lastWkStart.setDate(dayStart.getDate() - 7);
  const lastWkEnd   = new Date(dayEnd);   lastWkEnd.setDate(dayEnd.getDate() - 7);

  const [appointments, lastWeekAppts, rebookCandidates] = await Promise.all([
    db.appointment.findMany({
      where:   { tenantId: ctx.tenantId, startsAt: { gte: dayStart, lte: dayEnd } },
      include: {
        animal: { select: { id: true, name: true, species: true, breed: true } },
        client: { select: { id: true, name: true } },
        service: { select: { name: true, durationMinutes: true, description: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.appointment.findMany({
      where:  { tenantId: ctx.tenantId, startsAt: { gte: lastWkStart, lte: lastWkEnd }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { priceCents: true },
    }),
    db.animal.findMany({
      where:   { tenantId: ctx.tenantId, preferredCadenceDays: { not: null }, lastVisitAt: { not: null } },
      include: { client: true },
      orderBy: { lastVisitAt: "asc" },
      take: 8,
    }),
  ]);

  const active        = appointments.filter((a) => !["CANCELLED", "NO_SHOW"].includes(a.status));
  const totalCents    = active.reduce((s, a) => s + a.priceCents, 0);
  const lastWkCents   = lastWeekAppts.reduce((s, a) => s + a.priceCents, 0);
  const revDelta      = lastWkCents > 0 ? Math.round(((totalCents - lastWkCents) / lastWkCents) * 100) : null;
  const completedCount = active.filter((a) => ["COMPLETED", "READY"].includes(a.status)).length;
  const inChairCount   = active.filter((a) => ["IN_PROGRESS", "CHECKED_IN"].includes(a.status)).length;
  const upcomingCount  = active.filter((a) => ["CONFIRMED", "REQUESTED"].includes(a.status)).length;
  const chairMins      = active.reduce((s, a) => s + a.service.durationMinutes, 0);

  const dueAlerts = rebookCandidates
    .map((a) => ({
      ...a,
      daysSince: Math.floor((Date.now() - (a.lastVisitAt?.getTime() ?? 0)) / 86_400_000),
      daysUntil: (a.preferredCadenceDays ?? 0) - Math.floor((Date.now() - (a.lastVisitAt?.getTime() ?? 0)) / 86_400_000),
    }))
    .filter((a) => a.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">{ctx.name} / Today</div>
          <div className="topbar-title">
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"},{" "}
            {ctx.name.split(" ")[0]}.
          </div>
          <div className="topbar-sub">{dateLabel}</div>
        </div>
        <div className="topbar-center">
          <TopbarSearch />
        </div>
        <div className="topbar-actions">
          <button className="topbar-bell" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="topbar-bell-dot" />
          </button>
          <Link href="/app/calendar" className="d-btn d-btn-primary">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New booking
          </Link>
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 48 }}>

        {/* ── KPI row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>

          {/* Revenue */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)", fontWeight: 600, marginBottom: 8 }}>Today's revenue</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 40, fontWeight: 400, lineHeight: 1, marginBottom: 10 }}>
              {fmtMoney(totalCents)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {revDelta !== null && (
                <span style={{
                  background: revDelta >= 0 ? "#dcfce7" : "#fee2e2",
                  color:      revDelta >= 0 ? "#166534" : "#991b1b",
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                }}>
                  {revDelta >= 0 ? "+" : ""}{revDelta}%
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--d-ink-3)" }}>vs last {today.toLocaleDateString("en-US", { weekday: "short" })}</span>
            </div>
          </div>

          {/* Done / booked */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)", fontWeight: 600, marginBottom: 8 }}>Done / booked</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 40, fontWeight: 400, lineHeight: 1, marginBottom: 10 }}>
              {completedCount}
              <span style={{ color: "var(--d-ink-4)" }}>/{active.length}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
              {inChairCount > 0 && `${inChairCount} in chair · `}{upcomingCount} upcoming
            </div>
          </div>

          {/* Chair time */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "20px 24px" }}>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)", fontWeight: 600, marginBottom: 8 }}>Chair time</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 40, fontWeight: 400, lineHeight: 1, marginBottom: 10 }}>
              {fmtDuration(chairMins)}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>Open: 9:00a–6:00p</div>
          </div>
        </div>

        {/* ── Today's schedule ── */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: "var(--dash-sans)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Today's schedule
          </div>
          <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>{active.length} appointment{active.length !== 1 ? "s" : ""}</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", overflow: "hidden", marginBottom: 36 }}>
          {active.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🐾</div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, color: "var(--d-ink-3)" }}>No appointments today.</div>
              <Link href="/app/calendar" style={{ display: "inline-block", marginTop: 16, color: "var(--acc)", fontWeight: 600, fontSize: 13 }}>
                Book a slot →
              </Link>
            </div>
          ) : (
            active.map((appt, idx) => (
              <TodayApptRow
                key={appt.id}
                appt={appt}
                isLast={idx === active.length - 1}
              />
            ))
          )}
        </div>

        {/* ── Time to re-book ── */}
        {dueAlerts.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "var(--dash-sans)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>
                Time to re-book
              </div>
              <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>Regulars due soon</div>
            </div>

            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", overflow: "hidden" }}>
              {dueAlerts.map((a, idx) => {
                const isOverdue = a.daysUntil < 0;
                const isLast    = idx === dueAlerts.length - 1;
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "16px 22px",
                      borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
                      display: "grid", placeItems: "center", fontSize: 20,
                    }}>
                      {petEmoji(a.species)}
                    </div>

                    {/* Name + overdue */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--d-ink)", marginBottom: 2 }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: "var(--d-ink-3)" }}>{a.client.name} · </span>
                        <span style={{ color: isOverdue ? "var(--acc)" : "var(--d-ink-3)", fontWeight: isOverdue ? 600 : 400 }}>
                          {isOverdue
                            ? `${Math.abs(a.daysUntil)} days overdue`
                            : `Due in ${a.daysUntil} days`}
                        </span>
                      </div>
                    </div>

                    {/* Book button */}
                    <Link
                      href="/app/calendar"
                      className="d-btn d-btn-primary"
                      style={{ padding: "7px 20px", borderRadius: 999, fontSize: 13 }}
                    >
                      Book
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
