"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { updateAppointmentStatus } from "@/server/actions/appointments";
import { chargeNoShow } from "@/server/actions/invoices";
import { RescheduleModal } from "@/components/RescheduleModal";
import { appointmentDurationMinutes, appointmentServiceLabel } from "@/lib/appointment-summary";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtTime(iso: string | Date, timezone: string) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDateTime(iso: string | Date, timezone: string) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

function vaccinationLabel(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return "Vaccinated";
  if (vaccinated === false) return "Not vaccinated";
  return "Vaccination unknown";
}

function vaccinationStyle(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return { bg: "#dcfce7", color: "#166534" };
  if (vaccinated === false) return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#fef3c7", color: "#92400e" };
}

export type AppointmentDetailStatus = "CONFIRMED" | "REQUESTED" | "CHECKED_IN" | "IN_PROGRESS" | "READY" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

interface AppointmentDetailProps {
  appointment: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date;
    status: AppointmentDetailStatus;
    priceCents: number;
    client: { id: string; name: string; phone: string | null; hasCardOnFile?: boolean };
    animal: {
      id: string;
      name: string;
      species: string;
      breed: string | null;
      weightLbs: unknown; // Decimal from Prisma
      vaccinated?: boolean | null;
    };
    service: { id: string; name: string; durationMinutes: number; priceCents: number };
    services?: { serviceId?: string; id?: string; name: string; durationMinutes: number; priceCents: number }[];
    addOns?: { addOnId?: string | null; id?: string | null; name: string; durationMinutes: number; priceCents: number }[];
  };
  timezone: string;
  onClose: () => void;
}

function getNextActions(status: AppointmentDetailStatus): { label: string; nextStatus: AppointmentDetailStatus; style?: React.CSSProperties }[] {
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

function getStatusColor(status: AppointmentDetailStatus) {
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
  const [showReschedule, setShowReschedule] = useState(false);
  const [showNoShowCharge, setShowNoShowCharge] = useState(false);
  const [noShowAmount, setNoShowAmount] = useState(
    (appointment.priceCents / 100).toFixed(2),
  );
  const nextActions = getNextActions(appointment.status);
  const statusColor = getStatusColor(appointment.status);
  const serviceLabel = appointmentServiceLabel(appointment);
  const durationMinutes = appointmentDurationMinutes(appointment);
  const vaxStyle = vaccinationStyle(appointment.animal.vaccinated);
  const serviceIds = appointment.services && appointment.services.length > 0
    ? appointment.services.map((line) => line.serviceId ?? line.id).filter((id): id is string => Boolean(id))
    : [appointment.service.id];
  const addOnIds = (appointment.addOns ?? [])
    .map((line) => line.addOnId ?? line.id ?? null)
    .filter((id): id is string => Boolean(id));

  function handleAction(nextStatus: AppointmentDetailStatus) {
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
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 12px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 420,
          maxHeight: "calc(100vh - 24px)",
          padding: "20px",
          position: "relative",
          flexShrink: 0,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, marginBottom: 6, lineHeight: 1.2 }}>
              {appointment.animal.name}&apos;s Appointment
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "3px 8px",
                borderRadius: 4,
                background: statusColor.bg,
                color: statusColor.text,
                fontSize: 11,
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
              padding: "0 6px",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showReschedule ? (
            <RescheduleModal
              appointmentId={appointment.id}
              currentStartsAt={appointment.startsAt}
              serviceId={appointment.service.id}
              serviceIds={serviceIds}
              addOnIds={addOnIds}
              serviceName={serviceLabel}
              serviceDurationMinutes={durationMinutes}
              timezone={timezone}
              onSuccess={() => {
                setShowReschedule(false);
                onClose();
              }}
            />
          ) : (
            <>
          {/* Customer Info */}
          <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Customer
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
              {appointment.client.name}
            </div>
            {appointment.client.phone && (
              <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                {appointment.client.phone}
              </div>
            )}
          </div>

          {/* Pet Info */}
          <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pet
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{petEmoji(appointment.animal.species)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {appointment.animal.name}
                </div>
                {appointment.animal.breed && (
                  <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 1 }}>
                    {appointment.animal.breed}
                  </div>
                )}
                {appointment.animal.weightLbs != null && (
                  <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
                    {Number(appointment.animal.weightLbs).toFixed(1)} lbs
                  </div>
                )}
                <div style={{
                  display: "inline-flex",
                  marginTop: 6,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: vaxStyle.bg,
                  color: vaxStyle.color,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {vaccinationLabel(appointment.animal.vaccinated)}
                </div>
              </div>
            </div>
          </div>

          {/* Service & Time */}
          <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Service & Time
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {serviceLabel}
            </div>
            {appointment.addOns && appointment.addOns.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 6 }}>
                Add-ons: {appointment.addOns.map((line) => line.name).join(", ")}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 3 }}>
              📅 {fmtDateTime(appointment.startsAt, timezone)}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginBottom: 3 }}>
              🕐 {fmtTime(appointment.startsAt, timezone)} - {fmtTime(appointment.endsAt, timezone)}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
              ⏱️ {durationMinutes} min
            </div>
          </div>

          {/* Price */}
          <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--d-line)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--d-ink-4)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Price
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--acc)" }}>
              {fmtMoney(appointment.priceCents)}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {appointment.status === "COMPLETED" && (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Oops! Change status:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                  <button
                    className="d-btn"
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#dbeafe",
                      borderColor: "#93c5fd",
                      color: "#0c2d6b",
                    }}
                    disabled={isPending}
                    onClick={() => handleAction("CHECKED_IN")}
                  >
                    {isPending ? "…" : "Checked In"}
                  </button>
                  <button
                    className="d-btn"
                    style={{
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#fef3c7",
                      borderColor: "#fcd34d",
                      color: "#78350f",
                    }}
                    disabled={isPending}
                    onClick={() => handleAction("CONFIRMED")}
                  >
                    {isPending ? "…" : "Confirmed"}
                  </button>
                </div>
              </>
            )}
            {nextActions.length > 0 && nextActions.map((action) => (
              <button
                key={action.nextStatus}
                className="d-btn"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  ...(action.style ?? {}),
                }}
                disabled={isPending}
                onClick={() => handleAction(action.nextStatus)}
              >
                {isPending ? "…" : action.label}
              </button>
            ))}
            {appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED" && (
              <>
                <button
                  className="d-btn"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#dbeafe",
                    borderColor: "#93c5fd",
                    color: "#0c2d6b",
                  }}
                  disabled={isPending}
                  onClick={() => setShowReschedule(true)}
                >
                  Reschedule
                </button>
                <button
                  className="d-btn"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#fee2e2",
                    borderColor: "#fecaca",
                    color: "#7f1d1d",
                  }}
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        await updateAppointmentStatus({ id: appointment.id, status: "CANCELLED", reason: "Cancelled from calendar" });
                        onClose();
                      } catch (e: unknown) {
                        setError(e instanceof Error ? e.message : "Failed to cancel.");
                      }
                    });
                  }}
                >
                  {isPending ? "…" : "Cancel"}
                </button>
              </>
            )}
          </div>

          {/* No-show charge — only show if client has a card and appt is not completed */}
          {appointment.client.hasCardOnFile &&
            !["COMPLETED", "NO_SHOW"].includes(appointment.status) && (
              <>
                {!showNoShowCharge ? (
                  <button
                    className="d-btn"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#fef3c7",
                      borderColor: "#fcd34d",
                      color: "#78350f",
                    }}
                    disabled={isPending}
                    onClick={() => setShowNoShowCharge(true)}
                  >
                    💳 Charge no-show fee
                  </button>
                ) : (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "#fef3c7",
                      borderRadius: 10,
                      border: "1px solid #fcd34d",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#78350f", marginBottom: 8 }}>
                      No-show charge amount
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--d-ink-3)", fontSize: 13 }}>$</span>
                        <input
                          className="d-input"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={noShowAmount}
                          onChange={(e) => setNoShowAmount(e.target.value)}
                          style={{ paddingLeft: 24, width: "100%" }}
                        />
                      </div>
                      <button
                        className="d-btn"
                        style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                        disabled={isPending}
                        onClick={() => {
                          const cents = Math.round(parseFloat(noShowAmount) * 100);
                          if (!cents || cents <= 0) return;
                          setError(null);
                          startTransition(async () => {
                            try {
                              await chargeNoShow(appointment.id, cents);
                              onClose();
                            } catch (e: unknown) {
                              setError(e instanceof Error ? e.message : "Charge failed");
                              setShowNoShowCharge(false);
                            }
                          });
                        }}
                      >
                        {isPending ? "…" : "Charge"}
                      </button>
                      <button
                        className="d-btn"
                        style={{ padding: "8px 10px", fontSize: 12 }}
                        disabled={isPending}
                        onClick={() => setShowNoShowCharge(false)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--acc)", marginTop: 4, padding: "6px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 4 }}>{error}</div>
          )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
