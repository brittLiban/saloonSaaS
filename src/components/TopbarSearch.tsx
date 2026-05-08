"use client";

export function TopbarSearch() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#fff", border: "1.5px solid var(--d-line-2)",
      borderRadius: 12, padding: "0 14px",
      height: 38, width: 300, cursor: "pointer", flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--d-ink-4)", flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span style={{ flex: 1, fontSize: 13, color: "var(--d-ink-4)" }}>
        Search clients, pets, invoices…
      </span>
      <kbd style={{
        background: "var(--bg-tint)", border: "1px solid var(--d-line-2)",
        borderRadius: 6, padding: "1px 5px",
        fontSize: 10, color: "var(--d-ink-3)", fontFamily: "var(--dash-mono)",
        flexShrink: 0,
      }}>
        ⌘K
      </kbd>
    </div>
  );
}
