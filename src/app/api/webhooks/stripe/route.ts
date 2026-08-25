import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/**
 * Payment is only trusted from a signed webhook — never from the browser
 * landing back on the success URL, which anyone can visit directly.
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 501 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 501 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const raw = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("Stripe signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = Number(session.metadata?.orderId);
    if (Number.isFinite(orderId)) {
      await markOrderPaid(orderId, "ONLINE");
    }
  }

  return NextResponse.json({ received: true });
}
