import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export interface ApiCtx {
  tenantId: string;
  scopes:   string[];
  keyId:    string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function resolveApiKey(request: NextRequest): Promise<ApiCtx | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7).trim();
  const lastUnderscore = token.lastIndexOf("_");
  if (lastUnderscore < 1) return null;

  const prefix = token.slice(0, lastUnderscore);
  const secret = token.slice(lastUnderscore + 1);

  const key = await db.apiKey.findUnique({ where: { prefix } });
  if (!key) return null;
  if (key.revokedAt) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  if (sha256(secret) !== key.hashedSecret) return null;

  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return { tenantId: key.tenantId, scopes: key.scopes, keyId: key.id };
}

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, status, ...(details ? { details } : {}) }, { status });
}

export function requireScope(ctx: ApiCtx, scope: string): NextResponse | undefined {
  if (!ctx.scopes.includes(scope)) {
    return apiError(`Requires scope: ${scope}`, 403);
  }
  return undefined;
}

export function paginate(req: NextRequest) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") ?? "20")));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
