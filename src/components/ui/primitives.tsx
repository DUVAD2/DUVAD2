import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface-2/70 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pb-3", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "font-display text-lg font-semibold text-ink text-balance-safe",
        className,
      )}
      {...props}
    />
  );
}

const badgeTones = {
  neutral: "border-line-strong bg-surface-3 text-ink-muted",
  gold: "border-gold-dim bg-gold/15 text-gold-soft",
  ok: "border-ok/30 bg-ok/10 text-ok",
  warn: "border-warn/30 bg-warn/10 text-warn",
  bad: "border-bad/30 bg-bad/10 text-bad",
} as const;

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        // Badges wrap rather than clip: flavour and status labels get long.
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink",
        "placeholder:text-ink-faint transition-colors duration-200",
        "hover:border-gold-dim focus:border-gold focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink",
        "placeholder:text-ink-faint transition-colors duration-200",
        "hover:border-gold-dim focus:border-gold focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="space-y-1.5">
      {/* Visible label, never a placeholder standing in for one. */}
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {children}
      {/* Error sits next to the field it belongs to, not in a summary far away. */}
      {error ? (
        <p id={errorId} className="text-xs text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  className,
}: {
  eyebrow?: string;
  title: string;
  blurb?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl text-balance-safe">
        {title}
      </h2>
      {blurb ? (
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          {blurb}
        </p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <p className="font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-muted">{hint}</p> : null}
    </div>
  );
}
