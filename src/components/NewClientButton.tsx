"use client";

import { useState } from "react";
import { ClientModal } from "./ClientModal";

export function NewClientButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="d-btn d-btn-primary" type="button" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New client
      </button>

      {open && <ClientModal client={null} onClose={() => setOpen(false)} />}
    </>
  );
}
