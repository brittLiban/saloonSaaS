"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  fetchAvailableSlots,
  fetchClientsWithAnimals,
  type SlimAddOn,
  type SlimClient,
  type SlimService,
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

function petLabel(species: string) {
  const normalized = species.toLowerCase();
  if (normalized === "dog") return "Dog";
  if (normalized === "cat") return "Cat";
  return "Pet";
}

function vaccinationLabel(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return "Vaccinated";
  if (vaccinated === false) return "Not vaccinated";
  return "Vaccination unknown";
}

function vaccinationColor(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  if (vaccinated === false) return { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" };
  return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
}

function serviceAllowed(addOn: SlimAddOn, serviceIds: string[]) {
  return addOn.serviceIds.length === 0 || serviceIds.some((serviceId) => addOn.serviceIds.includes(serviceId));
}

function uniqueAddOns(services: SlimService[], addOns: SlimAddOn[]) {
  const map = new Map<string, SlimAddOn>();
  for (const addOn of addOns) map.set(addOn.id, addOn);
  for (const service of services) {
    for (const addOn of service.addOns ?? []) map.set(addOn.id, addOn);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

type Step = "service" | "slot" | "client" | "confirm";

interface Props {
  services: SlimService[];
  addOns?: SlimAddOn[];
  onClose: () => void;
  defaultDate?: string;
}

export function BookingModal({ services, addOns = [], onClose, defaultDate }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const allAddOns = useMemo(() => uniqueAddOns(services, addOns), [services, addOns]);
  const [step, setStep] = useState<Step>("service");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(services[0]?.id ? [services[0].id] : []);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [date, setDate] = useState(defaultDate ?? today);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [clients, setClients] = useState<SlimClient[]>([]);
  const [clientId, setClientId] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [done, setDone] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[] | null>(null);

  const selectedServices = useMemo(
    () => selectedServiceIds
      .map((id) => services.find((service) => service.id === id))
      .filter((service): service is SlimService => Boolean(service)),
    [selectedServiceIds, services],
  );

  const allowedAddOns = useMemo(
    () => allAddOns.filter((addOn) => serviceAllowed(addOn, selectedServiceIds)),
    [allAddOns, selectedServiceIds],
  );
  const activeSelectedAddOnIds = useMemo(
    () => selectedAddOnIds.filter((id) => allowedAddOns.some((addOn) => addOn.id === id)),
    [selectedAddOnIds, allowedAddOns],
  );

  const selectedAddOns = useMemo(
    () => activeSelectedAddOnIds
      .map((id) => allAddOns.find((addOn) => addOn.id === id))
      .filter((addOn): addOn is SlimAddOn => Boolean(addOn)),
    [activeSelectedAddOnIds, allAddOns],
  );

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedAnimal = selectedClient?.animals.find((a) => a.id === animalId);
  const totalDuration = [...selectedServices, ...selectedAddOns].reduce((sum, item) => sum + item.durationMinutes, 0);
  const totalPrice = [...selectedServices, ...selectedAddOns].reduce((sum, item) => sum + item.priceCents, 0);
  const serviceSummary = selectedServices.map((service) => service.name).join(" + ");
  const addOnSummary = selectedAddOns.map((addOn) => addOn.name).join(" + ");
  const bookingSummary = addOnSummary ? `${serviceSummary} + ${addOnSummary}` : serviceSummary;

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => {
      if (prev.includes(serviceId)) return prev.length === 1 ? prev : prev.filter((id) => id !== serviceId);
      return [...prev, serviceId];
    });
  }

  function toggleAddOn(addOnId: string) {
    setSelectedAddOnIds((prev) => (
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    ));
  }

  function handleFindSlots() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchAvailableSlots({
          serviceIds: selectedServiceIds,
          addOnIds: activeSelectedAddOnIds,
          date,
        });
        setSlots(result);
        setSelectedSlot(null);
        setStep("slot");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to find slots.");
      }
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
          serviceIds: selectedServiceIds,
          addOnIds: activeSelectedAddOnIds,
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(22, 22, 22, 0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 16px 40px", overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 560, padding: 28, position: "relative", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 21 }}>
              {done ? "Booking confirmed" : "New booking"}
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--d-ink-3)", fontSize: 20, lineHeight: 1, padding: "2px 4px" }}>x</button>
        </div>

        {done && (
          <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, marginBottom: 6 }}>
              {selectedAnimal?.name ?? "Appointment"} is booked
            </div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14, marginBottom: 20 }}>
              {bookingSummary} - {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""} at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""}
            </div>
            <button className="d-btn d-btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {!done && step === "service" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Services">
              <div style={{ display: "grid", gap: 8 }}>
                {services.map((service) => (
                  <label
                    key={service.id}
                    style={{ display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--d-line-2)", background: selectedServiceIds.includes(service.id) ? "oklch(from var(--oxblood) l c h / 0.06)" : "#fff", cursor: "pointer" }}
                  >
                    <input type="checkbox" checked={selectedServiceIds.includes(service.id)} onChange={() => toggleService(service.id)} />
                    <span>
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{service.name}</span>
                      <span style={{ display: "block", fontSize: 12, color: "var(--d-ink-3)", marginTop: 2 }}>
                        {service.durationMinutes} min{service.species ? ` - ${service.species}` : ""}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--dash-mono)" }}>{fmtMoney(service.priceCents)}</span>
                  </label>
                ))}
              </div>
            </Field>

            {allowedAddOns.length > 0 && (
              <Field label="Add-ons">
                <div style={{ display: "grid", gap: 8 }}>
                  {allowedAddOns.map((addOn) => (
                    <label
                      key={addOn.id}
                      style={{ display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 10, alignItems: "center", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--d-line-2)", background: selectedAddOnIds.includes(addOn.id) ? "oklch(from var(--oxblood) l c h / 0.06)" : "#fff", cursor: "pointer" }}
                    >
                      <input type="checkbox" checked={selectedAddOnIds.includes(addOn.id)} onChange={() => toggleAddOn(addOn.id)} />
                      <span>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{addOn.name}</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--d-ink-3)", marginTop: 2 }}>
                          +{addOn.durationMinutes} min{addOn.species ? ` - ${addOn.species}` : ""}
                        </span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--dash-mono)" }}>{fmtMoney(addOn.priceCents)}</span>
                    </label>
                  ))}
                </div>
              </Field>
            )}

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

            <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.05)", borderRadius: 10, fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span style={{ color: "var(--d-ink-3)" }}>{bookingSummary || "Select a service"}</span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{totalDuration} min - {fmtMoney(totalPrice)}</span>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <button
              className="d-btn d-btn-primary"
              style={{ marginTop: 4 }}
              onClick={handleFindSlots}
              disabled={isPending || selectedServiceIds.length === 0 || !date}
            >
              {isPending ? "Loading..." : "Find available slots"}
            </button>
          </div>
        )}

        {!done && step === "slot" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("service")}>Back</button>
              <div style={{ marginTop: 10, color: "var(--d-ink-3)", fontSize: 13 }}>
                {bookingSummary} - {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </div>
            </div>
            {slots.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--d-ink-3)" }}>
                No available slots on this date.
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
                      title={booked ? "Already booked - click to book anyway" : undefined}
                      style={{
                        padding: booked ? "7px 6px 5px" : "10px 6px",
                        borderRadius: 8, cursor: "pointer",
                        border: booked ? "1.5px solid #fca5a5" : "1.5px solid var(--d-line)",
                        background: booked ? "#fff1f0" : "oklch(1 0 0 / 0.6)",
                        fontFamily: "var(--dash-mono)", fontSize: 13, fontWeight: 600,
                        color: booked ? "#b91c1c" : "var(--d-ink)",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      }}
                    >
                      {fmtTime(slot.startsAt)}
                      <span style={{ fontSize: 10, color: booked ? "#b91c1c" : "var(--d-ink-4)" }}>
                        {slot.durationMinutes} min{booked ? " - booked" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!done && step === "client" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ marginBottom: 2 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("slot")}>Back</button>
              <div style={{ marginTop: 8, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.06)", borderRadius: 8, fontSize: 13, color: "var(--d-ink-2)" }}>
                <strong>{bookingSummary}</strong> at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""} on {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""}
              </div>
            </div>

            {clients.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--d-ink-3)", padding: "24px 0" }}>
                No clients with pets on file. Add a client first.
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
                      const client = clients.find((c) => c.id === e.target.value);
                      setAnimalId(client?.animals[0]?.id ?? "");
                    }}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Pet">
                  <select
                    className="d-input"
                    style={{ width: "100%" }}
                    value={animalId}
                    onChange={(e) => setAnimalId(e.target.value)}
                  >
                    {(selectedClient?.animals ?? []).map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {petLabel(animal.species)} - {animal.name}{animal.breed ? ` (${animal.breed})` : ""} - {vaccinationLabel(animal.vaccinated)}
                      </option>
                    ))}
                  </select>
                </Field>

                {selectedAnimal && (
                  <div style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${vaccinationColor(selectedAnimal.vaccinated).border}`,
                    background: vaccinationColor(selectedAnimal.vaccinated).bg,
                    color: vaccinationColor(selectedAnimal.vaccinated).color,
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {selectedAnimal.name}: {vaccinationLabel(selectedAnimal.vaccinated)}
                  </div>
                )}
              </>
            )}

            <button
              className="d-btn d-btn-primary"
              onClick={() => setStep("confirm")}
              disabled={!clientId || !animalId || isPending}
            >
              Review booking
            </button>
          </div>
        )}

        {!done && step === "confirm" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setStep("client")}>Back</button>
            </div>

            <div style={{ background: "oklch(from var(--oxblood) l c h / 0.05)", border: "1px solid oklch(from var(--oxblood) l c h / 0.2)", borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 14 }}>Booking summary</div>
              {[
                ["Pet", `${selectedAnimal ? petLabel(selectedAnimal.species) : ""} ${selectedAnimal?.name ?? ""}${selectedAnimal?.breed ? ` - ${selectedAnimal.breed}` : ""}`],
                ["Vaccination", vaccinationLabel(selectedAnimal?.vaccinated)],
                ["Owner", selectedClient?.name ?? ""],
                ["Services", serviceSummary],
                ["Add-ons", addOnSummary || "None"],
                ["Date", selectedSlot ? fmtDate(selectedSlot.startsAt) : ""],
                ["Time", selectedSlot ? `${fmtTime(selectedSlot.startsAt)} - ${fmtTime(selectedSlot.endsAt)}` : ""],
                ["Duration", `${totalDuration} minutes`],
                ["Price", fmtMoney(totalPrice)],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0", borderBottom: "1px solid oklch(from var(--oxblood) l c h / 0.12)", fontSize: 14 }}>
                  <span style={{ color: "var(--d-ink-3)" }}>{label}</span>
                  <span style={{ fontWeight: 500, textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>

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
                    {conflicts.map((conflict, index) => (
                      <li key={index}><strong>{conflict.animalName}</strong> - {conflict.serviceName} at {conflict.startsAt}</li>
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
                    {isPending ? "Booking..." : "Book anyway"}
                  </button>
                </div>
              </div>
            )}

            {error && <ErrorText>{error}</ErrorText>}

            {!conflicts && (
              <button
                className="d-btn d-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => handleConfirm(false)}
                disabled={isPending}
              >
                {isPending ? "Booking..." : "Confirm booking"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13, marginBottom: 14 }}>
      {children}
    </div>
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
