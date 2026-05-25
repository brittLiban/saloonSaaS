import Stripe from "stripe";

// Stripe is optional — app runs without it, features degrade gracefully
const key = process.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = key
  ? new Stripe(key, { apiVersion: "2026-04-22.dahlia" })
  : null;

/**
 * Returns the Stripe client, throwing if not configured.
 * Call this in server actions that require Stripe.
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment variables.",
    );
  }
  return stripe;
}
