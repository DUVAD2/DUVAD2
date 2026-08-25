import { db } from "./db";
import { getSettings } from "./settings";
import { totalsFor } from "./money";

export type OrderChannel = "DINE_IN" | "QR" | "PICKUP" | "DELIVERY";

/** What the client is allowed to ask for. Prices are never taken from here. */
export type RequestedLine = {
  productId: string;
  aromaId?: string | null;
  qty: number;
};

export type CreateOrderInput = {
  channel: OrderChannel;
  lines: RequestedLine[];
  tableCode?: string | null;
  employeeId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  note?: string | null;
  /** ONLINE goes to a card flow; CASH/CARD are settled in person by staff. */
  paymentMethod: "ONLINE" | "CASH" | "CARD" | null;
  /** Mark paid immediately (POS cash/card, or the demo online flow). */
  markPaid: boolean;
};

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/**
 * The single path every order takes, whatever the channel. Prices, tax and
 * stock are all resolved server-side so a tampered client payload cannot
 * change what is charged or what is deducted from inventory.
 */
export async function createOrder(input: CreateOrderInput) {
  const settings = await getSettings();

  const cleanLines = input.lines
    .map((l) => ({
      productId: String(l.productId),
      aromaId: l.aromaId ? String(l.aromaId) : null,
      qty: Math.floor(Number(l.qty)),
    }))
    .filter((l) => l.productId && Number.isFinite(l.qty) && l.qty > 0);

  if (cleanLines.length === 0) {
    throw new OrderError("Your order is empty.");
  }
  if (cleanLines.some((l) => l.qty > 50)) {
    throw new OrderError("That quantity looks wrong — please check your order.");
  }

  const products = await db.product.findMany({
    where: { id: { in: cleanLines.map((l) => l.productId) }, active: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const aromaIds = cleanLines
    .map((l) => l.aromaId)
    .filter((id): id is string => Boolean(id));
  const aromas = aromaIds.length
    ? await db.aroma.findMany({ where: { id: { in: aromaIds }, active: true } })
    : [];
  const aromaById = new Map(aromas.map((a) => [a.id, a]));

  // Resolve every line against the catalogue before touching the database.
  const resolved = cleanLines.map((l) => {
    const product = productById.get(l.productId);
    if (!product) {
      throw new OrderError("One of those items is no longer on the menu.");
    }

    const aroma = l.aromaId ? aromaById.get(l.aromaId) : null;
    if (product.isShisha && !aroma) {
      throw new OrderError(`Choose a flavour for ${product.name}.`);
    }
    if (!product.isShisha && aroma) {
      throw new OrderError(`${product.name} does not take a flavour.`);
    }

    return {
      product,
      aroma,
      qty: l.qty,
      unitCents: product.priceCents,
      gramsNeeded: aroma ? product.bowlGrams * l.qty : 0,
    };
  });

  // A flavour can appear on several lines; check total demand, not per line.
  const demandByAroma = new Map<string, number>();
  for (const r of resolved) {
    if (r.aroma) {
      demandByAroma.set(
        r.aroma.id,
        (demandByAroma.get(r.aroma.id) ?? 0) + r.gramsNeeded,
      );
    }
  }
  for (const [aromaId, grams] of demandByAroma) {
    const aroma = aromaById.get(aromaId)!;
    if (aroma.stockGrams < grams) {
      throw new OrderError(
        `${aroma.name} is out of stock — please pick another flavour.`,
      );
    }
  }

  let tableId: string | null = null;
  if (input.tableCode) {
    const table = await db.table.findUnique({
      where: { code: input.tableCode },
    });
    if (!table || !table.active) {
      throw new OrderError("That table code is not in use.", 404);
    }
    tableId = table.id;
  }

  if (input.channel === "DELIVERY") {
    if (!input.address?.trim()) {
      throw new OrderError("A delivery address is required.");
    }
    if (!input.customerPhone?.trim()) {
      throw new OrderError("A phone number is required for delivery.");
    }
  }

  const deliveryCents =
    input.channel === "DELIVERY" ? settings.deliveryFeeCents : 0;
  const totals = totalsFor(
    resolved.map((r) => ({ unitCents: r.unitCents, qty: r.qty })),
    settings.taxRateBp,
    deliveryCents,
  );

  if (
    input.channel === "DELIVERY" &&
    totals.subtotalCents < settings.minDeliveryCents
  ) {
    throw new OrderError(
      `Delivery orders start at ${(settings.minDeliveryCents / 100).toFixed(2)} ${settings.currency}.`,
    );
  }

  const now = new Date();

  // Order creation and the stock it consumes must land together or not at all.
  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        channel: input.channel,
        status: input.markPaid ? "PAID" : "OPEN",
        paymentStatus: input.markPaid ? "PAID" : "UNPAID",
        paymentMethod: input.paymentMethod,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        deliveryCents: totals.deliveryCents,
        totalCents: totals.totalCents,
        tableId,
        employeeId: input.employeeId ?? null,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        address: input.address?.trim() || null,
        note: input.note?.trim() || null,
        paidAt: input.markPaid ? now : null,
        items: {
          create: resolved.map((r) => ({
            productId: r.product.id,
            aromaId: r.aroma?.id ?? null,
            name: r.product.name,
            aromaName: r.aroma?.name ?? null,
            unitCents: r.unitCents,
            qty: r.qty,
            lineCents: r.unitCents * r.qty,
          })),
        },
      },
    });

    // Tobacco is consumed when the bowl is packed, so stock moves at order
    // time regardless of whether the guest has settled the bill yet.
    for (const [aromaId, grams] of demandByAroma) {
      const updated = await tx.aroma.updateMany({
        where: { id: aromaId, stockGrams: { gte: grams } },
        data: { stockGrams: { decrement: grams } },
      });
      // Guards against two tills selling the last of a flavour at once.
      if (updated.count === 0) {
        const aroma = aromaById.get(aromaId)!;
        throw new OrderError(
          `${aroma.name} just ran out — please pick another flavour.`,
        );
      }
      await tx.stockLog.create({
        data: {
          aromaId,
          deltaGrams: -grams,
          reason: "SALE",
          note: `Order #${created.id}`,
        },
      });
    }

    return created;
  });

  return { order, settings, totals };
}

/** Marks an order settled and stamps when. Used by POS, Stripe and the demo flow. */
export async function markOrderPaid(
  orderId: number,
  paymentMethod: "ONLINE" | "CASH" | "CARD",
) {
  return db.order.update({
    where: { id: orderId },
    data: {
      status: "PAID",
      paymentStatus: "PAID",
      paymentMethod,
      paidAt: new Date(),
    },
  });
}
