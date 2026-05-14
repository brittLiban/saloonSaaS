"use client";

import { useState } from "react";
import { BookingModal } from "@/components/BookingModal";
import type { SlimAddOn, SlimService } from "@/server/actions/booking";

export function RebookButton({
  clientId,
  animalId,
  services,
  addOns,
}: {
  clientId: string;
  animalId: string;
  services: SlimService[];
  addOns: SlimAddOn[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="d-btn d-btn-primary"
        style={{ padding: "7px 20px", borderRadius: 999, fontSize: 13, flexShrink: 0 }}
        onClick={() => setOpen(true)}
      >
        Book
      </button>
      {open && (
        <BookingModal
          services={services}
          addOns={addOns}
          defaultClientId={clientId}
          defaultAnimalId={animalId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
