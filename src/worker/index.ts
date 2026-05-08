import { Worker, Queue } from "bullmq";
import { createHash, createHmac } from "crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const connection = { url: process.env.REDIS_URL ?? "redis://localhost:6379" };

export const webhookQueue = new Queue("webhooks", { connection: { host: "localhost", port: 6379 } });

const RETRY_DELAYS_MS = [
  60_000,          // 1 min
  300_000,         // 5 min
  900_000,         // 15 min
  3_600_000,       // 1 hr
  14_400_000,      // 4 hr
  86_400_000,      // 24 hr
];

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmacSignature(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

const webhookWorker = new Worker(
  "webhooks",
  async (job) => {
    const { deliveryId } = job.data as { deliveryId: string };

    const delivery = await db.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });

    if (!delivery || !delivery.endpoint.active) return;

    const payload = JSON.stringify(delivery.payload);

    // We need the raw signing secret — not stored. Use the hash to verify only.
    // For outbound signing: store a separate plaintext secret in a future migration.
    // For now, skip HMAC on delivery (TODO: store plaintext signing secret).
    const sig = "sha256=placeholder";

    const startedAt = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;

    try {
      const res = await fetch(delivery.endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Glasshound-Signature": sig,
          "X-Glasshound-Event": delivery.event,
          "X-Glasshound-Delivery": delivery.id,
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      responseStatus = res.status;
      responseBody = await res.text().then(t => t.slice(0, 1000));

      if (res.ok) {
        await db.webhookDelivery.update({
          where: { id: deliveryId },
          data: { status: "SUCCESS", attempts: { increment: 1 }, responseStatus, responseBody },
        });
        return;
      }
    } catch (err) {
      responseBody = err instanceof Error ? err.message : "Unknown error";
    }

    const attempts = delivery.attempts + 1;
    const delay = RETRY_DELAYS_MS[attempts] ?? null;

    await db.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: delay ? "RETRYING" : "FAILED",
        attempts,
        responseStatus,
        responseBody,
        nextAttemptAt: delay ? new Date(Date.now() + delay) : null,
      },
    });

    if (delay) {
      await job.moveToDelayed(Date.now() + delay);
    }
  },
  { connection: { host: "localhost", port: 6379 }, concurrency: 5 },
);

const rebookingWorker = new Worker(
  "rebooking-check",
  async () => {
    const now = Date.now();
    const animals = await db.animal.findMany({
      where: { preferredCadenceDays: { not: null }, lastVisitAt: { not: null } },
      include: { tenant: { include: { webhookEndpoints: { where: { active: true, events: { has: "rebooking.due" } } } } } },
    });

    for (const animal of animals) {
      if (!animal.lastVisitAt || !animal.preferredCadenceDays) continue;
      const daysSince = Math.floor((now - animal.lastVisitAt.getTime()) / 86_400_000);
      if (daysSince < animal.preferredCadenceDays) continue;

      for (const endpoint of animal.tenant.webhookEndpoints) {
        await db.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event: "rebooking.due",
            payload: {
              id: `evt_${Date.now()}`,
              event: "rebooking.due",
              tenantId: animal.tenantId,
              timestamp: new Date().toISOString(),
              data: {
                animal: { id: animal.id, name: animal.name, breed: animal.breed, daysSinceLastVisit: daysSince, preferredCadenceDays: animal.preferredCadenceDays },
              },
            },
            status: "PENDING",
          },
        });
      }
    }
  },
  { connection: { host: "localhost", port: 6379 } },
);

async function main() {
  console.log("Glasshound worker started. Listening for webhook and rebooking jobs.");

  process.on("SIGTERM", async () => {
    await webhookWorker.close();
    await rebookingWorker.close();
    await db.$disconnect();
    process.exit(0);
  });
}

void main();
