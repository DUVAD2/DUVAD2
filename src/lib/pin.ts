import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * POS PINs are short by nature, so they are hashed with scrypt (memory-hard)
 * and compared in constant time. A PIN is still only a shift-floor credential:
 * it gates the till, not anything that leaves the venue.
 */

const KEY_LEN = 64;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pin, salt, KEY_LEN).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const derived = scryptSync(pin, salt, KEY_LEN);
  const expectedBuf = Buffer.from(expected, "hex");
  if (expectedBuf.length !== derived.length) return false;

  return timingSafeEqual(derived, expectedBuf);
}
