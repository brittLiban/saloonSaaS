import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { sessionOptions, type SessionData } from "@/lib/session";

const schema = z.object({
  name:       z.string().min(1).max(100),
  email:      z.string().email(),
  password:   z.string().min(8),
  salonName:  z.string().min(1).max(100),
  timezone:   z.string().default("America/Los_Angeles"),
});

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { name, email, password, salonName, timezone } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken", message: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const baseSlug = toSlug(salonName);

  const existingTenant = await db.tenant.findUnique({ where: { slug: baseSlug } });
  const slug = existingTenant ? `${baseSlug}-${Date.now()}` : baseSlug;

  const [user, tenant] = await db.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name, email, passwordHash } });
    const t = await tx.tenant.create({
      data: {
        name:       salonName,
        slug,
        timezone,
        themeTokens: { accent: "#ff5a1f", typography: "jakarta-serif", density: "regular", mode: "light" },
        businessHours: {
          monday:    [{ opens: "09:00", closes: "18:00" }],
          tuesday:   [{ opens: "09:00", closes: "18:00" }],
          wednesday: [{ opens: "09:00", closes: "18:00" }],
          thursday:  [{ opens: "09:00", closes: "18:00" }],
          friday:    [{ opens: "09:00", closes: "18:00" }],
          saturday:  [{ opens: "09:00", closes: "15:00" }],
          sunday:    [],
        },
        bookingRules: { defaultBufferBeforeMinutes: 0, defaultBufferAfterMinutes: 15, allowOverlap: false },
      },
    });
    await tx.membership.create({ data: { userId: u.id, tenantId: t.id, role: "OWNER" } });
    return [u, t];
  });

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId   = user.id;
  session.tenantId = tenant.id;
  session.role     = "OWNER";
  session.name     = user.name;
  session.email    = user.email;
  await session.save();

  return NextResponse.json({ ok: true, redirect: "/app/today" }, { status: 201 });
}
