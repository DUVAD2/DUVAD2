import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "pos_session";
const MAX_AGE_SECONDS = 12 * 60 * 60; // One long shift.

/**
 * A POS session is a signed cookie, not a database row: it only has to prove
 * "this device passed a valid PIN", and it expires with the shift.
 */
function secret(): string {
  const fromEnv = process.env.POS_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "POS_SESSION_SECRET must be set (32+ random chars) in production.",
    );
  }
  // Dev convenience only — regenerating this simply signs everyone out.
  globalThis.__posDevSecret ??= randomBytes(32).toString("hex");
  return globalThis.__posDevSecret;
}

declare global {
  var __posDevSecret: string | undefined;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function startSession(employeeId: string) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${employeeId}.${expires}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type PosUser = {
  id: string;
  name: string;
  role: string;
};

/** Returns the signed-in employee, or null. Always re-checks they're active. */
export async function getPosUser(): Promise<PosUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [employeeId, expiresRaw, mac] = parts;

  if (!safeEqual(sign(`${employeeId}.${expiresRaw}`), mac)) return null;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  const employee = await db.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !employee.active) return null;

  return { id: employee.id, name: employee.name, role: employee.role };
}

export async function requireOwner(): Promise<PosUser | null> {
  const user = await getPosUser();
  return user?.role === "OWNER" ? user : null;
}
