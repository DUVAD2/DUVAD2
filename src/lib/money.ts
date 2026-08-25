/**
 * All money in this app is integer minor units (cents). Formatting happens
 * only at the edges — never do arithmetic on formatted strings.
 */

export function formatMoney(cents: number, currency = "EUR", locale = "de-DE") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export type CartLine = {
  unitCents: number;
  qty: number;
};

/**
 * Tax here is treated as *included* in menu prices (the European VAT
 * convention this venue's currency default assumes), so the tax figure is
 * extracted from the gross total rather than added on top. Switching to
 * tax-on-top means changing this one function.
 */
export function totalsFor(
  lines: CartLine[],
  taxRateBp: number,
  deliveryCents = 0,
) {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitCents * line.qty,
    0,
  );
  const totalCents = subtotalCents + deliveryCents;
  const taxCents = Math.round(
    (totalCents * taxRateBp) / (10_000 + taxRateBp),
  );
  return { subtotalCents, deliveryCents, taxCents, totalCents };
}
