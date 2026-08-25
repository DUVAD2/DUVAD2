import { db } from "./db";
import type { MenuCategory, OrderAroma } from "@/components/order-flow";

/** The orderable menu plus current flavour availability, shared by all channels. */
export async function getOrderableMenu(): Promise<{
  categories: MenuCategory[];
  aromas: OrderAroma[];
}> {
  const [categories, aromas] = await Promise.all([
    db.category.findMany({
      orderBy: { sort: "asc" },
      include: {
        products: { where: { active: true }, orderBy: { sort: "asc" } },
      },
    }),
    db.aroma.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return {
    categories: categories
      .filter((c) => c.products.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        blurb: c.blurb,
        products: c.products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          priceCents: p.priceCents,
          isShisha: p.isShisha,
        })),
      })),
    aromas: aromas.map((a) => ({
      id: a.id,
      name: a.name,
      brand: a.brand,
      profile: a.profile,
      // A bowl is ~20g, so anything under that can't be packed.
      available: a.stockGrams >= 20,
    })),
  };
}
