"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";

export type OpenTab = {
  id: number;
  channel: string;
  tableLabel: string | null;
  customerName: string | null;
  note: string | null;
  totalCents: number;
  openedAt: string;
  employeeName: string | null;
  items: Array<{ id: string; name: string; aromaName: string | null; qty: number }>;
};

const CHANNEL_LABEL: Record<string, string> = {
  DINE_IN: "Till",
  QR: "Guest QR",
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

export function OpenTabs({
  tabs,
  currency,
}: {
  tabs: OpenTab[];
  currency: string;
}) {
  if (tabs.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-6" aria-hidden="true" />}
        title="No open tabs"
        hint="Everything is settled. New table orders and guest QR orders land here."
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {tabs.map((tab) => (
        <li key={tab.id}>
          <TabCard tab={tab} currency={currency} />
        </li>
      ))}
    </ul>
  );
}

function TabCard({ tab, currency }: { tab: OpenTab; currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"CASH" | "CARD" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function settle(method: "CASH" | "CARD") {
    setBusy(method);
    setError(null);
    try {
      const res = await fetch(`/api/pos/orders/${tab.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not settle that tab.");
        setBusy(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network problem — try again.");
      setBusy(null);
    }
  }

  return (
    <Card className="h-full">
      <CardBody className="flex h-full flex-col pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">#{tab.id}</Badge>
          {tab.tableLabel ? <Badge tone="neutral">{tab.tableLabel}</Badge> : null}
          <Badge tone="neutral">{CHANNEL_LABEL[tab.channel] ?? tab.channel}</Badge>
          <span className="ml-auto text-xs tabular-nums text-ink-faint">
            {tab.openedAt}
          </span>
        </div>

        {tab.customerName ? (
          <p className="mt-3 text-sm text-ink text-balance-safe">
            {tab.customerName}
          </p>
        ) : null}

        <ul className="mt-3 space-y-1 text-sm">
          {tab.items.map((i) => (
            <li key={i.id} className="text-ink-muted text-balance-safe">
              {i.qty} × {i.name}
              {i.aromaName ? (
                <span className="text-gold-soft"> · {i.aromaName}</span>
              ) : null}
            </li>
          ))}
        </ul>

        {tab.note ? (
          <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-muted text-balance-safe">
            {tab.note}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-sm text-ink-muted">Total</span>
            <span className="font-display text-lg font-semibold tabular-nums text-gold">
              {formatMoney(tab.totalCents, currency)}
            </span>
          </div>

          {error ? (
            <p role="alert" className="mb-2 text-xs text-bad">
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => settle("CASH")}
              disabled={busy !== null}
            >
              {busy === "CASH" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Banknote aria-hidden="true" />
              )}
              Cash
            </Button>
            <Button onClick={() => settle("CARD")} disabled={busy !== null}>
              {busy === "CARD" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard aria-hidden="true" />
              )}
              Card
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
