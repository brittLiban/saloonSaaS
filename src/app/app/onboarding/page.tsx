import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { OnboardingClient } from "./OnboardingClient";

export default async function OnboardingPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const serviceCount = await db.service.count({ where: { tenantId: ctx.tenantId } });
  if (serviceCount > 0) redirect("/app/today");

  return <OnboardingClient salonName={ctx.name} />;
}
