import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileTopbar } from "@/components/dashboard/mobile-topbar";

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile in DashboardGroupLayout:", error.message);
    throw new Error(`Could not load your profile (${error.message}). Please try again or contact support.`);
  }

  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        isAdmin={isAdmin}
        email={user.email ?? ""}
        fullName={profile?.full_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar
          isAdmin={isAdmin}
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
