import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { TopUpDialog } from "@/components/dashboard/top-up-dialog";
import { SubscribeButton } from "@/components/dashboard/subscribe-button";

function formatMoney(kobo: number, currency = "KES") {
  return (kobo / 100).toLocaleString(undefined, { style: "currency", currency });
}

const STATUS_VARIANT: Record<string, "default" | "amber" | "destructive" | "outline"> = {
  success: "default",
  pending: "amber",
  failed: "destructive",
  refunded: "outline",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entitlements }, { data: plans }, { data: payments }] = await Promise.all([
    supabase.from("user_entitlements").select("*").eq("user_id", user!.id).single(),
    supabase.from("subscription_plans").select("*").eq("is_active", true).order("price_kobo"),
    supabase
      .from("payments")
      .select("id, kind, status, amount_kobo, currency, reference, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const currency = entitlements?.currency ?? "KES";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Wallet, plan, and payment history.</p>
        </div>
        <TopUpDialog currency={currency} />
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Wallet balance</CardDescription>
          <p className="font-mono-data text-3xl font-medium">
            {formatMoney(entitlements?.balance_kobo ?? 0, currency)}
          </p>
        </CardHeader>
      </Card>

      <div>
        <h2 className="font-display text-lg font-medium">Plans</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {plans?.map((plan) => {
            const isCurrent = entitlements?.plan_code === plan.code;
            return (
              <Card key={plan.id} className={isCurrent ? "border-primary" : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isCurrent && <Badge>Current plan</Badge>}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <p className="font-mono-data mt-3 text-2xl font-medium">
                    {plan.price_kobo === 0
                      ? "Free"
                      : formatMoney(plan.price_kobo, plan.currency)}
                    {plan.price_kobo > 0 && (
                      <span className="text-sm text-muted-foreground"> /{plan.interval}</span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="mb-4 space-y-1.5 text-sm text-muted-foreground">
                    {(plan.features as string[]).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && plan.price_kobo > 0 && (
                    <SubscribeButton planId={plan.id} priceKobo={plan.price_kobo} label={`Subscribe to ${plan.name}`} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-medium">Payment history</h2>
        <Card className="mt-4">
          <CardContent className="pt-6">
            {payments && payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono-data text-xs">{p.reference}</TableCell>
                      <TableCell className="capitalize">{p.kind.replace("_", " ")}</TableCell>
                      <TableCell className="font-mono-data">{formatMoney(p.amount_kobo, p.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="capitalize">
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-md border border-dashed py-8 text-center">
                <p className="text-sm font-medium">No payments yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Top up your wallet or subscribe to a plan to see it here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
