"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000];

export function TopUpDialog({ currency = "NGN" }: { currency?: string }) {
  const [amount, setAmount] = useState<number>(5000);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleTopUp() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountKobo: Math.round(amount * 100),
          kind: "wallet_topup",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      window.location.href = data.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Top up wallet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top up your wallet</DialogTitle>
          <DialogDescription>You'll be redirected to Paystack to complete payment securely.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  amount === a ? "border-primary bg-primary/10 text-primary" : "hover:bg-secondary"
                }`}
              >
                {a.toLocaleString()}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Amount ({currency})</label>
            <Input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <Button className="w-full" onClick={handleTopUp} disabled={loading || amount <= 0}>
            {loading ? "Redirecting…" : `Pay ${amount.toLocaleString()} ${currency}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
