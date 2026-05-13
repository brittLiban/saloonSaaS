"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createInvoice, sendInvoice, markInvoicePaid, voidInvoice } from "@/server/actions/invoices";
import { WeeklyRevenueChart } from "@/components/WeeklyRevenueChart";

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
  monthDelta: number | null;
  yearRevenue: number;
  outstandingAmount: number;
  outstandingCount: number;
  overdueCount: number;
};

type StatusKey = "ALL" | "DRAFT" | "SENT" | "UNPAID" | "PAID" | "OVERDUE" | "VOID";

const STATUS_TABS: { key: StatusKey; label: string }[] = [
  { key: "ALL",     label: "All" },
  { key: "DRAFT",   label: "Draft" },
  { key: "SENT",    label: "Sent" },
  { key: "UNPAID",  label: "Unpaid" },
  { key: "PAID",    label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "VOID",    label: "Void" },
];

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  DRAFT:   { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb", label: "Draft" },
  SENT:    { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", label: "Sent" },
  PAID:    { bg: "#dcfce7", color: "#166534", border: "#86efac", label: "Paid" },
  UNPAID:  { bg: "#fef3c7", color: "#92400e", border: "#fde68a", label: "Unpaid" },
  OVERDUE: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca", label: "Overdue" },
  VOID:    { bg: "#f3f4f6", color: "#9ca3af", border: "#e5e7eb", label: "Void" },
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
  weeklyData,
  kpis,
}: {
  invoices: InvoiceRow[];
  clients: ClientRow[];
  weeklyData: { week: string; revenue: number }[];
  kpis: KPIs;
}) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusKey>("ALL");
  const now = new Date();

  const filtered = useMemo(() => {
    if (activeTab === "ALL") return invoices;
    if (activeTab === "OVERDUE") {
      return invoices.filter(
        (inv) => inv.dueAt && new Date(inv.dueAt) < now && !["PAID", "VOID", "DRAFT"].includes(inv.status),
      );
    }
    return invoices.filter((inv) => inv.status === activeTab);
  }, [invoices, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<StatusKey, number>> = { ALL: invoices.length };
    for (const inv of invoices) {
      const k = inv.status as StatusKey;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const overdueN = invoices.filter(
      (inv) => inv.dueAt && new Date(inv.dueAt) < now && !["PAID", "VOID", "DRAFT"].includes(inv.status),
    ).length;
    counts.OVERDUE = overdueN;
    return counts;
  }, [invoices]);

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <div className="topbar-title">Money</div>
          <div className="topbar-sub">Revenue &amp; invoices</div>
        </div>
        <div className="topbar-actions">
          <button className="d-btn d-btn-primary" onClick={() => setShowModal(true)}>
            + New invoice
          </button>
        </div>
      </header>

      <div className="dash-content">

        {/* Revenue chart */}
        <WeeklyRevenueChart data={weeklyData} />

        {/* KPI cards */}
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
          {/* This month */}
          <div className="glass-card" style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)", marginBottom: 8 }}>
              This month
            </div>
            <div style={{ fontSize: 26, fontFamily: "var(--dash-serif)", fontWeight: 400, marginBottom: 6 }}>
              {fmtMoney(kpis.monthRevenue)}
            </div>
            {kpis.monthDelta !== null && (
              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  fontWeight: 700,
                  color: kpis.monthDelta >= 0 ? "#166534" : "#991b1b",
                }}>
                  {kpis.monthDelta >= 0 ? "+" : ""}{kpis.monthDelta}%
                </span>
                <span style={{ color: "var(--d-ink-3)" }}>vs last month</span>
              </div>
            )}
            {kpis.monthDelta === null && (
              <div style={{ fontSize: 12, color: "var(--d-ink-4)" }}>First month of data</div>
            )}
          </div>

          {/* This year */}
          <div className="glass-card" style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)", marginBottom: 8 }}>
              This year
            </div>
            <div style={{ fontSize: 26, fontFamily: "var(--dash-serif)", fontWeight: 400, marginBottom: 6 }}>
              {fmtMoney(kpis.yearRevenue)}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>Paid invoices only</div>
          </div>

          {/* Outstanding */}
          <div className="glass-card" style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)", marginBottom: 8 }}>
              Outstanding
            </div>
            <div style={{ fontSize: 26, fontFamily: "var(--dash-serif)", fontWeight: 400, marginBottom: 6 }}>
              {fmtMoney(kpis.outstandingAmount)}
            </div>
            <div style={{ fontSize: 12, color: "var(--d-ink-3)" }}>
              {kpis.outstandingCount} invoice{kpis.outstandingCount !== 1 ? "s" : ""} awaiting payment
            </div>
          </div>

          {/* Overdue */}
          <div className="glass-card" style={{ padding: "18px 22px", borderColor: kpis.overdueCount > 0 ? "#fca5a5" : undefined }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: kpis.overdueCount > 0 ? "#b91c1c" : "var(--d-ink-3)", marginBottom: 8 }}>
              Overdue
            </div>
            <div style={{ fontSize: 26, fontFamily: "var(--dash-serif)", fontWeight: 400, marginBottom: 6, color: kpis.overdueCount > 0 ? "#991b1b" : "var(--d-ink)" }}>
              {kpis.overdueCount}
            </div>
            <div style={{ fontSize: 12, color: kpis.overdueCount > 0 ? "#b91c1c" : "var(--d-ink-3)" }}>
              {kpis.overdueCount > 0 ? "Need attention" : "All clear"}
            </div>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.key] ?? 0;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 13, fontWeight: active ? 700 : 500,
                  border: active ? "1.5px solid var(--oxblood)" : "1.5px solid var(--d-line-2)",
                  background: active ? "oklch(from var(--oxblood) l c h / 0.08)" : "oklch(1 0 0 / 0.6)",
                  color: active ? "var(--oxblood)" : "var(--d-ink-2)",
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                    background: active ? "var(--oxblood)" : "var(--d-line)",
                    color: active ? "#fff" : "var(--d-ink-3)",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Invoice table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "56px 0", textAlign: "center", color: "var(--d-ink-4)" }}>
              {activeTab === "ALL" ? "No invoices yet — create one to start tracking revenue." : `No ${activeTab.toLowerCase()} invoices.`}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--d-line)" }}>
                  {["#", "Client", "Pet", "Amount", "Status", "Issued", "Due", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--d-ink-3)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const isOverdue = inv.dueAt && new Date(inv.dueAt) < now && !["PAID", "VOID", "DRAFT"].includes(inv.status);
                  const statusKey = isOverdue ? "OVERDUE" : inv.status;
                  const style = STATUS_STYLE[statusKey] ?? STATUS_STYLE.DRAFT;
                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--d-line)", transition: "background 0.1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(from var(--oxblood) l c h / 0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "13px 16px", fontFamily: "var(--dash-mono)", fontSize: 12, color: "var(--d-ink-3)", whiteSpace: "nowrap" }}>
                        #{inv.number}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <Link href={`/app/clients/${inv.clientId}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--oxblood)", textDecoration: "none" }}>
                          {inv.client.name}
                        </Link>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--d-ink-2)" }}>
                        {inv.animal?.name ?? <span style={{ color: "var(--d-ink-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 14, fontFamily: "var(--dash-mono)", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {fmtMoney(inv.totalCents)}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: style.bg, color: style.color, border: `1px solid ${style.border}`, whiteSpace: "nowrap" }}>
                          {style.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--d-ink-3)", whiteSpace: "nowrap" }}>
                        {fmtDate(inv.issuedAt)}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, whiteSpace: "nowrap", fontWeight: isOverdue ? 700 : 400, color: isOverdue ? "#b91c1c" : "var(--d-ink-3)" }}>
                        {fmtDate(inv.dueAt)}
                        {isOverdue && <span style={{ marginLeft: 4 }}>!</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <InvoiceActions invoice={inv} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && <NewInvoiceModal clients={clients} onClose={() => setShowModal(false)} />}
    </>
  );
}

function InvoiceActions({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh(); });
  }

  const canSend = invoice.status === "DRAFT";
  const canPay  = ["SENT", "UNPAID", "OVERDUE"].includes(invoice.status);
  const canVoid = !["VOID", "PAID"].includes(invoice.status);

  if (!canSend && !canPay && !canVoid) return null;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {canSend && (
        <button className="d-btn" style={{ fontSize: 11, padding: "4px 10px" }} disabled={isPending} onClick={() => act(() => sendInvoice(invoice.id))}>
          {isPending ? "…" : "Send"}
        </button>
      )}
      {canPay && (
        <button className="d-btn d-btn-primary" style={{ fontSize: 11, padding: "4px 10px" }} disabled={isPending} onClick={() => act(() => markInvoicePaid(invoice.id))}>
          {isPending ? "…" : "Mark paid"}
        </button>
      )}
      {canVoid && (
        <button className="d-btn" style={{ fontSize: 11, padding: "4px 10px", color: "var(--d-ink-4)" }} disabled={isPending} onClick={() => act(() => voidInvoice(invoice.id))}>
          Void
        </button>
      )}
    </div>
  );
}

type LineItem = { description: string; quantity: string; unitPrice: string };

function NewInvoiceModal({ clients, onClose }: { clients: ClientRow[]; onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId]   = useState(clients[0]?.id ?? "");
  const [animalId, setAnimalId]   = useState(clients[0]?.animals[0]?.id ?? "");
  const [dueAt, setDueAt]         = useState("");
  const [taxDollars, setTaxDollars] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: "1", unitPrice: "" }]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function handleClientChange(id: string) {
    setClientId(id);
    const c = clients.find((c) => c.id === id);
    setAnimalId(c?.animals[0]?.id ?? "");
  }

  function updateItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  }

  const subtotal = lineItems.reduce((s, li) => s + (parseFloat(li.unitPrice) || 0) * (parseInt(li.quantity) || 0), 0);
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
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(15, 15, 20, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 32px)", overflowY: "auto", padding: 0, borderRadius: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid var(--d-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--dash-serif)", fontSize: 20 }}>New invoice</div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--d-line)", border: "none", cursor: "pointer", fontSize: 18, color: "var(--d-ink-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>&times;</button>
        </div>

        <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Client + Animal */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Client">
              <select className="d-input" style={{ width: "100%" }} value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Pet (optional)">
              <select className="d-input" style={{ width: "100%" }} value={animalId} onChange={(e) => setAnimalId(e.target.value)}>
                <option value="">— none —</option>
                {(selectedClient?.animals ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--d-ink-2)", marginBottom: 8 }}>Line items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lineItems.map((li, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 92px 28px", gap: 6, alignItems: "center" }}>
                  <input className="d-input" placeholder="Description" value={li.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                  <input className="d-input" type="number" min={1} placeholder="Qty" value={li.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} style={{ textAlign: "center" }} />
                  <input className="d-input" type="number" min={0} step="0.01" placeholder="$0.00" value={li.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
                  <button type="button" onClick={() => setLineItems((p) => p.filter((_, i) => i !== idx))} disabled={lineItems.length === 1} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--d-ink-3)", fontSize: 18, opacity: lineItems.length === 1 ? 0.3 : 1 }}>×</button>
                </div>
              ))}
            </div>
            <button className="d-btn" style={{ marginTop: 8, fontSize: 12 }} onClick={() => setLineItems((p) => [...p, { description: "", quantity: "1", unitPrice: "" }])} type="button">
              + Add line
            </button>
          </div>

          {/* Tax + Due */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Tax (USD)">
              <input className="d-input" style={{ width: "100%" }} type="number" min={0} step="0.01" placeholder="0.00" value={taxDollars} onChange={(e) => setTaxDollars(e.target.value)} />
            </Field>
            <Field label="Due date">
              <input className="d-input" style={{ width: "100%" }} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </Field>
          </div>

          {/* Totals */}
          <div style={{ background: "oklch(from var(--oxblood) l c h / 0.05)", border: "1px solid oklch(from var(--oxblood) l c h / 0.15)", borderRadius: 10, padding: "12px 16px" }}>
            {([["Subtotal", fmtMoney(subtotal * 100)], ["Tax", fmtMoney(tax * 100)], ["Total", fmtMoney(total * 100)]] as [string, string][]).map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: lbl === "Total" ? 15 : 13, fontWeight: lbl === "Total" ? 700 : 400 }}>
                <span style={{ color: "var(--d-ink-3)" }}>{lbl}</span>
                <span style={{ fontFamily: "var(--dash-mono)" }}>{val}</span>
              </div>
            ))}
          </div>

          {error && <div style={{ padding: "10px 14px", background: "oklch(from var(--oxblood) l c h / 0.08)", borderRadius: 8, color: "var(--oxblood)", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="d-btn" onClick={onClose} disabled={isPending}>Cancel</button>
            <button className="d-btn d-btn-primary" onClick={handleSubmit} disabled={isPending || !clientId || lineItems.every((li) => !li.description.trim())}>
              {isPending ? "Creating…" : "Create invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--d-ink-2)" }}>{label}</label>
      {children}
    </div>
  );
}
