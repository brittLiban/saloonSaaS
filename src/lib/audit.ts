import { db } from "@/server/db";

export async function writeAudit(params: {
  tenantId: string;
  actorUserId?: string;
  source: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({ data: params as never });
  } catch {
    // Audit logs are best-effort — never let a write failure break the request
  }
}
