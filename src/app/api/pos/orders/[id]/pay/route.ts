import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { getPosUser } from "@/lib/session";

const METHODS = ["CASH", "CARD"] as const;

/** Settles an open tab at the till. Staff-only. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getPosUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) {
    return NextResponse.json({ error: "Unknown order." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { method?: string };
  const method = body.method as (typeof METHODS)[number];
  if (!METHODS.includes(method)) {
    return NextResponse.json({ error: "Choose cash or card." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }
  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "That tab is already settled." },
      { status: 409 },
    );
  }

  await markOrderPaid(orderId, method);

  // A guest QR order has no employee on it until someone settles it — credit
  // the sale to whoever took the money.
  if (!order.employeeId) {
    await db.order.update({
      where: { id: orderId },
      data: { employeeId: user.id },
    });
  }

  return NextResponse.json({ ok: true });
}
