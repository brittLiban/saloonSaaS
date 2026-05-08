"use client";

import { useRouter } from "next/navigation";
import { CalendarActions } from "./CalendarActions";
import type { SlimService } from "@/server/actions/booking";

export function CalendarNav({
  weekOffset,
  monthLabel,
  services,
}: {
  weekOffset: number;
  monthLabel: string;
  services: SlimService[];
}) {
  const router = useRouter();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      {/* Month + prev/next/today */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => router.push(`/app/calendar?week=${weekOffset - 1}`)}
          style={{
            width: 32, height: 32, borderRadius: 9, border: "1.5px solid var(--d-line-2)",
            background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0,
            color: "var(--d-ink-3)",
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div style={{ fontFamily: "var(--dash-sans)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", minWidth: 120, textAlign: "center" }}>
          {monthLabel}
        </div>

        <button
          onClick={() => router.push(`/app/calendar?week=${weekOffset + 1}`)}
          style={{
            width: 32, height: 32, borderRadius: 9, border: "1.5px solid var(--d-line-2)",
            background: "#fff", display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0,
            color: "var(--d-ink-3)",
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button
          onClick={() => router.push("/app/calendar")}
          style={{
            height: 32, padding: "0 14px", borderRadius: 9, border: "1.5px solid var(--d-line-2)",
            background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--d-ink-2)",
          }}
        >
          Today
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View switcher */}
      <div style={{
        display: "flex", borderRadius: 10, border: "1.5px solid var(--d-line-2)",
        overflow: "hidden", background: "#fff",
      }}>
        {["Day", "Week", "Month"].map((v) => (
          <div
            key={v}
            style={{
              padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: v === "Week" ? "#1a1a1a" : "transparent",
              color: v === "Week" ? "#fff" : "var(--d-ink-3)",
              borderLeft: v !== "Day" ? "1px solid var(--d-line-2)" : "none",
            }}
          >
            {v}
          </div>
        ))}
      </div>

      {/* New booking */}
      <CalendarActions services={services} />
    </div>
  );
}
