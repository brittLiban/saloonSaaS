"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateAppointmentStatus } from "@/server/actions/appointments";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDateTime(iso: string | Date, timezone: string) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

type Status = "CONFIRMED" | "REQUESTED" | "CHECKED_IN" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface AppointmentDetailProps {
  appointment: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date;
    status: Status;
    priceCents: number;
    client: { id: string; name: string; phone: string | null };
    animal: {
      id: string;
      name: string;
      species: string;
      breed: string | null;
      weightLbs: any; // Decimal from Prisma
    };
    service: { id: string; name: string; durationMinutes: number };
  };
  timezone: string;
  onClose: () => void;
}

function getNextActions(status: Status): { label: string; nextStatus: Status; style?: React.CSSProperties }[] {
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

function getStatusColor(status: Status) {
  switch (status) {
    case "COMPLETED":
      return { bg: "#dcfce7", text: "#166534" };
    case "CANCELLED":
    case "NO_SHOW":
      return { bg: "#fee2e2", text: "#7f1d1d" };
    case "CHECKED_IN":
    case "IN_PROGRESS":
      return { bg: "#fef3c7", text: "#78350f" };
    default:
      return { bg: "#dbeafe", text: "#0c2d6b" };
  }
}

export function AppointmentDetailModal({
  appointment,
  timezone,
  onClose,
}: AppointmentDetailProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextActions = getNextActions(appointment.status);
  const statusColor = getStatusColor(appointment.status);

  function handleAction(nextStatus: Status) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAppointmentStatus({ id: appointment.id, status: nextStatus });
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to update.");
      }
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(22, 22, 22, 0.55)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "72px 16px 40px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 28,
          position: "relative",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 21, marginBottom: 8 }}>
              {appointment.animal.name}'s Appointment
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: statusColor.bg,
                color: statusColor.text,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {appointment.status}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--d-ink-3)",
              fontSize: 20,
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Customer Info */}
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Customer
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              {appointment.client.name}
            </div>
            {appointment.client.phone && (
              <div style={{ fontSize: 14, color: "var(--d-ink-3)" }}>
                📞 {appointment.client.phone}
              </div>
            )}
          </div>

          {/* Pet Info */}
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pet
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontSize: 32, lineHeight: 1 }}>{petEmoji(appointment.animal.species)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  {appointment.animal.name}
                </div>
                {appointment.animal.breed && (
                  <div style={{ fontSize: 13, color: "var(--d-ink-3)", marginBottom: 3 }}>
                    {appointment.animal.breed}
                  </div>
                )}
                {appointment.animal.weightLbs && (
                  <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
                    {appointment.animal.weightLbs} lbs
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Service & Time */}
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Service & Time
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
              {appointment.service.name}
            </div>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)", marginBottom: 4 }}>
              📅 {fmtDateTime(appointment.startsAt, timezone)}
            </div>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
              ⏱️ {appointment.service.durationMinutes} minutes
            </div>
          </div>

          {/* Price */}
          <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Price
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--acc)" }}>
              {fmtMoney(appointment.priceCents)}
            </div>
          </div>

          {/* Actions */}
          {nextActions.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                {nextActions.map((action) => (
                  <button
                    key={action.nextStatus}
                    className="d-btn"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      fontSize: 14,
                      fontWeight: 600,
                      ...(action.style ?? {}),
                    }}
                    disabled={isPending}
                    onClick={() => handleAction(action.nextStatus)}
                  >
                    {isPending ? "…" : action.label}
                  </button>
                ))}
              </div>
              {error && (
                <div style={{ fontSize: 12, color: "var(--acc)", marginTop: 8 }}>{error}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
