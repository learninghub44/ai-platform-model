"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function BillingCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      return;
    }
    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status === "success" ? "success" : "failed"))
      .catch(() => setStatus("failed"));
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Confirming your payment…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <p className="font-display text-lg font-medium">Payment confirmed</p>
              <p className="text-sm text-muted-foreground">Your wallet or plan has been updated.</p>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="font-display text-lg font-medium">Payment not confirmed</p>
              <p className="text-sm text-muted-foreground">
                Nothing was charged, or verification hasn't completed yet. Check billing history for the latest status.
              </p>
            </>
          )}
          <Button className="mt-2" onClick={() => router.push("/dashboard/billing")}>
            Back to billing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
