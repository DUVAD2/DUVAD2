import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPin } from "@/lib/pin";
import { startSession } from "@/lib/session";

export async function POST(req: Request) {
  const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };

  if (!pin || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: "Enter your PIN." }, { status: 400 });
  }

  // PINs are not unique across staff by construction, so check each active
  // employee rather than looking one up by the PIN itself.
  const employees = await db.employee.findMany({ where: { active: true } });
  const match = employees.find((e) => verifyPin(pin, e.pinHash));

  if (!match) {
    // Deliberately vague: don't reveal whether a PIN length or prefix was close.
    return NextResponse.json({ error: "PIN not recognised." }, { status: 401 });
  }

  await startSession(match.id);
  return NextResponse.json({
    employee: { id: match.id, name: match.name, role: match.role },
  });
}
