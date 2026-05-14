"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  fetchAvailableSlots,
  fetchClientsWithAnimals,
  quickCreateClientWithAnimal,
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
  const s = species.toLowerCase();
  if (s === "dog") return "Dog";
  if (s === "cat") return "Cat";
  return species;
}

function vaccinationLabel(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return "Vaccinated";
  if (vaccinated === false) return "Not vaccinated";
  return "Unknown";
}

function vaccinationColor(vaccinated: boolean | null | undefined) {
  if (vaccinated === true) return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  if (vaccinated === false) return { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" };
  return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
}

function serviceAllowed(addOn: SlimAddOn, serviceIds: string[]) {
  return addOn.serviceIds.length === 0 || serviceIds.some((id) => addOn.serviceIds.includes(id));
}

function uniqueAddOns(services: SlimService[], addOns: SlimAddOn[]) {
  const map = new Map<string, SlimAddOn>();
  for (const addOn of addOns) map.set(addOn.id, addOn);
  for (const svc of services) {
    for (const addOn of svc.addOns ?? []) map.set(addOn.id, addOn);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

type Step = "service" | "slot" | "client" | "confirm";

interface Props {
  services: SlimService[];
  addOns?: SlimAddOn[];
  onClose: () => void;
  defaultDate?: string;
  defaultClientId?: string;
  defaultAnimalId?: string;
}

export function BookingModal({ services, addOns = [], onClose, defaultDate, defaultClientId, defaultAnimalId }: Props) {
  const preselected = Boolean(defaultClientId);
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
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [animalId, setAnimalId] = useState(defaultAnimalId ?? "");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const [qName, setQName] = useState("");
  const [qPhone, setQPhone] = useState("");
  const [qPetName, setQPetName] = useState("");
  const [qSpecies, setQSpecies] = useState("dog");
  const [qVaccinated, setQVaccinated] = useState<"true" | "false" | "null">("null");

  const [done, setDone] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[] | null>(null);

  const selectedServices = useMemo(
    () => selectedServiceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as SlimService[],
    [selectedServiceIds, services],
  );

  const allowedAddOns = useMemo(
    () => allAddOns.filter((a) => serviceAllowed(a, selectedServiceIds)),
    [allAddOns, selectedServiceIds],
  );

  const activeSelectedAddOnIds = useMemo(
    () => selectedAddOnIds.filter((id) => allowedAddOns.some((a) => a.id === id)),
    [selectedAddOnIds, allowedAddOns],
  );

  const selectedAddOns = useMemo(
    () => activeSelectedAddOnIds.map((id) => allAddOns.find((a) => a.id === id)).filter(Boolean) as SlimAddOn[],
    [activeSelectedAddOnIds, allAddOns],
  );

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedAnimal = selectedClient?.animals.find((a) => a.id === animalId);
  const totalDuration = [...selectedServices, ...selectedAddOns].reduce((s, i) => s + i.durationMinutes, 0);
  const totalPrice = [...selectedServices, ...selectedAddOns].reduce((s, i) => s + i.priceCents, 0);
  const serviceSummary = selectedServices.map((s) => s.name).join(" + ");
  const addOnSummary = selectedAddOns.map((a) => a.name).join(" + ");
  const bookingSummary = addOnSummary ? `${serviceSummary} + ${addOnSummary}` : serviceSummary;

  const STEPS: Step[] = preselected ? ["service", "slot"] : ["service", "slot", "client"];
  const STEP_LABELS = preselected ? ["Services", "Time"] : ["Services", "Time", "Client"];
  const stepIdx: Record<Step, number> = { service: 0, slot: 1, client: 2, confirm: preselected ? 2 : 3 };

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? (prev.length === 1 ? prev : prev.filter((s) => s !== id)) : [...prev, id],
    );
  }

  function toggleAddOn(id: string) {
    setSelectedAddOnIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  function selectClientAnimal(cId: string, aId: string) {
    setClientId(cId);
    setAnimalId(aId);
    setShowQuickAdd(false);
  }

  function handleFindSlots() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchAvailableSlots({ serviceIds: selectedServiceIds, addOnIds: activeSelectedAddOnIds, date });
        setSlots(result);
        setSelectedSlot(null);
        setStep("slot");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load slots.");
      }
    });
  }

  function handlePickSlot(slot: TimeSlot) {
    setSelectedSlot(slot);
    startTransition(async () => {
      const result = await fetchClientsWithAnimals();
      setClients(result);
      if (preselected) {
        // client already known — skip straight to confirm
        setClientId(defaultClientId!);
        setAnimalId(defaultAnimalId ?? result.find((c) => c.id === defaultClientId)?.animals[0]?.id ?? "");
        setStep("confirm");
      } else {
        if (result[0]) {
          setClientId(result[0].id);
          setAnimalId(result[0].animals[0]?.id ?? "");
        }
        setStep("client");
      }
    });
  }

  function handleQuickAdd() {
    if (!qName.trim() || !qPetName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const newClient = await quickCreateClientWithAnimal({
          clientName: qName.trim(),
          phone: qPhone.trim() || undefined,
          animalName: qPetName.trim(),
          species: qSpecies,
          vaccinated: qVaccinated === "null" ? null : qVaccinated === "true",
        });
        setClients((prev) => [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name)));
        setClientId(newClient.id);
        setAnimalId(newClient.animals[0]?.id ?? "");
        setShowQuickAdd(false);
        setQName(""); setQPhone(""); setQPetName(""); setQSpecies("dog"); setQVaccinated("null");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create client.");
      }
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

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15, 15, 20, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 620, padding: 0, position: "relative", flexShrink: 0, borderRadius: 20, overflow: "hidden", maxHeight: "calc(100vh - 32px)", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — always visible, never scrolls */}
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--d-line)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: done ? 0 : 18 }}>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 22, fontWeight: 700 }}>
              {done ? "Booking confirmed" : "New booking"}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--d-line)", border: "none", cursor: "pointer", fontSize: 18, color: "var(--d-ink-3)", lineHeight: "32px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              &times;
            </button>
          </div>

          {!done && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                      background: stepIdx[step] >= i ? "var(--oxblood)" : "var(--d-line)",
                      color: stepIdx[step] >= i ? "#fff" : "var(--d-ink-4)",
                      transition: "background 0.2s",
                    }}>
                      {stepIdx[step] > i ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: stepIdx[step] === i ? 700 : 400, color: stepIdx[step] === i ? "var(--d-ink)" : "var(--d-ink-3)", transition: "all 0.2s" }}>
                      {STEP_LABELS[i]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 28, height: 1.5, background: stepIdx[step] > i ? "var(--oxblood)" : "var(--d-line)", borderRadius: 99, margin: "0 4px", transition: "background 0.2s" }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body — scrolls when content is taller than the modal */}
        <div style={{ padding: "22px 28px 28px", overflowY: "auto", flex: 1, minHeight: 0 }}>

          {/* Done state */}
          {done && (
            <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#dcfce7", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22, color: "#166534", fontWeight: 700 }}>✓</div>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 20, marginBottom: 6 }}>
                {selectedAnimal?.name ?? "Appointment"} is booked
              </div>
              <div style={{ color: "var(--d-ink-3)", fontSize: 14, marginBottom: 24 }}>
                {bookingSummary} &mdash; {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""} at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""}
              </div>
              <button className="d-btn d-btn-primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
            </div>
          )}

          {/* Step 1: Services */}
          {!done && step === "service" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SectionLabel>Main Services</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {services.map((svc) => {
                  const selected = selectedServiceIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => toggleService(svc.id)}
                      style={{
                        textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                        border: selected ? "2px solid var(--oxblood)" : "1.5px solid var(--d-line-2)",
                        background: selected ? "oklch(from var(--oxblood) l c h / 0.07)" : "oklch(1 0 0 / 0.7)",
                        position: "relative", transition: "all 0.15s",
                        display: "flex", flexDirection: "column", gap: 3,
                      }}
                    >
                      {selected && (
                        <span style={{ position: "absolute", top: 10, right: 10, width: 18, height: 18, borderRadius: "50%", background: "var(--oxblood)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 700, color: selected ? "var(--oxblood)" : "var(--d-ink)", paddingRight: 22 }}>{svc.name}</span>
                      <span style={{ fontSize: 12, color: "var(--d-ink-3)" }}>{svc.durationMinutes} min{svc.species ? ` · ${svc.species}` : ""}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--dash-mono)", color: "var(--d-ink-2)", marginTop: 4 }}>{fmtMoney(svc.priceCents)}</span>
                    </button>
                  );
                })}
              </div>

              {allowedAddOns.length > 0 && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 1, background: "var(--d-line)" }} />
                    <SectionLabel style={{ margin: 0 }}>Add-On Services</SectionLabel>
                    <div style={{ flex: 1, height: 1, background: "var(--d-line)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {allowedAddOns.map((addOn) => {
                      const selected = selectedAddOnIds.includes(addOn.id);
                      return (
                        <button
                          key={addOn.id}
                          onClick={() => toggleAddOn(addOn.id)}
                          style={{
                            textAlign: "left", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                            border: selected ? "1.5px solid var(--oxblood)" : "1.5px solid var(--d-line-2)",
                            background: selected ? "oklch(from var(--oxblood) l c h / 0.06)" : "oklch(1 0 0 / 0.5)",
                            display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: "50%", flexShrink: 0, transition: "all 0.15s",
                            background: selected ? "var(--oxblood)" : "transparent",
                            border: selected ? "none" : "1.5px solid var(--d-line-2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {selected && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--d-ink)" }}>{addOn.name}</div>
                            <div style={{ fontSize: 11, color: "var(--d-ink-3)", marginTop: 1 }}>+{addOn.durationMinutes} min &middot; {fmtMoney(addOn.priceCents)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 6 }}>Date</label>
                <input className="d-input" style={{ width: "100%" }} type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div style={{ padding: "12px 16px", background: "oklch(from var(--oxblood) l c h / 0.05)", border: "1px solid oklch(from var(--oxblood) l c h / 0.15)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--d-ink-3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {bookingSummary || "Select a service"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--dash-mono)", whiteSpace: "nowrap" }}>
                  {totalDuration} min &bull; {fmtMoney(totalPrice)}
                </span>
              </div>

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button className="d-btn d-btn-primary" onClick={handleFindSlots} disabled={isPending || selectedServiceIds.length === 0 || !date}>
                {isPending ? "Loading..." : "Find available times →"}
              </button>
            </div>
          )}

          {/* Step 2: Time slot */}
          {!done && step === "slot" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button className="d-btn" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setStep("service")}>Back</button>
                <div style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
                  <strong style={{ color: "var(--d-ink)" }}>{bookingSummary}</strong>&ensp;&bull;&ensp;{new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
              </div>

              {slots.length === 0 ? (
                <div style={{ padding: "44px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 15, color: "var(--d-ink-3)", marginBottom: 14 }}>No available slots on this date.</div>
                  <button className="d-btn" onClick={() => setStep("service")}>Change date</button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
                  {slots.map((slot) => {
                    const booked = !slot.available;
                    return (
                      <button
                        key={slot.startsAt}
                        onClick={() => !isPending && handlePickSlot(slot)}
                        disabled={isPending}
                        title={booked ? "Already taken — click to book anyway" : undefined}
                        style={{
                          padding: "11px 8px", borderRadius: 10, cursor: "pointer",
                          border: booked ? "1.5px solid #fca5a5" : "1.5px solid var(--d-line)",
                          background: booked ? "#fff1f0" : "oklch(1 0 0 / 0.7)",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                          transition: "all 0.1s",
                        }}
                      >
                        <span style={{ fontFamily: "var(--dash-mono)", fontSize: 13, fontWeight: 700, color: booked ? "#b91c1c" : "var(--d-ink)" }}>
                          {fmtTime(slot.startsAt)}
                        </span>
                        <span style={{ fontSize: 10, color: booked ? "#ef4444" : "var(--d-ink-4)" }}>
                          {slot.durationMinutes} min{booked ? " — taken" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Client */}
          {!done && step === "client" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="d-btn" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setStep("slot")}>Back</button>
                <div style={{ padding: "8px 14px", background: "oklch(from var(--oxblood) l c h / 0.06)", borderRadius: 8, fontSize: 13, color: "var(--d-ink-2)", flex: 1, overflow: "hidden" }}>
                  <strong style={{ color: "var(--d-ink)" }}>{bookingSummary}</strong> at {selectedSlot ? fmtTime(selectedSlot.startsAt) : ""}, {selectedSlot ? fmtDate(selectedSlot.startsAt) : ""}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 6 }}>Search clients</label>
                <input
                  className="d-input"
                  style={{ width: "100%" }}
                  placeholder="Type a name..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {filteredClients.length === 0 && (
                  <div style={{ padding: "16px 0", textAlign: "center", color: "var(--d-ink-3)", fontSize: 13 }}>
                    {clientSearch ? `No clients matching "${clientSearch}"` : "No clients on file yet."}
                  </div>
                )}
                {filteredClients.map((client) =>
                  client.animals.map((animal) => {
                    const selected = clientId === client.id && animalId === animal.id;
                    const vc = vaccinationColor(animal.vaccinated);
                    return (
                      <button
                        key={`${client.id}-${animal.id}`}
                        onClick={() => selectClientAnimal(client.id, animal.id)}
                        style={{
                          textAlign: "left", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          border: selected ? "2px solid var(--oxblood)" : "1.5px solid var(--d-line-2)",
                          background: selected ? "oklch(from var(--oxblood) l c h / 0.06)" : "oklch(1 0 0 / 0.7)",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 12, transition: "all 0.1s",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: selected ? "var(--oxblood)" : "var(--d-ink)" }}>{client.name}</div>
                          <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginTop: 2 }}>
                            {petLabel(animal.species)} &bull; {animal.name}{animal.breed ? ` (${animal.breed})` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999, background: vc.bg, color: vc.color, border: `1px solid ${vc.border}`, whiteSpace: "nowrap" }}>
                          {vaccinationLabel(animal.vaccinated)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Quick-add toggle */}
              {!showQuickAdd ? (
                <button
                  onClick={() => { setShowQuickAdd(true); setError(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "1.5px dashed var(--d-line-2)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--d-ink-2)", width: "100%" }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1, color: "var(--oxblood)", fontWeight: 400 }}>+</span>
                  New client &amp; pet
                </button>
              ) : (
                <div style={{ padding: "16px", borderRadius: 12, border: "1.5px solid var(--d-line-2)", background: "oklch(1 0 0 / 0.55)", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--d-ink)" }}>Quick add</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 4 }}>Client name *</label>
                      <input className="d-input" style={{ width: "100%" }} placeholder="Jane Smith" value={qName} onChange={(e) => setQName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 4 }}>Phone</label>
                      <input className="d-input" style={{ width: "100%" }} placeholder="(555) 000-0000" value={qPhone} onChange={(e) => setQPhone(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ height: 1, background: "var(--d-line)" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 4 }}>Pet name *</label>
                      <input className="d-input" style={{ width: "100%" }} placeholder="Buddy" value={qPetName} onChange={(e) => setQPetName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 4 }}>Species</label>
                      <select className="d-input" style={{ width: "100%" }} value={qSpecies} onChange={(e) => setQSpecies(e.target.value)}>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: "var(--d-ink-2)", display: "block", marginBottom: 4 }}>Vaccinated</label>
                      <select className="d-input" style={{ width: "100%" }} value={qVaccinated} onChange={(e) => setQVaccinated(e.target.value as "true" | "false" | "null")}>
                        <option value="null">Unknown</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>
                  {error && <ErrorBanner>{error}</ErrorBanner>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="d-btn" style={{ fontSize: 12 }} onClick={() => { setShowQuickAdd(false); setError(null); }}>Cancel</button>
                    <button
                      className="d-btn d-btn-primary"
                      style={{ fontSize: 12 }}
                      onClick={handleQuickAdd}
                      disabled={isPending || !qName.trim() || !qPetName.trim()}
                    >
                      {isPending ? "Saving..." : "Save & select"}
                    </button>
                  </div>
                </div>
              )}

              {error && !showQuickAdd && <ErrorBanner>{error}</ErrorBanner>}

              <button className="d-btn d-btn-primary" onClick={() => setStep("confirm")} disabled={!clientId || !animalId || isPending}>
                Review booking
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {!done && step === "confirm" && (
            <div>
              <div style={{ marginBottom: 18 }}>
                <button className="d-btn" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setStep("client")}>Back</button>
              </div>

              <div style={{ background: "oklch(from var(--oxblood) l c h / 0.05)", border: "1px solid oklch(from var(--oxblood) l c h / 0.18)", borderRadius: 14, padding: "20px 22px", marginBottom: 18 }}>
                <div style={{ fontFamily: "var(--dash-serif)", fontSize: 17, marginBottom: 14 }}>Booking summary</div>
                {([
                  ["Owner", selectedClient?.name ?? ""],
                  ["Pet", `${selectedAnimal ? petLabel(selectedAnimal.species) : ""} • ${selectedAnimal?.name ?? ""}${selectedAnimal?.breed ? ` (${selectedAnimal.breed})` : ""}`],
                  ["Vaccination", vaccinationLabel(selectedAnimal?.vaccinated)],
                  ["Services", serviceSummary],
                  ...(addOnSummary ? [["Add-ons", addOnSummary]] : []),
                  ["Date", selectedSlot ? fmtDate(selectedSlot.startsAt) : ""],
                  ["Time", selectedSlot ? `${fmtTime(selectedSlot.startsAt)} – ${fmtTime(selectedSlot.endsAt)}` : ""],
                  ["Duration", `${totalDuration} min`],
                  ["Total", fmtMoney(totalPrice)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "7px 0", borderBottom: "1px solid oklch(from var(--oxblood) l c h / 0.1)", fontSize: 14 }}>
                    <span style={{ color: "var(--d-ink-3)" }}>{label}</span>
                    <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
                  </div>
                ))}
              </div>

              {conflicts && conflicts.length > 0 && (
                <div style={{ padding: "14px 16px", marginBottom: 16, background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 6 }}>Schedule conflict</div>
                  <div style={{ fontSize: 12, color: "#92400e", marginBottom: 10 }}>
                    Overlaps with:
                    <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                      {conflicts.map((c, i) => (
                        <li key={i}><strong>{c.animalName}</strong> &mdash; {c.serviceName} at {c.startsAt}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setConflicts(null)}>Cancel</button>
                    <button className="d-btn" style={{ fontSize: 12, background: "#f59e0b", borderColor: "#f59e0b", color: "#fff" }} onClick={() => handleConfirm(true)} disabled={isPending}>
                      {isPending ? "Booking..." : "Book anyway"}
                    </button>
                  </div>
                </div>
              )}

              {error && <ErrorBanner>{error}</ErrorBanner>}

              {!conflicts && (
                <button className="d-btn d-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleConfirm(false)} disabled={isPending}>
                  {isPending ? "Confirming..." : "Confirm booking"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)", ...style }}>
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>
      {children}
    </div>
  );
}
