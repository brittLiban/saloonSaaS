"use client";

import { useState } from "react";
import { BookingModal } from "@/components/BookingModal";
import type { SlimAddOn, SlimService } from "@/server/actions/booking";

export function CalendarActions({ services, addOns = [] }: { services: SlimService[]; addOns?: SlimAddOn[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="d-btn d-btn-primary" type="button" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New booking
      </button>
      {open && <BookingModal services={services} addOns={addOns} onClose={() => setOpen(false)} />}
    </>
  );
}
