"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/server/actions/appointments";

type Status = "CONFIRMED" | "REQUESTED" | "CHECKED_IN" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type NextAction = { label: string; nextStatus: Status; style?: React.CSSProperties };

function getActions(status: Status): NextAction[] {
  switch (status) {
    case "CONFIRMED":
    case "REQUESTED":
      return [{ label: "Check in", nextStatus: "CHECKED_IN" }];
    case "CHECKED_IN":
    case "IN_PROGRESS":
    case "READY":
      return [{ label: "Mark done", nextStatus: "COMPLETED", style: { background: "#dcfce7", borderColor: "#86efac", color: "#166534" } }];
    default:
      return [];
  }
}

export function StatusChanger({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions = getActions(status as Status);
  if (actions.length === 0) return null;

  function handleAction(nextStatus: Status) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAppointmentStatus({ id: appointmentId, status: nextStatus });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {actions.map((a) => (
          <button
            key={a.nextStatus}
            className="d-btn"
            style={{ fontSize: 11, padding: "4px 11px", ...(a.style ?? {}) }}
            disabled={isPending}
            onClick={() => handleAction(a.nextStatus)}
          >
            {isPending ? "…" : a.label}
          </button>
        ))}
      </div>
      {error && (
        <div style={{ fontSize: 11, color: "var(--acc)", maxWidth: 180, textAlign: "right" }}>{error}</div>
      )}
    </div>
  );
}
