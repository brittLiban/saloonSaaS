import { NextResponse } from "next/server";
import { demoAppointments } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({
    mode: "scaffold",
    message: "Appointments are demo-backed until Sprint 4 connects Prisma booking services.",
    data: demoAppointments,
  });
}

export async function POST() {
  return NextResponse.json(
    {
      error: "not_implemented",
      message: "Appointment creation lands in Sprint 4 after tenant auth and service-layer validation.",
    },
    { status: 501 },
  );
}
