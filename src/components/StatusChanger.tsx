"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "@/server/actions/appointments";

const NEXT: Record<string, { label: string; status: string }> = {
  CONFIRMED:   { label: "Check in",  status: "CHECKED_IN" },
  CHECKED_IN:  { label: "Start",     status: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Ready",     status: "READY" },
  READY:       { label: "Complete",  status: "COMPLETED" },
};

export function StatusChanger({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const next = NEXT[status];
  if (!next) return null;

  return (
    <button
      className="d-btn"
      style={{ fontSize: 11, padding: "3px 9px" }}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await updateAppointmentStatus({ id: appointmentId, status: next.status });
        })
      }
    >
      {isPending ? "…" : next.label}
    </button>
  );
}
