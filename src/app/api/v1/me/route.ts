import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, apiError } from "@/lib/api-auth";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);

  const tenant = await db.tenant.findUnique({
    where: { id: auth.tenantId },
    select: {
      id: true, name: true, slug: true, timezone: true,
      address: true, phone: true, email: true,
    },
  });

  if (!tenant) return apiError("Tenant not found", 404);

  return NextResponse.json({
    data: {
      tenantId: auth.tenantId,
      keyId: auth.keyId,
      scopes: auth.scopes,
      tenant,
    },
  });
}
