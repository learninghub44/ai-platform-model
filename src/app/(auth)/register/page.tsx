"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";
import { MailCheck } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  return (
    <AuthShell
      title="The parts every product needs, done once."
      subtitle="Auth, wallet, subscriptions, and an AI layer that doesn't go down — ready before you write a single feature."
    >
      {submitted ? (
        <div className="text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-xl font-medium">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Confirm
            your address to activate your account.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            Didn&apos;t get the email?{" "}
            <a href="mailto:support@xetuai.com" className="text-foreground hover:underline">
              Contact support
            </a>
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display text-2xl font-medium">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start free — upgrade whenever you need to.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Full name</label>
              <Input
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
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
                placeholder="At least 8 characters"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Need help?{" "}
            <a href="mailto:support@xetuai.com" className="text-foreground hover:underline">
              Contact support
            </a>
          </p>
        </>
      )}
    </AuthShell>
  );
}
