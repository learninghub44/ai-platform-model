import Link from "next/link";
import { Wallet, CreditCard, Sparkles, ArrowUpRight, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { UsageChart } from "@/components/dashboard/usage-chart";

function formatMoney(kobo: number, currency = "KES") {
  return (kobo / 100).toLocaleString(undefined, { style: "currency", currency });
}

const STATUS_VARIANT: Record<string, "default" | "amber" | "destructive" | "outline"> = {
  success: "default",
  pending: "amber",
  failed: "destructive",
  refunded: "outline",
};

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [{ data: entitlements }, { data: recentPayments }, { data: recentAiCalls }, { data: usageWindow }] =
    await Promise.all([
      supabase.from("user_entitlements").select("*").eq("user_id", user!.id).single(),
      supabase
        .from("payments")
        .select("id, kind, status, amount_kobo, currency, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_usage_logs")
        .select("id, provider, model, succeeded, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_usage_logs")
        .select("created_at")
        .eq("user_id", user!.id)
        .gte("created_at", sevenDaysAgo.toISOString()),
    ]);

  const currency = entitlements?.currency ?? "KES";

  const usageByDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    usageByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of usageWindow ?? []) {
    const key = row.created_at.slice(0, 10);
    if (usageByDay.has(key)) usageByDay.set(key, (usageByDay.get(key) ?? 0) + 1);
  }
  const usageChartData = Array.from(usageByDay.entries()).map(([day, calls]) => ({ day, calls }));
  const totalCallsThisWeek = usageChartData.reduce((sum, d) => sum + d.calls, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-medium">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything moving through your account, in one place.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card
          className="animate-slide-up opacity-0 [animation-fill-mode:forwards] transition-shadow hover:shadow-md"
          style={{ animationDelay: "0ms" }}
        >
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Wallet balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono-data text-3xl font-medium">
              {formatMoney(entitlements?.balance_kobo ?? 0, currency)}
            </p>
            <Link href="/dashboard/billing" className="mt-4 inline-block">
              <Button size="sm" variant="outline" className="gap-1.5">
                Top up <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card
          className="animate-slide-up opacity-0 [animation-fill-mode:forwards] transition-shadow hover:shadow-md"
          style={{ animationDelay: "75ms" }}
        >
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Current plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-medium capitalize">{entitlements?.plan_code ?? "free"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entitlements?.subscription_status ?? "No active subscription"}
            </p>
            <Link href="/dashboard/billing" className="mt-4 inline-block">
              <Button size="sm" variant="outline" className="gap-1.5">
                Manage plan <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card
        className="animate-slide-up opacity-0 [animation-fill-mode:forwards]"
        style={{ animationDelay: "150ms" }}
      >
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> AI usage, last 7 days
          </CardTitle>
          <Badge variant="outline" className="font-mono-data">
            {totalCallsThisWeek} calls
          </Badge>
        </CardHeader>
        <CardContent>
          {totalCallsThisWeek > 0 ? (
            <UsageChart data={usageChartData} />
          ) : (
            <EmptyState
              icon={Activity}
              label="No AI usage yet this week"
              hint="Calls you make from the AI Playground will show up here."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          className="animate-slide-up opacity-0 [animation-fill-mode:forwards]"
          style={{ animationDelay: "225ms" }}
        >
          <CardHeader>
            <CardTitle className="text-base">Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments && recentPayments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="capitalize">{p.kind.replace("_", " ")}</TableCell>
                      <TableCell className="font-mono-data">{formatMoney(p.amount_kobo, p.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Wallet}
                label="No payments yet"
                hint="Top up your wallet or subscribe to see activity here."
                action={
                  <Link href="/dashboard/billing">
                    <Button size="sm" variant="outline">
                      Top up wallet
                    </Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card
          className="animate-slide-up opacity-0 [animation-fill-mode:forwards]"
          style={{ animationDelay: "300ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> Recent AI calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAiCalls && recentAiCalls.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAiCalls.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="capitalize">{c.provider}</TableCell>
                      <TableCell className="font-mono-data text-xs">{c.model ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={c.succeeded ? "default" : "destructive"}>
                          {c.succeeded ? "Success" : "Failed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Sparkles}
                label="No AI calls yet"
                hint="Try the AI Playground to see the failover chain in action."
                action={
                  <Link href="/dashboard/ai-playground">
                    <Button size="sm" variant="outline">
                      Open playground
                    </Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
