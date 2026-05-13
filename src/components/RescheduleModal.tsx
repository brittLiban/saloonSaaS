"use client";

import { useState, useTransition } from "react";
import { fetchAvailableSlots } from "@/server/actions/booking";
import { rescheduleAppointment } from "@/server/actions/appointments";

export type RescheduleModalProps = {
  appointmentId: string;
  currentStartsAt: Date | string;
  serviceId?: string;
  serviceIds?: string[];
  addOnIds?: string[];
  serviceName: string;
  serviceDurationMinutes: number;
  timezone: string;
  onSuccess: () => void;
};

export function RescheduleModal({
  appointmentId,
  currentStartsAt,
  serviceId,
  serviceIds,
  addOnIds = [],
  serviceName,
  serviceDurationMinutes,
  timezone,
  onSuccess,
}: RescheduleModalProps) {
  const [step, setStep] = useState<"date" | "time">("date");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<Array<{ startsAt: string; available: boolean }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentDate = typeof currentStartsAt === "string" 
    ? currentStartsAt.split("T")[0] 
    : currentStartsAt.toISOString().split("T")[0];

  function handleDateSelect() {
    if (!selectedDate) return;
    setError(null);
    startTransition(async () => {
      try {
        const selectedServiceIds = serviceIds && serviceIds.length > 0
          ? serviceIds
          : serviceId ? [serviceId] : [];
        const result = await fetchAvailableSlots({
          serviceIds: selectedServiceIds,
          addOnIds,
          durationMinutes: serviceDurationMinutes,
          date: selectedDate,
        });
        setSlots(result);
        setSelectedSlot(null);
        setStep("time");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to fetch slots");
      }
    });
  }

  function handleReschedule() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      try {
        await rescheduleAppointment({ id: appointmentId, newStartsAt: new Date(selectedSlot) });
        onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to reschedule appointment");
      }
    });
  }

  function fmtTime(iso: string, tz: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function addDays(dateStr: string, days: number) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(currentDate, i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--d-ink-4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Reschedule: {serviceName}
      </div>

      {step === "date" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))", gap: 6 }}>
            {nextDays.map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                style={{
                  padding: "8px 4px",
                  borderRadius: 6,
                  border: "1px solid var(--d-line)",
                  background: selectedDate === date ? "var(--acc)" : "#fff",
                  color: selectedDate === date ? "#fff" : "var(--d-ink)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div>{new Date(date).toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div>{new Date(date).getDate()}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleDateSelect}
            disabled={!selectedDate || isPending}
            className="d-btn"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {isPending ? "Loading slots…" : "Next"}
          </button>
        </>
      )}

      {step === "time" && (
        <>
          <button
            onClick={() => setStep("date")}
            style={{
              background: "none",
              border: "none",
              color: "var(--acc)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
              marginBottom: 4,
            }}
          >
            ← Change date
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 200, overflowY: "auto", paddingRight: 8 }}>
            {slots
              .filter((s) => s.available)
              .map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSlot(slot.startsAt)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--d-line)",
                    background: selectedSlot === slot.startsAt ? "var(--acc)" : "#fff",
                    color: selectedSlot === slot.startsAt ? "#fff" : "var(--d-ink)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center",
                  }}
                >
                  {fmtTime(slot.startsAt, timezone)}
                </button>
              ))}
          </div>
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || isPending}
            className="d-btn"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              background: "#dcfce7",
              borderColor: "#86efac",
              color: "#166534",
            }}
          >
            {isPending ? "Rescheduling…" : "Confirm reschedule"}
          </button>
        </>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#dc2626", padding: "6px 8px", background: "#fee2e2", borderRadius: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
