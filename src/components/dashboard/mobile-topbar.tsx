"use client";

import Link from "next/link";
import { Menu, LayoutDashboard, CreditCard, Sparkles, Settings, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/ai-playground", label: "AI Playground", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileTopbar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="border-b border-ink-border bg-ink px-4 py-3 md:hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between text-ink-foreground">
          <Logo />
          <Menu className="h-5 w-5" />
        </summary>
        <nav className="mt-3 space-y-1 border-t border-ink-border pt-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-white/5 hover:text-ink-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-white/5 hover:text-ink-foreground"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>
      </details>
    </div>
  );
}
