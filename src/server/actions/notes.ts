"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTenantCtx } from "@/lib/tenant";
import { db } from "@/server/db";

const CreateSchema = z.object({
  animalId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  appointmentId: z.string().cuid().optional(),
  tag: z.string().min(1).max(40).default("general"),
  body: z.string().min(1).max(5000),
  visibility: z.enum(["INTERNAL", "CLIENT_VISIBLE"]).default("INTERNAL"),
});

export async function createNote(raw: unknown) {
  const ctx = await requireTenantCtx();
  const data = CreateSchema.parse(raw);

  await db.groomingNote.create({
    data: {
      tenantId: ctx.tenantId,
      authorUserId: ctx.userId,
      ...data,
    },
  });

  if (data.animalId) revalidatePath(`/app/animals/${data.animalId}`);
  if (data.clientId) revalidatePath(`/app/clients/${data.clientId}`);
  revalidatePath("/app/notes");
}

export async function deleteNote(id: string) {
  const ctx = await requireTenantCtx();
  await db.groomingNote.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  revalidatePath("/app/notes");
}
