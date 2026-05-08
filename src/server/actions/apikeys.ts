"use server";

import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { ALL_SCOPES, type ApiScope } from "@/lib/api-scopes";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createApiKey(
  name: string,
  scopes: string[]
): Promise<{ token: string }> {
  const ctx = await requireTenantCtx();

  const prefixRand = randomBytes(8).toString("hex");
  const prefix = `glas_${prefixRand}`;
  const secretRaw = randomBytes(20).toString("hex");

  await db.apiKey.create({
    data: {
      tenantId: ctx.tenantId,
      name: name.trim(),
      prefix,
      hashedSecret: sha256(secretRaw),
      scopes: scopes.filter((s): s is ApiScope => (ALL_SCOPES as readonly string[]).includes(s)),
    },
  });

  revalidatePath("/app/settings");
  return { token: `${prefix}_${secretRaw}` };
}

export async function revokeApiKey(id: string) {
  const ctx = await requireTenantCtx();
  await db.apiKey.updateMany({
    where: { id, tenantId: ctx.tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/app/settings");
}
