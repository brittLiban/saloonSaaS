"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  fetchAvailableSlots,
  fetchClientsWithAnimals,
  type SlimService,
  type SlimClient,
  type TimeSlot,
} from "@/server/actions/booking";
import { createAppointment, type ConflictInfo } from "@/server/actions/appointments";

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function petEmoji(species: string) {
  const s = species.toLowerCase();
  return s === "dog" ? "🐶" : s === "cat" ? "🐈" : "🐾";
}

type Step = "service" | "slot" | "client" | "confirm";

interface Props {
  services: SlimService[];
  onClose: () => void;
  defaultDate?: string;
}

export function BookingModal({ services, onClose, defaultDate }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [step, setStep] = useState<Step>("service");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(defaultDate ?? today);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [clients, setClients] = useState<SlimClient[]>([]);
  const [clientId, setClientId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [done, setDone] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[] | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedAnimal = selectedClient?.animals.find((a) => a.id === animalId);

  function handleFindSlots() {
    setError(null);
    startTransition(async () => {
      const result = await fetchAvailableSlots(serviceId, date);
      setSlots(result);
      setSelectedSlot(null);
      setStep("slot");
    });
  }

  function handlePickSlot(slot: TimeSlot) {
    setSelectedSlot(slot);
    startTransition(async () => {
      const result = await fetchClientsWithAnimals();
      setClients(result);
      setClientId(result[0]?.id ?? "");
      setAnimalId(result[0]?.animals[0]?.id ?? "");
      setStep("client");
    });
  }

  function handleConfirm(force = false) {
    if (!selectedSlot || !clientId || !animalId) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createAppointment({
          clientId,
          animalId,
          serviceId,
          startsAt: new Date(selectedSlot.startsAt),
          force,
        });
        if (!result.ok) {
          setConflicts(result.conflicts);
        } else {
          setConflicts(null);
          setDone(true);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Booking failed. Please try again.");
      }
    });
  }

  const stepIdx: Record<Step, number> = { service: 0, slot: 1, client: 2, confirm: 3 };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(22, 22, 22, 0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 16px 40px", overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 520, padding: 28, position: "relative", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 21 }}>
              {done ? "Booking confirmed!" : "New booking"}
            </div>
            {!done && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {(["service", "slot", "client"] as Step[]).map((s, i) => (
                  <div key={s} style={{
                    height: 3, width: 56, borderRadius: 99,
                    background: stepIdx[step] >= i ? "var(--oxblood)" : "var(--d-line)",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--d-ink-3)", fontSize: 20, lineHeight: 1, padding: "2px 4px" }}>✕</button>
        </div>

        {/* Done state */}
        {done && (
          <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🐾</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, marginBottom: 6 }}>
              {selectedAnimal?.name ?? "Appointment"} is booked!
            </div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14, marginBottom: 20 }}>
              {selectedService?.name} · {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""} at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""}
            </div>
            <button className="d-btn d-btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {/* Step 1: Service + Date */}
        {!done && step === "service" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Service">
              <select
                className="d-input"
                style={{ width: "100%" }}
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {fmtMoney(s.priceCents)} · {s.durationMinutes}min{s.species ? ` (${s.species})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <button
              className="d-btn d-btn-primary"
              style={{ marginTop: 4 }}
              onClick={handleFindSlots}
              disabled={isPending || !serviceId || !date}
            >
              {isPending ? "Loading…" : "Find available slots →"}
            </button>
          </div>
        )}

        {/* Step 2: Time slot */}
        {!done && step === "slot" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("service")}>← Back</button>
              <div style={{ marginTop: 10, color: "var(--d-ink-3)", fontSize: 13 }}>
                {selectedService?.name} · {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
            {slots.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--d-ink-3)" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>😴</div>
                No available slots on this date. Try another day.
                <div style={{ marginTop: 14 }}>
                  <button className="d-btn" onClick={() => setStep("service")}>Change date</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                {slots.map((slot) => {
                  const booked = !slot.available;
                  return (
                    <button
                      key={slot.startsAt}
                      onClick={() => handlePickSlot(slot)}
                      disabled={isPending}
                      title={booked ? "Already booked — click to book anyway" : undefined}
                      style={{
                        padding: booked ? "7px 6px 5px" : "10px 6px",
                        borderRadius: 8, cursor: "pointer",
                        border: booked ? "1.5px solid #fca5a5" : "1.5px solid var(--d-line)",
                        background: booked ? "#fff1f0" : "oklch(1 0 0 / 0.6)",
                        fontFamily: "var(--dash-mono)", fontSize: 13, fontWeight: 600,
                        color: booked ? "#b91c1c" : "var(--d-ink)",
                        transition: "border-color 0.15s, background 0.15s",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      }}
                    >
                      {fmtTime(slot.startsAt)}
                      {booked && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: "#b91c1c", opacity: 0.8 }}>
                          BOOKED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Client + Animal */}
        {!done && step === "client" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ marginBottom: 2 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("slot")}>← Back</button>
              <div style={{ marginTop: 8, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.06)", borderRadius: 8, fontSize: 13, color: "var(--d-ink-2)" }}>
                <strong>{selectedService?.name}</strong> at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""} on {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""}
              </div>
            </div>

            {clients.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--d-ink-3)", padding: "24px 0" }}>
                No clients with animals on file. Add a client first.
              </div>
            ) : (
              <>
                <Field label="Client">
                  <select
                    className="d-input"
                    style={{ width: "100%" }}
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      const c = clients.find((c) => c.id === e.target.value);
                      setAnimalId(c?.animals[0]?.id ?? "");
                    }}
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Animal">
                  <select
                    className="d-input"
                    style={{ width: "100%" }}
                    value={animalId}
                    onChange={(e) => setAnimalId(e.target.value)}
                  >
                    {(selectedClient?.animals ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {petEmoji(a.species)} {a.name}{a.breed ? ` (${a.breed})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            <button
              className="d-btn d-btn-primary"
              onClick={() => setStep("confirm")}
              disabled={!clientId || !animalId || isPending}
            >
              Review booking →
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {!done && step === "confirm" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("client")}>← Back</button>
            </div>

            <div style={{ background: "oklch(from var(--oxblood) l c h / 0.05)", border: "1px solid oklch(from var(--oxblood) l c h / 0.2)", borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 14 }}>Booking summary</div>
              {[
                ["Pet", `${selectedAnimal ? petEmoji(selectedAnimal.species) : ""} ${selectedAnimal?.name ?? ""}${selectedAnimal?.breed ? ` · ${selectedAnimal.breed}` : ""}`],
                ["Owner", selectedClient?.name ?? ""],
                ["Service", selectedService?.name ?? ""],
                ["Date", selectedSlot ? fmtDate(selectedSlot.startsAt) : ""],
                ["Time", selectedSlot ? `${fmtTime(selectedSlot.startsAt)} – ${fmtTime(selectedSlot.endsAt)}` : ""],
                ["Price", fmtMoney(selectedService?.priceCents ?? 0)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid oklch(from var(--oxblood) l c h / 0.12)", fontSize: 14 }}>
                  <span style={{ color: "var(--d-ink-3)" }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Conflict warning — requires groomer confirmation */}
            {conflicts && conflicts.length > 0 && (
              <div style={{
                padding: "14px 16px", marginBottom: 14,
                background: "#fffbeb", border: "1.5px solid #f59e0b",
                borderRadius: 10,
              }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 6 }}>
                  Schedule conflict detected
                </div>
                <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                  This time overlaps with:
                  <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                    {conflicts.map((c, i) => (
                      <li key={i}><strong>{c.animalName}</strong> — {c.serviceName} at {c.startsAt}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setConflicts(null)}>
                    Cancel
                  </button>
                  <button
                    className="d-btn"
                    style={{ fontSize: 12, background: "#f59e0b", borderColor: "#f59e0b", color: "#fff" }}
                    onClick={() => handleConfirm(true)}
                    disabled={isPending}
                  >
                    {isPending ? "Booking…" : "Book anyway"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13, marginBottom: 14 }}>
                {error}
              </div>
            )}

            {!conflicts && (
              <button
                className="d-btn d-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => handleConfirm(false)}
                disabled={isPending}
              >
                {isPending ? "Booking…" : "Confirm booking →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: "var(--d-ink-2)" }}>{label}</label>
      {children}
    </div>
  );
}
