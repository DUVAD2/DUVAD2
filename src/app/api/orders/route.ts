import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrder, markOrderPaid, OrderError, type OrderChannel } from "@/lib/orders";
import { baseUrl, getStripe, isStripeConfigured } from "@/lib/stripe";

const GUEST_CHANNELS: OrderChannel[] = ["QR", "PICKUP", "DELIVERY"];

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const channel = payload.channel as OrderChannel;

  // This endpoint is public, so it only accepts the guest-facing channels.
  // Staff sales go through the POS, which attributes them to an employee.
  if (!GUEST_CHANNELS.includes(channel)) {
    return NextResponse.json(
      { error: "Unsupported order channel." },
      { status: 400 },
    );
  }

  const payAtTable = channel === "QR" && payload.payment === "AT_TABLE";

  try {
    const { order, settings } = await createOrder({
      channel,
      lines: Array.isArray(payload.items) ? (payload.items as never[]) : [],
      tableCode: (payload.tableCode as string) ?? null,
      customerName: (payload.customerName as string) ?? null,
      customerPhone: (payload.customerPhone as string) ?? null,
      address: (payload.address as string) ?? null,
      note: (payload.note as string) ?? null,
      paymentMethod: payAtTable ? null : "ONLINE",
      // Card orders are only marked paid once payment actually clears.
      markPaid: false,
    });

    if (payAtTable) {
      return NextResponse.json({
        orderId: order.id,
        redirectTo: `/orders/${order.id}`,
      });
    }

    if (isStripeConfigured()) {
      const items = await db.orderItem.findMany({
        where: { orderId: order.id },
      });
      const stripe = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: [
          ...items.map((i) => ({
            quantity: i.qty,
            price_data: {
              currency: settings.currency.toLowerCase(),
              unit_amount: i.unitCents,
              product_data: {
                name: i.aromaName ? `${i.name} — ${i.aromaName}` : i.name,
              },
            },
          })),
          ...(order.deliveryCents > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: settings.currency.toLowerCase(),
                    unit_amount: order.deliveryCents,
                    product_data: { name: "Delivery" },
                  },
                },
              ]
            : []),
        ],
        success_url: `${baseUrl()}/orders/${order.id}?paid=1`,
        cancel_url: `${baseUrl()}/orders/${order.id}?cancelled=1`,
        metadata: { orderId: String(order.id) },
      });

      await db.order.update({
        where: { id: order.id },
        data: { stripeSessionId: stripe.id },
      });

      return NextResponse.json({ orderId: order.id, checkoutUrl: stripe.url });
    }

    // No Stripe keys configured — settle it as a demo payment so the flow
    // remains testable. The confirmation page says so explicitly.
    await markOrderPaid(order.id, "ONLINE");
    return NextResponse.json({
      orderId: order.id,
      redirectTo: `/orders/${order.id}?demo=1`,
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Failed to create order", err);
    return NextResponse.json(
      { error: "Could not place that order. Please try again." },
      { status: 500 },
    );
  }
}
