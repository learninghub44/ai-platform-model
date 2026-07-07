import { cn } from "@/lib/utils";

export interface LedgerEntry {
  label: string;
  detail: string;
  tone: "positive" | "pending" | "neutral";
}

const DEFAULT_ENTRIES: LedgerEntry[] = [
  { label: "wallet", detail: "+ credit 5,000.00", tone: "positive" },
  { label: "ai · claude", detail: "428 tokens · 640ms", tone: "neutral" },
  { label: "subscription", detail: "pro_monthly renewed", tone: "positive" },
  { label: "ai · groq", detail: "fallback used · openai down", tone: "pending" },
  { label: "payment", detail: "ref pay_8f2c… verified", tone: "positive" },
  { label: "wallet", detail: "− debit 1,200.00", tone: "neutral" },
  { label: "ai · gemini", detail: "212 tokens · 310ms", tone: "neutral" },
  { label: "subscription", detail: "invoice past_due", tone: "pending" },
];

const toneDot: Record<LedgerEntry["tone"], string> = {
  positive: "bg-primary",
  pending: "bg-accent",
  neutral: "bg-ink-muted",
};

function Row({ entry }: { entry: LedgerEntry }) {
  return (
    <div className="flex items-center gap-3 border-b border-ink-border/60 px-4 py-3 text-xs">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[entry.tone])} />
      <span className="font-mono-data uppercase tracking-wide text-ink-muted">{entry.label}</span>
      <span className="font-mono-data ml-auto text-ink-foreground/90">{entry.detail}</span>
    </div>
  );
}

export function LedgerTape({
  entries = DEFAULT_ENTRIES,
  className,
  compact = false,
}: {
  entries?: LedgerEntry[];
  className?: string;
  compact?: boolean;
}) {
  const doubled = [...entries, ...entries];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-ink-border bg-ink",
        compact ? "h-40" : "h-[420px]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-ink to-transparent" />
      <div className="animate-ledger-scroll">
        {doubled.map((entry, i) => (
          <Row key={i} entry={entry} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
