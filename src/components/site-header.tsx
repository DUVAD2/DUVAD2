import Link from "next/link";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader({ venueName }: { venueName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-ink transition-colors duration-200 hover:text-gold"
        >
          <Flame className="size-5 text-gold" aria-hidden="true" />
          <span className="font-display text-lg font-semibold tracking-tight">
            {venueName}
          </span>
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 md:flex"
        >
          {[
            { href: "/#flavours", label: "Flavours" },
            { href: "/#menu", label: "Menu" },
            { href: "/#visit", label: "Visit" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button asChild size="sm">
          <Link href="/order">Order online</Link>
        </Button>
      </div>
    </header>
  );
}
