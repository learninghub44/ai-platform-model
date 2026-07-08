"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ErrorState
        label="Couldn't load your dashboard"
        hint="Something went wrong while fetching your account data."
        onRetry={reset}
      />
    </div>
  );
}
