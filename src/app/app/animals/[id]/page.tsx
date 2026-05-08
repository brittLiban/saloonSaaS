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

export default async function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const animal = await db.animal.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      client: true,
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 10,
        include: { service: true },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { author: true },
      },
    },
  });

  if (!animal) notFound();

  const completedAppts = animal.appointments.filter((a) => a.status === "COMPLETED");
  const totalSpend = completedAppts.reduce((sum, a) => sum + a.priceCents, 0);
  const lastAppt = completedAppts[0];

  const ageDays = animal.dateOfBirth
    ? Math.floor((Date.now() - animal.dateOfBirth.getTime()) / 86400000)
    : null;
  const ageStr = ageDays != null
    ? ageDays < 365
      ? `${Math.floor(ageDays / 30)} mo`
      : `${Math.floor(ageDays / 365)} yr`
    : null;

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/app/animals" style={{ color: "var(--d-ink-3)", fontSize: 13, textDecoration: "none" }}>
            ← Animals
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 28 }}>{petEmoji(animal.species)}</span>
            <div className="topbar-title">{animal.name}</div>
          </div>
          <div className="topbar-sub">
            {animal.breed ?? animal.species}
            {ageStr ? ` · ${ageStr}` : ""}
            {animal.weightLbs ? ` · ${Number(animal.weightLbs)} lbs` : ""}
            {" · "}
            <Link href={`/app/clients/${animal.clientId}`} style={{ color: "var(--oxblood)" }}>
              {animal.client.name}
            </Link>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn" type="button">Edit</button>
          <button className="d-btn d-btn-primary" type="button">+ Booking</button>
        </div>
      </header>

      <div className="dash-content">
        {/* Allergy / behavior alert banner */}
        {(animal.allergies.length > 0 || animal.behaviorFlags.length > 0) && (
          <div className="glass-card" style={{ padding: "12px 20px", borderColor: "var(--oxblood)", background: "oklch(from var(--oxblood) l c h / 0.05)", marginBottom: 4 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              {animal.allergies.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--oxblood)" }}>⚠ Allergies:</span>
                  {animal.allergies.map((a) => <span key={a} className="pill pill-red">{a}</span>)}
                </div>
              )}
              {animal.behaviorFlags.length > 0 && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--d-ink-2)" }}>Behavior:</span>
                  {animal.behaviorFlags.map((f) => <span key={f} className="pill pill-brass">{f}</span>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "Total visits", value: completedAppts.length },
            { label: "Lifetime spend", value: fmtMoney(totalSpend) },
            { label: "Last visit", value: lastAppt ? lastAppt.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Never" },
            { label: "Preferred cadence", value: animal.preferredCadenceDays ? `${animal.preferredCadenceDays}d` : "Not set" },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--d-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontFamily: "var(--dash-serif)", fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Appointment history */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 14 }}>Appointment history</div>
            {animal.appointments.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontStyle: "italic", fontSize: 13 }}>No appointments yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {animal.appointments.map((a) => {
                  const { cls, label } = STATUS_PILL[a.status] ?? { cls: "pill pill-gray", label: a.status };
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--d-line)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.service.name}</div>
                        <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>
                          {a.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {" · "}
                          {a.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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

          {/* Care notes */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16 }}>Care notes</div>
              <button className="d-btn" type="button" style={{ fontSize: 11, padding: "4px 10px" }}>+ Add note</button>
            </div>
            {animal.careSummary && (
              <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.06)", borderRadius: 8, marginBottom: 12, fontSize: 13, lineHeight: 1.5, borderLeft: "3px solid var(--oxblood)" }}>
                {animal.careSummary}
              </div>
            )}
            {animal.notes.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontStyle: "italic", fontSize: 13 }}>No notes yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {animal.notes.map((n) => (
                  <div key={n.id} style={{ padding: "10px 12px", background: "oklch(1 0 0 / 0.5)", borderRadius: 8, border: "1px solid var(--d-line)" }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                      <span className="pill pill-gray" style={{ fontSize: 10 }}>{n.tag}</span>
                      <span style={{ fontSize: 11, color: "var(--d-ink-4)" }}>
                        {n.author?.name ?? "System"} · {n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{n.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
