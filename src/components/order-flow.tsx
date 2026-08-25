"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingBag, X, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Field, Input, Textarea } from "@/components/ui/primitives";
import { formatMoney, totalsFor } from "@/lib/money";
import { cn } from "@/lib/utils";

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  isShisha: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  blurb: string;
  products: MenuProduct[];
};

export type OrderAroma = {
  id: string;
  name: string;
  brand: string;
  profile: string;
  available: boolean;
};

type CartLine = {
  key: string;
  productId: string;
  name: string;
  unitCents: number;
  qty: number;
  aromaId?: string;
  aromaName?: string;
};

export type OrderFlowMode = "TABLE" | "ONLINE";

export function OrderFlow({
  mode,
  categories,
  aromas,
  currency,
  taxRateBp,
  deliveryFeeCents,
  minDeliveryCents,
  tableCode,
}: {
  mode: OrderFlowMode;
  categories: MenuCategory[];
  aromas: OrderAroma[];
  currency: string;
  taxRateBp: number;
  deliveryFeeCents: number;
  minDeliveryCents: number;
  tableCode?: string;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [pendingShisha, setPendingShisha] = useState<MenuProduct | null>(null);
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [payment, setPayment] = useState<"ONLINE" | "AT_TABLE">(
    mode === "TABLE" ? "AT_TABLE" : "ONLINE",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const deliveryCents =
    mode === "ONLINE" && fulfilment === "DELIVERY" ? deliveryFeeCents : 0;

  const totals = useMemo(
    () => totalsFor(lines, taxRateBp, deliveryCents),
    [lines, taxRateBp, deliveryCents],
  );

  function addLine(product: MenuProduct, aroma?: OrderAroma) {
    const key = aroma ? `${product.id}:${aroma.id}` : product.id;
    setError(null);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
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

  function onAdd(product: MenuProduct) {
    if (product.isShisha) {
      setPendingShisha(product);
      return;
    }
    addLine(product);
  }

  /** Clears a field's error as soon as the guest starts fixing it. */
  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (mode === "ONLINE") {
      if (!name.trim()) errs.name = "We need a name for the order.";
      if (!phone.trim()) errs.phone = "We need a number to reach you on.";
      if (fulfilment === "DELIVERY") {
        if (!address.trim()) errs.address = "Add the delivery address.";
        if (totals.subtotalCents < minDeliveryCents) {
          errs.address = `Delivery starts at ${formatMoney(minDeliveryCents, currency)}.`;
        }
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (lines.length === 0) {
      setError("Add something to your order first.");
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: mode === "TABLE" ? "QR" : fulfilment,
          tableCode,
          payment: mode === "TABLE" ? payment : "ONLINE",
          customerName: name,
          customerPhone: phone,
          address: fulfilment === "DELIVERY" ? address : null,
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
        setError(data.error ?? "Could not place that order.");
        setSubmitting(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      router.push(data.redirectTo);
    } catch {
      setError("Network problem — please try again.");
      setSubmitting(false);
    }
  }

  const belowDeliveryMin =
    mode === "ONLINE" &&
    fulfilment === "DELIVERY" &&
    totals.subtotalCents < minDeliveryCents;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
      {/* ---------- Menu ---------- */}
      <div className="space-y-10">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="font-display text-xl font-semibold text-gold-soft">
              {cat.name}
            </h2>
            {cat.blurb ? (
              <p className="mt-1 text-sm text-ink-muted">{cat.blurb}</p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {cat.products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-4 rounded-card border border-line bg-surface-2/50 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink text-balance-safe">
                      {p.name}
                    </p>
                    {p.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {p.description}
                      </p>
                    ) : null}
                    <p className="mt-2 font-display text-sm font-semibold tabular-nums text-gold">
                      {formatMoney(p.priceCents, currency)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAdd(p)}
                    className="shrink-0"
                  >
                    <Plus aria-hidden="true" />
                    {p.isShisha ? "Choose flavour" : "Add"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* ---------- Cart ---------- */}
      <aside className="lg:sticky lg:top-20">
        <div className="rounded-card border border-line bg-surface-2/80 p-5 backdrop-blur">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <ShoppingBag className="size-4 text-gold" aria-hidden="true" />
            Your order
          </h2>

          {lines.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">
              Nothing added yet. Pick something from the menu.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {lines.map((l) => (
                <li key={l.key} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink text-balance-safe">
                      {l.name}
                    </p>
                    {l.aromaName ? (
                      <p className="text-xs text-gold-soft text-balance-safe">
                        {l.aromaName}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs tabular-nums text-ink-faint">
                      {formatMoney(l.unitCents, currency)} each
                    </p>
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
                    <span className="w-6 text-center text-sm tabular-nums text-ink">
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
                  <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                    {formatMoney(l.unitCents * l.qty, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 ? (
            <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotalCents, currency)} />
              {deliveryCents > 0 ? (
                <Row label="Delivery" value={formatMoney(deliveryCents, currency)} />
              ) : null}
              <Row
                label={`Incl. VAT (${(taxRateBp / 100).toFixed(0)}%)`}
                value={formatMoney(totals.taxCents, currency)}
                muted
              />
              <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                <dt className="font-display text-base font-semibold text-ink">
                  Total
                </dt>
                <dd className="font-display text-lg font-semibold tabular-nums text-gold">
                  {formatMoney(totals.totalCents, currency)}
                </dd>
              </div>
            </dl>
          ) : null}

          {/* ---------- Checkout details ---------- */}
          <div className="mt-5 space-y-4 border-t border-line pt-5">
            {mode === "ONLINE" ? (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">
                    How do you want it?
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["PICKUP", "DELIVERY"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFulfilment(f)}
                        aria-pressed={fulfilment === f}
                        className={cn(
                          "min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors duration-200 cursor-pointer",
                          fulfilment === f
                            ? "border-gold bg-gold text-ink-strong"
                            : "border-line-strong bg-surface text-ink-muted hover:border-gold-dim hover:text-ink",
                        )}
                      >
                        {f === "PICKUP" ? "Pickup" : "Delivery"}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Field label="Name" htmlFor="name" error={fieldErrors.name}>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError("name");
                    }}
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.name)}
                  />
                </Field>

                <Field label="Phone" htmlFor="phone" error={fieldErrors.phone}>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError("phone");
                    }}
                    autoComplete="tel"
                    aria-invalid={Boolean(fieldErrors.phone)}
                  />
                </Field>

                {fulfilment === "DELIVERY" ? (
                  <Field
                    label="Delivery address"
                    htmlFor="address"
                    hint={`Minimum ${formatMoney(minDeliveryCents, currency)} · ${formatMoney(deliveryFeeCents, currency)} fee`}
                    error={fieldErrors.address}
                  >
                    <Textarea
                      id="address"
                      rows={2}
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        clearFieldError("address");
                      }}
                      autoComplete="street-address"
                      aria-invalid={Boolean(fieldErrors.address)}
                    />
                  </Field>
                ) : null}
              </>
            ) : (
              <>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink">
                    How would you like to pay?
                  </legend>
                  <div className="grid gap-2">
                    {(
                      [
                        { v: "AT_TABLE", label: "Pay at the table", hint: "Staff will settle up with you" },
                        { v: "ONLINE", label: "Pay now by card", hint: "Settle instantly from your phone" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setPayment(opt.v)}
                        aria-pressed={payment === opt.v}
                        className={cn(
                          "min-h-11 rounded-lg border px-3 py-2 text-left transition-colors duration-200 cursor-pointer",
                          payment === opt.v
                            ? "border-gold bg-gold/15"
                            : "border-line-strong bg-surface hover:border-gold-dim",
                        )}
                      >
                        <span className="block text-sm font-medium text-ink">
                          {opt.label}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {opt.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Field label="Name (optional)" htmlFor="name">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="So staff know whose tab it is"
                    autoComplete="name"
                  />
                </Field>
              </>
            )}

            <Field label="Anything else?" htmlFor="note">
              <Textarea
                id="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Allergies, extra coals, no ice…"
              />
            </Field>

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
              onClick={submit}
              disabled={submitting || lines.length === 0 || belowDeliveryMin}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Placing order…
                </>
              ) : mode === "TABLE" && payment === "AT_TABLE" ? (
                "Send to the bar"
              ) : (
                `Pay ${formatMoney(totals.totalCents, currency)}`
              )}
            </Button>
          </div>
        </div>
      </aside>

      <AromaPicker
        product={pendingShisha}
        aromas={aromas}
        onClose={() => setPendingShisha(null)}
        onPick={(aroma) => {
          if (pendingShisha) addLine(pendingShisha, aroma);
          setPendingShisha(null);
        }}
      />
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className={muted ? "text-ink-faint" : "text-ink-muted"}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          muted ? "text-ink-faint" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function AromaPicker({
  product,
  aromas,
  onClose,
  onPick,
}: {
  product: MenuProduct | null;
  aromas: OrderAroma[];
  onClose: () => void;
  onPick: (aroma: OrderAroma) => void;
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line-strong bg-surface-2 shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-ink">
                Pick a flavour
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-muted">
                For your {product?.name}. Sold-out flavours can&apos;t be selected.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button size="icon" variant="ghost" aria-label="Close">
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="border-b border-line p-4">
            <label htmlFor="aroma-search" className="sr-only">
              Search flavours
            </label>
            <Input
              id="aroma-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, brand or profile…"
            />
          </div>

          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
            {shown.length === 0 ? (
              <li className="py-8 text-center text-sm text-ink-muted">
                No flavour matches that.
              </li>
            ) : (
              shown.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={!a.available}
                    onClick={() => onPick(a)}
                    className={cn(
                      "flex w-full min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
                      a.available
                        ? "cursor-pointer border-line-strong bg-surface hover:border-gold hover:bg-gold/10"
                        : "cursor-not-allowed border-line bg-surface/40 opacity-55",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink text-balance-safe">
                        {a.name}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {a.brand} · {a.profile}
                      </span>
                    </span>
                    {!a.available ? (
                      <Badge tone="neutral" className="shrink-0">
                        Sold out
                      </Badge>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
