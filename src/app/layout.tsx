import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glasshound | Pet Salon Software",
  description: "Run your grooming salon like clockwork. Booking, payments, client records, and an AI receptionist — built for the solo owner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
