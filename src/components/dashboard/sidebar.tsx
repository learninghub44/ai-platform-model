"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, Sparkles, Settings, ShieldCheck, LogOut, Search, Command, ChevronRight, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
        {!collapsed && <Logo />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === "/admin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {/* Command Bar Trigger */}
      {!collapsed && (
        <div className="px-3 pb-4">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto flex h-5 items-center gap-1 rounded border border-border/50 bg-background px-1.5 text-[10px] font-medium">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>
        </div>
      )}

      {/* User Section */}
      <div className="border-t border-border/50 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-border/50">
            <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? email} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{fullName || "Your account"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
