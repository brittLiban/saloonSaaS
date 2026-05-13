import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiKey, apiError, requireScope, paginate } from "@/lib/api-auth";
import { db } from "@/server/db";

const CreateSchema = z.object({
  clientId: z.string().cuid(),
  name: z.string().min(1).max(80),
  species: z.string().min(1).max(40),
  breed: z.string().max(80).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
  weightLbs: z.coerce.number().positive().optional(),
  vaccinated: z.boolean().nullable().optional(),
  allergies: z.array(z.string()).default([]),
  behaviorFlags: z.array(z.string()).default([]),
  preferredCadenceDays: z.coerce.number().int().positive().optional(),
  careSummary: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "animals:read"); if (_se) return _se;

  const { skip, take, page, pageSize } = paginate(req);
  const clientId = req.nextUrl.searchParams.get("clientId");
  const species = req.nextUrl.searchParams.get("species");

  const [animals, total] = await Promise.all([
    db.animal.findMany({
      where: {
        tenantId: auth.tenantId,
        ...(clientId ? { clientId } : {}),
        ...(species ? { species: { equals: species, mode: "insensitive" } } : {}),
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    db.animal.count({ where: { tenantId: auth.tenantId } }),
  ]);

  return NextResponse.json({ data: animals, meta: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "animals:write"); if (_se) return _se;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  // Verify client belongs to this tenant
  const client = await db.client.findFirst({ where: { id: parsed.data.clientId, tenantId: auth.tenantId } });
  if (!client) return apiError("Client not found", 404);

  const animal = await db.animal.create({
    data: { ...parsed.data, tenantId: auth.tenantId },
  });

  return NextResponse.json({ data: animal }, { status: 201 });
}
