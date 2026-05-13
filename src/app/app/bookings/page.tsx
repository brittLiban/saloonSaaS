import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { CalendarActions } from "@/components/CalendarActions";
import { BookingPeriodTabs } from "@/components/BookingPeriodTabs";
import { BookingVolumeChart } from "@/components/BookingVolumeChart";
import { TopbarSearch } from "@/components/TopbarSearch";
import { appointmentDurationMinutes, appointmentServiceLabel } from "@/lib/appointment-summary";

type Period = "today" | "week" | "month" | "3mo" | "6mo" | "year";
type BucketUnit = "day" | "week" | "month";

function fmtMoney(cents: number) {
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00)   return `$${(cents / 1_000_00).toFixed(1)}k`;
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  CONFIRMED:   { label: "Confirmed",  bg: "#fef3c7", color: "#92400e" },
  CHECKED_IN:  { label: "Checked in", bg: "#dbeafe", color: "#1e40af" },
  IN_PROGRESS: { label: "In chair",   bg: "#ffedd5", color: "var(--acc)" },
  READY:       { label: "Ready",      bg: "#dcfce7", color: "#166534" },
  COMPLETED:   { label: "Done",       bg: "#f3f4f6", color: "#374151" },
  CANCELLED:   { label: "Cancelled",  bg: "#fee2e2", color: "#991b1b" },
  NO_SHOW:     { label: "No show",    bg: "#fee2e2", color: "#991b1b" },
  REQUESTED:   { label: "Requested",  bg: "#f3f4f6", color: "#374151" },
};

function getPeriodRanges(period: Period, now: Date): {
  cStart: Date; cEnd: Date;
  pStart: Date; pEnd: Date;
  chartStart: Date; buckets: number; unit: BucketUnit;
  periodLabel: string; chartLabel: string;
} {
  const eoDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const soDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  switch (period) {
    case "today": {
      const cStart = soDay(now);
      const pStart = new Date(cStart); pStart.setDate(cStart.getDate() - 1);
      const chartStart = new Date(cStart); chartStart.setDate(cStart.getDate() - 13);
      return { cStart, cEnd: now, pStart, pEnd: eoDay(pStart), chartStart, buckets: 14, unit: "day", periodLabel: "Today", chartLabel: "Last 14 days" };
    }
    case "week": {
      const dow = now.getDay();
      const cStart = soDay(now); cStart.setDate(cStart.getDate() - (dow === 0 ? 6 : dow - 1));
      const pStart = new Date(cStart); pStart.setDate(cStart.getDate() - 7);
      const chartStart = new Date(pStart); chartStart.setDate(pStart.getDate() - 7 * 12);
      return { cStart, cEnd: now, pStart, pEnd: eoDay(new Date(cStart.getDate() - 1 + cStart.getTime())), chartStart, buckets: 14, unit: "week", periodLabel: "This week", chartLabel: "Last 14 weeks" };
    }
    case "3mo": {
      const cStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const pStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const pEnd   = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59, 999);
      const chartStart = new Date(now.getFullYear(), now.getMonth() - 14, 1);
      return { cStart, cEnd: now, pStart, pEnd, chartStart, buckets: 14, unit: "month", periodLabel: "Last 3 months", chartLabel: "Last 14 months" };
    }
    case "6mo": {
      const cStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const pStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const pEnd   = new Date(now.getFullYear(), now.getMonth() - 6, 0, 23, 59, 59, 999);
      const chartStart = new Date(now.getFullYear(), now.getMonth() - 14, 1);
      return { cStart, cEnd: now, pStart, pEnd, chartStart, buckets: 14, unit: "month", periodLabel: "Last 6 months", chartLabel: "Last 14 months" };
    }
    case "year": {
      const cStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      const pStart = new Date(now.getFullYear() - 2, now.getMonth(), 1);
      const pEnd   = new Date(now.getFullYear() - 1, now.getMonth(), 0, 23, 59, 59, 999);
      const chartStart = new Date(now.getFullYear(), now.getMonth() - 14, 1);
      return { cStart, cEnd: now, pStart, pEnd, chartStart, buckets: 14, unit: "month", periodLabel: "Last year", chartLabel: "Last 14 months" };
    }
    default: { // month
      const cStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const chartStart = new Date(now.getFullYear(), now.getMonth() - 13, 1);
      return { cStart, cEnd: now, pStart, pEnd, chartStart, buckets: 14, unit: "month", periodLabel: "This month", chartLabel: "Last 14 months" };
    }
  }
}

function bucketLabel(date: Date, unit: BucketUnit) {
  if (unit === "day")   return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (unit === "week")  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const params = await searchParams;
  const period = (params.period ?? "month") as Period;
  const pageNum = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 20;

  const now    = new Date();
  const ranges = getPeriodRanges(period, now);

  const [
    currentAppts, priorAppts, chartAppts, services, addOnRows,
    totalCount, allAppts,
  ] = await Promise.all([
    db.appointment.aggregate({
      where: { tenantId: ctx.tenantId, startsAt: { gte: ranges.cStart, lte: ranges.cEnd }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      _count: true, _sum: { priceCents: true },
    }),
    db.appointment.aggregate({
      where: { tenantId: ctx.tenantId, startsAt: { gte: ranges.pStart, lte: ranges.pEnd }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      _count: true, _sum: { priceCents: true },
    }),
    db.appointment.findMany({
      where: { tenantId: ctx.tenantId, startsAt: { gte: ranges.chartStart, lte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { startsAt: true },
    }),
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
    db.appointment.count({ where: { tenantId: ctx.tenantId } }),
    db.appointment.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        animal: true,
        client: true,
        service: true,
        services: { orderBy: { sortOrder: "asc" } },
        addOns: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { startsAt: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const addOns = addOnRows.map(({ serviceLinks, ...addOn }) => ({
    ...addOn,
    serviceIds: serviceLinks.map((link) => link.serviceId),
  }));

  // Build chart buckets
  const chartData = Array.from({ length: ranges.buckets }, (_, i) => {
    let bStart: Date, bEnd: Date;
    if (ranges.unit === "month") {
      bStart = new Date(ranges.chartStart.getFullYear(), ranges.chartStart.getMonth() + i, 1);
      bEnd   = new Date(ranges.chartStart.getFullYear(), ranges.chartStart.getMonth() + i + 1, 0, 23, 59, 59, 999);
    } else if (ranges.unit === "week") {
      bStart = new Date(ranges.chartStart); bStart.setDate(bStart.getDate() + i * 7);
      bEnd   = new Date(bStart); bEnd.setDate(bStart.getDate() + 6); bEnd.setHours(23, 59, 59, 999);
    } else {
      bStart = new Date(ranges.chartStart); bStart.setDate(bStart.getDate() + i);
      bEnd   = new Date(bStart); bEnd.setHours(23, 59, 59, 999);
    }
    const count = chartAppts.filter((a) => a.startsAt >= bStart && a.startsAt <= bEnd).length;
    return { label: bucketLabel(bStart, ranges.unit), count };
  });

  // KPI deltas
  const cCount  = currentAppts._count;
  const pCount  = priorAppts._count;
  const cRev    = currentAppts._sum.priceCents ?? 0;
  const pRev    = priorAppts._sum.priceCents ?? 0;
  const cAvg    = cCount > 0 ? Math.round(cRev / cCount / 100) : 0;
  const pAvg    = pCount > 0 ? Math.round(pRev / pCount / 100) : 0;

  function pct(cur: number, prior: number) {
    if (prior === 0) return null;
    return Math.round(((cur - prior) / prior) * 100);
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">{ctx.name} / Bookings</div>
          <div className="topbar-title">Bookings</div>
          <div className="topbar-sub">Performance &amp; trends</div>
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
          <CalendarActions services={services} addOns={addOns} />
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 48 }}>

        {/* Period selector + KPIs */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <BookingPeriodTabs current={period} />
        </div>

        {/* 3 KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Appointments", value: String(cCount), delta: pct(cCount, pCount), suffix: "%" },
            { label: "Revenue",       value: fmtMoney(cRev), delta: pct(cRev, pRev),   suffix: "%" },
            { label: "Avg ticket",    value: `$${cAvg}`,     delta: pAvg > 0 ? cAvg - pAvg : null, suffix: "" },
          ].map(({ label, value, delta, suffix }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
              <div style={{ fontSize: 12, color: "var(--d-ink-3)", fontWeight: 600, marginBottom: 8 }}>{label}</div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 42, fontWeight: 400, lineHeight: 1, marginBottom: 12 }}>
                {value}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {delta !== null && (
                  <span style={{
                    background: delta >= 0 ? "#dcfce7" : "#fee2e2",
                    color:      delta >= 0 ? "#166534" : "#991b1b",
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                  }}>
                    {delta >= 0 ? "+" : ""}{delta}{suffix}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--d-ink-3)" }}>vs prior</span>
              </div>
            </div>
          ))}
        </div>

        {/* Booking volume line chart */}
        <div style={{ marginBottom: 32 }}>
          <BookingVolumeChart data={chartData} label={ranges.chartLabel} />
        </div>

        {/* Appointment list */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>All bookings</div>
          <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>{totalCount} total</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", overflow: "hidden" }}>
          {allAppts.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--d-ink-3)" }}>No bookings yet.</div>
          ) : (
            allAppts.map((a, idx) => {
              const s = STATUS_LABEL[a.status] ?? { label: a.status, bg: "#f3f4f6", color: "#374151" };
              const isLast = idx === allAppts.length - 1;
              const start = new Date(a.startsAt);
              const label = appointmentServiceLabel(a);
              const duration = appointmentDurationMinutes(a);
              return (
                <div
                  key={a.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 46px 1fr auto auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 22px",
                    borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--dash-mono)" }}>
                      {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--d-ink-4)", fontFamily: "var(--dash-mono)" }}>
                      {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>

                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
                    display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0,
                  }}>
                    {petEmoji(a.animal.species)}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{a.animal.name}</div>
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                      {label} · {duration} min · <Link href={`/app/clients/${a.clientId}`} style={{ color: "var(--acc)" }}>{a.client.name}</Link>
                    </div>
                  </div>

                  <div style={{
                    display: "inline-flex", alignItems: "center",
                    padding: "4px 10px", borderRadius: 999,
                    background: s.bg, color: s.color,
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    {s.label}
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--dash-mono)", textAlign: "right" }}>
                    {fmtMoney(a.priceCents)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`?period=${period}&page=${p}`}
                style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: p === pageNum ? "#1a1a1a" : "#fff",
                  color: p === pageNum ? "#fff" : "var(--d-ink-3)",
                  border: "1.5px solid var(--d-line-2)",
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
