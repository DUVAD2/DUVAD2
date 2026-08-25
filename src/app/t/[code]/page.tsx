import { notFound } from "next/navigation";
import { QrCode } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getOrderableMenu } from "@/lib/menu";
import { SiteHeader } from "@/components/site-header";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { OrderFlow } from "@/components/order-flow";

export const dynamic = "force-dynamic";

/** Guest ordering from a QR code stuck to a specific table. */
export default async function TablePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const table = await db.table.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!table || !table.active) notFound();

  const [settings, menu] = await Promise.all([
    getSettings(),
    getOrderableMenu(),
  ]);

  return (
    <div className="min-h-dvh">
      <SiteHeader venueName={settings.venueName} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Badge tone="gold" className="mb-4">
          <QrCode className="size-3.5" aria-hidden="true" />
          {table.label}
        </Badge>
        <SectionHeading
          eyebrow="Table service"
          title={`Ordering to ${table.label}`}
          blurb="Add what you want and send it straight to the bar. Pay now by card, or settle with staff before you leave."
          className="mb-8"
        />
        <OrderFlow
          mode="TABLE"
          tableCode={table.code}
          categories={menu.categories}
          aromas={menu.aromas}
          currency={settings.currency}
          taxRateBp={settings.taxRateBp}
          deliveryFeeCents={settings.deliveryFeeCents}
          minDeliveryCents={settings.minDeliveryCents}
        />
      </main>
    </div>
  );
}
