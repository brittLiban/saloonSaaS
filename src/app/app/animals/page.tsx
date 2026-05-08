import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

function daysAgo(date: Date | null) {
  if (!date) return null;
  const d = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { q, species } = await searchParams;

  const animals = await db.animal.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(species ? { species: { equals: species, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { breed: { contains: q, mode: "insensitive" } },
              { client: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  const now = new Date();
  const overdueAnimals = animals.filter((a) => {
    if (!a.preferredCadenceDays || !a.lastVisitAt) return false;
    const daysSince = (now.getTime() - a.lastVisitAt.getTime()) / 86400000;
    return daysSince > a.preferredCadenceDays;
  });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Animals</div>
          <div className="topbar-sub">
            {animals.length} animal{animals.length !== 1 ? "s" : ""}
            {overdueAnimals.length > 0 && (
              <span style={{ marginLeft: 8, color: "var(--oxblood)", fontWeight: 600 }}>
                · {overdueAnimals.length} overdue for grooming
              </span>
            )}
          </div>
        </div>
        <div className="topbar-actions">
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <select name="species" defaultValue={species ?? ""} className="d-input" style={{ width: 120 }}>
              <option value="">All species</option>
              <option value="dog">Dogs 🐶</option>
              <option value="cat">Cats 🐈</option>
              <option value="other">Other 🐾</option>
            </select>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, breed, owner…"
              className="d-input"
              style={{ width: 240 }}
            />
            <button className="d-btn" type="submit">Search</button>
          </form>
        </div>
      </header>

      <div className="dash-content">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {animals.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: "center", color: "var(--d-ink-4)", fontStyle: "italic", gridColumn: "1/-1" }}>
              {q || species ? "No animals match that filter." : "No animals on file yet."}
            </div>
          ) : (
            animals.map((a) => {
              const overdue = a.preferredCadenceDays && a.lastVisitAt &&
                (now.getTime() - a.lastVisitAt.getTime()) / 86400000 > a.preferredCadenceDays;
              return (
                <Link key={a.id} href={`/app/animals/${a.id}`} style={{ textDecoration: "none" }}>
                  <div
                    className="glass-card"
                    style={{
                      padding: 18,
                      cursor: "pointer",
                      borderColor: overdue ? "var(--oxblood)" : undefined,
                      background: overdue ? "oklch(from var(--oxblood) l c h / 0.04)" : undefined,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ fontSize: 32 }}>{petEmoji(a.species)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 8 }}>
                          {a.breed ?? a.species} · {a.client.name}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {a.allergies.map((tag) => (
                            <span key={tag} className="pill pill-red" style={{ fontSize: 10 }}>⚠ {tag}</span>
                          ))}
                          {a.behaviorFlags.map((tag) => (
                            <span key={tag} className="pill pill-brass" style={{ fontSize: 10 }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--d-line)", fontSize: 11, color: "var(--d-ink-3)" }}>
                      <span>{a._count.appointments} visits</span>
                      <span style={{ color: overdue ? "var(--oxblood)" : undefined }}>
                        Last: {daysAgo(a.lastVisitAt) ?? "never"}
                        {overdue && " ⚠"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
