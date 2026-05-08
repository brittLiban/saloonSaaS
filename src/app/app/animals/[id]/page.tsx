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

function fmt12(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  const totalSpend     = completedAppts.reduce((sum, a) => sum + a.priceCents, 0);
  const lastAppt       = completedAppts[0];

  const ageDays = animal.dateOfBirth
    ? Math.floor((Date.now() - animal.dateOfBirth.getTime()) / 86400000)
    : null;
  const ageStr = ageDays != null
    ? ageDays < 365
      ? `${Math.floor(ageDays / 30)} mo`
      : `${Math.floor(ageDays / 365)} yr`
    : null;

  const hasAlerts = animal.allergies.length > 0 || animal.behaviorFlags.length > 0;

  return (
    <>
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">
            <Link href="/app/animals" style={{ color: "var(--d-ink-3)", textDecoration: "none" }}>
              ← Animals
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <span style={{ fontSize: 30 }}>{petEmoji(animal.species)}</span>
            <div className="topbar-title">{animal.name}</div>
          </div>
          <div className="topbar-sub">
            {animal.breed ?? animal.species}
            {ageStr ? ` · ${ageStr}` : ""}
            {animal.weightLbs ? ` · ${Number(animal.weightLbs)} lbs` : ""}
            {" · "}
            <Link href={`/app/clients/${animal.clientId}`} style={{ color: "var(--acc)", textDecoration: "none", fontWeight: 600 }}>
              {animal.client.name}
            </Link>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn" type="button">Edit</button>
          <button className="d-btn d-btn-primary" type="button">+ Booking</button>
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 48 }}>

        {/* ── Allergy / behavior pill banner ── */}
        {hasAlerts && (
          <div style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "12px 20px", marginBottom: 20,
            background: "#fff4ee",
            border: "1.5px solid var(--acc)",
            borderRadius: 999,
          }}>
            {animal.allergies.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚠</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--acc)" }}>Allergies:</span>
                {animal.allergies.map((a) => (
                  <span key={a} style={{
                    padding: "3px 12px", borderRadius: 999,
                    background: "#ffe9dd", color: "var(--acc)",
                    fontSize: 13, fontWeight: 600,
                    border: "1px solid oklch(from var(--acc) l c h / 0.25)",
                  }}>{a}</span>
                ))}
              </div>
            )}
            {animal.behaviorFlags.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--d-ink-2)" }}>Behavior:</span>
                {animal.behaviorFlags.map((f) => (
                  <span key={f} style={{
                    padding: "3px 12px", borderRadius: 999,
                    background: "#fef3c7", color: "#92400e",
                    fontSize: 13, fontWeight: 600,
                    border: "1px solid #fde68a",
                  }}>{f}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 4 KPI cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 }}>
          {[
            {
              label: "Total visits",
              value: completedAppts.length.toString(),
            },
            {
              label: "Lifetime spend",
              value: fmtMoney(totalSpend),
            },
            {
              label: "Last visit",
              value: lastAppt
                ? lastAppt.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "Never",
            },
            {
              label: "Preferred cadence",
              value: animal.preferredCadenceDays ? `${animal.preferredCadenceDays}d` : "Not set",
            },
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

        {/* ── Two-column: appointment history + care notes ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Appointment history */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 18 }}>
              Appointment history
            </div>
            {animal.appointments.length === 0 ? (
              <div style={{ color: "var(--d-ink-4)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                No appointments yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {animal.appointments.map((a, idx) => {
                  const s = STATUS_STYLE[a.status] ?? { bg: "#f3f4f6", color: "#374151", label: a.status };
                  const isLast = idx === animal.appointments.length - 1;
                  const dateStr = a.startsAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px 0",
                        borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--d-ink)", marginBottom: 3 }}>
                          {a.service.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                          {dateStr} · {fmt12(a.startsAt)}
                        </div>
                      </div>
                      <span style={{
                        padding: "4px 11px", borderRadius: 999,
                        background: s.bg, color: s.color,
                        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                      }}>
                        {s.label}
                      </span>
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

          {/* Care notes */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>Care notes</div>
              <button className="d-btn" type="button" style={{ fontSize: 12, padding: "5px 12px" }}>
                + Add note
              </button>
            </div>

            {/* Care summary block */}
            {animal.careSummary && (
              <div style={{
                padding: "12px 16px",
                background: "#fff8f5",
                borderLeft: "3px solid var(--acc)",
                borderRadius: "0 10px 10px 0",
                marginBottom: 14,
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--d-ink-2)",
              }}>
                {animal.careSummary}
              </div>
            )}

            {animal.notes.length === 0 && !animal.careSummary ? (
              <div style={{ color: "var(--d-ink-4)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
                No notes yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {animal.notes.map((n) => (
                  <div key={n.id} style={{
                    padding: "12px 14px",
                    background: "#fafafa",
                    borderRadius: 12,
                    border: "1px solid var(--d-line-2)",
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
      </div>
    </>
  );
}
