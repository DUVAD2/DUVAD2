import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPosUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getOrderableMenu } from "@/lib/menu";
import { PosShell } from "@/components/pos/pos-shell";
import { PosOrderBuilder } from "@/components/pos/pos-order-builder";
import { SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function NewPosOrderPage() {
  const user = await getPosUser();
  if (!user) redirect("/pos/login");

  const [settings, menu, tables] = await Promise.all([
    getSettings(),
    getOrderableMenu(),
    db.table.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <PosShell user={user}>
      <SectionHeading
        eyebrow="New order"
        title="Open a tab"
        blurb="Pick the table, tap through the menu, then open the tab. Settle it when the guests leave."
        className="mb-8"
      />
      <PosOrderBuilder
        categories={menu.categories}
        aromas={menu.aromas}
        tables={tables.map((t) => ({ id: t.id, code: t.code, label: t.label }))}
        currency={settings.currency}
        taxRateBp={settings.taxRateBp}
      />
    </PosShell>
  );
}
