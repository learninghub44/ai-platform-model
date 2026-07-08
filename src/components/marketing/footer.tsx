import Link from "next/link";
import { Mail } from "lucide-react";
import { Logo } from "@/components/logo";

const SUPPORT_EMAIL = "support@xetuai.com";

export function MarketingFooter() {
  return (
    <footer className="border-t border-ink-border/60 bg-ink">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Think. Create. Build. Your AI assistant for professional work and creative projects.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-ink-muted sm:items-end">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-2 hover:text-ink-foreground"
            >
              <Mail className="h-4 w-4" />
              {SUPPORT_EMAIL}
            </a>
            <div className="flex gap-6 text-xs">
              <Link href="/login" className="hover:text-ink-foreground">
                Sign in
              </Link>
              <a href="#pricing" className="hover:text-ink-foreground">
                Pricing
              </a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ink-foreground">
                Support
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-border/60 pt-6 text-xs text-ink-muted">
          © {new Date().getFullYear()} XETU AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
