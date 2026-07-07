import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-border/60 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
          <a href="#features" className="transition-colors hover:text-ink-foreground">
            Features
          </a>
          <a href="#pricing" className="transition-colors hover:text-ink-foreground">
            Pricing
          </a>
          <a href="#architecture" className="transition-colors hover:text-ink-foreground">
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" className="text-ink-foreground hover:bg-white/10 hover:text-ink-foreground">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
