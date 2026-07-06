import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Platform</h1>
      <p className="max-w-md text-muted-foreground">
        A production-ready starter built on Next.js, Supabase, Paystack, and a
        modular multi-provider AI layer.
      </p>
      <div className="flex gap-3">
        <Link href="/login">
          <Button>Sign in</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline">Create account</Button>
        </Link>
      </div>
    </main>
  );
}
