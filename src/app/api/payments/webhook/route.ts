import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/payments/paystack";

// Paystack webhooks must be verified via raw body + HMAC signature, and
// should use the service-role client since there is no authenticated user
// session in this request.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const supabase = createServiceRoleClient();

  switch (event.event) {
    case "charge.success": {
      const reference: string = event.data.reference;

      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("reference", reference)
        .single();

      if (payment && payment.status !== "success") {
        await supabase
          .from("payments")
          .update({ status: "success", verified_at: new Date().toISOString() })
          .eq("reference", reference);

        if (payment.kind === "wallet_topup") {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("id")
            .eq("user_id", payment.user_id)
            .single();

          if (wallet) {
            await supabase.from("wallet_transactions").insert({
              wallet_id: wallet.id,
              user_id: payment.user_id,
              type: "credit",
              amount_kobo: payment.amount_kobo,
              reference,
              description: "Wallet top-up via Paystack webhook",
            });
          }
        }
      }
      break;
    }

    case "subscription.create":
    case "subscription.enable": {
      const customerCode = event.data.customer?.customer_code;
      const subscriptionCode = event.data.subscription_code;
      if (customerCode) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            paystack_subscription_code: subscriptionCode,
            paystack_customer_code: customerCode,
          })
          .eq("paystack_customer_code", customerCode);
      }
      break;
    }

    case "subscription.disable":
    case "subscription.not_renew": {
      const subscriptionCode = event.data.subscription_code;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("paystack_subscription_code", subscriptionCode);
      break;
    }

    case "invoice.payment_failed": {
      const subscriptionCode = event.data.subscription?.subscription_code;
      if (subscriptionCode) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("paystack_subscription_code", subscriptionCode);
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged but ignored.
      break;
  }

  return NextResponse.json({ received: true });
}
