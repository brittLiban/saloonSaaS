import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { ClientDetailActions } from "@/components/ClientDetailActions";

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  CONFIRMED:   { bg: "#fef3c7", color: "#b45309",         label: "Confirmed"  },
  CHECKED_IN:  { bg: "#dbeafe", color: "#1e40af",         label: "Checked in" },
  IN_PROGRESS: { bg: "#ffedd5", color: "var(--acc)",      label: "In chair"   },
  READY:       { bg: "#dcfce7", color: "#166534",         label: "Ready"      },
  COMPLETED:   { bg: "#f3f4f6", color: "#374151",         label: "Done"       },
  CANCELLED:   { bg: "#fee2e2", color: "#991b1b",         label: "Cancelled"  },
  NO_SHOW:     { bg: "#fee2e2", color: "#991b1b",         label: "No show"    },
  REQUESTED:   { bg: "#f3f4f6", color: "#374151",         label: "Requested"  },
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const client = await db.client.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      animals: {
        orderBy: { name: "asc" },
        include: { _count: { select: { appointments: true } } },
      },
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 10,
        include: { animal: true, service: true },
      },
      notesFeed: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { author: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!client) notFound();

  const totalSpend = client.invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  const totalVisits = client.appointments.filter((a) => a.status === "COMPLETED").length;

  return (
    <>
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <Link href="/app/clients" style={{ color: "var(--d-ink-3)", textDecoration: "none" }}>
              ← Clients
            </Link>
          </div>
          <div className="topbar-title">{client.name}</div>
          <div className="topbar-sub">
            {client.email ?? ""}
            {client.phone ? ` · ${client.phone}` : ""}
          </div>
        </div>
        <div className="topbar-actions">
          <ClientDetailActions client={{
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address,
            tier: client.tier,
            notes: client.notes,
          }} />
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 48 }}>

        {/* ── 4 KPI cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
          {[
            { label: "Total visits",  value: totalVisits.toString() },
            { label: "Pets on file",  value: client.animals.length.toString() },
            { label: "Lifetime spend", value: fmtMoney(totalSpend) },
            { label: "Client tier",   value: client.tier },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)",
              padding: "18px 22px",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "var(--d-ink-4)", marginBottom: 10,
              }}>
                {label}
              </div>
              <div style={{
                fontFamily: "var(--dash-serif)", fontSize: 34,
                fontWeight: 400, color: "var(--d-ink)", lineHeight: 1,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-column: Pets + Recent appointments ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Pets */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 16 }}>Pets</div>
            {client.animals.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                No pets on file
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {client.animals.map((a) => (
                  <Link key={a.id} href={`/app/animals/${a.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: "#fafafa",
                      borderRadius: 12, border: "1px solid var(--d-line-2)",
                      transition: "background 0.1s",
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
                        display: "grid", placeItems: "center", fontSize: 18,
                      }}>
                        {petEmoji(a.species)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--d-ink)", marginBottom: 2 }}>
                          {a.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                          {a.breed ?? a.species} · {a._count.appointments} visit{a._count.appointments !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {a.lastVisitAt && (
                        <div style={{ fontSize: 12, color: "var(--d-ink-4)", flexShrink: 0 }}>
                          Last: {a.lastVisitAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent appointments */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 16 }}>
              Recent appointments
            </div>
            {client.appointments.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                No appointments yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {client.appointments.map((a, idx) => {
                  const s = STATUS_STYLE[a.status] ?? { bg: "#f3f4f6", color: "#374151", label: a.status };
                  const isLast = idx === client.appointments.length - 1;
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 0",
                        borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                      }}
                    >
                      {/* Animal emoji */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
                        display: "grid", placeItems: "center", fontSize: 15,
                      }}>
                        {petEmoji(a.animal.species)}
                      </div>

                      {/* Name + date */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--d-ink)", marginBottom: 3 }}>
                          {a.animal.name} — {a.service.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                          {a.startsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                      </div>

                      {/* Status */}
                      <span style={{
                        padding: "4px 11px", borderRadius: 999,
                        background: s.bg, color: s.color,
                        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {s.label}
                      </span>

                      {/* Price */}
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: "var(--d-ink)",
                        fontFamily: "var(--dash-mono)", minWidth: 58, textAlign: "right",
                      }}>
                        {fmtMoney(a.priceCents)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Notes (full width) ── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 16 }}>Notes</div>
          {client.notesFeed.length === 0 ? (
            <div style={{ color: "var(--d-ink-4)", fontSize: 13, padding: "12px 0", textAlign: "center" }}>
              No notes yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {client.notesFeed.map((n) => (
                <div key={n.id} style={{
                  padding: "12px 14px",
                  background: "#fafafa",
                  borderRadius: 12, border: "1px solid var(--d-line-2)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999,
                      background: "#f3f4f6", color: "#6b7280",
                      fontSize: 11, fontWeight: 600,
                      border: "1px solid var(--d-line-2)",
                    }}>
                      {n.tag}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--d-ink-4)" }}>
                      {n.author?.name ?? "System"} · {n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--d-ink)" }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
