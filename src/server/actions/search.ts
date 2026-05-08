"use server";

import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

export type SearchResult = {
  type: "client" | "animal";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(q: string): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const ctx = await getTenantCtx();
  if (!ctx) return [];

  const [clients, animals] = await Promise.all([
    db.client.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { email: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed } },
        ],
      },
      take: 5,
      select: { id: true, name: true, email: true, phone: true },
    }),
    db.animal.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { name: { contains: trimmed, mode: "insensitive" } },
          { breed: { contains: trimmed, mode: "insensitive" } },
          { species: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, breed: true, species: true, client: { select: { name: true } } },
    }),
  ]);

  return [
    ...clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      title: c.name,
      subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || "Client",
      href: `/app/clients/${c.id}`,
    })),
    ...animals.map((a) => ({
      type: "animal" as const,
      id: a.id,
      title: a.name,
      subtitle: `${a.breed ?? a.species} · ${a.client.name}`,
      href: `/app/animals/${a.id}`,
    })),
  ];
}
