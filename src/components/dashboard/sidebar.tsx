"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Sparkles, Settings, ShieldCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { LedgerTape } from "@/components/ledger-tape";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/ai-playground", label: "AI Playground", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({
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
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-ink-border bg-ink text-ink-foreground md:flex">
      <div className="flex h-16 items-center border-b border-ink-border px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 text-ink-foreground"
                  : "text-ink-muted hover:bg-white/5 hover:text-ink-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/admin"
                ? "bg-white/10 text-ink-foreground"
                : "text-ink-muted hover:bg-white/5 hover:text-ink-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      <div className="px-3 pb-3">
        <LedgerTape compact />
      </div>

      <div className="flex items-center gap-3 border-t border-ink-border px-4 py-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? email} />
          <AvatarFallback className="bg-white/10 text-ink-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{fullName || "Your account"}</p>
          <p className="truncate text-[11px] text-ink-muted">{email}</p>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-white/10 hover:text-ink-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
