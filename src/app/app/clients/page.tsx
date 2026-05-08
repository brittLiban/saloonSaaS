import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { TopbarSearch } from "@/components/TopbarSearch";

function tierStyle(tier: string): { bg: string; color: string; dot: string } {
  switch (tier) {
    case "VIP":     return { bg: "#fef3c7", color: "#b45309", dot: "#d97706" };
    case "New":     return { bg: "#ffedd5", color: "var(--acc)", dot: "var(--acc)" };
    default:        return { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" };
  }
}

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
              { animals: { some: { name: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: {
      animals: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">{ctx.name} / Clients</div>
          <div className="topbar-title">Clients</div>
          <div className="topbar-sub">Owners &amp; their pets</div>
        </div>
        <div className="topbar-center">
          <TopbarSearch />
        </div>
        <div className="topbar-actions">
          <button className="topbar-bell" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="topbar-bell-dot" />
          </button>
          <Link href="/app/calendar" className="d-btn d-btn-primary">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New booking
          </Link>
        </div>
      </header>

      <div className="dash-content">
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", overflow: "hidden" }}>

          {/* Search + count row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 22px", borderBottom: "1px solid var(--d-line)",
          }}>
            <form method="GET">
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f8f8f8", border: "1.5px solid var(--d-line-2)",
                borderRadius: 10, padding: "0 14px", height: 38, width: 280,
              }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--d-ink-4)", flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by owner or pet..."
                  style={{
                    flex: 1, border: "none", background: "transparent", outline: "none",
                    fontSize: 13, color: "var(--d-ink)", fontFamily: "var(--dash-sans)",
                  }}
                />
              </div>
            </form>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
              {clients.length} shown
            </div>
          </div>

          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 1fr) minmax(160px, 1fr) 200px 150px 32px",
            padding: "10px 22px",
            borderBottom: "1px solid var(--d-line)",
          }}>
            {["OWNER", "PETS", "PHONE", "TIER", ""].map((h) => (
              <div key={h} style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                color: "var(--d-ink-4)", textTransform: "uppercase",
              }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {clients.length === 0 ? (
            <div style={{ padding: "48px 22px", textAlign: "center", color: "var(--d-ink-4)", fontSize: 14 }}>
              {q ? `No clients match "${q}".` : "No clients yet."}
            </div>
          ) : (
            clients.map((c, idx) => {
              const ts = tierStyle(c.tier);
              const isLast = idx === clients.length - 1;
              return (
                <Link
                  key={c.id}
                  href={`/app/clients/${c.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(160px, 1fr) minmax(160px, 1fr) 200px 150px 32px",
                    alignItems: "center",
                    padding: "18px 22px",
                    textDecoration: "none",
                    borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                    background: "transparent",
                  transition: "background 0.1s",
                }}
                className="client-row"
                >
                  {/* Owner name */}
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--d-ink)" }}>
                    {c.name}
                  </div>

                  {/* Pet pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.animals.length > 0 ? c.animals.map((a) => (
                      <span
                        key={a.id}
                        style={{
                          padding: "4px 12px", borderRadius: 999,
                          background: "#f3f4f6", color: "var(--d-ink-2)",
                          fontSize: 13, fontWeight: 500,
                          border: "1px solid var(--d-line-2)",
                        }}
                      >
                        {a.name}
                      </span>
                    )) : (
                      <span style={{ fontSize: 13, color: "var(--d-ink-4)" }}>—</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div style={{ fontSize: 13, color: "var(--d-ink-2)", fontFamily: "var(--dash-mono)" }}>
                    {c.phone ?? "—"}
                  </div>

                  {/* Tier pill */}
                  <div>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "5px 12px", borderRadius: 999,
                      background: ts.bg, color: ts.color,
                      fontSize: 13, fontWeight: 600,
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: ts.dot, flexShrink: 0, display: "inline-block",
                      }} />
                      {c.tier}
                    </span>
                  </div>

                  {/* Chevron */}
                  <div style={{ display: "flex", justifyContent: "flex-end", color: "var(--d-ink-4)" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
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
