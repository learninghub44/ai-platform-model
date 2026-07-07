import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UsersTable } from "@/components/dashboard/users-table";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: summary }, { data: users }] = await Promise.all([
    supabase.from("payments_summary").select("*").eq("status", "success").order("day", { ascending: false }).limit(14),
    supabase.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }).limit(100),
  ]);

  const totalRevenueKobo = (summary ?? []).reduce((sum, r) => sum + (r.total_kobo ?? 0), 0);
  const totalTx = (summary ?? []).reduce((sum, r) => sum + (r.tx_count ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-medium">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Revenue and user management, in one view.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Revenue, last 14 days</CardDescription>
            <p className="font-mono-data text-3xl font-medium">
              {(totalRevenueKobo / 100).toLocaleString(undefined, { style: "currency", currency: "KES" })}
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Successful transactions</CardDescription>
            <p className="font-mono-data text-3xl font-medium">{totalTx}</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by day</CardTitle>
        </CardHeader>
        <CardContent>
          {summary && summary.length > 0 ? (
            <RevenueChart data={summary as any} />
          ) : (
            <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
              No successful payments yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable initialUsers={(users as any) ?? []} currentUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
