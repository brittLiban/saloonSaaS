"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { upsertService, upsertAddOn, toggleAddOnActive, deleteService, deleteAddOn } from "@/server/actions/services";
import { TopbarSearch } from "@/components/TopbarSearch";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceCents: number;
  active: boolean;
  species: string | null;
  addOnLinks?: { addOnId: string }[];
};

type AddOn = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  species: string | null;
  serviceLinks: { serviceId: string }[];
};

function fmtPrice(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m} min` : `${h}h`;
}

export function ServicesClient({
  services: initial,
  addOns: initialAddOns,
  monthlyCountMap,
  tenantName,
}: {
  services: Service[];
  addOns: AddOn[];
  monthlyCountMap: Record<string, number>;
  tenantName: string;
}) {
  const router = useRouter();
  const [services] = useState(initial);
  const [addOns, setAddOns] = useState(initialAddOns);
  const [editTarget, setEditTarget] = useState<Service | "new" | null>(null);
  const [editAddOnTarget, setEditAddOnTarget] = useState<AddOn | "new" | null>(null);
  const [, startToggle] = useTransition();

  function handleAddOnToggle(addOn: AddOn) {
    const next = !addOn.active;
    setAddOns((prev) => prev.map((item) => (item.id === addOn.id ? { ...item, active: next } : item)));
    startToggle(async () => {
      await toggleAddOnActive(addOn.id, next);
    });
  }

  function handleSaved() {
    setEditTarget(null);
    router.refresh();
  }

  function handleAddOnSaved() {
    setEditAddOnTarget(null);
    router.refresh();
  }

  const activeServices = services.filter((s) => s.active);
  const activeAddOns = addOns.filter((a) => a.active);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-breadcrumb">{tenantName} / Services</div>
          <div className="topbar-title">Services</div>
          <div className="topbar-sub">Menu &amp; pricing</div>
        </div>
        <div className="topbar-center">
          <TopbarSearch />
        </div>
        <div className="topbar-actions">
          <button className="topbar-bell" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="topbar-bell-dot" />
          </button>
          <Link href="/app/calendar" className="d-btn d-btn-primary">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New booking
          </Link>
        </div>
      </header>

      <div className="dash-content" style={{ paddingBottom: 48 }}>
        {activeServices.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 16, border: "1px solid var(--d-line-2)",
            padding: "48px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✂️</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 18, color: "var(--d-ink-3)", marginBottom: 16 }}>
              No services yet
            </div>
            <button className="d-btn d-btn-primary" onClick={() => setEditTarget("new")}>
              Add your first service
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}>
            {activeServices.map((svc) => {
              const bookingCount = monthlyCountMap[svc.id] ?? 0;
              return (
                <div
                  key={svc.id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid var(--d-line-2)",
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0,
                  }}
                >
                  {/* Service name */}
                  <div style={{
                    fontSize: 17, fontWeight: 700, color: "var(--d-ink)",
                    letterSpacing: "-0.01em", marginBottom: 12,
                  }}>
                    {svc.name}
                  </div>

                  {/* Price + duration */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
                    <span style={{
                      fontFamily: "var(--dash-serif)",
                      fontSize: 38, fontWeight: 400,
                      color: "var(--d-ink)", lineHeight: 1,
                    }}>
                      {fmtPrice(svc.priceCents)}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--d-ink-4)" }}>
                      · {fmtDuration(svc.durationMinutes)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: "1px solid var(--d-line)", marginBottom: 14 }} />

                  {/* Footer: booking count + edit */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--d-ink-3)" }}>
                      Booked {bookingCount}× this month
                    </span>
                    <button
                      onClick={() => setEditTarget(svc)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: 4, color: "var(--d-ink-4)", display: "grid", placeItems: "center",
                        borderRadius: 6,
                        transition: "color 0.1s",
                      }}
                      title="Edit service"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* + New service card */}
            <button
              onClick={() => setEditTarget("new")}
              style={{
                background: "transparent",
                borderRadius: 16,
                border: "2px dashed var(--d-line-2)",
                padding: "22px 24px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 160,
                color: "var(--d-ink-4)",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>New service</span>
            </button>
          </div>
        )}

        <div style={{ marginTop: 34, marginBottom: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--dash-sans)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Add-ons
            </div>
            <div style={{ fontSize: 13, color: "var(--d-ink-3)", marginTop: 3 }}>
              Optional extras that can add time and price to a booking.
            </div>
          </div>
          <button className="d-btn" type="button" onClick={() => setEditAddOnTarget("new")}>
            New add-on
          </button>
        </div>

        {activeAddOns.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid var(--d-line-2)",
            padding: "28px 24px", color: "var(--d-ink-3)", fontSize: 14,
          }}>
            No add-ons yet. Add deshedding, teeth brushing, flea treatment, nail grinding, or any salon-specific extra.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {activeAddOns.map((addOn) => {
              const allowedServices = addOn.serviceLinks
                .map((link) => services.find((service) => service.id === link.serviceId)?.name)
                .filter(Boolean)
                .join(", ");

              return (
                <div
                  key={addOn.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid var(--d-line-2)",
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{addOn.name}</div>
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginTop: 3 }}>
                        {allowedServices || "All services"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditAddOnTarget(addOn)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: 4, color: "var(--d-ink-4)", display: "grid", placeItems: "center",
                        borderRadius: 6,
                      }}
                      title="Edit add-on"
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: "var(--dash-serif)", fontSize: 30, color: "var(--d-ink)", lineHeight: 1 }}>
                      {fmtPrice(addOn.priceCents)}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--d-ink-4)" }}>
                      {fmtDuration(addOn.durationMinutes)}
                    </span>
                  </div>

                  {addOn.description && (
                    <div style={{ fontSize: 12, color: "var(--d-ink-3)", lineHeight: 1.45 }}>
                      {addOn.description}
                    </div>
                  )}

                  <button
                    type="button"
                    className="d-btn"
                    style={{ marginTop: "auto", fontSize: 12, alignSelf: "flex-start" }}
                    onClick={() => handleAddOnToggle(addOn)}
                  >
                    Deactivate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editTarget !== null && (
        <ServiceModal
          service={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
      {editAddOnTarget !== null && (
        <AddOnModal
          addOn={editAddOnTarget === "new" ? null : editAddOnTarget}
          services={services}
          onClose={() => setEditAddOnTarget(null)}
          onSaved={handleAddOnSaved}
        />
      )}
    </>
  );
}

function ServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.durationMinutes ?? 60));
  const [bufferBefore, setBufferBefore] = useState(String(service?.bufferBeforeMinutes ?? 0));
  const [bufferAfter, setBufferAfter] = useState(String(service?.bufferAfterMinutes ?? 0));
  const [price, setPrice] = useState(service ? String(service.priceCents / 100) : "");
  const [species, setSpecies] = useState(service?.species ?? "");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertService({
          id: service?.id,
          name,
          description: description || undefined,
          durationMinutes: Number(duration),
          bufferBeforeMinutes: Number(bufferBefore) || 0,
          bufferAfterMinutes: Number(bufferAfter) || 0,
          priceCents: Math.round(Number(price) * 100),
          active: service?.active ?? true,
          species: species || undefined,
        });
        onSaved();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      }
    });
  }

  function handleDelete() {
    if (!service?.id) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteService(service.id);
        onSaved();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to delete.");
        setConfirmDelete(false);
      }
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(22, 22, 22, 0.55)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "72px 16px 40px", overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          width: "100%", maxWidth: 480, padding: 28, flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--dash-sans)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 20 }}>
          {service ? "Edit service" : "New service"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Service name">
            <input
              className="d-input"
              style={{ width: "100%" }}
              placeholder="e.g. Full Groom"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Duration (minutes)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
            <Field label="Price (USD)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                step="0.01"
                placeholder="75.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Buffer before (min)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                max={120}
                value={bufferBefore}
                onChange={(e) => setBufferBefore(e.target.value)}
              />
            </Field>
            <Field label="Buffer after (min)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                max={120}
                value={bufferAfter}
                onChange={(e) => setBufferAfter(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Species (leave blank for all)">
            <select
              className="d-input"
              style={{ width: "100%" }}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="">All species</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Rabbit">Rabbit</option>
            </select>
          </Field>

          <Field label="Description (optional)">
            <textarea
              className="d-input"
              style={{ width: "100%", minHeight: 68, resize: "vertical" }}
              placeholder="What's included…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff1ee", borderRadius: 8, color: "var(--acc)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
          {service && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 12, color: "var(--acc)", fontWeight: 600 }}>Delete this service?</span>
                <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setConfirmDelete(false)} disabled={isPending}>Cancel</button>
                <button
                  className="d-btn"
                  style={{ fontSize: 12, background: "var(--acc)", borderColor: "var(--acc)", color: "#fff" }}
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting…" : "Yes, delete"}
                </button>
              </>
            ) : (
              <button
                className="d-btn"
                style={{ fontSize: 12, color: "var(--acc)", borderColor: "var(--acc)" }}
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
              >
                Delete
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="d-btn d-btn-primary"
            onClick={handleSubmit}
            disabled={isPending || !name || !price || !duration}
          >
            {isPending ? "Saving…" : "Save service"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddOnModal({
  addOn,
  services,
  onClose,
  onSaved,
}: {
  addOn: AddOn | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(addOn?.name ?? "");
  const [description, setDescription] = useState(addOn?.description ?? "");
  const [duration, setDuration] = useState(String(addOn?.durationMinutes ?? 30));
  const [price, setPrice] = useState(addOn ? String(addOn.priceCents / 100) : "");
  const [species, setSpecies] = useState(addOn?.species ?? "");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    addOn?.serviceLinks.map((link) => link.serviceId) ?? [],
  );

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => (
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    ));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertAddOn({
          id: addOn?.id,
          name,
          description: description || undefined,
          durationMinutes: Number(duration),
          priceCents: Math.round(Number(price) * 100),
          active: addOn?.active ?? true,
          species: species || undefined,
          serviceIds: selectedServiceIds,
        });
        onSaved();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
      }
    });
  }

  function handleDelete() {
    if (!addOn?.id) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAddOn(addOn.id);
        onSaved();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to delete.");
        setConfirmDelete(false);
      }
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(22, 22, 22, 0.55)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "72px 16px 40px", overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          width: "100%", maxWidth: 520, padding: 28, flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--dash-sans)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 20 }}>
          {addOn ? "Edit add-on" : "New add-on"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Add-on name">
            <input
              className="d-input"
              style={{ width: "100%" }}
              placeholder="e.g. Deshedding"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Duration (minutes)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                max={480}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
            <Field label="Price (USD)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                step="0.01"
                placeholder="20.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Species (leave blank for all)">
            <select
              className="d-input"
              style={{ width: "100%" }}
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
            >
              <option value="">All species</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Rabbit">Rabbit</option>
            </select>
          </Field>

          <Field label="Can be used with">
            <div style={{ border: "1px solid var(--d-line-2)", borderRadius: 10, padding: 10, display: "grid", gap: 8, maxHeight: 180, overflowY: "auto" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--d-ink-3)" }}>
                <input
                  type="checkbox"
                  checked={selectedServiceIds.length === 0}
                  onChange={() => setSelectedServiceIds([])}
                />
                All services
              </label>
              {services.map((svc) => (
                <label key={svc.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(svc.id)}
                    onChange={() => toggleService(svc.id)}
                  />
                  {svc.name}{svc.species ? ` (${svc.species})` : ""}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Description (optional)">
            <textarea
              className="d-input"
              style={{ width: "100%", minHeight: 68, resize: "vertical" }}
              placeholder="Notes for groomers or booking workflows"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff1ee", borderRadius: 8, color: "var(--acc)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center" }}>
          {addOn && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 12, color: "var(--acc)", fontWeight: 600 }}>Delete this add-on?</span>
                <button className="d-btn" style={{ fontSize: 12 }} onClick={() => setConfirmDelete(false)} disabled={isPending}>Cancel</button>
                <button
                  className="d-btn"
                  style={{ fontSize: 12, background: "var(--acc)", borderColor: "var(--acc)", color: "#fff" }}
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting…" : "Yes, delete"}
                </button>
              </>
            ) : (
              <button
                className="d-btn"
                style={{ fontSize: 12, color: "var(--acc)", borderColor: "var(--acc)" }}
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
              >
                Delete
              </button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="d-btn d-btn-primary"
            onClick={handleSubmit}
            disabled={isPending || !name || price === "" || duration === ""}
          >
            {isPending ? "Saving..." : "Save add-on"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--d-ink-2)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
