"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";

const CreateSchema = z.object({
  clientId: z.string().min(1),
  animalId: z.string().min(1),
  serviceId: z.string().min(1),
  startsAt: z.coerce.date(),
  durationMinutes: z.number().int().positive().optional(),
  force: z.boolean().optional().default(false),
});

const UpdateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  reason: z.string().optional(),
});

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export type ConflictInfo = {
  animalName: string;
  serviceName: string;
  startsAt: string;
};

export async function createAppointment(raw: unknown): Promise<{ ok: true } | { ok: false; conflicts: ConflictInfo[] }> {
  const ctx = await requireTenantCtx();
  const data = CreateSchema.parse(raw);

  const service = await db.service.findFirstOrThrow({
    where: { id: data.serviceId, tenantId: ctx.tenantId, active: true },
  });

  const endsAt = new Date(
    data.startsAt.getTime() + 
    (data.durationMinutes ?? service.durationMinutes) * 60_000
  );

  // Effective blocked window including this service's buffers
  const effectiveStart = new Date(data.startsAt.getTime() - service.bufferBeforeMinutes * 60_000);
  const effectiveEnd = new Date(endsAt.getTime() + service.bufferAfterMinutes * 60_000);

  if (!data.force) {
    // Check for any appointments that overlap with our effective window
    const conflicts = await db.appointment.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        AND: [
          { startsAt: { lt: effectiveEnd } },
          { endsAt: { gt: effectiveStart } },
        ],
      },
      select: {
        startsAt: true,
        animal: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    if (conflicts.length > 0) {
      return {
        ok: false,
        conflicts: conflicts.map((c) => ({
          animalName: c.animal.name,
          serviceName: c.service.name,
          startsAt: fmtTime(c.startsAt),
        })),
      };
    }
  }

  await db.appointment.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: data.clientId,
      animalId: data.animalId,
      serviceId: data.serviceId,
      startsAt: data.startsAt,
      endsAt,
      priceCents: service.priceCents,
      source: "DASHBOARD",
      status: "CONFIRMED",
    },
  });

  revalidatePath("/app/today");
  revalidatePath("/app/calendar");
  revalidatePath("/app/bookings");
  await writeAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, source: "DASHBOARD", action: "appointment.created", entityType: "appointment" });

  return { ok: true };
}

export async function updateAppointmentStatus(raw: unknown) {
  const ctx = await requireTenantCtx();
  const { id, status, reason } = UpdateStatusSchema.parse(raw);

  const appt = await db.appointment.findFirstOrThrow({
    where: { id, tenantId: ctx.tenantId },
  });

  await db.appointment.update({
    where: { id: appt.id },
    data: {
      status,
      ...(status === "CANCELLED" ? { cancellationReason: reason } : {}),
    },
  });

  if (status === "COMPLETED") {
    await db.animal.update({
      where: { id: appt.animalId },
      data: { lastVisitAt: appt.startsAt },
    });
  }

  revalidatePath("/app/today");
  revalidatePath("/app/calendar");
  revalidatePath("/app/bookings");
  await writeAudit({ tenantId: ctx.tenantId, actorUserId: ctx.userId, source: "DASHBOARD", action: `appointment.${status.toLowerCase()}`, entityType: "appointment", entityId: id, metadata: { status } });
}
