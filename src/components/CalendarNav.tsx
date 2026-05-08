"use client";

import { useRouter } from "next/navigation";
import { CalendarActions } from "./CalendarActions";
import { TopbarSearch } from "./TopbarSearch";
import type { SlimService } from "@/server/actions/booking";

type View = "day" | "week" | "month";

export function CalendarNav({
  view,
  weekOffset,
  dayOffset,
  monthOffset,
  label,
  services,
}: {
  view: View;
  weekOffset: number;
  dayOffset: number;
  monthOffset: number;
  label: string;
  services: SlimService[];
}) {
  const router = useRouter();

  function prev() {
    if (view === "week")  router.push(`/app/calendar?view=week&week=${weekOffset - 1}`);
    if (view === "day")   router.push(`/app/calendar?view=day&day=${dayOffset - 1}`);
    if (view === "month") router.push(`/app/calendar?view=month&month=${monthOffset - 1}`);
  }
  function next() {
    if (view === "week")  router.push(`/app/calendar?view=week&week=${weekOffset + 1}`);
    if (view === "day")   router.push(`/app/calendar?view=day&day=${dayOffset + 1}`);
    if (view === "month") router.push(`/app/calendar?view=month&month=${monthOffset + 1}`);
  }
  function today() {
    router.push(`/app/calendar?view=${view}`);
  }
  function setView(v: View) {
    router.push(`/app/calendar?view=${v}`);
  }

  return (
    <>
      {/* Left: label + nav */}
      <div className="topbar-left">
        <div className="topbar-breadcrumb">Calendar</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <button onClick={prev} style={navBtnStyle}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div style={{ fontFamily: "var(--dash-sans)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--d-ink)", minWidth: 110 }}>
            {label}
          </div>

          <button onClick={next} style={navBtnStyle}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <button onClick={today} style={{
            height: 30, padding: "0 12px", borderRadius: 9, border: "1.5px solid var(--d-line-2)",
            background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--d-ink-2)",
          }}>
            Today
          </button>
        </div>
      </div>

      {/* Center: search */}
      <div className="topbar-center">
        <TopbarSearch />
      </div>

      {/* Right: view switcher + bell + new booking */}
      <div className="topbar-actions">
        <div style={{
          display: "flex", borderRadius: 10, border: "1.5px solid var(--d-line-2)",
          overflow: "hidden", background: "#fff",
        }}>
          {(["Day", "Week", "Month"] as const).map((v) => {
            const key = v.toLowerCase() as View;
            const active = view === key;
            return (
              <button
                key={v}
                onClick={() => setView(key)}
                style={{
                  padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: "none",
                  background: active ? "#1a1a1a" : "transparent",
                  color: active ? "#fff" : "var(--d-ink-3)",
                  borderLeft: v !== "Day" ? "1px solid var(--d-line-2)" : "none",
                  transition: "background 0.12s, color 0.12s",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>

        <button className="topbar-bell" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="topbar-bell-dot" />
        </button>

        <CalendarActions services={services} />
      </div>
    </>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 9, border: "1.5px solid var(--d-line-2)",
  background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0,
  color: "var(--d-ink-3)",
};
