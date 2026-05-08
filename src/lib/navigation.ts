export const dashboardTabs = [
  { key: "today",     label: "Today",     href: "/app/today",     description: "Run-of-day, alerts, revenue estimate." },
  { key: "calendar",  label: "Calendar",  href: "/app/calendar",  description: "Book, cancel, reschedule, availability." },
  { key: "bookings",  label: "Bookings",  href: "/app/bookings",  description: "Appointment volume and trend reporting." },
  { key: "rebooking", label: "Rebooking", href: "/app/rebooking", description: "Pets due soon or overdue by cadence.", badge: true },
  { key: "clients",   label: "Clients",   href: "/app/clients",   description: "Client and animal directory." },
  { key: "animals",   label: "Animals",   href: "/app/animals",   description: "Pet profiles and care history." },
  { key: "services",  label: "Services",  href: "/app/services",  description: "Service menu and pricing." },
  { key: "money",     label: "Money",     href: "/app/money",     description: "Invoices, statuses, totals." },
  { key: "notes",     label: "Notes",     href: "/app/notes",     description: "Animal and client care notes." },
] as const;

export type DashboardTabKey = (typeof dashboardTabs)[number]["key"];
