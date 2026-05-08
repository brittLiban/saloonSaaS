import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json(
    {
      appointmentId: id,
      error: "not_implemented",
      message: "Cancellation flow lands in Sprint 4 with audit logs and webhooks.",
    },
    { status: 501 },
  );
}
