export const dashboardTabs = [
  { key: "calendar", label: "Calendar", description: "Book, cancel, reschedule, and inspect availability." },
  { key: "today", label: "Today", description: "Run-of-day, alerts, revenue estimate, and care reminders." },
  { key: "bookings", label: "Bookings", description: "Appointment volume and trend reporting." },
  { key: "rebooking", label: "Rebooking", description: "Pets due soon or overdue by care cadence." },
  { key: "clients", label: "Clients", description: "Client and animal directory." },
  { key: "services", label: "Services", description: "Tenant-specific service menu and pricing." },
  { key: "money", label: "Money", description: "Invoices, statuses, totals, and exports." },
  { key: "notes", label: "Notes", description: "Animal, patient, and client care notes." },
] as const;

export type DashboardTabKey = (typeof dashboardTabs)[number]["key"];
