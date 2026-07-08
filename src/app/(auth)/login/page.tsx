"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(searchParams.get("redirectTo") || "/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <AuthShell
      title="Run the money and the model from one ledger."
      subtitle="Wallets, subscriptions, and AI usage — one console, one source of truth."
    >
      <h1 className="font-display text-2xl font-medium">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back — enter your details below.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Password</label>
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
        Continue with Google
      </Button>

      <div className="mt-6 flex justify-between text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-foreground hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="hover:text-foreground hover:underline">
          Create account
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Having trouble signing in?{" "}
        <a href="mailto:support@xetuai.com" className="text-foreground hover:underline">
          Contact support
        </a>
      </p>
    </AuthShell>
  );
}
