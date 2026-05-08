import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const apiKeys = await db.apiKey.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return <SettingsClient apiKeys={apiKeys} />;
}
