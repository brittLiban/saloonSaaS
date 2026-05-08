import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { db } from "@/server/db";
import { sessionOptions, type SessionData } from "@/lib/session";

const DEMO_EMAIL = "nina@example.com";

export async function POST() {
  const user = await db.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: {
      memberships: {
        take: 1,
        include: { tenant: true },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return NextResponse.json(
      { error: "Demo account not found. Run `npm run db:seed` to set it up." },
      { status: 404 }
    );
  }

  const membership = user.memberships[0];

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId   = user.id;
  session.tenantId = membership.tenantId;
  session.role     = membership.role as SessionData["role"];
  session.name     = user.name;
  session.email    = user.email;
  await session.save();

  return NextResponse.json({ ok: true, redirect: "/app/today" });
}
