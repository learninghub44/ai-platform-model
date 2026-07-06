import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: entitlements } = await supabase
    .from("user_entitlements")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Available credit balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {((entitlements?.balance_kobo ?? 0) / 100).toLocaleString(undefined, {
                style: "currency",
                currency: "NGN",
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Current subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium capitalize">
              {entitlements?.plan_code ?? "free"}
            </p>
            <p className="text-sm text-muted-foreground">
              {entitlements?.subscription_status ?? "no active subscription"}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
