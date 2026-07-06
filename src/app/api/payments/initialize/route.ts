import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/payments/paystack";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { amountKobo, kind, planId, metadata } = body as {
    amountKobo: number;
    kind: "one_time" | "wallet_topup" | "subscription";
    planId?: string;
    metadata?: Record<string, unknown>;
  };

  if (!amountKobo || amountKobo <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const reference = `pay_${randomUUID()}`;

  // Record a pending payment row first so the webhook has something to update.
  const { error: insertError } = await supabase.from("payments").insert({
    user_id: user.id,
    kind,
    amount_kobo: amountKobo,
    reference,
    metadata: metadata ?? {},
    related_subscription_id: planId ?? null,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const paystackRes = await initializeTransaction({
      email: user.email!,
      amountKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/billing/callback`,
      metadata: { userId: user.id, kind, ...metadata },
    });

    await supabase
      .from("payments")
      .update({
        paystack_authorization_url: paystackRes.data.authorization_url,
        paystack_access_code: paystackRes.data.access_code,
      })
      .eq("reference", reference);

    return NextResponse.json({
      authorizationUrl: paystackRes.data.authorization_url,
      reference,
    });
  } catch (err) {
    await supabase.from("payments").update({ status: "failed" }).eq("reference", reference);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initialization failed" },
      { status: 502 }
    );
  }
}
