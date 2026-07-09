import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to load profile in OnboardingPage:", error.message);
    throw new Error(`Could not load your profile (${error.message}). Please try again or contact support.`);
  }

  // Already onboarded — don't make them do it again.
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  return <OnboardingWizard fullName={profile?.full_name ?? null} />;
}
