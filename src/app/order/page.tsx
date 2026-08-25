import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getOrderableMenu } from "@/lib/menu";
import { SiteHeader } from "@/components/site-header";
import { SectionHeading } from "@/components/ui/primitives";
import { OrderFlow } from "@/components/order-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order online",
  description: "Order shisha, drinks and food for pickup or delivery.",
};

export default async function OrderPage() {
  const [settings, menu] = await Promise.all([
    getSettings(),
    getOrderableMenu(),
  ]);

  return (
    <div className="min-h-dvh">
      <SiteHeader venueName={settings.venueName} />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Order online"
          title="Pickup or delivery"
          blurb="Build your order, pay by card, and we'll start packing the moment it clears."
          className="mb-8"
        />
        <OrderFlow
          mode="ONLINE"
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
