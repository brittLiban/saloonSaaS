const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  REQUESTED:   { cls: "pill pill-gray",   label: "Requested" },
  CONFIRMED:   { cls: "pill pill-brass",  label: "Confirmed" },
  CHECKED_IN:  { cls: "pill pill-blue",   label: "Checked in" },
  IN_PROGRESS: { cls: "pill pill-red",    label: "● In progress" },
  READY:       { cls: "pill pill-green",  label: "Ready" },
  COMPLETED:   { cls: "pill pill-gray",   label: "Completed" },
  CANCELLED:   { cls: "pill pill-red",    label: "Cancelled" },
  NO_SHOW:     { cls: "pill pill-red",    label: "No show" },
};

const INVOICE_PILL: Record<string, { cls: string }> = {
  DRAFT:   { cls: "pill pill-gray" },
  SENT:    { cls: "pill pill-blue" },
  PAID:    { cls: "pill pill-green" },
  UNPAID:  { cls: "pill pill-brass" },
  OVERDUE: { cls: "pill pill-red" },
  VOID:    { cls: "pill pill-gray" },
};

export function AppointmentStatusPill({ status }: { status: string }) {
  const config = STATUS_PILL[status] ?? { cls: "pill pill-gray", label: status };
  return <span className={config.cls}>{config.label}</span>;
}

export function InvoiceStatusPill({ status }: { status: string }) {
  const config = INVOICE_PILL[status] ?? { cls: "pill pill-gray" };
  return <span className={config.cls}>{status}</span>;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function petEmoji(species: string): string {
  const s = species.toLowerCase();
  if (s === "dog") return "🐶";
  if (s === "cat") return "🐈";
  if (s === "rabbit") return "🐰";
  if (s === "bird") return "🐦";
  return "🐾";
}

export function daysAgo(date: Date | null): number {
  if (!date) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}
