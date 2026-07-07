import crypto from "crypto";
import { isEnabledCurrency } from "./currencies";

const BASE_URL = "https://api.paystack.co";

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

export interface InitializePaymentParams {
  email: string;
  amountKobo: number;
  reference: string;
  currency?: string; // defaults to DEFAULT_CURRENCY (KES) if omitted
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  plan?: string; // Paystack plan code, for subscriptions
}

export async function initializeTransaction(params: InitializePaymentParams) {
  const currency = params.currency ?? undefined;
  if (currency && !isEnabledCurrency(currency)) {
    throw new Error(
      `Currency "${currency}" is not enabled on this Paystack account. ` +
        `Enabled currencies: KES, USD.`
    );
  }

  const res = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      currency,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      plan: params.plan,
    }),
  });

  if (!res.ok) {
    throw new Error(`Paystack initialize failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Paystack verify failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Verifies the `x-paystack-signature` header against the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}
