import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { db } from "@/server/db";

const CreateSchema = z.object({
  animalId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  appointmentId: z.string().cuid().optional(),
  tag: z.string().min(1).max(40).default("general"),
  body: z.string().min(1).max(5000),
  visibility: z.enum(["INTERNAL", "CLIENT_VISIBLE"]).default("INTERNAL"),
});

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:read"); if (_se) return _se;

  const { skip, take, page, pageSize } = paginate(req);
  const animalId = req.nextUrl.searchParams.get("animalId");

  const [notes, total] = await Promise.all([
    db.groomingNote.findMany({
      where: { tenantId: auth.tenantId, ...(animalId ? { animalId } : {}) },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.groomingNote.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: notes, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:write"); if (_se) return _se;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const note = await db.groomingNote.create({
    data: { ...parsed.data, tenantId: auth.tenantId },
  });

  return NextResponse.json({ data: note }, { status: 201 });
}
