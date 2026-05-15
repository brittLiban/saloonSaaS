import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { ServicesClient } from "./ServicesClient";

export default async function ServicesPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [services, addOns, monthlyCounts] = await Promise.all([
    db.service.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        bufferBeforeMinutes: true,
        bufferAfterMinutes: true,
        priceCents: true,
        active: true,
        species: true,
        sizeRules: true,
        addOnLinks: { select: { addOnId: true } },
      },
    }),
    db.addOn.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        active: true,
        species: true,
        serviceLinks: { select: { serviceId: true } },
      },
    }),
    db.appointment.groupBy({
      by: ["serviceId"],
      where: {
        tenantId: ctx.tenantId,
        startsAt: { gte: monthStart, lte: monthEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      _count: { serviceId: true },
    }),
  ]);

  const countMap: Record<string, number> = Object.fromEntries(
    monthlyCounts.map((c) => [c.serviceId, c._count.serviceId])
  );

  const parsedServices = services.map(({ sizeRules, ...s }) => ({
    ...s,
    applyWeightAdjustment: !!(sizeRules && typeof sizeRules === "object" && (sizeRules as Record<string, unknown>).applyWeightAdjustment),
  }));

  return <ServicesClient services={parsedServices} addOns={addOns} monthlyCountMap={countMap} tenantName={ctx.name} />;
}
