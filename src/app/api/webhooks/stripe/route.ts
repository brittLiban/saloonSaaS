import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/server/db";
import { requireStripe } from "@/lib/stripe";

// Disable Next.js body parsing — Stripe needs the raw body for signature verification
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = requireStripe();

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Sync invoice status — primary path goes through server action,
        // but webhook is the fallback for off-session payments
        await db.invoice.updateMany({
          where: { stripePaymentIntentId: pi.id, status: { not: "PAID" } },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });
        break;
      }

      case "payment_intent.payment_failed": {
        // Logged for observability — UI surfaces errors synchronously via server action
        const pi = event.data.object as Stripe.PaymentIntent;
        console.warn(
          `[stripe] payment_intent.payment_failed id=${pi.id} error=${pi.last_payment_error?.message}`,
        );
        break;
      }

      case "setup_intent.succeeded": {
        // Card saved successfully — SavedCard row is written in saveCard() server action
        break;
      }

      default:
        // Unhandled event type — return 200 so Stripe stops retrying
        break;
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
