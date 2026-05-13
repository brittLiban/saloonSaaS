"use client";

import { useState } from "react";
import { TimeGridColClient } from "@/components/CalendarInteractive";
import { AppointmentDetailModal, type AppointmentDetailStatus } from "@/components/AppointmentDetailModal";

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

interface CalendarViewProps {
  appts: Appt[];
  today: boolean;
  nowTop: number;
  showNow: boolean;
  gridH: number;
  hours: number[];
  timezone: string;
}

export function TimeGridColWrapper({
  appts,
  today,
  nowTop,
  showNow,
  gridH,
  hours,
  timezone,
}: CalendarViewProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appt | null>(null);

  return (
    <>
      <TimeGridColClient
        appts={appts}
        today={today}
        nowTop={nowTop}
        showNow={showNow}
        gridH={gridH}
        hours={hours}
        timezone={timezone}
        onAppointmentClick={setSelectedAppointment}
      />
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
          timezone={timezone}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </>
  );
}
