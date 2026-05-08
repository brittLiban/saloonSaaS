"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";
import { writeAudit } from "@/lib/audit";

const CreateSchema = z.object({
  clientId: z.string().cuid(),
  animalId: z.string().cuid(),
  serviceId: z.string().cuid(),
  startsAt: z.coerce.date(),
});

const UpdateStatusSchema = z.object({
  id: z.string().cuid(),
  status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "READY", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  reason: z.string().optional(),
});

export async function createAppointment(raw: unknown) {
  const ctx = await requireTenantCtx();
  const data = CreateSchema.parse(raw);

  const service = await db.service.findFirstOrThrow({
    where: { id: data.serviceId, tenantId: ctx.tenantId, active: true },
  });

  const endsAt = new Date(data.startsAt.getTime() + service.durationMinutes * 60_000);

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
      ...(status === "COMPLETED" ? {} : {}),
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
