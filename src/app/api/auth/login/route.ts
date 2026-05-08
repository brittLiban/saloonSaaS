import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { sessionOptions, type SessionData } from "@/lib/session";

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "Email and password required." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { include: { tenant: true }, take: 1 } },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid_credentials", message: "Incorrect email or password." }, { status: 401 });
  }

  const membership = user.memberships[0];
  if (!membership) {
    return NextResponse.json({ error: "no_tenant", message: "Account has no associated salon." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId   = user.id;
  session.tenantId = membership.tenantId;
  session.role     = membership.role;
  session.name     = user.name;
  session.email    = user.email;
  await session.save();

  return NextResponse.json({ ok: true, redirect: "/app/today" });
}
