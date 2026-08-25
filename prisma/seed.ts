import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { hashPin } from "../src/lib/pin";
import { totalsFor } from "../src/lib/money";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Fall through to whatever is already in the environment.
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const db = new PrismaClient({ adapter });

/** How many days of trading history the seed fabricates, today included. */
const DAYS_OF_HISTORY = 7;

/** PINs are printed once at the end so the owner can hand them out. */
const STAFF = [
  { name: "Yusuf Demir", pin: "4821", role: "OWNER" },
  { name: "Amira Haddad", pin: "1074", role: "STAFF" },
  { name: "Deniz Kaya", pin: "2263", role: "STAFF" },
  { name: "Leyla Osman", pin: "3390", role: "STAFF" },
];

const AROMAS = [
  // name, brand, profile, stock g, low-at g, description
  ["Double Apple", "Al Fakher", "Classic", 1200, 250, "The original aniseed-apple. The one everybody knows."],
  ["Mint", "Al Fakher", "Minty", 900, 250, "Clean, cold and sharp. Best mixed."],
  ["Grape Mint", "Al Fakher", "Fruity", 750, 200, "Sweet grape softened with a cool finish."],
  ["Peach", "Al Fakher", "Fruity", 180, 200, "Ripe yellow peach, low acidity."],
  ["Gum Mint", "Al Fakher", "Classic", 420, 200, "Bubblegum and mint — a house staple."],
  ["Love 66", "Adalya", "Fruity", 1400, 300, "Passionfruit, melon and mint. Our best seller."],
  ["Lady Killer", "Adalya", "Fruity", 680, 200, "Citrus, kiwi and berry with a cold edge."],
  ["Blue Melon", "Adalya", "Fruity", 240, 200, "Blueberry over honeydew melon."],
  ["Pan Rasna", "Adalya", "Signature", 90, 150, "Spiced, floral and unusual. For the curious."],
  ["Watermelon Chill", "Adalya", "Fruity", 830, 200, "Watermelon with a long cooling finish."],
  ["Lemon Mint", "Nakhla", "Citrus", 560, 200, "Sour lemon cut with fresh mint."],
  ["Skyfall", "Musthave", "Signature", 310, 150, "Blackcurrant, lime and menthol."],
  ["Pornstar Martini", "Musthave", "Signature", 145, 150, "Passionfruit and vanilla, dessert-sweet."],
  ["Vanilla Cream", "Nakhla", "Dessert", 400, 150, "Soft, creamy, no cooling. Pairs with coffee."],
  ["Cola Ice", "Nakhla", "Classic", 275, 150, "Cola with a crisp cold finish."],
  ["Cherry Bomb", "Musthave", "Fruity", 60, 150, "Dark sour cherry. Intense."],
] as const;

const MENU: Array<{
  name: string;
  slug: string;
  blurb: string;
  products: Array<{
    name: string;
    description: string;
    price: number; // in cents
    isShisha?: boolean;
    bowlGrams?: number;
  }>;
}> = [
  {
    name: "Shisha",
    slug: "shisha",
    blurb: "Every head is packed fresh. Choose any flavour from our stock.",
    products: [
      {
        name: "Classic Shisha",
        description: "Traditional clay head, natural coconut coal, one flavour of your choice.",
        price: 1490,
        isShisha: true,
        bowlGrams: 20,
      },
      {
        name: "Premium Shisha",
        description: "Phunnel head with a heat-managed setup for a longer, smoother session.",
        price: 1890,
        isShisha: true,
        bowlGrams: 25,
      },
      {
        name: "Fruit Head Shisha",
        description: "Packed inside a hollowed pineapple or melon. Sweeter, juicier smoke.",
        price: 2490,
        isShisha: true,
        bowlGrams: 30,
      },
      {
        name: "Head Refill",
        description: "Fresh bowl on your existing setup. Same or new flavour.",
        price: 890,
        isShisha: true,
        bowlGrams: 20,
      },
      {
        name: "Coal Change",
        description: "Fresh coconut coals brought to your table.",
        price: 250,
      },
    ],
  },
  {
    name: "Extras",
    slug: "extras",
    blurb: "Small upgrades that change the whole session.",
    products: [
      { name: "Ice Hose", description: "Chilled hose for a colder draw.", price: 300 },
      { name: "Milk Base", description: "Milk instead of water — softer, creamier smoke.", price: 200 },
      { name: "Fresh Fruit Base", description: "Citrus and berries in the base.", price: 350 },
      { name: "Private Mouthpieces", description: "Sealed personal tips for the table.", price: 150 },
    ],
  },
  {
    name: "Drinks",
    slug: "drinks",
    blurb: "Brewed and pressed in-house.",
    products: [
      { name: "Moroccan Mint Tea", description: "Whole pot, fresh mint, served sweet.", price: 490 },
      { name: "Turkish Coffee", description: "Ground fine, brewed slow, served with lokum.", price: 350 },
      { name: "Fresh Orange Juice", description: "Pressed to order.", price: 450 },
      { name: "Homemade Lemonade", description: "Lemon, mint and a little rose.", price: 420 },
      { name: "Ayran", description: "Chilled salted yoghurt drink.", price: 290 },
      { name: "Soft Drinks", description: "Cola, Fanta, Sprite or tonic.", price: 320 },
      { name: "Sparkling Water", description: "500ml, served with lime.", price: 280 },
      { name: "Energy Drink", description: "Served over ice.", price: 390 },
    ],
  },
  {
    name: "Kitchen",
    slug: "kitchen",
    blurb: "Sharing plates, made to go with a long session.",
    products: [
      { name: "Mezze Platter", description: "Hummus, muhammara, labneh, olives and warm flatbread.", price: 1290 },
      { name: "Halloumi Fries", description: "Fried halloumi, honey, black sesame.", price: 750 },
      { name: "Loaded Nachos", description: "Cheese sauce, jalapeño, spring onion.", price: 690 },
      { name: "Spiced Nuts & Olives", description: "Warm, salted, rosemary.", price: 450 },
      { name: "Baklava", description: "Three pieces, pistachio, served warm.", price: 550 },
    ],
  },
];

async function main() {
  console.log("Seeding Ember Lounge…\n");

  // Idempotent: wipe transactional and catalogue data, then rebuild.
  await db.stockLog.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.aroma.deleteMany();
  await db.table.deleteMany();
  await db.employee.deleteMany();
  await db.settings.deleteMany();

  const settings = await db.settings.create({
    data: {
      id: 1,
      venueName: "Ember Lounge",
      currency: "EUR",
      taxRateBp: 1900,
      deliveryFeeCents: 499,
      minDeliveryCents: 1500,
      address: "Kaiserstraße 42, 60329 Frankfurt am Main",
      phone: "+49 69 1234 5678",
      openingHours: "Mon–Thu 16:00–01:00 · Fri–Sat 16:00–03:00 · Sun 15:00–00:00",
    },
  });

  const aromas = [];
  for (const [i, a] of AROMAS.entries()) {
    const [name, brand, profile, stockGrams, lowStockGrams, description] = a;
    aromas.push(
      await db.aroma.create({
        data: { name, brand, profile, stockGrams, lowStockGrams, description, sort: i },
      }),
    );
  }
  console.log(`  ${aromas.length} aromas`);

  const products = [];
  for (const [ci, cat] of MENU.entries()) {
    const category = await db.category.create({
      data: { name: cat.name, slug: cat.slug, blurb: cat.blurb, sort: ci },
    });
    for (const [pi, p] of cat.products.entries()) {
      products.push(
        await db.product.create({
          data: {
            name: p.name,
            description: p.description,
            priceCents: p.price,
            categoryId: category.id,
            isShisha: p.isShisha ?? false,
            bowlGrams: p.bowlGrams ?? 20,
            sort: pi,
          },
        }),
      );
    }
  }
  console.log(`  ${MENU.length} categories, ${products.length} products`);

  const tables = [];
  for (let i = 1; i <= 12; i++) {
    tables.push(
      await db.table.create({
        data: {
          code: `T${String(i).padStart(2, "0")}`,
          label: i <= 8 ? `Table ${i}` : `Booth ${i - 8}`,
          seats: i <= 8 ? 4 : 6,
        },
      }),
    );
  }
  console.log(`  ${tables.length} tables`);

  const employees = [];
  for (const s of STAFF) {
    employees.push(
      await db.employee.create({
        data: { name: s.name, pinHash: hashPin(s.pin), role: s.role },
      }),
    );
  }
  console.log(`  ${employees.length} employees`);

  await seedTradingHistory({ settings, products, aromas, tables, employees });

  console.log("\n  POS PINs (change these in /admin/staff):");
  for (const s of STAFF) {
    console.log(`    ${s.pin}  ${s.name} (${s.role})`);
  }
  console.log("\nDone.");
}

/**
 * Creates a plausible week of trading so the dashboard, stock levels and
 * per-employee figures are meaningful the first time they are opened.
 */
async function seedTradingHistory({
  settings,
  products,
  aromas,
  tables,
  employees,
}: {
  settings: { taxRateBp: number; deliveryFeeCents: number };
  products: Array<{ id: string; name: string; priceCents: number; isShisha: boolean; bowlGrams: number }>;
  aromas: Array<{ id: string; name: string }>;
  tables: Array<{ id: string }>;
  employees: Array<{ id: string; name: string }>;
}) {
  const byName = (n: string) => products.find((p) => p.name === n)!;
  const aromaByName = (n: string) => aromas.find((a) => a.name === n)!;

  // Deterministic pseudo-random so reseeding gives a comparable-looking day.
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const shishaNames = ["Classic Shisha", "Premium Shisha", "Fruit Head Shisha", "Head Refill"];
  const drinkNames = ["Moroccan Mint Tea", "Turkish Coffee", "Soft Drinks", "Homemade Lemonade", "Ayran", "Sparkling Water"];
  const foodNames = ["Mezze Platter", "Halloumi Fries", "Loaded Nachos", "Baklava", "Spiced Nuts & Olives"];
  const extraNames = ["Ice Hose", "Milk Base", "Fresh Fruit Base"];
  const popularAromas = ["Love 66", "Double Apple", "Lady Killer", "Watermelon Chill", "Grape Mint", "Skyfall", "Mint", "Blue Melon"];

  const stockDrain = new Map<string, number>();
  let totalOrders = 0;

  // Seed a week so the dashboard's trend chart has real history on first open.
  // Only today's orders move stock: the previous days' consumption is already
  // reflected in the opening stock levels above.
  for (let dayOffset = DAYS_OF_HISTORY - 1; dayOffset >= 0; dayOffset--) {
    const isToday = dayOffset === 0;

    const dayEnd = new Date();
    dayEnd.setDate(dayEnd.getDate() - dayOffset);
    // A past day is a full night's trading; today only runs up to now.
    if (!isToday) dayEnd.setHours(23, 30, 0, 0);

    const openedAt = new Date(dayEnd);
    openedAt.setHours(16, 0, 0, 0);
    // If seeding before opening time, treat the day as starting this morning.
    if (openedAt > dayEnd) openedAt.setHours(9, 0, 0, 0);

    const spanMs = Math.max(dayEnd.getTime() - openedAt.getTime(), 60 * 60 * 1000);

    // Weekends are busier than midweek, which is what a real chart looks like.
    const weekday = dayEnd.getDay();
    const busy = weekday === 5 || weekday === 6 ? 1.45 : weekday === 0 ? 1.1 : 1;
    const orderCount = Math.round((isToday ? 23 : 26) * busy);
    totalOrders += orderCount;

    await seedDay({
      orderCount,
      openedAt,
      spanMs,
      applyStock: isToday,
      stockDrain,
    });
  }

  // Apply today's tobacco usage to stock, with an audit trail.
  for (const [aromaId, grams] of stockDrain) {
    await db.aroma.update({
      where: { id: aromaId },
      data: { stockGrams: { decrement: grams } },
    });
    await db.stockLog.create({
      data: { aromaId, deltaGrams: -grams, reason: "SALE", note: "Seeded trading day" },
    });
  }

  console.log(`  ${totalOrders} paid orders across ${DAYS_OF_HISTORY} days`);

  async function seedDay({
    orderCount,
    openedAt,
    spanMs,
    applyStock,
    stockDrain,
  }: {
    orderCount: number;
    openedAt: Date;
    spanMs: number;
    applyStock: boolean;
    stockDrain: Map<string, number>;
  }) {
  for (let i = 0; i < orderCount; i++) {
    const createdAt = new Date(openedAt.getTime() + spanMs * (i / orderCount));
    const roll = rand();
    const channel = roll < 0.62 ? "DINE_IN" : roll < 0.82 ? "QR" : roll < 0.93 ? "PICKUP" : "DELIVERY";
    const isVenue = channel === "DINE_IN" || channel === "QR";

    const lines: Array<{
      productId: string;
      name: string;
      unitCents: number;
      qty: number;
      aromaId?: string;
      aromaName?: string;
      bowlGrams?: number;
    }> = [];

    // Venue orders almost always include a shisha; delivery/pickup lean food.
    if (isVenue || rand() < 0.45) {
      const p = byName(shishaNames[Math.floor(rand() * shishaNames.length)]);
      const a = aromaByName(popularAromas[Math.floor(rand() * popularAromas.length)]);
      lines.push({
        productId: p.id,
        name: p.name,
        unitCents: p.priceCents,
        qty: 1,
        aromaId: a.id,
        aromaName: a.name,
        bowlGrams: p.bowlGrams,
      });
      if (rand() < 0.3) {
        const e = byName(extraNames[Math.floor(rand() * extraNames.length)]);
        lines.push({ productId: e.id, name: e.name, unitCents: e.priceCents, qty: 1 });
      }
    }

    const drinkQty = 1 + Math.floor(rand() * 3);
    const d = byName(drinkNames[Math.floor(rand() * drinkNames.length)]);
    lines.push({ productId: d.id, name: d.name, unitCents: d.priceCents, qty: drinkQty });

    if (rand() < 0.45) {
      const f = byName(foodNames[Math.floor(rand() * foodNames.length)]);
      lines.push({ productId: f.id, name: f.name, unitCents: f.priceCents, qty: 1 });
    }

    const deliveryCents = channel === "DELIVERY" ? settings.deliveryFeeCents : 0;
    const totals = totalsFor(lines, settings.taxRateBp, deliveryCents);

    // QR and online orders are card-paid; the floor splits cash and card.
    const paymentMethod =
      channel === "DINE_IN" ? (rand() < 0.45 ? "CASH" : "CARD") : "ONLINE";
    const employee =
      channel === "DINE_IN" || channel === "QR"
        ? employees[Math.floor(rand() * employees.length)]
        : null;

    await db.order.create({
      data: {
        channel,
        status: "PAID",
        paymentStatus: "PAID",
        paymentMethod,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        deliveryCents: totals.deliveryCents,
        totalCents: totals.totalCents,
        tableId: isVenue ? tables[Math.floor(rand() * tables.length)].id : null,
        employeeId: employee?.id ?? null,
        customerName: isVenue ? null : ["Sara", "Mo", "Elif", "Jonas", "Nadia"][Math.floor(rand() * 5)],
        createdAt,
        paidAt: createdAt,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            aromaId: l.aromaId ?? null,
            name: l.name,
            aromaName: l.aromaName ?? null,
            unitCents: l.unitCents,
            qty: l.qty,
            lineCents: l.unitCents * l.qty,
          })),
        },
      },
    });

    if (applyStock) {
      for (const l of lines) {
        if (l.aromaId && l.bowlGrams) {
          stockDrain.set(
            l.aromaId,
            (stockDrain.get(l.aromaId) ?? 0) + l.bowlGrams * l.qty,
          );
        }
      }
    }
  }
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
