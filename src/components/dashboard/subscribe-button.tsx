"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubscribeButton({
  planId,
  priceKobo,
  currency,
  label,
  variant = "default",
}: {
  planId: string;
  priceKobo: number;
  currency?: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountKobo: priceKobo,
          currency,
          kind: "subscription",
          planId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start subscription");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Button className="w-full" variant={variant} onClick={handleSubscribe} disabled={loading || priceKobo === 0}>
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
