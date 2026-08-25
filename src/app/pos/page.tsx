import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getPosUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { PosShell } from "@/components/pos/pos-shell";
import { OpenTabs, type OpenTab } from "@/components/pos/open-tabs";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await getPosUser();
  if (!user) redirect("/pos/login");

  const settings = await getSettings();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [openOrders, myToday] = await Promise.all([
    db.order.findMany({
      where: { paymentStatus: "UNPAID", status: { not: "CANCELLED" } },
      include: { items: true, table: true, employee: true },
      orderBy: { createdAt: "asc" },
    }),
    db.order.aggregate({
      where: {
        employeeId: user.id,
        paymentStatus: "PAID",
        paidAt: { gte: startOfDay },
      },
      _sum: { totalCents: true },
      _count: true,
    }),
  ]);

  const tabs: OpenTab[] = openOrders.map((o) => ({
    id: o.id,
    channel: o.channel,
    tableLabel: o.table?.label ?? null,
    customerName: o.customerName,
    note: o.note,
    totalCents: o.totalCents,
    openedAt: o.createdAt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    employeeName: o.employee?.name ?? null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      aromaName: i.aromaName,
      qty: i.qty,
    })),
  }));

  return (
    <PosShell user={user}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={`Signed in as ${user.name}`}
          title="Open tabs"
          blurb="Guest QR orders and table tabs waiting to be settled."
        />
        <Button asChild size="lg">
          <Link href="/pos/new">
            <Plus aria-hidden="true" />
            New order
          </Link>
        </Button>
      </div>

      {/* Staff care about their own numbers; the full breakdown is the owner's. */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Stat
          label="Your sales today"
          value={formatMoney(myToday._sum.totalCents ?? 0, settings.currency)}
        />
        <Stat label="Your orders today" value={String(myToday._count)} />
        <Stat label="Open tabs" value={String(tabs.length)} />
      </div>

      <OpenTabs tabs={tabs} currency={settings.currency} />
    </PosShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-surface-2/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
