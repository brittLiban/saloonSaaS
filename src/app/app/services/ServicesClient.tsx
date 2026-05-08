"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { upsertService, toggleServiceActive } from "@/server/actions/services";
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
  monthlyCountMap,
  tenantName,
}: {
  services: Service[];
  monthlyCountMap: Record<string, number>;
  tenantName: string;
}) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [editTarget, setEditTarget] = useState<Service | "new" | null>(null);
  const [, startToggle] = useTransition();

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

  const activeServices = services.filter((s) => s.active);

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
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

  if (!mounted) return null;

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
