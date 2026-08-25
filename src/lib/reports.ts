import { db } from "./db";

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Everything the owner dashboard shows, in one pass. "Today" means paid
 * orders stamped since local midnight — a late-night venue still books a
 * 01:00 sale to the calendar day it happened on.
 */
export async function getDailyReport() {
  const since = startOfToday();

  const [paidToday, openOrders, aromas, employees] = await Promise.all([
    db.order.findMany({
      where: { paymentStatus: "PAID", paidAt: { gte: since } },
      include: { items: true, employee: true },
    }),
    db.order.findMany({
      where: { paymentStatus: "UNPAID", status: { not: "CANCELLED" } },
      select: { id: true, totalCents: true },
    }),
    db.aroma.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    db.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const revenueCents = paidToday.reduce((t, o) => t + o.totalCents, 0);
  const taxCents = paidToday.reduce((t, o) => t + o.taxCents, 0);

  const byChannel = tally(paidToday, (o) => o.channel);
  const byPayment = tally(paidToday, (o) => o.paymentMethod ?? "UNKNOWN");

  // Sales per employee — the figure the owner asked to see.
  const staffSales = employees
    .map((e) => {
      const theirs = paidToday.filter((o) => o.employeeId === e.id);
      const total = theirs.reduce((t, o) => t + o.totalCents, 0);
      return {
        id: e.id,
        name: e.name,
        role: e.role,
        orders: theirs.length,
        revenueCents: total,
        avgOrderCents: theirs.length ? Math.round(total / theirs.length) : 0,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // Which flavours actually moved today, by bowls sold.
  const bowlsByAroma = new Map<string, number>();
  for (const order of paidToday) {
    for (const item of order.items) {
      if (!item.aromaName) continue;
      bowlsByAroma.set(
        item.aromaName,
        (bowlsByAroma.get(item.aromaName) ?? 0) + item.qty,
      );
    }
  }
  const topFlavours = [...bowlsByAroma.entries()]
    .map(([name, bowls]) => ({ name, bowls }))
    .sort((a, b) => b.bowls - a.bowls)
    .slice(0, 8);

  const stock = aromas.map((a) => ({
    id: a.id,
    name: a.name,
    brand: a.brand,
    profile: a.profile,
    stockGrams: a.stockGrams,
    lowStockGrams: a.lowStockGrams,
    // A standard bowl is 20g; below that it can't be packed at all.
    status:
      a.stockGrams < 20
        ? ("OUT" as const)
        : a.stockGrams <= a.lowStockGrams
          ? ("LOW" as const)
          : ("OK" as const),
  }));

  return {
    revenueCents,
    taxCents,
    orderCount: paidToday.length,
    avgOrderCents: paidToday.length
      ? Math.round(revenueCents / paidToday.length)
      : 0,
    openTabs: openOrders.length,
    openTabsCents: openOrders.reduce((t, o) => t + o.totalCents, 0),
    byChannel,
    byPayment,
    staffSales,
    topFlavours,
    stock,
    lowCount: stock.filter((s) => s.status !== "OK").length,
  };
}

/** Paid revenue per day for the last `days` days, oldest first. */
export async function getRevenueTrend(days = 7) {
  const since = daysAgo(days - 1);
  const orders = await db.order.findMany({
    where: { paymentStatus: "PAID", paidAt: { gte: since } },
    select: { paidAt: true, totalCents: true },
  });

  const buckets: Array<{ label: string; date: Date; cents: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    buckets.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      date: d,
      cents: 0,
    });
  }

  for (const o of orders) {
    if (!o.paidAt) continue;
    const day = new Date(o.paidAt);
    day.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.date.getTime() === day.getTime());
    if (bucket) bucket.cents += o.totalCents;
  }

  return buckets.map((b) => ({ label: b.label, cents: b.cents }));
}

function tally<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, { count: number; cents: number }>();
  for (const row of rows) {
    const k = key(row);
    const entry = map.get(k) ?? { count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += (row as { totalCents: number }).totalCents;
    map.set(k, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cents - a.cents);
}
