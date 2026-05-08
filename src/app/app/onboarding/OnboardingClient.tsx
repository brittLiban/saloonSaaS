"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessHours } from "@/server/actions/onboarding";
import { upsertService } from "@/server/actions/services";

type DayConfig = {
  idx: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
};

const DEFAULT_DAYS: DayConfig[] = [
  { idx: "1", label: "Monday",    open: true,  start: "09:00", end: "17:00" },
  { idx: "2", label: "Tuesday",   open: true,  start: "09:00", end: "17:00" },
  { idx: "3", label: "Wednesday", open: true,  start: "09:00", end: "17:00" },
  { idx: "4", label: "Thursday",  open: true,  start: "09:00", end: "17:00" },
  { idx: "5", label: "Friday",    open: true,  start: "09:00", end: "17:00" },
  { idx: "6", label: "Saturday",  open: true,  start: "09:00", end: "14:00" },
  { idx: "0", label: "Sunday",    open: false, start: "09:00", end: "17:00" },
];

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function OnboardingClient({ salonName }: { salonName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Step 1: Hours
  const [days, setDays] = useState<DayConfig[]>(DEFAULT_DAYS);

  function toggleDay(idx: string) {
    setDays((prev) => prev.map((d) => (d.idx === idx ? { ...d, open: !d.open } : d)));
  }
  function updateDay(idx: string, field: "start" | "end", value: string) {
    setDays((prev) => prev.map((d) => (d.idx === idx ? { ...d, [field]: value } : d)));
  }

  function handleSaveHours() {
    const hours: Record<string, { open: string; close: string } | null> = {};
    for (const d of days) {
      hours[d.idx] = d.open ? { open: d.start, close: d.end } : null;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveBusinessHours(hours);
        setStep(2);
      } catch {
        setError("Failed to save hours. Please try again.");
      }
    });
  }

  // Step 2: First service
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState("60");
  const [svcPrice, setSvcPrice] = useState("");
  const [svcSpecies, setSvcSpecies] = useState("");

  function handleSaveService() {
    if (!svcName || !svcPrice) return;
    setError(null);
    startTransition(async () => {
      try {
        await upsertService({
          name: svcName,
          durationMinutes: parseInt(svcDuration) || 60,
          priceCents: Math.round(parseFloat(svcPrice) * 100),
          active: true,
          species: svcSpecies || undefined,
        });
        setStep(3);
      } catch {
        setError("Failed to save service. Please try again.");
      }
    });
  }

  const openCount = days.filter((d) => d.open).length;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 99,
              background: step >= s ? "var(--oxblood)" : "var(--d-line)",
              transition: "background 0.25s",
            }} />
          ))}
        </div>

        {/* ── Step 1: Business hours ── */}
        {step === 1 && (
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ fontSize: 13, color: "var(--oxblood)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Step 1 of 3
            </div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 26, marginBottom: 8 }}>
              When is {salonName} open?
            </div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              Set your regular hours. The booking system will only show slots within these windows.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {days.map((day) => (
                <div
                  key={day.idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 44px 1fr",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: day.open ? "oklch(from var(--oxblood) l c h / 0.04)" : "oklch(1 0 0 / 0.4)",
                    border: `1px solid ${day.open ? "oklch(from var(--oxblood) l c h / 0.2)" : "var(--d-line)"}`,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: day.open ? "var(--d-ink)" : "var(--d-ink-3)" }}>
                    {day.label}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDay(day.idx)}
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: day.open ? "var(--oxblood)" : "var(--d-line)",
                      border: "none", cursor: "pointer", position: "relative",
                      transition: "background 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: 2, left: day.open ? 18 : 2,
                      width: 16, height: 16,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.15s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }} />
                  </button>
                  {day.open ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="time"
                        className="d-input"
                        value={day.start}
                        onChange={(e) => updateDay(day.idx, "start", e.target.value)}
                        style={{ fontSize: 12, padding: "4px 8px", width: 90 }}
                      />
                      <span style={{ fontSize: 12, color: "var(--d-ink-3)" }}>to</span>
                      <input
                        type="time"
                        className="d-input"
                        value={day.end}
                        onChange={(e) => updateDay(day.idx, "end", e.target.value)}
                        style={{ fontSize: 12, padding: "4px 8px", width: 90 }}
                      />
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--d-ink-4)", fontStyle: "italic" }}>Closed</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "var(--d-ink-3)" }}>
              {openCount} day{openCount !== 1 ? "s" : ""} open · you can update these any time in Settings
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              className="d-btn d-btn-primary"
              style={{ marginTop: 24, width: "100%", justifyContent: "center" }}
              onClick={handleSaveHours}
              disabled={isPending || openCount === 0}
            >
              {isPending ? "Saving…" : "Save hours →"}
            </button>
          </div>
        )}

        {/* ── Step 2: First service ── */}
        {step === 2 && (
          <div className="glass-card" style={{ padding: 32 }}>
            <div style={{ fontSize: 13, color: "var(--oxblood)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Step 2 of 3
            </div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 26, marginBottom: 8 }}>
              Add your first service
            </div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
              This is what clients will book. You can add more from the Services tab later.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Service name">
                <input
                  className="d-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. Full Groom"
                  value={svcName}
                  onChange={(e) => setSvcName(e.target.value)}
                  autoFocus
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
                    value={svcDuration}
                    onChange={(e) => setSvcDuration(e.target.value)}
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
                    value={svcPrice}
                    onChange={(e) => setSvcPrice(e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Species (optional)">
                <select
                  className="d-input"
                  style={{ width: "100%" }}
                  value={svcSpecies}
                  onChange={(e) => setSvcSpecies(e.target.value)}
                >
                  <option value="">All species</option>
                  <option value="Dog">Dog only</option>
                  <option value="Cat">Cat only</option>
                </select>
              </Field>
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                className="d-btn"
                style={{ flex: "0 0 auto" }}
                onClick={() => setStep(3)}
                disabled={isPending}
              >
                Skip for now
              </button>
              <button
                className="d-btn d-btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleSaveService}
                disabled={isPending || !svcName || !svcPrice}
              >
                {isPending ? "Saving…" : "Add service →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && (
          <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
            <div style={{ fontFamily: "var(--dash-serif)", fontSize: 28, marginBottom: 10 }}>
              {salonName} is ready!
            </div>
            <div style={{ color: "var(--d-ink-3)", fontSize: 14, lineHeight: 1.6, marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
              Your hours are set and your first service is live. Head to your dashboard to start taking bookings.
            </div>

            <div className="glass-card" style={{
              padding: "16px 20px",
              marginBottom: 24,
              background: "oklch(from var(--oxblood) l c h / 0.04)",
              border: "1px solid oklch(from var(--oxblood) l c h / 0.15)",
              textAlign: "left",
            }}>
              <div style={{ fontFamily: "var(--dash-serif)", fontSize: 15, marginBottom: 10 }}>Next steps</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["🔑", "Generate an API key in Settings to connect n8n"],
                  ["👤", "Add your first client in the Clients tab"],
                  ["📅", "Schedule a booking from the Calendar"],
                  ["🔌", "Explore the API docs to automate reminders"],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13 }}>
                    <span>{icon}</span>
                    <span style={{ color: "var(--d-ink-2)" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="d-btn d-btn-primary"
              style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 24px" }}
              onClick={() => router.push("/app/today")}
            >
              Open my dashboard →
            </button>
          </div>
        )}

        {/* Step indicator dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: step === s ? "var(--oxblood)" : "var(--d-line)",
              transition: "background 0.2s",
            }} />
          ))}
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
