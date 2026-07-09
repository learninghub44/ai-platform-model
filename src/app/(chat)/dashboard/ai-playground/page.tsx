import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaygroundClient } from "./playground-client";

export default async function AiPlaygroundPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <PlaygroundClient
      isAdmin={profile?.role === "admin"}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? null}
      avatarUrl={profile?.avatar_url ?? null}
    />
  );
}
