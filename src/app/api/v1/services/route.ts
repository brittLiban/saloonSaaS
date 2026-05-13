import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "appointments:read"); if (_se) return _se;

  const species = req.nextUrl.searchParams.get("species");

  const services = await db.service.findMany({
    where: {
      tenantId: auth.tenantId,
      active: true,
      ...(species ? { OR: [{ species: { equals: species, mode: "insensitive" } }, { species: null }] } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, description: true,
      durationMinutes: true, priceCents: true, species: true,
      bufferBeforeMinutes: true, bufferAfterMinutes: true,
      addOnLinks: {
        select: {
          addOn: {
            select: {
              id: true,
              name: true,
              description: true,
              durationMinutes: true,
              priceCents: true,
              species: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    data: services.map(({ addOnLinks, ...service }) => ({
      ...service,
      addOns: addOnLinks.map((link) => link.addOn),
    })),
  });
}
