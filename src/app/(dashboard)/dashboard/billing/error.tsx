"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function BillingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ErrorState
        label="Couldn't load billing"
        hint="We ran into a problem fetching your plan and payment history."
        onRetry={reset}
      />
    </div>
  );
}
