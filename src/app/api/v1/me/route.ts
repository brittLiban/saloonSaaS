import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    tenant: {
      id: "demo_tenant",
      name: "Nina's Pet Salon",
      slug: "ninas-pet-salon",
    },
    api: {
      version: "v1",
      mode: "scaffold",
      message: "Tenant-scoped API key authentication lands in Sprint 5.",
    },
  });
}
