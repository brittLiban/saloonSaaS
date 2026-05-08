"use client";

import { useRouter } from "next/navigation";

type FilterKey = "overdue" | "due" | "lapsed";

export function RebookingFilterTabs({
  current,
  counts,
}: {
  current: FilterKey;
  counts: { overdue: number; due: number; lapsed: number };
}) {
  const router = useRouter();
  const tabs: { key: FilterKey; label: string }[] = [
    { key: "overdue", label: `Overdue (${counts.overdue})` },
    { key: "due",     label: `Due soon (${counts.due})` },
    { key: "lapsed",  label: `Lapsed (${counts.lapsed})` },
  ];

  return (
    <div style={{
      display: "flex", gap: 2,
      background: "#f3f3f3", borderRadius: 11, padding: 3,
    }}>
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            onClick={() => router.push(`/app/rebooking?filter=${t.key}`)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              cursor: "pointer", fontSize: 13,
              fontWeight: active ? 700 : 500,
              background: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "var(--d-ink-3)",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
