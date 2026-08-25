"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Flame, LayoutGrid, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PosShell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/pos/logout", { method: "POST" });
    router.push("/pos/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/pos" className="flex items-center gap-2.5 text-ink">
            <Flame className="size-5 text-gold" aria-hidden="true" />
            <span className="font-display text-lg font-semibold">Till</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/pos">
                <LayoutGrid aria-hidden="true" />
                <span className="hidden sm:inline">Tabs</span>
              </Link>
            </Button>
            {user.role === "OWNER" ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/admin">
                  <BarChart3 aria-hidden="true" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            ) : null}
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.name}
            </span>
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
