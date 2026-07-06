import { AIProvider, AIGenerateParams, AIGenerateResult } from "./types";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { anthropicProvider } from "./providers/anthropic";
import { openrouterProvider } from "./providers/openrouter";
import { groqProvider } from "./providers/groq";
import { togetherProvider } from "./providers/together";
import { cohereProvider } from "./providers/cohere";
import { deepseekProvider } from "./providers/deepseek";

const REGISTRY: Record<string, AIProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
  groq: groqProvider,
  together: togetherProvider,
  cohere: cohereProvider,
  deepseek: deepseekProvider,
};

function getPriorityOrder(): string[] {
  const configured = (process.env.AI_PROVIDER_PRIORITY || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const all = Object.keys(REGISTRY);
  // Any provider not explicitly listed is appended at the end, so nothing is
  // silently dropped just because it's missing from the priority env var.
  const rest = all.filter((p) => !configured.includes(p));
  return [...configured, ...rest].filter((p) => REGISTRY[p]);
}

export interface AIGenerateOptions extends AIGenerateParams {
  /** Restrict to a specific provider instead of using the full failover chain */
  preferredProvider?: string;
  /** Called after each attempt (success or failure) — useful for logging to ai_usage_logs */
  onAttempt?: (result: { provider: string; ok: boolean; error?: string }) => void;
}

/**
 * Tries providers in priority order. Each provider's failure (missing key,
 * network error, non-2xx response) is caught independently and never
 * propagates — the next configured provider is tried automatically.
 * Throws only if every configured provider has failed or none are configured.
 */
export async function generateWithFailover(options: AIGenerateOptions): Promise<AIGenerateResult> {
  const { preferredProvider, onAttempt, ...params } = options;

  const order = preferredProvider ? [preferredProvider] : getPriorityOrder();
  const attemptedErrors: string[] = [];

  for (const key of order) {
    const provider = REGISTRY[key];
    if (!provider) continue;

    if (!provider.isConfigured()) {
      onAttempt?.({ provider: key, ok: false, error: "not configured" });
      continue;
    }

    try {
      const result = await provider.generate(params);
      onAttempt?.({ provider: key, ok: true });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attemptedErrors.push(`${key}: ${message}`);
      onAttempt?.({ provider: key, ok: false, error: message });
      // swallow and continue to next provider — this is the core
      // "one provider failing never breaks the platform" guarantee
      continue;
    }
  }

  throw new Error(
    `All AI providers failed or unconfigured. Attempts: ${attemptedErrors.join(" | ") || "none configured"}`
  );
}

export function listConfiguredProviders(): string[] {
  return Object.values(REGISTRY)
    .filter((p) => p.isConfigured())
    .map((p) => p.name);
}
