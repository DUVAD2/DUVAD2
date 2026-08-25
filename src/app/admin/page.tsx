import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, LogOut, QrCode, Receipt, TrendingUp, Users, Package } from "lucide-react";
import { getPosUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getDailyReport, getRevenueTrend } from "@/lib/reports";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState } from "@/components/ui/primitives";
import { RevenueBars } from "@/components/admin/revenue-bars";
import { StockList } from "@/components/admin/stock-list";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = {
  DINE_IN: "Table (till)",
  QR: "Guest QR",
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card (in person)",
  ONLINE: "Card (online)",
  UNKNOWN: "Unrecorded",
};

export default async function AdminPage() {
  const user = await getPosUser();
  if (!user) redirect("/pos/login");
  // The dashboard exposes takings and staff performance — owners only.
  if (user.role !== "OWNER") redirect("/pos");

  const [settings, report, trend] = await Promise.all([
    getSettings(),
    getDailyReport(),
    getRevenueTrend(7),
  ]);

  const cur = settings.currency;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5 text-ink">
            <Flame className="size-5 text-gold" aria-hidden="true" />
            <span className="font-display text-lg font-semibold">Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/tables">
                <QrCode aria-hidden="true" />
                <span className="hidden sm:inline">Table QR</span>
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/pos">Till</Link>
            </Button>
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.name}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/">
                <LogOut aria-hidden="true" />
                <span className="hidden sm:inline">Site</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Today at {settings.venueName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        {/* ---------- Headline numbers: single values, so no chart ---------- */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={TrendingUp}
            label="Taken today"
            value={formatMoney(report.revenueCents, cur)}
            sub={`incl. ${formatMoney(report.taxCents, cur)} VAT`}
            emphasis
          />
          <StatTile
            icon={Receipt}
            label="Orders"
            value={String(report.orderCount)}
            sub={`avg ${formatMoney(report.avgOrderCents, cur)}`}
          />
          <StatTile
            icon={Receipt}
            label="Open tabs"
            value={String(report.openTabs)}
            sub={`${formatMoney(report.openTabsCents, cur)} unsettled`}
          />
          <StatTile
            icon={Package}
            label="Flavours to reorder"
            value={String(report.lowCount)}
            sub={`of ${report.stock.length} on the shelf`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* ---------- Revenue trend ---------- */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Takings, last 7 days</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Paid orders only. Hover or focus a bar for the exact figure.
              </p>
            </CardHeader>
            <CardBody>
              <RevenueBars data={trend} currency={cur} />
            </CardBody>
          </Card>

          {/* ---------- Staff ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-gold" aria-hidden="true" />
                Sales per employee
              </CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Today, credited to whoever opened or settled the tab.
              </p>
            </CardHeader>
            <CardBody>
              {report.staffSales.every((s) => s.orders === 0) ? (
                <EmptyState title="No sales recorded yet today" />
              ) : (
                <StaffTable rows={report.staffSales} currency={cur} />
              )}
            </CardBody>
          </Card>

          {/* ---------- Channels & payment ---------- */}
          <Card>
            <CardHeader>
              <CardTitle>Where it came from</CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Today, by ordering channel and how it was paid.
              </p>
            </CardHeader>
            <CardBody className="space-y-6">
              <Breakdown
                title="Channel"
                rows={report.byChannel.map((c) => ({
                  name: CHANNEL_LABEL[c.name] ?? c.name,
                  count: c.count,
                  cents: c.cents,
                }))}
                total={report.revenueCents}
                currency={cur}
              />
              <Breakdown
                title="Payment"
                rows={report.byPayment.map((c) => ({
                  name: PAYMENT_LABEL[c.name] ?? c.name,
                  count: c.count,
                  cents: c.cents,
                }))}
                total={report.revenueCents}
                currency={cur}
              />
            </CardBody>
          </Card>

          {/* ---------- Stock ---------- */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4 text-gold" aria-hidden="true" />
                Aroma stock
              </CardTitle>
              <p className="mt-1 text-sm text-ink-muted">
                Live tobacco stock. Every bowl sold is deducted automatically —
                anything low or out is listed first.
              </p>
            </CardHeader>
            <CardBody>
              <StockList rows={report.stock} />
            </CardBody>
          </Card>

          {/* ---------- Top flavours ---------- */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Flavours sold today</CardTitle>
            </CardHeader>
            <CardBody>
              {report.topFlavours.length === 0 ? (
                <EmptyState title="No shisha sold yet today" />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {report.topFlavours.map((f) => (
                    <li key={f.name}>
                      <Badge tone="gold">
                        {f.name}
                        <span className="tabular-nums opacity-80">
                          × {f.bowls}
                        </span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  emphasis,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-card border border-line bg-surface-2/60 p-5">
      <div className="flex items-center gap-2 text-ink-faint">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={
          emphasis
            ? "mt-2 font-display text-3xl font-semibold tabular-nums text-gold"
            : "mt-2 font-display text-3xl font-semibold tabular-nums text-ink"
        }
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}

function StaffTable({
  rows,
  currency,
}: {
  rows: Array<{
    id: string;
    name: string;
    role: string;
    orders: number;
    revenueCents: number;
    avgOrderCents: number;
  }>;
  currency: string;
}) {
  const max = Math.max(...rows.map((r) => r.revenueCents), 1);

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink text-balance-safe">
              {r.name}
              {r.role === "OWNER" ? (
                <span className="ml-2 text-xs font-normal text-ink-faint">
                  owner
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-display text-sm font-semibold tabular-nums text-ink">
              {formatMoney(r.revenueCents, currency)}
            </span>
          </div>
          {/* Single measure, single hue — the name carries identity. */}
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-gold"
              style={{ width: `${Math.max((r.revenueCents / max) * 100, 1)}%` }}
            />
          </div>
          <p className="mt-1 text-xs tabular-nums text-ink-faint">
            {r.orders} {r.orders === 1 ? "order" : "orders"} · avg{" "}
            {formatMoney(r.avgOrderCents, currency)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Breakdown({
  title,
  rows,
  total,
  currency,
}: {
  title: string;
  rows: Array<{ name: string; count: number; cents: number }>;
  total: number;
  currency: string;
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {title}
        </h4>
        <p className="text-sm text-ink-muted">Nothing yet today.</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.cents / total) * 100) : 0;
          return (
            <li key={r.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink text-balance-safe">{r.name}</span>
                <span className="shrink-0 tabular-nums text-ink">
                  {formatMoney(r.cents, currency)}
                  <span className="ml-2 text-xs text-ink-faint">{pct}%</span>
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-gold/70"
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
