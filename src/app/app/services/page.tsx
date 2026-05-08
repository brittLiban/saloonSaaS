import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { ServicesClient } from "./ServicesClient";

export default async function ServicesPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const services = await db.service.findMany({
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
    },
  });

  return <ServicesClient services={services} />;
}
