import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { q } = await searchParams;

  const clients = await db.client.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { animals: true, appointments: true } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  const tierColor: Record<string, string> = {
    VIP: "pill pill-brass",
    Regular: "pill pill-gray",
    New: "pill pill-blue",
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Clients</div>
          <div className="topbar-sub">{clients.length} client{clients.length !== 1 ? "s" : ""}{q ? ` matching "${q}"` : ""}</div>
        </div>
        <div className="topbar-actions">
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name, email, phone…"
              className="d-input"
              style={{ width: 260 }}
            />
            <button className="d-btn" type="submit">Search</button>
          </form>
          <button className="d-btn d-btn-primary" type="button">+ New client</button>
        </div>
      </header>

      <div className="dash-content">
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                {["Name", "Contact", "Pets", "Visits", "Tier", "Since", ""].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                    color: "var(--d-ink-3)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--d-ink-4)", fontStyle: "italic" }}>
                    {q ? "No clients match that search." : "No clients yet. Add your first client!"}
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13 }}>{c.email ?? "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{c.phone ?? ""}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{c._count.animals}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{c._count.appointments}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={tierColor[c.tier] ?? "pill pill-gray"}>{c.tier}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--d-ink-3)" }}>
                      {c.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/app/clients/${c.id}`} className="d-btn" style={{ fontSize: 12, padding: "4px 10px" }}>View →</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
