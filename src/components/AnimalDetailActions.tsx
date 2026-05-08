"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimalModal, type AnimalFormData } from "./AnimalModal";

export function AnimalDetailActions({ animal }: { animal: AnimalFormData }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <button className="d-btn" type="button" onClick={() => setShowEdit(true)}>Edit</button>
      <Link href="/app/calendar" className="d-btn d-btn-primary">+ Booking</Link>

      {showEdit && (
        <AnimalModal
          animal={animal}
          clientId={animal.clientId}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
