export type AppointmentLine = {
  name: string;
  durationMinutes: number;
  priceCents: number;
};

export type AppointmentSummarySource = {
  startsAt: Date | string;
  endsAt: Date | string;
  durationMinutes?: number | null;
  priceCents: number;
  service: AppointmentLine;
  services?: AppointmentLine[] | null;
  addOns?: AppointmentLine[] | null;
};

export function appointmentDurationMinutes(appt: AppointmentSummarySource) {
  if (appt.durationMinutes && appt.durationMinutes > 0) return appt.durationMinutes;

  const start = new Date(appt.startsAt);
  const end = new Date(appt.endsAt);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function appointmentServices(appt: AppointmentSummarySource): AppointmentLine[] {
  return appt.services && appt.services.length > 0 ? appt.services : [appt.service];
}

export function appointmentAddOns(appt: AppointmentSummarySource): AppointmentLine[] {
  return appt.addOns ?? [];
}

export function appointmentServiceLabel(appt: AppointmentSummarySource) {
  const services = appointmentServices(appt).map((line) => line.name).join(" + ");
  const addOns = appointmentAddOns(appt).map((line) => line.name).join(" + ");
  return addOns ? `${services} + ${addOns}` : services;
}
