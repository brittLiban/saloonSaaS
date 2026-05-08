"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { upsertClient } from "@/server/actions/clients";

export type ClientFormData = {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tier: string;
  notes: string | null;
};

export function ClientModal({
  client,
  onClose,
}: {
  client: ClientFormData | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName]       = useState(client?.name ?? "");
  const [email, setEmail]     = useState(client?.email ?? "");
  const [phone, setPhone]     = useState(client?.phone ?? "");
  const [address, setAddress] = useState(client?.address ?? "");
  const [tier, setTier]       = useState(client?.tier ?? "Regular");
  const [notes, setNotes]     = useState(client?.notes ?? "");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await upsertClient({ id: client?.id, name, email, phone, address, tier, notes });
        onClose();
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

  return (
    <Overlay onClose={onClose}>
      <h2 style={{ fontFamily: "var(--dash-sans)", fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
        {client?.id ? "Edit client" : "New client"}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name *">
          <input className="d-input" style={{ width: "100%" }} placeholder="Full name"
            value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email">
            <input className="d-input" style={{ width: "100%" }} type="email" placeholder="email@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="d-input" style={{ width: "100%" }} type="tel" placeholder="(555) 000-0000"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </div>

        <Field label="Address">
          <input className="d-input" style={{ width: "100%" }} placeholder="Street, City, State"
            value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        <Field label="Client tier">
          <select className="d-input" style={{ width: "100%" }} value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="New">New</option>
            <option value="Regular">Regular</option>
            <option value="VIP">VIP</option>
          </select>
        </Field>

        <Field label="Internal notes">
          <textarea className="d-input" style={{ width: "100%", minHeight: 72, resize: "vertical" }}
            placeholder="Any notes about this client…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#fff1ee", borderRadius: 8, color: "var(--acc)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
        <button className="d-btn d-btn-primary" onClick={handleSubmit} disabled={isPending || !name.trim()}>
          {isPending ? "Saving…" : client?.id ? "Save changes" : "Add client"}
        </button>
      </div>
    </Overlay>
  );
}

/* ── Small reusable components ── */

export function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(22, 22, 22, 0.55)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "72px 16px 40px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.10)",
          width: "100%", maxWidth: 500,
          padding: "28px 28px 24px",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: "var(--d-ink-2)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
