import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-6 w-6", className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" className="text-primary" />
      <path
        d="M9 17.5L14 22L23 10"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className, dark = true }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn(
          "font-display text-[15px] font-semibold tracking-tight",
          dark ? "text-ink-foreground" : "text-foreground"
        )}
      >
        Platform<span className="text-primary">.</span>
      </span>
    </div>
  );
}
