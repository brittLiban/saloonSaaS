export const demoTenant = {
  name: "Nina's Pet Salon",
  slug: "ninas-pet-salon",
  city: "Federal Way, WA",
  owner: "Nina Reyes",
  timezone: "America/Los_Angeles",
  theme: {
    accent: "#7c2f24",
    typography: "fraunces-inter",
    density: "regular",
    mode: "light",
  },
};

export const demoAppointments = [
  { time: "8:00 AM", animal: "Persephone", service: "Bath & Brush", status: "completed" },
  { time: "9:30 AM", animal: "Atlas", service: "Full Groom", status: "in_progress" },
  { time: "12:30 PM", animal: "Margaux", service: "De-shed Treatment", status: "confirmed" },
  { time: "2:30 PM", animal: "Mochi", service: "Bath & Brush", status: "confirmed" },
];

export const demoStats = [
  { label: "Pets today", value: "4", detail: "1 in chair" },
  { label: "Revenue estimate", value: "$340", detail: "invoice tracking first" },
  { label: "Due to rebook", value: "7", detail: "cadence-based" },
];
