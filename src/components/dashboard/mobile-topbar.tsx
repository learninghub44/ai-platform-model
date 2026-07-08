"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LayoutDashboard, CreditCard, Sparkles, Settings, ShieldCheck, X, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/ai-playground", label: "AI Playground", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileTopbar({
  isAdmin,
  email,
  fullName,
  avatarUrl,
}: {
  isAdmin: boolean;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const initials = (fullName || email || "?").slice(0, 2).toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/login");
    router.refresh();
  }

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
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="rounded-lg"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-xl md:hidden">
          {/* Account info */}
          <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
            <Avatar className="h-9 w-9 ring-2 ring-border/50">
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? email} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{fullName || "Your account"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-6">
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

          {/* Sign out — always visible at the bottom */}
          <div className="border-t border-border/50 p-6">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
