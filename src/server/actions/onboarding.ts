"use server";

import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

export async function saveBusinessHours(
  hours: Record<string, { open: string; close: string } | null>
) {
  const ctx = await requireTenantCtx();
  await db.tenant.update({
    where: { id: ctx.tenantId },
    data: { businessHours: hours as never },
  });
  revalidatePath("/app/calendar");
  revalidatePath("/app/today");
}
