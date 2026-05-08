import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarActions } from "@/components/CalendarActions";
import { WeeklyRevenueChart } from "@/components/WeeklyRevenueChart";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  CONFIRMED:   { cls: "pill pill-brass", label: "Confirmed" },
  CHECKED_IN:  { cls: "pill pill-blue",  label: "Checked in" },
  IN_PROGRESS: { cls: "pill pill-red",   label: "In chair" },
  READY:       { cls: "pill pill-green", label: "Ready" },
  COMPLETED:   { cls: "pill pill-gray",  label: "Done" },
  CANCELLED:   { cls: "pill pill-red",   label: "Cancelled" },
  NO_SHOW:     { cls: "pill pill-red",   label: "No show" },
  REQUESTED:   { cls: "pill pill-gray",  label: "Requested" },
};

function getWeekStart(d: Date): string {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { status, page } = await searchParams;
  const pageNum  = Math.max(1, parseInt(page ?? "1"));
  const pageSize = 25;

  const where = {
    tenantId: ctx.tenantId,
    ...(status ? { status: status as never } : {}),
  };

  // Eight-week revenue window
  const now = new Date();
  const thisMonday = new Date(now);
  const dow = thisMonday.getDay();
  thisMonday.setDate(thisMonday.getDate() - (dow === 0 ? 6 : dow - 1));
  thisMonday.setHours(0, 0, 0, 0);
  const eightWeeksAgo = new Date(thisMonday);
  eightWeeksAgo.setDate(thisMonday.getDate() - 49); // 7 prior weeks

  const [appointments, total, monthRevenue, services, weeklyAppts] = await Promise.all([
    db.appointment.findMany({
      where,
      include: { animal: true, client: true, service: true },
      orderBy: { startsAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    db.appointment.count({ where }),
    db.appointment.aggregate({
      where: {
        tenantId: ctx.tenantId,
        status: "COMPLETED",
        startsAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _sum: { priceCents: true },
    }),
    db.service.findMany({
      where: { tenantId: ctx.tenantId, active: true },
      select: { id: true, name: true, durationMinutes: true, bufferAfterMinutes: true, priceCents: true, species: true },
      orderBy: { name: "asc" },
    }),
    db.appointment.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: "COMPLETED",
        startsAt: { gte: eightWeeksAgo },
      },
      select: { startsAt: true, priceCents: true },
    }),
  ]);

  // Build 8-week revenue buckets
  const weekMap: Record<string, number> = {};
  for (const a of weeklyAppts) {
    const w = getWeekStart(a.startsAt);
    weekMap[w] = (weekMap[w] ?? 0) + a.priceCents;
  }
  const weeklyData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() - 7 * (7 - i));
    const week = d.toISOString().slice(0, 10);
    return { week, revenue: weekMap[week] ?? 0 };
  });

  const totalPages = Math.ceil(total / pageSize);
  const statuses = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED", "NO_SHOW", "REQUESTED"];

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Bookings</div>
          <div className="topbar-sub">
            {total} total · {fmtMoney(monthRevenue._sum.priceCents ?? 0)} this month
          </div>
        </div>
        <div className="topbar-actions">
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="d-input"
              style={{ width: 160 }}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{STATUS_PILL[s]?.label ?? s}</option>
              ))}
            </select>
            <button className="d-btn" type="submit">Filter</button>
          </form>
          <CalendarActions services={services} />
        </div>
      </header>

      <div className="dash-content">
        {/* Weekly revenue chart */}
        <WeeklyRevenueChart data={weeklyData} />

        {/* Appointment table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                {["Date & Time", "Pet", "Service", "Client", "Status", "Source", "Price"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 11,
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                      color: "var(--d-ink-3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--d-ink-4)", fontStyle: "italic" }}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                appointments.map((a) => {
                  const { cls, label } = STATUS_PILL[a.status] ?? { cls: "pill pill-gray", label: a.status };
                  const srcCls = a.source === "API" ? "pill pill-blue" : a.source === "SYSTEM" ? "pill pill-brass" : "pill pill-gray";
                  return (
                    <tr key={a.id} className="table-row">
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {a.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--d-ink-3)", fontFamily: "var(--dash-mono)" }}>
                          {a.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {petEmoji(a.animal.species)} {a.animal.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>{a.animal.breed ?? a.animal.species}</div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{a.service.name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>
                        <Link href={`/app/clients/${a.clientId}`} style={{ color: "var(--oxblood)" }}>
                          {a.client.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={cls} style={{ fontSize: 10 }}>{label}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={srcCls} style={{ fontSize: 10 }}>{a.source}</span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "var(--dash-mono)" }}>
                        {fmtMoney(a.priceCents)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`}
                className="d-btn"
                style={{
                  padding: "4px 12px",
                  fontWeight: p === pageNum ? 700 : 400,
                  background: p === pageNum ? "var(--oxblood)" : undefined,
                  color: p === pageNum ? "#fff" : undefined,
                }}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
