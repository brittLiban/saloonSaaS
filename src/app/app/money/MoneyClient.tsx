"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createInvoice,
  sendInvoice,
  markInvoicePaid,
  voidInvoice,
} from "@/server/actions/invoices";

type InvoiceRow = {
  id: string;
  number: string;
  status: string;
  totalCents: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  clientId: string;
  client: { name: string };
  animal: { name: string } | null;
};

type ClientRow = {
  id: string;
  name: string;
  animals: { id: string; name: string; species: string }[];
};

type KPIs = {
  monthRevenue: number;
  yearRevenue: number;
  outstandingCount: number;
  totalCount: number;
};

const INV_STATUS: Record<string, { cls: string; label: string }> = {
  DRAFT:   { cls: "pill pill-gray",  label: "Draft" },
  SENT:    { cls: "pill pill-blue",  label: "Sent" },
  PAID:    { cls: "pill pill-green", label: "Paid" },
  UNPAID:  { cls: "pill pill-brass", label: "Unpaid" },
  OVERDUE: { cls: "pill pill-red",   label: "Overdue" },
  VOID:    { cls: "pill pill-gray",  label: "Void" },
};

function fmtMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MoneyClient({
  invoices,
  clients,
  kpis,
  status: activeStatus,
}: {
  invoices: InvoiceRow[];
  clients: ClientRow[];
  kpis: KPIs;
  status?: string;
}) {
  const [showModal, setShowModal] = useState(false);
  const now = new Date();

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Money</div>
          <div className="topbar-sub">Invoices &amp; revenue</div>
        </div>
        <div className="topbar-actions">
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <select
              name="status"
              defaultValue={activeStatus ?? ""}
              className="d-input"
              style={{ width: 140 }}
            >
              <option value="">All invoices</option>
              {Object.entries(INV_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className="d-btn" type="submit">Filter</button>
          </form>
          <button
            className="d-btn d-btn-primary"
            type="button"
            onClick={() => setShowModal(true)}
          >
            + New invoice
          </button>
        </div>
      </header>

      <div className="dash-content">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { label: "Revenue this month", value: fmtMoney(kpis.monthRevenue) },
            { label: "Revenue this year",  value: fmtMoney(kpis.yearRevenue) },
            { label: "Outstanding",        value: kpis.outstandingCount },
            { label: "Total invoices",     value: kpis.totalCount },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 11, color: "var(--d-ink-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontFamily: "var(--dash-serif)", fontWeight: 400 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Invoice table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                {["Invoice #", "Client", "Pet", "Amount", "Status", "Issued", "Due", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 11,
                      fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                      color: "var(--d-ink-3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 16px", textAlign: "center", color: "var(--d-ink-4)", fontStyle: "italic" }}>
                    No invoices yet. Create one to start tracking revenue.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = inv.dueAt && new Date(inv.dueAt) < now && !["PAID", "VOID"].includes(inv.status);
                  const { cls, label } = INV_STATUS[inv.status] ?? { cls: "pill pill-gray", label: inv.status };
                  return (
                    <tr key={inv.id} className="table-row">
                      <td style={{ padding: "12px 16px", fontFamily: "var(--dash-mono)", fontSize: 12 }}>
                        #{inv.number}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Link href={`/app/clients/${inv.clientId}`} style={{ fontSize: 13, color: "var(--oxblood)" }}>
                          {inv.client.name}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{inv.animal?.name ?? "—"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "var(--dash-mono)", fontWeight: 600 }}>
                        {fmtMoney(inv.totalCents)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className={isOverdue ? "pill pill-red" : cls} style={{ fontSize: 10 }}>
                          {isOverdue ? "Overdue" : label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--d-ink-3)" }}>
                        {fmtDate(inv.issuedAt)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: isOverdue ? "var(--oxblood)" : "var(--d-ink-3)" }}>
                        {fmtDate(inv.dueAt)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <InvoiceActions invoice={inv} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NewInvoiceModal
          clients={clients}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function InvoiceActions({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const canSend    = invoice.status === "DRAFT";
  const canPay     = ["SENT", "UNPAID", "OVERDUE"].includes(invoice.status);
  const canVoid    = !["VOID", "PAID"].includes(invoice.status);

  if (!canSend && !canPay && !canVoid) return null;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {canSend && (
        <button
          className="d-btn"
          style={{ fontSize: 11, padding: "3px 9px" }}
          disabled={isPending}
          onClick={() => act(() => sendInvoice(invoice.id))}
        >
          {isPending ? "…" : "Send"}
        </button>
      )}
      {canPay && (
        <button
          className="d-btn d-btn-primary"
          style={{ fontSize: 11, padding: "3px 9px" }}
          disabled={isPending}
          onClick={() => act(() => markInvoicePaid(invoice.id))}
        >
          {isPending ? "…" : "Mark paid"}
        </button>
      )}
      {canVoid && (
        <button
          className="d-btn"
          style={{ fontSize: 11, padding: "3px 9px", color: "var(--d-ink-3)" }}
          disabled={isPending}
          onClick={() => act(() => voidInvoice(invoice.id))}
        >
          Void
        </button>
      )}
    </div>
  );
}

type LineItem = { description: string; quantity: string; unitPrice: string };

function NewInvoiceModal({
  clients,
  onClose,
}: {
  clients: ClientRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [animalId, setAnimalId] = useState(clients[0]?.animals[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [taxDollars, setTaxDollars] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function handleClientChange(id: string) {
    setClientId(id);
    const c = clients.find((c) => c.id === id);
    setAnimalId(c?.animals[0]?.id ?? "");
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  }

  function addItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lineItems.reduce((s, li) => {
    return s + (parseFloat(li.unitPrice) || 0) * (parseInt(li.quantity) || 0);
  }, 0);
  const tax = parseFloat(taxDollars) || 0;
  const total = subtotal + tax;

  function handleSubmit() {
    const validItems = lineItems.filter((li) => li.description.trim() && li.unitPrice);
    if (!clientId || validItems.length === 0) return;
    setError(null);

    startTransition(async () => {
      try {
        await createInvoice({
          clientId,
          animalId: animalId || undefined,
          lineItems: validItems.map((li) => ({
            description: li.description.trim(),
            quantity: parseInt(li.quantity) || 1,
            unitCents: Math.round((parseFloat(li.unitPrice) || 0) * 100),
          })),
          taxCents: Math.round(tax * 100),
          dueAt: dueAt ? new Date(dueAt) : undefined,
        });
        router.refresh();
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to create invoice.");
      }
    });
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "oklch(0 0 0 / 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: 560, maxHeight: "92vh", overflowY: "auto", padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--dash-serif)", fontSize: 21, marginBottom: 20 }}>New invoice</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Client + Animal */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Client">
              <select
                className="d-input"
                style={{ width: "100%" }}
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Animal (optional)">
              <select
                className="d-input"
                style={{ width: "100%" }}
                value={animalId}
                onChange={(e) => setAnimalId(e.target.value)}
              >
                <option value="">— none —</option>
                {(selectedClient?.animals ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--d-ink-2)", marginBottom: 8 }}>
              Line items
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lineItems.map((li, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 64px 96px 28px", gap: 6, alignItems: "center" }}>
                  <input
                    className="d-input"
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                  />
                  <input
                    className="d-input"
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    style={{ textAlign: "center" }}
                  />
                  <input
                    className="d-input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="$0.00"
                    value={li.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={lineItems.length === 1}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--d-ink-3)", fontSize: 16, lineHeight: 1,
                      opacity: lineItems.length === 1 ? 0.3 : 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              className="d-btn"
              style={{ marginTop: 8, fontSize: 12 }}
              onClick={addItem}
              type="button"
            >
              + Add line item
            </button>
          </div>

          {/* Tax + Due */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tax (USD, optional)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={taxDollars}
                onChange={(e) => setTaxDollars(e.target.value)}
              />
            </Field>
            <Field label="Due date (optional)">
              <input
                className="d-input"
                style={{ width: "100%" }}
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </Field>
          </div>

          {/* Totals */}
          <div style={{
            background: "oklch(from var(--oxblood) l c h / 0.05)",
            border: "1px solid oklch(from var(--oxblood) l c h / 0.15)",
            borderRadius: 10, padding: "12px 16px",
          }}>
            {[
              ["Subtotal", fmtMoney(subtotal * 100)],
              ["Tax",      fmtMoney(tax * 100)],
              ["Total",    fmtMoney(total * 100)],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{
                display: "flex", justifyContent: "space-between",
                padding: "4px 0", fontSize: lbl === "Total" ? 15 : 13,
                fontWeight: lbl === "Total" ? 600 : 400,
              }}>
                <span style={{ color: "var(--d-ink-3)" }}>{lbl}</span>
                <span style={{ fontFamily: "var(--dash-mono)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
          <button
            className="d-btn d-btn-primary"
            onClick={handleSubmit}
            disabled={isPending || !clientId || lineItems.every((li) => !li.description.trim())}
          >
            {isPending ? "Creating…" : "Create invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--d-ink-2)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
