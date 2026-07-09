import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TopUpDialog } from "@/components/dashboard/top-up-dialog";
import { SubscribeButton } from "@/components/dashboard/subscribe-button";
import { PaymentHistoryTable } from "@/components/dashboard/payment-history-table";

function formatMoney(kobo: number, currency = "KES") {
  return (kobo / 100).toLocaleString(undefined, { style: "currency", currency });
}

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
      <div className="animate-fade-in flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Wallet, plan, and payment history.</p>
        </div>
        <TopUpDialog currency={currency} />
      </div>

      <Card
        className="animate-slide-up opacity-0 [animation-fill-mode:forwards]"
        style={{ animationDelay: "0ms" }}
      >
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
          {plans?.map((plan, i) => {
            const isCurrent = entitlements?.plan_code === plan.code;
            return (
              <Card
                key={plan.id}
                className={`animate-slide-up opacity-0 [animation-fill-mode:forwards] transition-shadow hover:shadow-md ${
                  isCurrent ? "border-primary" : ""
                }`}
                style={{ animationDelay: `${75 + i * 75}ms` }}
              >
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
                    <SubscribeButton
                      planId={plan.id}
                      priceKobo={plan.price_kobo}
                      currency={plan.currency}
                      label={`Subscribe to ${plan.name}`}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-medium">Payment history</h2>
        <Card
          className="animate-slide-up mt-4 opacity-0 [animation-fill-mode:forwards]"
          style={{ animationDelay: `${75 + (plans?.length ?? 0) * 75}ms` }}
        >
          <CardContent className="pt-6">
            <PaymentHistoryTable payments={payments ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
