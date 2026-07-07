import Link from "next/link";
import { ArrowRight, ShieldCheck, Wallet, Cpu, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { LedgerTape } from "@/components/ledger-tape";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Auth & roles, done once",
    description:
      "Email/password, Google sign-in, verification, reset — with role-based access already wired into middleware.",
  },
  {
    icon: Wallet,
    title: "Wallet & subscriptions",
    description:
      "A credit ledger and Paystack-backed subscriptions, both driven by a single source of truth in Postgres.",
  },
  {
    icon: Cpu,
    title: "AI that doesn't go down",
    description:
      "Eight providers behind one call. If one is unconfigured or fails, the next takes over — automatically.",
  },
  {
    icon: ImageIcon,
    title: "Storage that's ready",
    description: "Supabase Storage for files, Cloudinary for optimized delivery — both tracked in one table.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "0",
    tagline: "For getting a product off the ground",
    features: ["Core auth & dashboard", "Wallet with manual top-ups", "1 AI provider of your choice"],
  },
  {
    name: "Pro",
    price: "5,000",
    tagline: "For products taking on real usage",
    features: ["Everything in Free", "Full 8-provider AI failover chain", "Priority support", "Admin revenue console"],
    highlighted: true,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="border-b border-ink-border/60 bg-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <span className="font-mono-data text-xs uppercase tracking-[0.2em] text-primary">
              Operations console
            </span>
            <h1 className="mt-4 font-display text-4xl font-medium leading-[1.1] text-ink-foreground sm:text-5xl">
              Run the money and the model from one ledger.
            </h1>
            <p className="mt-5 max-w-md text-ink-muted">
              Wallets, subscriptions, and AI usage tend to live in three different dashboards. This one keeps them
              in the same place — so you can see what happened, to whom, and why, without switching tabs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="border-ink-border text-ink-foreground hover:bg-white/10">
                  See what's inside
                </Button>
              </a>
            </div>
          </div>

          <LedgerTape />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-2xl font-medium">What's already built</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          The parts every product needs and re-implements badly — so the first week goes to your product, not your
          foundation.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="h-5 w-5 text-primary" />
                <CardTitle className="mt-3 text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Architecture strip */}
      <section id="architecture" className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-medium">How a request moves through it</h2>
          <ol className="mt-8 grid gap-6 text-sm sm:grid-cols-4">
            {[
              ["Middleware", "Refreshes the session, checks the route against auth state and role."],
              ["API route", "Talks to Supabase, Paystack, Cloudinary, or the AI layer — each fails independently."],
              ["Postgres + RLS", "Every row is scoped to its owner; admins get a policy-level exception, not a bypass."],
              ["Response", "Wallet balances and usage logs update from triggers, not application-side math."],
            ].map(([title, desc], i) => (
              <li key={title} className="relative pl-6">
                <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary" />
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-2xl font-medium">Pricing</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Ships with these two plans seeded in the database — rename, reprice, or add more directly in
          `subscription_plans`.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-primary shadow-md" : undefined}
            >
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="font-mono-data mt-4 text-3xl font-medium">
                  {plan.price === "0" ? "Free" : `₦${plan.price}`}
                  {plan.price !== "0" && <span className="text-sm text-muted-foreground"> /mo</span>}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-6 block">
                  <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                    Choose {plan.name}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
