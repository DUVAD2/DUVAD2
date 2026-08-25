import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StockRow = {
  id: string;
  name: string;
  brand: string;
  profile: string;
  stockGrams: number;
  lowStockGrams: number;
  status: "OK" | "LOW" | "OUT";
};

const GRAMS_PER_BOWL = 20;

/**
 * Stock status carries an icon and a written label as well as colour: the
 * palette validator put green/amber at ΔE 7.3 for protanopia, which is only
 * legal with secondary encoding. Never let the colour be the only signal.
 */
const STATUS = {
  OK: {
    label: "In stock",
    icon: CheckCircle2,
    text: "text-ok",
    bar: "bg-ok",
  },
  LOW: {
    label: "Running low",
    icon: AlertTriangle,
    text: "text-warn",
    bar: "bg-warn",
  },
  OUT: {
    label: "Out of stock",
    icon: XCircle,
    text: "text-bad",
    bar: "bg-bad",
  },
} as const;

export function StockList({ rows }: { rows: StockRow[] }) {
  // The meter is relative to the best-stocked flavour on the shelf — a real,
  // explainable reference rather than an invented "full tin" constant.
  const max = Math.max(...rows.map((r) => r.stockGrams), 1);

  const sorted = [...rows].sort((a, b) => {
    const rank = { OUT: 0, LOW: 1, OK: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return a.stockGrams - b.stockGrams;
  });

  return (
    <div>
      <ul className="space-y-3">
        {sorted.map((r) => {
          const s = STATUS[r.status];
          const Icon = s.icon;
          const bowls = Math.floor(r.stockGrams / GRAMS_PER_BOWL);
          return (
            <li key={r.id}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-ink text-balance-safe">
                    {r.name}
                  </span>
                  <span className="ml-2 text-xs text-ink-faint">{r.brand}</span>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-ink">
                  {r.stockGrams} g
                  <span className="ml-1.5 text-xs text-ink-faint">
                    ≈ {bowls} {bowls === 1 ? "bowl" : "bowls"}
                  </span>
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"
                  role="img"
                  aria-label={`${r.name}: ${r.stockGrams} grams, ${s.label}`}
                >
                  <div
                    className={cn("h-full rounded-full", s.bar)}
                    style={{
                      width: `${Math.max((r.stockGrams / max) * 100, 1.5)}%`,
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-xs font-medium",
                    s.text,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {s.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-ink-faint">
        Bars are relative to your best-stocked flavour. A bowl is about{" "}
        {GRAMS_PER_BOWL}g; &ldquo;running low&rdquo; uses the threshold set per
        flavour.
      </p>
    </div>
  );
}
