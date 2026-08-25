"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const MAX = 8;

export function PinPad() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function press(digit: string) {
    setError(null);
    setPin((p) => (p.length >= MAX ? p : p + digit));
  }

  async function submit(value: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "PIN not recognised.");
        setPin("");
        setBusy(false);
        return;
      }
      router.push("/pos");
      router.refresh();
    } catch {
      setError("Network problem — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-xs">
      <div className="mb-6 text-center">
        <LockKeyhole className="mx-auto size-6 text-gold" aria-hidden="true" />
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Staff sign in
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Enter your PIN to open the till.</p>
      </div>

      {/* Dots show length without ever rendering the PIN itself. */}
      <div
        className="mb-2 flex justify-center gap-2.5"
        role="status"
        aria-label={`${pin.length} digits entered`}
      >
        {Array.from({ length: MAX }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-2.5 rounded-full transition-colors duration-200",
              i < pin.length ? "bg-gold" : "bg-surface-3",
            )}
          />
        ))}
      </div>

      <p className="mb-5 min-h-10 text-center text-sm" role="alert">
        {error ? <span className="text-bad">{error}</span> : null}
      </p>

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((k) => (
          <Button
            key={k}
            variant="secondary"
            onClick={() => press(k)}
            disabled={busy}
            className="h-16 font-display text-xl"
          >
            {k}
          </Button>
        ))}
        <Button
          variant="ghost"
          onClick={() => setPin((p) => p.slice(0, -1))}
          disabled={busy || pin.length === 0}
          className="h-16"
          aria-label="Delete last digit"
        >
          <Delete aria-hidden="true" />
        </Button>
        <Button
          variant="secondary"
          onClick={() => press("0")}
          disabled={busy}
          className="h-16 font-display text-xl"
        >
          0
        </Button>
        <Button
          onClick={() => submit(pin)}
          disabled={busy || pin.length < 4}
          className="h-16"
          aria-label="Sign in"
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Enter"}
        </Button>
      </div>
    </div>
  );
}
