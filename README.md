# Ember Lounge

A complete shisha lounge system: the public flavour menu, three ways to order and
pay, live tobacco stock, and a daily takings dashboard with per-employee sales.

Built with Next.js 16 (App Router), TypeScript, Tailwind v4, Prisma 7 + SQLite.

## What it does

**For guests**

- A dark, mobile-first site with the full menu and a searchable flavour library
  showing what's actually on the shelf tonight (sold-out flavours stay visible).
- **QR table ordering** — scan the code on the table, order, and either pay by
  card on your phone or leave it on the tab for staff to settle.
- **Pickup and delivery** — order ahead and pay by card. Delivery enforces a
  minimum basket and adds the delivery fee.

**For staff** (`/pos`, PIN sign-in)

- Open a tab against any table, tap through the menu, pick flavours.
- See every unsettled tab — from the till *and* from guest QR orders — and
  settle it as cash or card.
- Each staff member sees their own sales and order count for the day.

**For the owner** (`/admin`, owner PIN only)

- Taken today, order count, average order, unsettled tabs.
- Takings over the last 7 days.
- **Sales per employee** — revenue, orders and average order value each.
- Where the money came from, by channel and payment method.
- **Aroma stock in grams and bowls remaining**, deducted automatically on every
  bowl sold, with low-stock and out-of-stock flagged first.
- Printable QR codes for every table (`/admin/tables`).

## Getting started

```bash
npm install
cp .env.example .env        # then fill in POS_SESSION_SECRET (see below)
npm run db:push             # create the SQLite database
npm run db:seed             # menu, flavours, tables, staff + a week of trading
npm run dev
```

Open http://localhost:3000.

### Seeded PINs

| PIN    | Who          | Access                |
| ------ | ------------ | --------------------- |
| `4821` | Yusuf Demir  | Owner — POS + dashboard |
| `1074` | Amira Haddad | Staff — POS only      |
| `2263` | Deniz Kaya   | Staff — POS only      |
| `3390` | Leyla Osman  | Staff — POS only      |

Change these before going anywhere near a real venue — edit `STAFF` in
`prisma/seed.ts`, or update the `Employee` rows directly.

### Environment

| Variable                | Required | What it does                                            |
| ----------------------- | -------- | ------------------------------------------------------- |
| `DATABASE_URL`          | yes      | SQLite file, e.g. `file:./dev.db`                        |
| `POS_SESSION_SECRET`    | in prod  | Signs staff session cookies. 32+ random chars.           |
| `STRIPE_SECRET_KEY`     | no       | Enables real card payments                               |
| `STRIPE_WEBHOOK_SECRET` | no       | Verifies Stripe webhooks                                 |
| `NEXT_PUBLIC_BASE_URL`  | no       | Public origin, used for Stripe redirects and table QRs   |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Payments

Card payments run through **Stripe Checkout**. Without `STRIPE_SECRET_KEY` the
app falls back to a clearly-labelled demo payment so the whole flow stays
testable — the confirmation page says no card was charged. To take real money:

1. Put your keys in `.env`.
2. Point a Stripe webhook at `/api/webhooks/stripe` for
   `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`.

Orders are only marked paid from the **signed webhook**, never from the browser
landing on the success URL.

## Changing venue details

Name, currency, tax rate, delivery fee and minimum, address, phone and opening
hours all live in a single `Settings` row — no code change needed. The seed sets
EUR at 19% VAT included in menu prices; adjust in `prisma/seed.ts` or edit the
row directly.

Prices are treated as **tax-inclusive** (the European VAT convention). To switch
to tax-on-top, change `totalsFor()` in `src/lib/money.ts` — it's the only place
that decides.

## How the money and stock rules work

- All money is stored as **integer cents**. No floats anywhere.
- Prices, tax and stock are always resolved **server-side** from the catalogue.
  A tampered client payload cannot change what's charged or deducted.
- Tobacco is deducted **when the bowl is packed** (order creation), not when the
  bill is paid — because that's when the product is actually consumed.
- Stock deduction happens in the same transaction as the order, with a
  conditional update that stops two tills selling the last of a flavour at once.
- Every stock movement is written to `StockLog` with a reason and order number.

## Project layout

```
prisma/schema.prisma      Data model
prisma/seed.ts            Menu, flavours, staff, tables + a week of trading
src/lib/orders.ts         The one path every order takes, whatever the channel
src/lib/reports.ts        Everything the owner dashboard shows
src/lib/money.ts          Cents arithmetic and the tax rule
src/lib/session.ts        Signed POS session cookies
src/app/                  Public site, /order, /t/[code], /pos, /admin
```

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run db:reset    # wipe, re-push schema and re-seed
```

## Not built yet

Deliberately out of scope for this first version — say the word and they're
straightforward to add:

- Editing the menu, flavours and staff from the admin UI (currently seed/DB).
- Restocking flavours from the dashboard (the `StockLog` model already supports
  `RESTOCK`).
- Shift clock-in/out and rotas.
- Emailed or printed receipts, and a kitchen/bar ticket screen.
