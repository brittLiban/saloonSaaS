import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { MoneyClient } from "./MoneyClient";

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export default async function MoneyPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const now = new Date();
  const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart     = new Date(now.getFullYear(), 0, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1);
  const eightWeeksAgo  = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

  const [
    invoices,
    clients,
    monthAgg,
    lastMonthAgg,
    yearAgg,
    outstandingAgg,
    overdueCount,
    recentPaid,
  ] = await Promise.all([
    db.invoice.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        client: { select: { name: true } },
        animal: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.client.findMany({
      where: { tenantId: ctx.tenantId },
      select: {
        id: true, name: true,
        animals: { select: { id: true, name: true, species: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    db.invoice.aggregate({
      where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: monthStart } },
      _sum: { totalCents: true },
    }),
    db.invoice.aggregate({
      where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: lastMonthStart, lt: lastMonthEnd } },
      _sum: { totalCents: true },
    }),
    db.invoice.aggregate({
      where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: yearStart } },
      _sum: { totalCents: true },
    }),
    db.invoice.aggregate({
      where: { tenantId: ctx.tenantId, status: { in: ["SENT", "UNPAID", "OVERDUE"] } },
      _sum: { totalCents: true },
      _count: true,
    }),
    db.invoice.count({
      where: { tenantId: ctx.tenantId, status: "OVERDUE" },
    }),
    db.invoice.findMany({
      where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: eightWeeksAgo } },
      select: { paidAt: true, totalCents: true },
    }),
  ]);

  // Build 8-week chart data
  const weekMap = new Map<string, number>();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weekMap.set(getMonday(d), 0);
  }
  for (const inv of recentPaid) {
    if (!inv.paidAt) continue;
    const week = getMonday(inv.paidAt);
    if (weekMap.has(week)) weekMap.set(week, (weekMap.get(week) ?? 0) + inv.totalCents);
  }
  const weeklyData = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, revenue]) => ({ week, revenue }));

  const monthRev     = monthAgg._sum.totalCents ?? 0;
  const lastMonthRev = lastMonthAgg._sum.totalCents ?? 0;
  const monthDelta   = lastMonthRev === 0 ? null : Math.round(((monthRev - lastMonthRev) / lastMonthRev) * 100);

  return (
    <MoneyClient
      invoices={invoices}
      clients={clients}
      weeklyData={weeklyData}
      kpis={{
        monthRevenue:      monthRev,
        monthDelta,
        yearRevenue:       yearAgg._sum.totalCents ?? 0,
        outstandingAmount: outstandingAgg._sum.totalCents ?? 0,
        outstandingCount:  outstandingAgg._count,
        overdueCount,
      }}
    />
  );
}
