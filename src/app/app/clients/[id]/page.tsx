import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  CONFIRMED:   { cls: "pill pill-brass",  label: "Confirmed" },
  CHECKED_IN:  { cls: "pill pill-blue",   label: "Checked in" },
  IN_PROGRESS: { cls: "pill pill-red",    label: "In chair" },
  READY:       { cls: "pill pill-green",  label: "Ready" },
  COMPLETED:   { cls: "pill pill-gray",   label: "Done" },
  CANCELLED:   { cls: "pill pill-red",    label: "Cancelled" },
  NO_SHOW:     { cls: "pill pill-red",    label: "No show" },
  REQUESTED:   { cls: "pill pill-gray",   label: "Requested" },
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
        take: 5,
        include: { author: true },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client) notFound();

  const totalSpend = client.invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.totalCents, 0);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/app/clients" style={{ color: "var(--d-ink-3)", fontSize: 13, textDecoration: "none" }}>
            ← Clients
          </Link>
          <div className="topbar-title" style={{ marginTop: 2 }}>{client.name}</div>
          <div className="topbar-sub">{client.email ?? ""}{client.phone ? ` · ${client.phone}` : ""}</div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn" type="button">Edit</button>
          <button className="d-btn d-btn-primary" type="button">+ Booking</button>
        </div>
      </header>

      <div className="dash-content">
        {/* KPI strip */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "Total visits", value: client.appointments.filter(a => a.status === "COMPLETED").length },
            { label: "Pets on file", value: client.animals.length },
            { label: "Lifetime spend", value: fmtMoney(totalSpend) },
            { label: "Client tier", value: client.tier },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--d-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontFamily: "var(--dash-serif)", fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 0 }}>
          {/* Animals */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 14 }}>Pets</div>
            {client.animals.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontStyle: "italic", fontSize: 13 }}>No pets on file</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {client.animals.map((a) => (
                  <Link key={a.id} href={`/app/animals/${a.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "oklch(1 0 0 / 0.5)", borderRadius: 8, border: "1px solid var(--d-line)" }}>
                      <div style={{ fontSize: 22 }}>{petEmoji(a.species)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{a.breed ?? a.species} · {a._count.appointments} visits</div>
                      </div>
                      {a.lastVisitAt && (
                        <div style={{ fontSize: 11, color: "var(--d-ink-4)" }}>
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
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 14 }}>Recent appointments</div>
            {client.appointments.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontStyle: "italic", fontSize: 13 }}>No appointments yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {client.appointments.map((a) => {
                  const { cls, label } = STATUS_PILL[a.status] ?? { cls: "pill pill-gray", label: a.status };
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--d-line)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{petEmoji(a.animal.species)} {a.animal.name} — {a.service.name}</div>
                        <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>
                          {a.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <span className={cls} style={{ fontSize: 10 }}>{label}</span>
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)", minWidth: 55, textAlign: "right" }}>{fmtMoney(a.priceCents)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {client.notesFeed.length > 0 && (
          <div className="glass-card" style={{ padding: 20, marginTop: 0 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 14 }}>Notes</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {client.notesFeed.map((n) => (
                <div key={n.id} style={{ padding: "10px 14px", background: "oklch(1 0 0 / 0.5)", borderRadius: 8, border: "1px solid var(--d-line)" }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "center" }}>
                    <span className="pill pill-gray" style={{ fontSize: 10 }}>{n.tag}</span>
                    <span style={{ fontSize: 11, color: "var(--d-ink-4)" }}>
                      {n.author?.name ?? "System"} · {n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{n.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
