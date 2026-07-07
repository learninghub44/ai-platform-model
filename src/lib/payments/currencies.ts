/**
 * Official currencies supported by Paystack.
 * Source: https://paystack.com/docs/api/#supported-currency
 *
 * A single Paystack business account is generally locked to one
 * "home" currency based on the country it was registered in, with one
 * exception: Kenya- and Nigeria-registered accounts can additionally
 * accept USD alongside their home currency. Sending a currency your
 * account isn't enabled for will fail at `initializeTransaction`.
 */

export type PaystackCurrencyCode = "NGN" | "USD" | "GHS" | "ZAR" | "KES" | "XOF";

export interface PaystackCurrencyInfo {
  code: PaystackCurrencyCode;
  subunit: string;
  /** Minimum transaction amount, in the *major* unit (e.g. 3.00 for KES). */
  minMajorUnit: number;
  availability: string;
}

export const PAYSTACK_CURRENCIES: Record<PaystackCurrencyCode, PaystackCurrencyInfo> = {
  NGN: { code: "NGN", subunit: "Kobo", minMajorUnit: 50.0, availability: "Nigeria" },
  USD: { code: "USD", subunit: "Cent", minMajorUnit: 2.0, availability: "Kenya and Nigeria" },
  GHS: { code: "GHS", subunit: "Pesewa", minMajorUnit: 0.1, availability: "Ghana" },
  ZAR: { code: "ZAR", subunit: "Cent", minMajorUnit: 1.0, availability: "South Africa" },
  KES: { code: "KES", subunit: "Cent", minMajorUnit: 3.0, availability: "Kenya" },
  XOF: { code: "XOF", subunit: "-", minMajorUnit: 1.0, availability: "Côte d'Ivoire" },
};

/**
 * Currencies enabled for THIS app's Paystack account.
 * Zetu Business Solutions is Kenya-registered, so KES is the home
 * currency; USD is available on the same account as a secondary option.
 * Update this list if the underlying Paystack account changes.
 */
export const ENABLED_CURRENCIES: PaystackCurrencyCode[] = ["KES", "USD"];

export const DEFAULT_CURRENCY: PaystackCurrencyCode = "KES";

export function isEnabledCurrency(code: string): code is PaystackCurrencyCode {
  return (ENABLED_CURRENCIES as string[]).includes(code);
}

/** Converts a major-unit amount (e.g. shillings) to the integer subunit Paystack expects. */
export function toSubunit(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

export function fromSubunit(amountSubunit: number): number {
  return amountSubunit / 100;
}
