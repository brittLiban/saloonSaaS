"use client";

import { useState } from "react";
import { TimeGridColClient } from "@/components/CalendarInteractive";
import { AppointmentDetailModal } from "@/components/AppointmentDetailModal";

type Appt = {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  status: string;
  priceCents: number;
  client: { id: string; name: string; phone: string | null };
  animal: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    weightLbs: any; // Decimal from Prisma
  };
  service: { id: string; name: string; durationMinutes: number };
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
            status: selectedAppointment.status as any,
            priceCents: selectedAppointment.priceCents,
            client: selectedAppointment.client,
            animal: selectedAppointment.animal,
            service: selectedAppointment.service,
          }}
          timezone={timezone}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </>
  );
}
