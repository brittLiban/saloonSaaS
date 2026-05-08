"use client";

import { useState } from "react";
import Link from "next/link";
import { ClientModal, type ClientFormData } from "./ClientModal";
import { AnimalModal } from "./AnimalModal";

export function ClientDetailActions({ client }: { client: ClientFormData }) {
  const [showEdit, setShowEdit]     = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);

  return (
    <>
      <button className="d-btn" type="button" onClick={() => setShowEdit(true)}>Edit</button>
      <button className="d-btn" type="button" onClick={() => setShowAddPet(true)}>+ Add pet</button>
      <Link href="/app/calendar" className="d-btn d-btn-primary">+ Booking</Link>

      {showEdit && (
        <ClientModal client={client} onClose={() => setShowEdit(false)} />
      )}
      {showAddPet && (
        <AnimalModal
          animal={null}
          clientId={client.id!}
          onClose={() => setShowAddPet(false)}
        />
      )}
    </>
  );
}
