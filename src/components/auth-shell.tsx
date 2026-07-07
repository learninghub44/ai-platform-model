import Link from "next/link";
import { Logo } from "@/components/logo";
import { LedgerTape } from "@/components/ledger-tape";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-10 md:flex">
        <Link href="/">
          <Logo />
        </Link>
        <div>
          <h2 className="font-display max-w-sm text-2xl font-medium leading-snug text-ink-foreground">
            {title}
          </h2>
          <p className="mt-3 max-w-sm text-sm text-ink-muted">{subtitle}</p>
        </div>
        <LedgerTape compact className="max-w-sm" />
      </div>

      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex justify-center md:hidden">
            <Logo dark={false} />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
