import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { db } from "@/server/db";

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  tier: z.enum(["Regular", "VIP", "New"]).default("Regular"),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const rl = await checkRateLimit(auth.keyId); if (rl) return rl;
  const e1 = requireScope(auth, "clients:read"); if (e1) return e1;

  const { skip, take, page, pageSize } = paginate(req);
  const q = req.nextUrl.searchParams.get("q");

  const [clients, total] = await Promise.all([
    db.client.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
      include: { _count: { select: { animals: true, appointments: true } } },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    db.client.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: clients, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const e2 = requireScope(auth, "clients:write"); if (e2) return e2;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const client = await db.client.create({
    data: { ...parsed.data, tenantId: auth.tenantId },
  });

  return NextResponse.json({ data: client }, { status: 201 });
}
