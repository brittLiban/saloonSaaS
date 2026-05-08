import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  if (s === "dog") return "🐶";
  if (s === "cat") return "🐈";
  return "🐾";
}

function statusPill(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    CONFIRMED:   { cls: "pill pill-brass",  label: "Confirmed" },
    CHECKED_IN:  { cls: "pill pill-blue",   label: "Checked in" },
    IN_PROGRESS: { cls: "pill pill-red",    label: "● In progress" },
    READY:       { cls: "pill pill-green",  label: "Ready" },
    COMPLETED:   { cls: "pill pill-gray",   label: "Completed" },
    CANCELLED:   { cls: "pill pill-red",    label: "Cancelled" },
    NO_SHOW:     { cls: "pill pill-red",    label: "No show" },
    REQUESTED:   { cls: "pill pill-gray",   label: "Requested" },
  };
  return map[status] ?? { cls: "pill pill-gray", label: status };
}

export default async function TodayPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const [appointments, tenant, rebookCandidates, unpaidCount] = await Promise.all([
    db.appointment.findMany({
      where: { tenantId: ctx.tenantId, startsAt: { gte: dayStart, lte: dayEnd } },
      include: { animal: true, client: true, service: true },
      orderBy: { startsAt: "asc" },
    }),
    db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, timezone: true },
    }),
    db.animal.findMany({
      where: { tenantId: ctx.tenantId, preferredCadenceDays: { not: null }, lastVisitAt: { not: null } },
      include: { client: true },
      orderBy: { lastVisitAt: "asc" },
      take: 10,
    }),
    db.invoice.count({
      where: { tenantId: ctx.tenantId, status: { in: ["UNPAID", "OVERDUE"] } },
    }),
  ]);

  const totalCents     = appointments.reduce((s, a) => s + a.priceCents, 0);
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;

  const dueAlerts = rebookCandidates
    .filter((a) => {
      if (!a.lastVisitAt || !a.preferredCadenceDays) return false;
      const daysSince = Math.floor((Date.now() - a.lastVisitAt.getTime()) / 86400000);
      return daysSince >= a.preferredCadenceDays - 3;
    })
    .map((a) => ({
      ...a,
      daysSince: Math.floor((Date.now() - (a.lastVisitAt?.getTime() ?? 0)) / 86400000),
      overdue:   Math.floor((Date.now() - (a.lastVisitAt?.getTime() ?? 0)) / 86400000) - (a.preferredCadenceDays ?? 0),
    }))
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 4);

  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"}, {ctx.name.split(" ")[0]}.
          </div>
          <div className="topbar-sub">{dateLabel} · {tenant?.timezone ?? ""}</div>
        </div>
        <div className="topbar-actions">
          <Link href="/app/calendar" className="d-btn d-btn-primary">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New booking
          </Link>
        </div>
      </header>

      <div className="dash-content">
        {/* KPIs */}
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <div className="glass-card kpi-card">
            <div className="kpi-eyebrow">Pets today</div>
            <div className="kpi-value">{appointments.length}</div>
            <div className="kpi-detail">{completedCount} completed</div>
          </div>
          <div className="glass-card kpi-card">
            <div className="kpi-eyebrow">Expected revenue</div>
            <div className="kpi-value">{fmtMoney(totalCents)}</div>
            <div className="kpi-detail">All bookings</div>
          </div>
          <div className="glass-card kpi-card">
            <div className="kpi-eyebrow">Progress</div>
            <div className="kpi-value">{completedCount}<span style={{ fontSize: 18, opacity: 0.5 }}>/{appointments.length}</span></div>
            <div className="kpi-detail">Appointments done</div>
          </div>
          <div className="glass-card kpi-card">
            <div className="kpi-eyebrow">Unpaid invoices</div>
            <div className="kpi-value" style={{ color: unpaidCount > 0 ? "var(--oxblood)" : undefined }}>{unpaidCount}</div>
            <div className="kpi-detail"><Link href="/app/money" style={{ color: "var(--oxblood)" }}>View invoices →</Link></div>
          </div>
        </div>

        {/* Panel grid */}
        <div className="panel-grid">
          {/* Run of show */}
          <div className="glass-card table-card">
            <div className="table-head">
              <div className="table-head-title">Run of show</div>
              <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>{appointments.length} pets · {appointments.length - completedCount} to go</div>
            </div>

            {appointments.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🐾</div>
                <div style={{ color: "var(--d-ink-3)", fontFamily: "var(--dash-serif)", fontSize: 18 }}>No appointments today.</div>
                <div style={{ color: "var(--d-ink-3)", fontSize: 13, marginTop: 4 }}>
                  <Link href="/app/calendar" style={{ color: "var(--oxblood)" }}>Schedule a booking →</Link>
                </div>
              </div>
            ) : (
              appointments.map((appt) => {
                const { cls, label } = statusPill(appt.status);
                const timeStr = appt.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                return (
                  <div key={appt.id} className="table-row" style={{ gridTemplateColumns: "72px 36px 1fr auto auto" }}>
                    <span style={{ fontFamily: "var(--dash-mono)", fontSize: 12, color: "var(--d-ink-3)" }}>{timeStr}</span>
                    <span style={{ fontSize: 20 }}>{petEmoji(appt.animal.species)}</span>
                    <span>
                      <strong style={{ fontSize: 14 }}>{appt.animal.name}</strong>
                      <span style={{ color: "var(--d-ink-3)", fontSize: 12, marginLeft: 6 }}>{appt.service.name} · {fmtDuration(appt.service.durationMinutes)}</span>
                    </span>
                    <span className={cls}>{label}</span>
                    <span style={{ fontFamily: "var(--dash-mono)", fontSize: 13, fontWeight: 600 }}>{fmtMoney(appt.priceCents)}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Rebooking alerts */}
            <div className="glass-card" style={{ padding: "var(--pad-card)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16 }}>Due for rebooking</div>
                <Link href="/app/rebooking" style={{ fontSize: 12, color: "var(--oxblood)" }}>See all →</Link>
              </div>
              {dueAlerts.length === 0 ? (
                <div style={{ color: "var(--d-ink-3)", fontSize: 13 }}>All clients are up to date. 🎉</div>
              ) : (
                dueAlerts.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--d-line)" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>{a.breed ?? a.species} · {a.client.name}</div>
                    </div>
                    <span className={`pill ${a.overdue > 0 ? "pill-red" : "pill-brass"}`}>
                      {a.overdue > 0 ? `${a.overdue}d overdue` : `due soon`}
                    </span>
                  </div>
                ))
              )}
              <Link href="/app/calendar" className="d-btn" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
                Book a slot →
              </Link>
            </div>

            {/* Quick stats */}
            <div className="glass-card" style={{ padding: "var(--pad-card)" }}>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 14 }}>Quick links</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/app/clients" className="d-btn" style={{ justifyContent: "flex-start" }}>👤 Client directory</Link>
                <Link href="/app/money" className="d-btn" style={{ justifyContent: "flex-start" }}>
                  💰 Invoices {unpaidCount > 0 && <span className="pill pill-red" style={{ marginLeft: "auto" }}>{unpaidCount} unpaid</span>}
                </Link>
                <Link href="/app/notes" className="d-btn" style={{ justifyContent: "flex-start" }}>📝 Grooming notes</Link>
                <Link href="/developers" className="d-btn" style={{ justifyContent: "flex-start" }}>🔌 n8n API docs</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
