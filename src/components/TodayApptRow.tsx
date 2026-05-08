"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusChanger } from "./StatusChanger";

type Appt = {
  id: string;
  status: string;
  priceCents: number;
  startsAt: Date;
  endsAt: Date;
  animal: { id: string; name: string; species: string; breed: string | null };
  client: { id: string; name: string };
  service: { name: string; durationMinutes: number; description: string | null };
};

function fmt12(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}
function statusDisplay(status: string): { label: string; dot: string; bg: string; color: string } {
  switch (status) {
    case "COMPLETED": return { label: "Done",     dot: "●", bg: "#dcfce7", color: "#166534" };
    case "READY":     return { label: "Ready",    dot: "●", bg: "#dcfce7", color: "#166534" };
    case "IN_PROGRESS":
    case "CHECKED_IN":return { label: "In chair", dot: "●", bg: "#ffedd5", color: "var(--acc)" };
    default:          return { label: "Upcoming", dot: "○", bg: "#f3f4f6", color: "#6b7280" };
  }
}

export function TodayApptRow({ appt, isLast }: { appt: Appt; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusDisplay(appt.status);
  const start = new Date(appt.startsAt);
  const end   = new Date(appt.endsAt);

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--d-line)" }}>
      {/* Main row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 48px 1fr auto",
          alignItems: "center",
          gap: 14,
          padding: "18px 22px",
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Time */}
        <div onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--d-ink)", fontFamily: "var(--dash-mono)" }}>{fmt12(start)}</div>
          <div style={{ fontSize: 11, color: "var(--d-ink-4)", fontFamily: "var(--dash-mono)", marginTop: 2 }}>{fmt12(end)}</div>
        </div>

        {/* Avatar — links to animal page */}
        <Link
          href={`/app/animals/${appt.animal.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#fef3e8", border: "1.5px solid var(--d-line-2)",
            display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0,
            textDecoration: "none",
          }}
          title={`View ${appt.animal.name}'s profile`}
        >
          {petEmoji(appt.animal.species)}
        </Link>

        {/* Name + client */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href={`/app/animals/${appt.animal.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 15, fontWeight: 700, color: "var(--d-ink)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--acc)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--d-ink)")}
            >
              {appt.animal.name}
            </Link>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--d-ink-4)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginTop: 2 }}>
            <Link
              href={`/app/clients/${appt.client.id}`}
              onClick={(e) => e.stopPropagation()}
              style={{ color: "var(--d-ink-3)", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--acc)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--d-ink-3)")}
            >
              {appt.client.name}
            </Link>
            {appt.animal.breed ? ` · ${appt.animal.breed}` : ""}
          </div>
        </div>

        {/* Right: service + status + actions + price */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "flex-end" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 13, color: "var(--d-ink-3)", whiteSpace: "nowrap" }}>{appt.service.name}</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 11px", borderRadius: 999,
            background: s.bg, color: s.color,
            fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
          }}>
            <span>{s.dot}</span> {s.label}
          </div>
          <StatusChanger appointmentId={appt.id} status={appt.status} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--d-ink)", fontFamily: "var(--dash-mono)", minWidth: 46, textAlign: "right" }}>
            {fmtMoney(appt.priceCents)}
          </div>
        </div>
      </div>

      {/* Expanded details panel */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--d-line)",
          padding: "16px 22px 18px 22px",
          background: "#fafafa",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d-ink-4)", marginBottom: 4 }}>Service</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--d-ink)", marginBottom: 2 }}>{appt.service.name}</div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{appt.service.durationMinutes} min · {fmtMoney(appt.priceCents)}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d-ink-4)", marginBottom: 4 }}>Time</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--d-ink)", marginBottom: 2 }}>{fmt12(start)} – {fmt12(end)}</div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
              {new Date(appt.startsAt).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d-ink-4)", marginBottom: 4 }}>Owner</div>
            <Link
              href={`/app/clients/${appt.client.id}`}
              style={{ fontSize: 14, fontWeight: 600, color: "var(--acc)", textDecoration: "none", display: "block", marginBottom: 2 }}
            >
              {appt.client.name} →
            </Link>
            <Link
              href={`/app/animals/${appt.animal.id}`}
              style={{ fontSize: 12, color: "var(--d-ink-3)", textDecoration: "none" }}
            >
              View {appt.animal.name}&apos;s profile →
            </Link>
          </div>

          {appt.service.description && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--d-ink-4)", marginBottom: 4 }}>Service notes</div>
              <div style={{ fontSize: 13, color: "var(--d-ink-2)", lineHeight: 1.5 }}>{appt.service.description}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
