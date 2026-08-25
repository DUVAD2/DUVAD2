import { db } from "./db";

export type VenueSettings = {
  id: number;
  venueName: string;
  currency: string;
  taxRateBp: number;
  deliveryFeeCents: number;
  minDeliveryCents: number;
  address: string;
  phone: string;
  openingHours: string;
};

const FALLBACK: VenueSettings = {
  id: 1,
  venueName: "Ember Lounge",
  currency: "EUR",
  taxRateBp: 1900,
  deliveryFeeCents: 499,
  minDeliveryCents: 1500,
  address: "",
  phone: "",
  openingHours: "",
};

/**
 * Venue configuration lives in a single row so the owner can change the name,
 * currency, tax rate and delivery terms from /admin/settings without a deploy.
 */
export async function getSettings(): Promise<VenueSettings> {
  const row = await db.settings.findFirst({ where: { id: 1 } });
  if (row) return row;

  // First run against an un-seeded database — create the row rather than
  // letting every page render with different implicit defaults.
  return db.settings.create({ data: { id: 1 } });
}

export { FALLBACK as DEFAULT_SETTINGS };
