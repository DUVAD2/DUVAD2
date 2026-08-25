import Link from "next/link";
import { Clock, MapPin, Phone, QrCode, ShoppingBag, Flame } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { FlavourBrowser, type FlavourCard } from "@/components/flavour-browser";

// Menu and stock change during service, so never serve a stale cached page.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();

  const [categories, aromas] = await Promise.all([
    db.category.findMany({
      orderBy: { sort: "asc" },
      include: {
        products: {
          where: { active: true },
          orderBy: { sort: "asc" },
        },
      },
    }),
    db.aroma.findMany({
      where: { active: true },
      orderBy: [{ profile: "asc" }, { name: "asc" }],
    }),
  ]);

  const flavours: FlavourCard[] = aromas.map((a) => ({
    id: a.id,
    name: a.name,
    brand: a.brand,
    profile: a.profile,
    description: a.description,
    availability:
      a.stockGrams <= 0
        ? "OUT"
        : a.stockGrams <= a.lowStockGrams
          ? "LAST_FEW"
          : "IN_STOCK",
  }));

  const inStock = flavours.filter((f) => f.availability !== "OUT").length;

  return (
    <div className="min-h-dvh">
      <SiteHeader venueName={settings.venueName} />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            Shisha · Kitchen · Late
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] font-semibold text-ink sm:text-6xl text-balance-safe">
            Every head packed fresh, every flavour in the open.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            {inStock} flavours on the shelf tonight. Scan the code at your table,
            order from your phone, or have it ready before you arrive.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="#flavours">
                <Flame aria-hidden="true" />
                See tonight&apos;s flavours
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/order">
                <ShoppingBag aria-hidden="true" />
                Order for pickup or delivery
              </Link>
            </Button>
          </div>

          {settings.openingHours ? (
            <p className="mt-8 flex items-start gap-2 text-sm text-ink-muted">
              <Clock className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
              <span className="text-balance-safe">{settings.openingHours}</span>
            </p>
          ) : null}
        </section>

        {/* ---------- Flavour library ---------- */}
        <section
          id="flavours"
          className="scroll-mt-20 border-t border-line bg-surface/40 py-16"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="The shelf"
              title="Tonight's flavours"
              blurb="Live from our stock room — if it's listed, we can pack it. Sold-out flavours stay visible so you know what to ask for next time."
              className="mb-8"
            />
            <FlavourBrowser flavours={flavours} />
          </div>
        </section>

        {/* ---------- Menu ---------- */}
        <section id="menu" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Menu"
              title="Everything we serve"
              className="mb-10"
            />

            <div className="space-y-12">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-5 border-b border-line pb-3">
                    <h3 className="font-display text-xl font-semibold text-gold-soft">
                      {cat.name}
                    </h3>
                    {cat.blurb ? (
                      <p className="mt-1 text-sm text-ink-muted">{cat.blurb}</p>
                    ) : null}
                  </div>

                  <ul className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                    {cat.products.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-baseline justify-between gap-4 border-b border-line/50 pb-4"
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
                        </div>
                        <span className="shrink-0 font-display text-base font-semibold tabular-nums text-gold">
                          {formatMoney(p.priceCents, settings.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-8 text-xs text-ink-faint">
              Prices include {(settings.taxRateBp / 100).toFixed(0)}% VAT.
            </p>
          </div>
        </section>

        {/* ---------- How to order ---------- */}
        <section className="border-t border-line bg-surface/40 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Ordering"
              title="Three ways to order"
              className="mb-8"
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: QrCode,
                  title: "At your table",
                  body: "Scan the code on the table to open your tab, add rounds and pay from your phone. No waiting to catch an eye.",
                },
                {
                  icon: ShoppingBag,
                  title: "Pickup",
                  body: "Order ahead and collect at the bar. We start packing when you pay.",
                },
                {
                  icon: MapPin,
                  title: "Delivery",
                  body: `Delivered locally for ${formatMoney(settings.deliveryFeeCents, settings.currency)} on orders over ${formatMoney(settings.minDeliveryCents, settings.currency)}.`,
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-card border border-line bg-surface-2/60 p-5"
                >
                  <c.icon className="size-5 text-gold" aria-hidden="true" />
                  <p className="mt-3 font-display text-base font-semibold text-ink">
                    {c.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Visit ---------- */}
        <section id="visit" className="scroll-mt-20 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Visit" title="Find us" className="mb-6" />
            <div className="grid gap-4 sm:grid-cols-3">
              {settings.address ? (
                <InfoTile icon={MapPin} label="Address" value={settings.address} />
              ) : null}
              {settings.openingHours ? (
                <InfoTile icon={Clock} label="Hours" value={settings.openingHours} />
              ) : null}
              {settings.phone ? (
                <InfoTile
                  icon={Phone}
                  label="Phone"
                  value={settings.phone}
                  href={`tel:${settings.phone.replace(/\s/g, "")}`}
                />
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.venueName}
          </p>
          <div className="flex gap-4">
            <Link
              href="/pos"
              className="transition-colors duration-200 hover:text-ink"
            >
              Staff POS
            </Link>
            <Link
              href="/admin"
              className="transition-colors duration-200 hover:text-ink"
            >
              Owner dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-gold">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink text-balance-safe">
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="rounded-card border border-line bg-surface-2/60 p-5 transition-colors duration-200 hover:border-gold-dim"
      >
        {content}
      </a>
    );
  }
  return (
    <div className="rounded-card border border-line bg-surface-2/60 p-5">
      {content}
    </div>
  );
}
