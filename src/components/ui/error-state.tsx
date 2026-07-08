import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  label?: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  label = "Something went wrong",
  hint = "Please try again, or reload the page if the problem persists.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "animate-fade-in flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/40 bg-destructive/5 py-12 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="mt-4 text-sm font-medium">{label}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
