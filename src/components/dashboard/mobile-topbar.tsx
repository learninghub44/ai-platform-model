"use client";

import Link from "next/link";
import { Menu, LayoutDashboard, CreditCard, Sparkles, Settings, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/ai-playground", label: "AI Playground", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileTopbar({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex h-full flex-col p-6 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              >
                <ShieldCheck className="h-5 w-5" />
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
