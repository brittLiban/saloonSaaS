"use client";

export function BookingVolumeChart({
  data,
  label,
}: {
  data: { label: string; count: number }[];
  label: string;
}) {
  const W = 860;
  const H = 220;
  const PAD_L = 44;
  const PAD_R = 20;
  const PAD_T = 24;
  const PAD_B = 20;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const minVal = 0;

  // Nice Y-axis ticks
  const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.67), maxVal];

  function toX(i: number) {
    return PAD_L + (i / Math.max(data.length - 1, 1)) * plotW;
  }
  function toY(val: number) {
    return PAD_T + plotH - ((val - minVal) / (maxVal - minVal || 1)) * plotH;
  }

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.count), ...d }));

  // Smooth cubic bezier path
  function pathD(points: { x: number; y: number }[]) {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const cur  = points[i];
      const cpx  = (prev.x + cur.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${cur.y}, ${cur.x} ${cur.y}`;
    }
    return d;
  }

  const linePath = pathD(pts);
  const bottomY  = PAD_T + plotH;
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${bottomY} L ${PAD_L} ${bottomY} Z`
    : "";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)", padding: "24px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>Booking volume</div>
        <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{label}</div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      >
        {/* Y-axis grid lines + labels */}
        {yTicks.map((val, i) => {
          const y = toY(val);
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="var(--d-line)" strokeWidth="1"
              />
              <text
                x={PAD_L - 8} y={y + 4}
                textAnchor="end" fontSize="11" fill="#aaa"
                fontFamily="var(--dash-sans)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill — gradient */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ff5a1f" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#ff5a1f"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point dots */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ff5a1f" />
        ))}
      </svg>
    </div>
  );
}
