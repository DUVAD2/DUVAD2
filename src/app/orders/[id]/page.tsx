import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Info } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const CHANNEL_COPY: Record<string, string> = {
  QR: "Table order",
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
  DINE_IN: "Table order",
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string; cancelled?: string }>;
}) {
  const { id } = await params;
  const { demo, cancelled } = await searchParams;

  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true },
    }),
    getSettings(),
  ]);

  if (!order) notFound();

  const paid = order.paymentStatus === "PAID";

  return (
    <div className="min-h-dvh">
      <SiteHeader venueName={settings.venueName} />
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className="flex items-start gap-3">
          {paid ? (
            <CheckCircle2 className="mt-1 size-6 shrink-0 text-ok" aria-hidden="true" />
          ) : (
            <Clock className="mt-1 size-6 shrink-0 text-warn" aria-hidden="true" />
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {paid ? "Order confirmed" : "Sent to the bar"}
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              {paid
                ? "We're packing it now."
                : "Your order is with the staff. Settle up before you leave."}
            </p>
          </div>
        </div>

        {cancelled ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn"
          >
            Payment was cancelled. This order is still open — talk to staff or
            try paying again.
          </p>
        ) : null}

        {demo ? (
          <p className="mt-6 flex items-start gap-2 rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
            <span>
              Marked paid by the built-in demo flow — no card was charged. Add
              your Stripe keys to <code className="text-gold-soft">.env</code> to
              take real payments.
            </span>
          </p>
        ) : null}

        <Card className="mt-8">
          <CardBody className="pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">Order #{order.id}</Badge>
              <Badge tone="neutral">
                {CHANNEL_COPY[order.channel] ?? order.channel}
              </Badge>
              {order.table ? (
                <Badge tone="neutral">{order.table.label}</Badge>
              ) : null}
              <Badge tone={paid ? "ok" : "warn"}>
                {paid ? "Paid" : "Unpaid"}
              </Badge>
            </div>

            <ul className="mt-5 space-y-3 border-t border-line pt-4">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink text-balance-safe">
                      {i.qty} × {i.name}
                    </p>
                    {i.aromaName ? (
                      <p className="text-xs text-gold-soft">{i.aromaName}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-ink">
                    {formatMoney(i.lineCents, settings.currency)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums text-ink">
                  {formatMoney(order.subtotalCents, settings.currency)}
                </dd>
              </div>
              {order.deliveryCents > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Delivery</dt>
                  <dd className="tabular-nums text-ink">
                    {formatMoney(order.deliveryCents, settings.currency)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between text-ink-faint">
                <dt>Incl. VAT</dt>
                <dd className="tabular-nums">
                  {formatMoney(order.taxCents, settings.currency)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="font-display text-base font-semibold text-ink">
                  Total
                </dt>
                <dd className="font-display text-lg font-semibold tabular-nums text-gold">
                  {formatMoney(order.totalCents, settings.currency)}
                </dd>
              </div>
            </dl>

            {order.address ? (
              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted text-balance-safe">
                Delivering to {order.address}
              </p>
            ) : null}
            {order.note ? (
              <p className="mt-2 text-sm text-ink-muted text-balance-safe">
                Note: {order.note}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/">Back to the menu</Link>
          </Button>
          {order.table ? (
            <Button asChild>
              <Link href={`/t/${order.table.code}`}>Order another round</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/order">Order again</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
