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

const TOP_UP_TIERS = [
  { amount: 100, label: "Starter", description: "Quick top-up" },
  { amount: 500, label: "Basic", description: "For light use" },
  { amount: 1000, label: "Standard", description: "Regular use" },
  { amount: 2500, label: "Popular", description: "Best value" },
  { amount: 5000, label: "Pro", description: "Power users" },
  { amount: 10000, label: "Business", description: "Team usage" },
];

export function TopUpDialog({ currency = "KES" }: { currency?: string }) {
  const [amount, setAmount] = useState<number>(5000);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");

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

  function handleTierSelect(tierAmount: number) {
    setAmount(tierAmount);
    setCustomAmount("");
  }

  function handleCustomAmountChange(value: string) {
    setCustomAmount(value);
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      setAmount(num);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Top up wallet</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top up your wallet</DialogTitle>
          <DialogDescription>
            Choose a tier or enter a custom amount. You'll be redirected to Paystack to complete payment securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TOP_UP_TIERS.map((tier) => (
              <button
                key={tier.amount}
                onClick={() => handleTierSelect(tier.amount)}
                className={`rounded-xl border p-4 text-left transition-all duration-200 hover-lift ${
                  amount === tier.amount
                    ? "border-2 border-primary bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card hover:border-primary/30"
                }`}
              >
                <div className="font-semibold">{tier.label}</div>
                <div className="text-lg font-bold">{tier.amount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{tier.description}</div>
              </button>
            ))}
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or custom amount</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Custom amount ({currency})</label>
            <Input
              type="number"
              min={100}
              max={1000000}
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              placeholder="Enter amount..."
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Minimum: 100 {currency}</span>
            <span>Maximum: 1,000,000 {currency}</span>
          </div>

          <Button 
            className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
            onClick={handleTopUp} 
            disabled={loading || amount < 100 || amount > 1000000}
          >
            {loading ? "Redirecting…" : `Pay ${amount.toLocaleString()} ${currency}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
