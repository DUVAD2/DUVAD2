import { redirect } from "next/navigation";
import { getPosUser } from "@/lib/session";
import { PinPad } from "@/components/pos/pin-pad";

export const dynamic = "force-dynamic";

export default async function PosLoginPage() {
  if (await getPosUser()) redirect("/pos");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <PinPad />
    </main>
  );
}
