"use client";

import { useRouter } from "next/navigation";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week",  label: "Week" },
  { key: "month", label: "Month" },
  { key: "3mo",   label: "3 mo" },
  { key: "6mo",   label: "6 mo" },
  { key: "year",  label: "Year" },
];

export function BookingPeriodTabs({ current }: { current: string }) {
  const router = useRouter();
  return (
    <div style={{
      display: "flex", gap: 2,
      background: "#f3f3f3", borderRadius: 11, padding: 3,
    }}>
      {PERIODS.map((p) => {
        const active = p.key === current;
        return (
          <button
            key={p.key}
            onClick={() => router.push(`/app/bookings?period=${p.key}`)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              cursor: "pointer", fontSize: 13,
              fontWeight: active ? 700 : 500,
              background: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "var(--d-ink-3)",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
