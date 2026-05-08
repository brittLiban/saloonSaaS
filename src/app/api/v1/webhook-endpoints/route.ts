import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { resolveApiKey, apiError, requireScope } from "@/lib/api-auth";
import { db } from "@/server/db";

const VALID_EVENTS = [
  "appointment.created", "appointment.updated", "appointment.cancelled",
  "appointment.completed", "appointment.rescheduled",
  "rebooking.due",
];

const CreateSchema = z.object({
  url: z.string().url(),
  description: z.string().max(200).optional(),
  events: z.array(z.enum(VALID_EVENTS as [string, ...string[]])).min(1),
});

export async function GET(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "webhooks:read"); if (_se) return _se;

  const endpoints = await db.webhookEndpoint.findMany({
    where: { tenantId: auth.tenantId },
    select: { id: true, url: true, description: true, events: true, active: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: endpoints });
}

export async function POST(req: NextRequest) {
  const auth = await resolveApiKey(req);
  if (!auth) return apiError("Unauthorized", 401);
  const _se = requireScope(auth, "webhooks:write"); if (_se) return _se;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("Validation error", 422, parsed.error.flatten());

  const signingSecret = randomBytes(32).toString("hex");
  const signingSecretHash = createHash("sha256").update(signingSecret).digest("hex");

  const endpoint = await db.webhookEndpoint.create({
    data: {
      tenantId: auth.tenantId,
      url: parsed.data.url,
      description: parsed.data.description,
      events: parsed.data.events,
      signingSecretHash,
      active: true,
    },
    select: { id: true, url: true, description: true, events: true, active: true, createdAt: true },
  });

  // Return the plain-text signing secret once — it won't be shown again
  return NextResponse.json({
    data: endpoint,
    signingSecret: `whsec_${signingSecret}`,
    warning: "Save this signing secret — it will not be shown again.",
  }, { status: 201 });
}
