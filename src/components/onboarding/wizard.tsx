"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Code2,
  Megaphone,
  GraduationCap,
  MoreHorizontal,
  User,
  Users,
  FileText,
  Pen,
  Palette,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RoleType = "founder" | "developer" | "marketer" | "student" | "other";
type AccountType = "individual" | "team";
type UseCase = "cv_writing" | "content_writing" | "code_assistant" | "design_ideas" | "other";

const ROLE_OPTIONS: { value: RoleType; label: string; hint: string; icon: typeof User }[] = [
  { value: "founder", label: "Founder / Business owner", hint: "Running or launching a company", icon: Rocket },
  { value: "developer", label: "Developer", hint: "Building or shipping software", icon: Code2 },
  { value: "marketer", label: "Marketer / Content creator", hint: "Writing, campaigns, content", icon: Megaphone },
  { value: "student", label: "Student", hint: "Learning or working on coursework", icon: GraduationCap },
  { value: "other", label: "Something else", hint: "None of the above quite fit", icon: MoreHorizontal },
];

const TEAM_SIZE_OPTIONS = ["1-3", "4-10", "11-25", "25+"];

const USE_CASE_OPTIONS: { value: UseCase; label: string; hint: string; icon: typeof FileText }[] = [
  { value: "cv_writing", label: "CV writing", hint: "Resumes and cover letters", icon: FileText },
  { value: "content_writing", label: "Content writing", hint: "Articles, copy, social posts", icon: Pen },
  { value: "code_assistant", label: "Code assistant", hint: "Writing, debugging, explaining code", icon: Code2 },
  { value: "design_ideas", label: "Design ideas", hint: "Creative concepts and inspiration", icon: Palette },
  { value: "other", label: "Something else", hint: "A bit of everything", icon: Sparkles },
];

const TOTAL_STEPS = 3;

export function OnboardingWizard({ fullName }: { fullName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roleType, setRoleType] = useState<RoleType | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState<string | null>(null);
  const [useCase, setUseCase] = useState<UseCase | null>(null);

  const firstName = fullName?.split(" ")[0];

  function canAdvance() {
    if (step === 1) return !!roleType;
    if (step === 2) return accountType === "individual" || (accountType === "team" && teamName.trim().length > 0 && !!teamSize);
    if (step === 3) return !!useCase;
    return false;
  }

  async function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    await handleFinish();
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role_type: roleType,
        account_type: accountType,
        team_name: accountType === "team" ? teamName.trim() : null,
        team_size: accountType === "team" ? teamSize : null,
        primary_use_case: useCase,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  function handleSkip() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar: logo + progress */}
      <div className="border-b border-border/50 px-6 py-5">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Logo />
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
        <div className="mx-auto mt-4 max-w-xl">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex flex-1 items-start justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {step === 1 && (
            <StepShell
              eyebrow={`Step 1 of ${TOTAL_STEPS}`}
              title={firstName ? `Welcome, ${firstName}. Who are you?` : "Welcome. Who are you?"}
              subtitle="This helps us tailor templates and defaults to how you work."
            >
              <div className="space-y-2.5">
                {ROLE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    icon={opt.icon}
                    label={opt.label}
                    hint={opt.hint}
                    selected={roleType === opt.value}
                    onClick={() => setRoleType(opt.value)}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              eyebrow={`Step 2 of ${TOTAL_STEPS}`}
              title="Individual, or a team?"
              subtitle="Team accounts get room to add teammates later."
            >
              <div className="grid grid-cols-2 gap-3">
                <BigOptionCard
                  icon={User}
                  label="Individual"
                  selected={accountType === "individual"}
                  onClick={() => setAccountType("individual")}
                />
                <BigOptionCard
                  icon={Users}
                  label="Team"
                  selected={accountType === "team"}
                  onClick={() => setAccountType("team")}
                />
              </div>

              {accountType === "team" && (
                <div className="mt-6 space-y-4 rounded-xl border border-border/50 bg-muted/30 p-4 animate-fade-in">
                  <div>
                    <label className="text-xs text-muted-foreground">Team name</label>
                    <Input
                      placeholder="e.g. Acme Studio"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Team size</label>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {TEAM_SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setTeamSize(size)}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                            teamSize === size
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/50 bg-background text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              eyebrow={`Step 3 of ${TOTAL_STEPS}`}
              title="What will you use this for?"
              subtitle="We'll open your dashboard on the template you'll use most."
            >
              <div className="space-y-2.5">
                {USE_CASE_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    icon={opt.icon}
                    label={opt.label}
                    hint={opt.hint}
                    selected={useCase === opt.value}
                    onClick={() => setUseCase(opt.value)}
                  />
                ))}
              </div>
            </StepShell>
          )}

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={handleNext} disabled={!canAdvance() || saving} className="gap-1.5">
              {saving ? "Saving…" : step === TOTAL_STEPS ? "Finish" : "Continue"}
              {!saving && (step === TOTAL_STEPS ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">{eyebrow}</p>
      <h1 className="mt-2 font-display text-2xl font-medium">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OptionCard({
  icon: Icon,
  label,
  hint,
  selected,
  onClick,
}: {
  icon: typeof User;
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-background hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

function BigOptionCard({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: typeof User;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border px-4 py-6 transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 bg-background hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
    </button>
  );
}
