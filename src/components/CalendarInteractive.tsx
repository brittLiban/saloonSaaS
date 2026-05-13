"use client";

import { useState } from "react";
import { AppointmentDetailModal, type AppointmentDetailStatus } from "@/components/AppointmentDetailModal";
import { appointmentDurationMinutes, appointmentServiceLabel } from "@/lib/appointment-summary";

/* ── constants ──────────────────────────────────── */
const HOUR_START  = 8;
const PX_PER_HOUR = 64;
const PX_PER_MIN  = PX_PER_HOUR / 60;
const TOP_PAD     = 20;

const PALETTE = [
  { bg: "#ffbcbc", text: "#8B2020" },
  { bg: "#b8eec0", text: "#1a5c2e" },
  { bg: "#cfc8f4", text: "#4a2d9e" },
  { bg: "#ffe494", text: "#7a4800" },
  { bg: "#aacff4", text: "#1a3d6e" },
  { bg: "#ffd4ac", text: "#7a3200" },
];

function animalColor(animalId: string) {
  const hash = animalId.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function minuteTop(totalMin: number) { return TOP_PAD + (totalMin - HOUR_START * 60) * PX_PER_MIN; }
function hourTop(h: number) { return TOP_PAD + (h - HOUR_START) * PX_PER_HOUR; }

function fmt12(date: Date, timezone: string) {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function minutesInZone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return hour * 60 + minute;
}

type Appt = {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: AppointmentDetailStatus;
  priceCents: number;
  client: { id: string; name: string; phone: string | null };
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

interface TimeGridColProps {
  appts: Appt[];
  today: boolean;
  nowTop: number;
  showNow: boolean;
  gridH: number;
  hours: number[];
  timezone: string;
  onAppointmentClick: (appt: Appt) => void;
}

export function TimeGridColClient({
  appts,
  today,
  nowTop,
  showNow,
  gridH,
  hours,
  timezone,
  onAppointmentClick,
}: TimeGridColProps) {
  return (
    <div style={{
      position: "relative", height: gridH,
      borderLeft: "1px solid var(--d-line)",
      background: today ? "rgba(255,90,31,0.03)" : "transparent",
    }}>
      {hours.map((h) => (
        <div key={h} style={{ position: "absolute", top: hourTop(h), left: 0, right: 0, borderTop: "1px solid var(--d-line)" }} />
      ))}
      {hours.map((h) => (
        <div key={`${h}h`} style={{ position: "absolute", top: hourTop(h) + PX_PER_HOUR / 2, left: 0, right: 0, borderTop: "1px dashed var(--d-line)", opacity: 0.5 }} />
      ))}
      {today && showNow && (
        <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 4 }}>
          <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--acc)" }} />
          <div style={{ borderTop: "2px solid var(--acc)" }} />
        </div>
      )}
      {appts.map((a) => {
        const start = new Date(a.startsAt);
        const end = new Date(a.endsAt);
        const startMin = minutesInZone(start, timezone);
        const dur = appointmentDurationMinutes(a);
        const label = appointmentServiceLabel(a);
        const top = minuteTop(startMin);
        const height = Math.max(dur * PX_PER_MIN - 3, 28);
        const color = animalColor(a.animal.id);
        const isCompleted = a.status === "COMPLETED";
        return (
          <div
            key={a.id}
            onClick={() => onAppointmentClick(a)}
            style={{
              position: "absolute", top: top + 2, left: 3, right: 3, height,
              background: color.bg, borderRadius: 14, padding: "7px 10px",
              overflow: "hidden", zIndex: 2, cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "transform 0.2s, box-shadow 0.2s",
              opacity: isCompleted ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)";
            }}
          >
            {isCompleted && (
              <div style={{ position: "absolute", top: 4, right: 6, fontSize: 14, lineHeight: 1 }}>
                ✓
              </div>
            )}
            <div style={{ fontSize: 10, fontWeight: 600, color: color.text, opacity: 0.72, lineHeight: 1.4, marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {fmt12(start, timezone)} · {fmt12(end, timezone)}
            </div>
            {height > 38 && (
              <div style={{ fontSize: 14, fontWeight: 800, color: color.text, lineHeight: 1.2, marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.animal.name}
              </div>
            )}
            {height > 58 && (
              <div style={{ fontSize: 11.5, color: color.text, opacity: 0.82, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
              </div>
            )}
            {height > 78 && (
              <div style={{ fontSize: 10.5, color: color.text, opacity: 0.72, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {dur} minutes
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CalendarInteractiveWrapper() {
  const [selectedAppointment, setSelectedAppointment] = useState<Appt | null>(null);

  return (
    <>
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={{
            id: selectedAppointment.id,
            startsAt: selectedAppointment.startsAt,
            endsAt: selectedAppointment.endsAt,
            status: selectedAppointment.status,
            priceCents: selectedAppointment.priceCents,
            client: selectedAppointment.client,
            animal: selectedAppointment.animal,
            service: selectedAppointment.service,
            services: selectedAppointment.services,
            addOns: selectedAppointment.addOns,
          }}
          timezone={window.location.hostname ? "UTC" : "America/Los_Angeles"} // This will be overridden by server
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </>
  );
}

export function AppointmentClickHandler() {
  const [selectedAppointment, setSelectedAppointment] = useState<Appt | null>(null);

  return {
    selectedAppointment,
    setSelectedAppointment,
    detailModal: selectedAppointment ? (
      <AppointmentDetailModal
        appointment={{
          id: selectedAppointment.id,
          startsAt: selectedAppointment.startsAt,
          endsAt: selectedAppointment.endsAt,
          status: selectedAppointment.status,
          priceCents: selectedAppointment.priceCents,
          client: selectedAppointment.client,
          animal: selectedAppointment.animal,
          service: selectedAppointment.service,
          services: selectedAppointment.services,
          addOns: selectedAppointment.addOns,
        }}
        timezone="UTC"
        onClose={() => setSelectedAppointment(null)}
      />
    ) : null,
  };
}
