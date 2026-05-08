import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return NextResponse.json(
    {
      appointmentId: id,
      error: "not_implemented",
      message: "Status mutation lands in Sprint 4 with audit logs and webhook events.",
    },
    { status: 501 },
  );
}
