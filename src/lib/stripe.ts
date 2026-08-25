import Stripe from "stripe";

/**
 * Stripe is optional. With no secret key configured the app falls back to a
 * clearly-labelled demo payment so the whole ordering flow still works end to
 * end; drop real keys into .env to switch on live card payments.
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  client ??= new Stripe(key);
  return client;
}

export function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
