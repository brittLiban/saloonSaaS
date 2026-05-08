"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertService, toggleServiceActive } from "@/server/actions/services";

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
};

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ServicesClient({ services: initial }: { services: Service[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [editTarget, setEditTarget] = useState<Service | "new" | null>(null);
  const [togglePending, startToggle] = useTransition();

  function handleToggle(svc: Service) {
    const next = !svc.active;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, active: next } : s)));
    startToggle(async () => {
      await toggleServiceActive(svc.id, next);
    });
  }

  function handleSaved() {
    setEditTarget(null);
    router.refresh();
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Services</div>
          <div className="topbar-sub">
            {services.filter((s) => s.active).length} active services
          </div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn d-btn-primary" type="button" onClick={() => setEditTarget("new")}>
            + New service
          </button>
        </div>
      </header>

      <div className="dash-content">
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                {["Service", "Duration", "Price", "Species", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "var(--d-ink-3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "var(--d-ink-3)" }}>
                    No services yet. Add your first service to start booking.
                  </td>
                </tr>
              )}
              {services.map((svc) => (
                <tr key={svc.id} className="table-row">
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.name}</div>
                    {svc.description && (
                      <div style={{ fontSize: 12, color: "var(--d-ink-3)", marginTop: 2 }}>{svc.description}</div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13 }}>{fmtDuration(svc.durationMinutes)}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "var(--dash-mono)" }}>
                    {fmtMoney(svc.priceCents)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {svc.species ? (
                      <span className="pill pill-blue" style={{ fontSize: 11 }}>{svc.species}</span>
                    ) : (
                      <span style={{ color: "var(--d-ink-4)", fontSize: 12 }}>All</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => handleToggle(svc)}
                      disabled={togglePending}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      <span className={svc.active ? "pill pill-green" : "pill pill-gray"} style={{ fontSize: 11 }}>
                        {svc.active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      className="d-btn"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => setEditTarget(svc)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget !== null && (
        <ServiceModal
          service={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "oklch(0 0 0 / 0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: 480, padding: 28, position: "relative", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--dash-serif)", fontSize: 20, marginBottom: 20 }}>
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
          <div style={{ marginTop: 14, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
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
    </div>
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
