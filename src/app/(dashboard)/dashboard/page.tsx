import Link from "next/link";
import { Wallet, CreditCard, Sparkles, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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

  const [{ data: entitlements }, { data: recentPayments }, { data: recentAiCalls }] = await Promise.all([
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
  ]);

  const currency = entitlements?.currency ?? "KES";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-medium">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything moving through your account, in one place.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
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

        <Card>
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
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
              <EmptyState label="No payments yet" hint="Top up your wallet or subscribe to see activity here." />
            )}
          </CardContent>
        </Card>

        <Card>
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
              <EmptyState label="No AI calls yet" hint="Try the AI Playground to see the failover chain in action." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-md border border-dashed py-8 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
