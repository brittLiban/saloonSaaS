import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { MoneyClient } from "./MoneyClient";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { status } = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart  = new Date(now.getFullYear(), 0, 1);

  const [invoices, clients, monthAgg, yearAgg, outstandingCount] = await Promise.all([
    db.invoice.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        client: { select: { name: true } },
        animal: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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
      where: { tenantId: ctx.tenantId, status: "PAID", paidAt: { gte: yearStart } },
      _sum: { totalCents: true },
    }),
    db.invoice.count({
      where: { tenantId: ctx.tenantId, status: { in: ["SENT", "UNPAID", "OVERDUE"] } },
    }),
  ]);

  return (
    <MoneyClient
      invoices={invoices}
      clients={clients}
      kpis={{
        monthRevenue:    monthAgg._sum.totalCents ?? 0,
        yearRevenue:     yearAgg._sum.totalCents ?? 0,
        outstandingCount,
        totalCount:      invoices.length,
      }}
      status={status}
    />
  );
}
