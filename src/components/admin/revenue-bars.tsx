"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type TrendPoint = { label: string; cents: number };

/**
 * One measure, one series, so identity needs no legend — the heading names it.
 * Colour is a single hue (gold); today's bar is separated by weight, not by a
 * second hue, so the chart never depends on hue comparison to be read.
 */
export function RevenueBars({
  data,
  currency,
}: {
  data: TrendPoint[];
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.cents), 1);
  const todayIndex = data.length - 1;

  return (
    <div>
      <div className="flex h-40 items-end gap-2" role="group" aria-label="Revenue by day">
        {data.map((d, i) => {
          const pct = (d.cents / max) * 100;
          const isToday = i === todayIndex;
          const isHover = hover === i;
          return (
            <div
              key={d.label + i}
              className="relative flex h-full flex-1 flex-col justify-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              aria-label={`${d.label}: ${formatMoney(d.cents, currency)}`}
            >
              {isHover ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-full z-10 mb-2 flex justify-center">
                  <span className="whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-xs tabular-nums text-ink shadow-lg">
                    {formatMoney(d.cents, currency)}
                  </span>
                </div>
              ) : null}
              <div
                className={cn(
                  // 4px rounded data-end, anchored to the baseline.
                  "w-full rounded-t transition-colors duration-200",
                  isToday ? "bg-gold" : "bg-gold/35",
                  isHover && !isToday && "bg-gold/60",
                )}
                style={{ height: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div
            key={d.label + i}
            className={cn(
              "flex-1 text-center text-xs",
              i === todayIndex ? "font-semibold text-ink" : "text-ink-faint",
            )}
          >
            {i === todayIndex ? "Today" : d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
