import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { TopbarSearch } from "@/components/TopbarSearch";
import { RebookingFilterTabs } from "@/components/RebookingFilterTabs";

type FilterKey = "overdue" | "due" | "lapsed";

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

export default async function RebookingPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const ctx = await getTenantCtx();
  if (!ctx) redirect("/login");

  const filter: FilterKey =
    searchParams.filter === "due" ? "due" :
    searchParams.filter === "lapsed" ? "lapsed" : "overdue";

  const now = new Date();

  const animals = await db.animal.findMany({
    where: { tenantId: ctx.tenantId, lastVisitAt: { not: null } },
    include: {
      client: true,
      appointments: {
        where: { status: { in: ["CONFIRMED", "REQUESTED", "CHECKED_IN", "IN_PROGRESS"] } },
        take: 1,
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: { lastVisitAt: "asc" },
  });

  function daysSinceVisit(a: typeof animals[0]) {
    return (now.getTime() - a.lastVisitAt!.getTime()) / 86_400_000;
  }

  const overdue = animals.filter((a) => {
    if (!a.preferredCadenceDays) return false;
    return daysSinceVisit(a) > a.preferredCadenceDays && a.appointments.length === 0;
  });

  const due = animals.filter((a) => {
    if (!a.preferredCadenceDays) return false;
    const daysUntilDue = a.preferredCadenceDays - daysSinceVisit(a);
    return daysUntilDue >= 0 && daysUntilDue <= 14;
  });

  const lapsed = animals.filter((a) => {
    return daysSinceVisit(a) > 30 && a.appointments.length === 0;
  });

  const displayList = filter === "due" ? due : filter === "lapsed" ? lapsed : overdue;

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">{ctx.name} / Rebooking</div>
          <div className="topbar-title">Rebooking</div>
          <div className="topbar-sub">Lapsed regulars and overdue dogs</div>
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

      <div className="dash-content" style={{ paddingBottom: 48 }}>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 11, color: "var(--d-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Overdue</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 48, fontWeight: 400, lineHeight: 1, color: "var(--acc)", marginBottom: 8 }}>
              {overdue.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>past their cadence</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 11, color: "var(--d-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Due in 14 days</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 48, fontWeight: 400, lineHeight: 1, color: "var(--acc)", marginBottom: 8 }}>
              {due.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>book before they slip</div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "22px 24px" }}>
            <div style={{ fontSize: 11, color: "var(--d-ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Lapsed 30d+</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 48, fontWeight: 400, lineHeight: 1, color: "var(--d-ink)", marginBottom: 8 }}>
              {lapsed.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>haven't been in a while</div>
          </div>
        </div>

        {/* Filter tabs + Text all button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <RebookingFilterTabs
            current={filter}
            counts={{ overdue: overdue.length, due: due.length, lapsed: lapsed.length }}
          />
          <button className="d-btn d-btn-primary" type="button">
            Text all
          </button>
        </div>

        {/* Animal list */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", overflow: "hidden" }}>
          {displayList.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, color: "var(--d-ink-3)" }}>
                {filter === "overdue" ? "No overdue animals — you're all caught up!" :
                 filter === "due" ? "No animals due in the next 14 days." :
                 "No lapsed clients right now."}
              </div>
            </div>
          ) : (
            displayList.map((a, idx) => {
              const ds = Math.floor(daysSinceVisit(a));
              const isOverdue = a.preferredCadenceDays ? ds > a.preferredCadenceDays : false;
              const daysOver  = isOverdue ? ds - a.preferredCadenceDays! : 0;
              const daysUntil = a.preferredCadenceDays ? Math.ceil(a.preferredCadenceDays - daysSinceVisit(a)) : null;
              const isLast    = idx === displayList.length - 1;
              const lastVisit = a.lastVisitAt!.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "18px 22px",
                    borderBottom: isLast ? "none" : "1px solid var(--d-line)",
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                    background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
                    display: "grid", placeItems: "center", fontSize: 20,
                  }}>
                    {petEmoji(a.species)}
                  </div>

                  {/* Name + client · breed */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--d-ink)", marginBottom: 2 }}>
                      <Link href={`/app/animals/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {a.name}
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                      <Link href={`/app/clients/${a.clientId}`} style={{ color: "var(--d-ink-3)", textDecoration: "none" }}>
                        {a.client.name}
                      </Link>
                      {a.breed ? ` · ${a.breed}` : ` · ${a.species}`}
                    </div>
                  </div>

                  {/* Last visit + status */}
                  <div style={{ textAlign: "right", minWidth: 110, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 3 }}>Last: {lastVisit}</div>
                    {isOverdue ? (
                      <div style={{ fontSize: 12, color: "var(--acc)", fontWeight: 700 }}>
                        {daysOver} days overdue
                      </div>
                    ) : daysUntil !== null ? (
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                        Due in {daysUntil} days
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                        {ds} days since visit
                      </div>
                    )}
                  </div>

                  {/* Message icon */}
                  <button
                    type="button"
                    style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      border: "1.5px solid var(--d-line-2)", background: "#fff",
                      display: "grid", placeItems: "center", cursor: "pointer",
                      color: "var(--d-ink-3)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>

                  {/* Book button */}
                  <Link
                    href="/app/calendar"
                    className="d-btn d-btn-primary"
                    style={{ padding: "7px 20px", borderRadius: 999, fontSize: 13, flexShrink: 0 }}
                  >
                    Book
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
