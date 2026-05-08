import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function RebookingPage() {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const now = new Date();

  // Animals with a preferred cadence and a last visit that is past due
  const animals = await db.animal.findMany({
    where: {
      tenantId: ctx.tenantId,
      preferredCadenceDays: { not: null },
      lastVisitAt: { not: null },
    },
    include: {
      client: true,
      appointments: {
        where: { status: { in: ["CONFIRMED", "REQUESTED"] } },
        take: 1,
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: { lastVisitAt: "asc" },
  });

  const overdue = animals.filter((a) => {
    const daysSince = (now.getTime() - a.lastVisitAt!.getTime()) / 86400000;
    return daysSince > a.preferredCadenceDays! && a.appointments.length === 0;
  });

  const upcoming = animals.filter((a) => {
    const daysSince = (now.getTime() - a.lastVisitAt!.getTime()) / 86400000;
    return daysSince > a.preferredCadenceDays! && a.appointments.length > 0;
  });

  const dueThisWeek = animals.filter((a) => {
    const daysLeft = a.preferredCadenceDays! - (now.getTime() - a.lastVisitAt!.getTime()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 7;
  });

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Rebooking</div>
          <div className="topbar-sub">
            {overdue.length} overdue · {dueThisWeek.length} due this week
          </div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn d-btn-primary" type="button">Send reminders</button>
        </div>
      </header>

      <div className="dash-content">
        {/* Stats strip */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[
            { label: "Overdue (no booking)", value: overdue.length, urgent: overdue.length > 0 },
            { label: "Overdue (has booking)", value: upcoming.length, urgent: false },
            { label: "Due within 7 days", value: dueThisWeek.length, urgent: false },
          ].map(({ label, value, urgent }) => (
            <div key={label} className="glass-card" style={{
              padding: "16px 20px",
              borderColor: urgent ? "var(--oxblood)" : undefined,
              background: urgent ? "oklch(from var(--oxblood) l c h / 0.05)" : undefined,
            }}>
              <div style={{ fontSize: 11, color: urgent ? "var(--oxblood)" : "var(--d-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontFamily: "var(--dash-serif)", fontWeight: 400, color: urgent ? "var(--oxblood)" : undefined }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Overdue list */}
        {overdue.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 16, color: "var(--oxblood)" }}>
              Overdue — no upcoming booking
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {overdue.map((a) => {
                const daysSince = Math.floor((now.getTime() - a.lastVisitAt!.getTime()) / 86400000);
                const daysOver = daysSince - a.preferredCadenceDays!;
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 16px", background: "oklch(1 0 0 / 0.5)",
                    borderRadius: 10, border: "1px solid var(--d-line)",
                  }}>
                    <div style={{ fontSize: 28 }}>{petEmoji(a.species)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        <Link href={`/app/animals/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>{a.name}</Link>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                        {a.breed ?? a.species} · {" "}
                        <Link href={`/app/clients/${a.clientId}`} style={{ color: "var(--oxblood)" }}>{a.client.name}</Link>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "var(--oxblood)", fontWeight: 600 }}>{daysOver}d overdue</div>
                      <div style={{ fontSize: 11, color: "var(--d-ink-3)" }}>Last: {a.lastVisitAt!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="d-btn" style={{ fontSize: 12, padding: "5px 12px" }}>Send reminder</button>
                      <button className="d-btn d-btn-primary" style={{ fontSize: 12, padding: "5px 12px" }}>Book now</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Due this week */}
        {dueThisWeek.length > 0 && (
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 16 }}>Due within 7 days</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dueThisWeek.map((a) => {
                const daysSince = (now.getTime() - a.lastVisitAt!.getTime()) / 86400000;
                const daysLeft = Math.ceil(a.preferredCadenceDays! - daysSince);
                return (
                  <div key={a.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", background: "oklch(1 0 0 / 0.5)",
                    borderRadius: 8, border: "1px solid var(--d-line)",
                  }}>
                    <div style={{ fontSize: 22 }}>{petEmoji(a.species)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        <Link href={`/app/animals/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>{a.name}</Link>
                        {" "}
                        <span style={{ fontWeight: 400, color: "var(--d-ink-3)" }}>· {a.client.name}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>Due in {daysLeft}d</div>
                    <button className="d-btn" style={{ fontSize: 11, padding: "4px 10px" }}>Book</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {overdue.length === 0 && dueThisWeek.length === 0 && (
          <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, marginBottom: 8 }}>All caught up!</div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14 }}>No animals are overdue or due this week.</div>
          </div>
        )}
      </div>
    </>
  );
}
