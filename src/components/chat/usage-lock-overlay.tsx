"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatResetTime(resetTime: string | null): string | null {
  if (!resetTime) return null;
  const reset = new Date(resetTime);
  if (Number.isNaN(reset.getTime()) || reset.getTime() <= Date.now()) return null;
  return reset.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(reset.toDateString() !== new Date().toDateString()
      ? { month: "short", day: "numeric" }
      : {}),
  });
}

export function UsageLockOverlay({ resetTime }: { resetTime: string | null }) {
  const resetLabel = formatResetTime(resetTime);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/90 backdrop-blur-md">
      <div className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card p-6 text-center shadow-lg animate-fade-in">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-base font-medium">You're out of credit</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You've used up today's free requests.
            {resetLabel ? ` Your limit resets at ${resetLabel}, or ` : " "}
            Upgrade for more requests and priority speed.
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className={cn(buttonVariants({ variant: "default" }), "mt-1 w-full")}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}
