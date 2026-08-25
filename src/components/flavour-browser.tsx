"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export type FlavourCard = {
  id: string;
  name: string;
  brand: string;
  profile: string;
  description: string;
  /** Derived server-side. Guests never see gram counts — that's owner data. */
  availability: "IN_STOCK" | "LAST_FEW" | "OUT";
};

const ALL = "All";

export function FlavourBrowser({ flavours }: { flavours: FlavourCard[] }) {
  const profiles = useMemo(() => {
    const set = new Set(flavours.map((f) => f.profile));
    return [ALL, ...Array.from(set).sort()];
  }, [flavours]);

  const [active, setActive] = useState(ALL);

  const shown = useMemo(
    () => (active === ALL ? flavours : flavours.filter((f) => f.profile === active)),
    [flavours, active],
  );

  return (
    <div className="space-y-5">
      {/* Filter chips wrap onto more lines rather than scrolling out of reach. */}
      <div
        role="group"
        aria-label="Filter flavours by profile"
        className="flex flex-wrap gap-2"
      >
        {profiles.map((p) => {
          const isActive = p === active;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setActive(p)}
              aria-pressed={isActive}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors duration-200 cursor-pointer",
                isActive
                  ? "border-gold bg-gold text-ink-strong"
                  : "border-line-strong bg-surface-2 text-ink-muted hover:border-gold-dim hover:text-ink",
              )}
            >
              {p}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {shown.length} flavours shown
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((f) => (
          <li
            key={f.id}
            className={cn(
              "rounded-card border border-line bg-surface-2/60 p-4 transition-colors duration-200",
              f.availability === "OUT"
                ? "opacity-55"
                : "hover:border-gold-dim",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-ink text-balance-safe">
                  {f.name}
                </p>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-faint">
                  {f.brand}
                </p>
              </div>
              <AvailabilityBadge availability={f.availability} />
            </div>
            {f.description ? (
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                {f.description}
              </p>
            ) : null}
            <Badge tone="neutral" className="mt-3">
              {f.profile}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AvailabilityBadge({
  availability,
}: {
  availability: FlavourCard["availability"];
}) {
  // Status is carried by the words themselves, not by colour alone.
  if (availability === "OUT") {
    return (
      <Badge tone="neutral" className="shrink-0">
        Sold out
      </Badge>
    );
  }
  if (availability === "LAST_FEW") {
    return (
      <Badge tone="warn" className="shrink-0">
        Last few
      </Badge>
    );
  }
  return null;
}
