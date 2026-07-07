import Link from "next/link";
import { Logo } from "@/components/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-border/60 bg-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <Logo />
        <p className="text-xs text-ink-muted">
          © {new Date().getFullYear()} Platform. Built on Next.js, Supabase, and Paystack.
        </p>
        <div className="flex gap-6 text-xs text-ink-muted">
          <Link href="/login" className="hover:text-ink-foreground">
            Sign in
          </Link>
          <a href="#pricing" className="hover:text-ink-foreground">
            Pricing
          </a>
        </div>
      </div>
    </footer>
  );
}
