import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// This route group intentionally skips the standard DashboardSidebar /
// MobileTopbar chrome used by (dashboard). The chat experience is a
// full-viewport, single-scroll-region app shell (like ChatGPT) — nesting it
// inside the generic dashboard chrome produced two overlapping sidebars and
// a broken height calculation. Its own sidebar carries the primary app nav
// (Dashboard, Billing, Settings, Admin, sign out) so navigation still works.
export default async function ChatGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  return <div className="h-screen overflow-hidden bg-background">{children}</div>;
}
