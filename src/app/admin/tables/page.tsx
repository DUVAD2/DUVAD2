import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getPosUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

/** Printable QR codes, one per table, pointing at /t/<code>. */
export default async function TableQrPage() {
  const user = await getPosUser();
  if (!user) redirect("/pos/login");
  if (user.role !== "OWNER") redirect("/pos");

  const [settings, tables] = await Promise.all([
    getSettings(),
    db.table.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  // Build the QR target from the request host so codes work on whatever
  // domain the venue actually serves this from, not just localhost.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;

  const cards = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      url: `${origin}/t/${t.code}`,
      svg: await QRCode.toString(`${origin}/t/${t.code}`, {
        type: "svg",
        margin: 1,
        color: { dark: "#0c0a09", light: "#ffffff" },
      }),
    })),
  );

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <Button asChild size="sm" variant="ghost" className="mb-3 -ml-3">
              <Link href="/admin">
                <ArrowLeft aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <SectionHeading
              eyebrow="Table QR codes"
              title="Print and stick on the tables"
              blurb={`Each code opens the menu for that table at ${origin}. Guests order and pay without waiting for staff.`}
            />
          </div>
          <p className="text-xs text-ink-faint">
            Use your browser&apos;s print dialog (Ctrl/Cmd + P).
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
          {cards.map((t) => (
            <li
              key={t.id}
              className="flex break-inside-avoid flex-col items-center rounded-card border border-line bg-white p-5 text-center"
            >
              <p className="font-display text-lg font-semibold text-[#0c0a09]">
                {settings.venueName}
              </p>
              <p className="mt-0.5 text-sm text-[#57534e]">{t.label}</p>
              <div
                className="my-4 w-full max-w-[190px] [&>svg]:h-auto [&>svg]:w-full"
                // QRCode.toString returns a self-contained SVG string.
                dangerouslySetInnerHTML={{ __html: t.svg }}
              />
              <p className="text-sm font-medium text-[#0c0a09]">
                Scan to see the menu &amp; order
              </p>
              <p className="mt-1 break-all text-[10px] text-[#78716c]">{t.url}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
