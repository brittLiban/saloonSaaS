import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paw Reception | Pet Salon Software",
  description: "Run your grooming salon like clockwork. Booking, payments, client records, and an AI receptionist — built for the solo owner.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
