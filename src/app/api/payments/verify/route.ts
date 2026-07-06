import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/payments/paystack";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("reference", reference)
    .eq("user_id", user.id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (payment.status === "success") {
    return NextResponse.json({ status: "success", payment });
  }

  try {
    const result = await verifyTransaction(reference);
    const paystackStatus = result.data.status; // "success" | "failed" | "abandoned"

    if (paystackStatus === "success") {
      // Unlock the feature: wallet topup credits the wallet, subscription
      // activates the plan. Both paths run through Postgres so the wallet
      // ledger trigger keeps balances consistent.
      await supabase
        .from("payments")
        .update({ status: "success", verified_at: new Date().toISOString() })
        .eq("reference", reference);

      if (payment.kind === "wallet_topup") {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (wallet) {
          await supabase.from("wallet_transactions").insert({
            wallet_id: wallet.id,
            user_id: user.id,
            type: "credit",
            amount_kobo: payment.amount_kobo,
            reference,
            description: "Wallet top-up via Paystack",
          });
        }
      }

      return NextResponse.json({ status: "success" });
    }

    await supabase.from("payments").update({ status: "failed" }).eq("reference", reference);
    return NextResponse.json({ status: "failed" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 502 }
    );
  }
}
