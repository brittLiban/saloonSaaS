"use client";

function fmtMoney(cents: number) {
  if (cents === 0) return "$0";
  if (cents >= 100000) return `$${(cents / 100000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function fmtWeekLabel(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeeklyRevenueChart({
  data,
}: {
  data: { week: string; revenue: number }[];
}) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="glass-card" style={{ padding: "20px 24px 16px", marginBottom: 16 }}>
      <div style={{ fontFamily: "var(--dash-serif)", fontSize: 16, marginBottom: 20 }}>
        Weekly revenue
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 6,
          alignItems: "flex-end",
          height: 120,
        }}
      >
        {data.map((d) => {
          const pct = d.revenue / maxRevenue;
          const barH = Math.max(pct * 96, d.revenue > 0 ? 4 : 0);
          return (
            <div
              key={d.week}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              {d.revenue > 0 && (
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--dash-mono)",
                    color: "var(--oxblood)",
                    fontWeight: 600,
                  }}
                >
                  {fmtMoney(d.revenue)}
                </div>
              )}
              <div
                title={`${fmtWeekLabel(d.week)}: ${fmtMoney(d.revenue)}`}
                style={{
                  width: "100%",
                  height: barH,
                  borderRadius: "4px 4px 0 0",
                  background:
                    d.revenue > 0
                      ? "oklch(from var(--oxblood) l c h / 0.7)"
                      : "var(--d-line)",
                  transition: "height 0.3s ease",
                  minHeight: 3,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 6,
          marginTop: 8,
        }}
      >
        {data.map((d) => (
          <div
            key={d.week}
            style={{
              fontSize: 10,
              color: "var(--d-ink-3)",
              textAlign: "center",
              fontFamily: "var(--dash-mono)",
            }}
          >
            {fmtWeekLabel(d.week)}
          </div>
        ))}
      </div>
    </div>
  );
}
