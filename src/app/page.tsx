import Link from "next/link";
import { ArrowRight, Sparkles, FileText, Pen, Code, Palette, Book, Share, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const TEMPLATE_CARDS = [
  { icon: FileText, title: "CV Writing", description: "Create professional resumes" },
  { icon: Pen, title: "Content Writing", description: "Write engaging articles and copy" },
  { icon: Code, title: "Code Assistant", description: "Write, debug, and explain code" },
  { icon: Palette, title: "Design Ideas", description: "Generate creative concepts" },
];

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    tagline: "Perfect for getting started",
    features: ["10 requests per day", "Basic templates", "Standard response speed", "Daily limit reset"],
  },
  {
    name: "Plus",
    price: "500",
    period: "month",
    tagline: "For regular users",
    features: ["100 requests per day", "All templates", "Faster response speed", "Priority support"],
    highlighted: true,
  },
  {
    name: "Pro",
    price: "1,500",
    period: "month",
    tagline: "For power users",
    features: ["Unlimited requests", "All templates", "Fastest response speed", "Priority support", "Early access to features"],
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingNav isLoggedIn={!!user} />

      {/* Hero - Premium Design */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>AI-powered assistant for everything</span>
          </div>
          
          <h1 className="font-display text-5xl font-semibold leading-tight sm:text-6xl md:text-7xl tracking-tight">
            Your AI assistant for work and creativity
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Write CVs, create content, plan strategies, write code, design logos, and much more. 
            Powered by advanced AI models that work seamlessly behind the scenes.
          </p>
          
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2 rounded-xl shadow-sm">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-xl">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Template Cards */}
        <div className="mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_CARDS.map((card) => (
            <Card key={card.title} className="group border border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-glass-md transition-all duration-200 cursor-pointer hover-lift">
              <CardContent className="p-6">
                <div className="mb-4 rounded-xl bg-primary/10 p-3 w-fit group-hover:bg-primary/20 transition-colors">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-border/50 bg-muted/30 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Everything you need</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              From professional documents to creative projects, our AI assistant helps you accomplish more in less time.
            </p>
          </div>
          
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Professional Documents",
                description: "Create CVs, business plans, emails, and reports with professional formatting and tone.",
              },
              {
                icon: Code,
                title: "Code & Development",
                description: "Write clean code, debug issues, and get explanations for complex programming concepts.",
              },
              {
                icon: Palette,
                title: "Creative Design",
                description: "Generate design ideas, logo concepts, and visual content for your projects.",
              },
              {
                icon: Book,
                title: "Education & Learning",
                description: "Get help with coursework, assignments, and research summaries.",
              },
              {
                icon: Share,
                title: "Social Media",
                description: "Create engaging social media content that resonates with your audience.",
              },
              {
                icon: Search,
                title: "Research & Analysis",
                description: "Summarize complex research and extract key insights quickly.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border border-border/50 bg-card hover:border-primary/30 hover:shadow-glass-md transition-all duration-200 hover-lift">
                <CardHeader>
                  <div className="mb-3 rounded-xl bg-primary/10 p-2 w-fit">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight">Simple, affordable pricing</h2>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Start free with daily limits. Upgrade when you need more.
            </p>
          </div>
          
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "border bg-card transition-all duration-200 hover-lift",
                  plan.highlighted 
                    ? "border-2 border-primary shadow-lg shadow-primary/10 scale-105" 
                    : "border-border/50"
                )}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                  <p className="font-mono-data mt-4 text-3xl font-semibold">
                    {plan.price === "0" ? "Free" : `KES ${plan.price}`}
                    {plan.price !== "0" && <span className="text-sm text-muted-foreground font-normal"> /{plan.period}</span>}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-6 block">
                    <Button 
                      className="w-full rounded-xl" 
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      Choose {plan.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
