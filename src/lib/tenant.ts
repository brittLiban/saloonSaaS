import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { db } from "@/server/db";

export interface TenantCtx {
  userId:   string;
  tenantId: string;
  role:     SessionData["role"];
  name:     string;
  email:    string;
}

export async function getTenantCtx(): Promise<TenantCtx | null> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.userId || !session.tenantId) return null;
  return {
    userId:   session.userId,
    tenantId: session.tenantId,
    role:     session.role,
    name:     session.name,
    email:    session.email,
  };
}

export async function requireTenantCtx(): Promise<TenantCtx> {
  const ctx = await getTenantCtx();
  if (!ctx) throw new Error("Unauthenticated");
  return ctx;
}

export async function getTenantWithTheme(tenantId: string) {
  return db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      address: true,
      phone: true,
      logoUrl: true,
      themeTokens: true,
      businessHours: true,
      bookingRules: true,
    },
  });
}
