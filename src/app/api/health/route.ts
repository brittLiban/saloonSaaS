import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "glasshound-saas", status: "healthy", db: "ok" });
  } catch {
    return NextResponse.json({ ok: false, service: "glasshound-saas", status: "degraded", db: "error" }, { status: 503 });
  }
}
