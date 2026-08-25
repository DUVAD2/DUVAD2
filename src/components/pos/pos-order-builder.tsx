"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Input, Textarea } from "@/components/ui/primitives";
import { formatMoney, totalsFor } from "@/lib/money";
import { cn } from "@/lib/utils";
import type {
  MenuCategory,
  MenuProduct,
  OrderAroma,
} from "@/components/order-flow";

export type PosTable = { id: string; code: string; label: string };

type Line = {
  key: string;
  productId: string;
  name: string;
  unitCents: number;
  qty: number;
  aromaId?: string;
  aromaName?: string;
};

export function PosOrderBuilder({
  categories,
  aromas,
  tables,
  currency,
  taxRateBp,
}: {
  categories: MenuCategory[];
  aromas: OrderAroma[];
  tables: PosTable[];
  currency: string;
  taxRateBp: number;
}) {
  const router = useRouter();
  const [tableCode, setTableCode] = useState<string>(tables[0]?.code ?? "");
  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [pendingShisha, setPendingShisha] = useState<MenuProduct | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(
    () => totalsFor(lines, taxRateBp, 0),
    [lines, taxRateBp],
  );

  const shown = categories.find((c) => c.id === activeCat) ?? categories[0];

  function add(product: MenuProduct, aroma?: OrderAroma) {
    const key = aroma ? `${product.id}:${aroma.id}` : product.id;
    setError(null);
    setLines((prev) => {
      const found = prev.find((l) => l.key === key);
      if (found) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          unitCents: product.priceCents,
          qty: 1,
          aromaId: aroma?.id,
          aromaName: aroma?.name,
        },
      ];
    });
  }

  function changeQty(key: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  }

  async function openTab() {
    if (lines.length === 0) {
      setError("Add something first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableCode,
          note,
          items: lines.map((l) => ({
            productId: l.productId,
            aromaId: l.aromaId ?? null,
            qty: l.qty,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not open that tab.");
        setBusy(false);
        return;
      }
      router.push("/pos");
      router.refresh();
    } catch {
      setError("Network problem — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div>
        {/* Table picker — big targets, this is used standing up. */}
        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium text-ink">Table</legend>
          <div className="flex flex-wrap gap-2">
            {tables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTableCode(t.code)}
                aria-pressed={tableCode === t.code}
                className={cn(
                  "min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors duration-200 cursor-pointer",
                  tableCode === t.code
                    ? "border-gold bg-gold text-ink-strong"
                    : "border-line-strong bg-surface-2 text-ink-muted hover:border-gold-dim hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div
          role="tablist"
          aria-label="Menu sections"
          className="mb-4 flex flex-wrap gap-2 border-b border-line pb-3"
        >
          {categories.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "min-h-11 rounded-lg px-4 text-sm font-medium transition-colors duration-200 cursor-pointer",
                activeCat === c.id
                  ? "bg-surface-3 text-ink"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {shown?.products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (p.isShisha ? setPendingShisha(p) : add(p))}
              className="flex min-h-20 cursor-pointer flex-col justify-between rounded-card border border-line bg-surface-2/60 p-3 text-left transition-colors duration-200 hover:border-gold hover:bg-gold/10"
            >
              <span className="text-sm font-medium text-ink text-balance-safe">
                {p.name}
              </span>
              <span className="mt-2 flex items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold tabular-nums text-gold">
                  {formatMoney(p.priceCents, currency)}
                </span>
                {p.isShisha ? (
                  <Badge tone="gold" className="shrink-0">
                    Flavour
                  </Badge>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Running tab ---------- */}
      <aside className="lg:sticky lg:top-20">
        <div className="rounded-card border border-line bg-surface-2/80 p-5">
          <h2 className="font-display text-lg font-semibold text-ink">
            {tables.find((t) => t.code === tableCode)?.label ?? "New tab"}
          </h2>

          {lines.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">Tap items to add them.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {lines.map((l) => (
                <li key={l.key} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink text-balance-safe">
                      {l.name}
                    </p>
                    {l.aromaName ? (
                      <p className="text-xs text-gold-soft text-balance-safe">
                        {l.aromaName}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => changeQty(l.key, -1)}
                      aria-label={`Remove one ${l.name}`}
                    >
                      <Minus aria-hidden="true" />
                    </Button>
                    <span className="w-5 text-center text-sm tabular-nums text-ink">
                      {l.qty}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => changeQty(l.key, 1)}
                      aria-label={`Add one more ${l.name}`}
                    >
                      <Plus aria-hidden="true" />
                    </Button>
                  </div>
                  <span className="w-14 shrink-0 text-right text-sm tabular-nums text-ink">
                    {formatMoney(l.unitCents * l.qty, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-display text-base font-semibold text-ink">
              Total
            </span>
            <span className="font-display text-xl font-semibold tabular-nums text-gold">
              {formatMoney(totals.totalCents, currency)}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <label htmlFor="pos-note" className="block text-sm font-medium text-ink">
              Note for the bar
            </label>
            <Textarea
              id="pos-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Extra coals, no ice…"
            />

            {error ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              onClick={openTab}
              disabled={busy || lines.length === 0 || !tableCode}
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Opening…
                </>
              ) : (
                "Open tab"
              )}
            </Button>
            <p className="text-xs text-ink-faint">
              The tab stays open until you settle it from the tabs screen.
            </p>
          </div>
        </div>
      </aside>

      <PosAromaPicker
        product={pendingShisha}
        aromas={aromas}
        onClose={() => setPendingShisha(null)}
        onPick={(aroma) => {
          if (pendingShisha) add(pendingShisha, aroma);
          setPendingShisha(null);
        }}
      />
    </div>
  );
}

function PosAromaPicker({
  product,
  aromas,
  onClose,
  onPick,
}: {
  product: MenuProduct | null;
  aromas: OrderAroma[];
  onClose: () => void;
  onPick: (a: OrderAroma) => void;
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return aromas;
    return aromas.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.profile.toLowerCase().includes(q),
    );
  }, [aromas, query]);

  return (
    <Dialog.Root
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line-strong bg-surface-2">
          <div className="flex items-start justify-between gap-4 border-b border-line p-4">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-ink">
                Flavour for {product?.name}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-ink-muted">
                Greyed-out flavours are out of stock.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button size="icon" variant="ghost" aria-label="Close">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="border-b border-line p-3">
            <label htmlFor="pos-aroma-search" className="sr-only">
              Search flavours
            </label>
            <Input
              id="pos-aroma-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search flavour…"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {shown.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={!a.available}
                  onClick={() => onPick(a)}
                  className={cn(
                    "min-h-14 rounded-lg border px-3 py-2 text-left transition-colors duration-200",
                    a.available
                      ? "cursor-pointer border-line-strong bg-surface hover:border-gold hover:bg-gold/10"
                      : "cursor-not-allowed border-line bg-surface/40 opacity-50",
                  )}
                >
                  <span className="block text-sm font-medium text-ink text-balance-safe">
                    {a.name}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {a.brand} · {a.profile}
                    {a.available ? "" : " · out of stock"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
