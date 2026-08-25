import { NextResponse } from "next/server";
import { createOrder, OrderError } from "@/lib/orders";
import { getPosUser } from "@/lib/session";

/** Staff-only: creates a dine-in order attributed to the signed-in employee. */
export async function POST(req: Request) {
  const user = await getPosUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const { order } = await createOrder({
      channel: "DINE_IN",
      lines: Array.isArray(body.items) ? (body.items as never[]) : [],
      tableCode: (body.tableCode as string) ?? null,
      note: (body.note as string) ?? null,
      // The employee is taken from the session, never from the request body.
      employeeId: user.id,
      paymentMethod: null,
      markPaid: false,
    });

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POS order failed", err);
    return NextResponse.json(
      { error: "Could not open that tab." },
      { status: 500 },
    );
  }
}
