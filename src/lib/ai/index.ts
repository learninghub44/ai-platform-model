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
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const key of order) {
    const provider = REGISTRY[key];
    if (!provider) continue;

    if (!provider.isConfigured()) {
      skipped.push(key);
      onAttempt?.({ provider: key, ok: false, error: "not configured" });
      continue;
    }

    try {
      const result = await provider.generate(params);
      onAttempt?.({ provider: key, ok: true });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push(`${key}: ${message}`);
      onAttempt?.({ provider: key, ok: false, error: message });
      // swallow and continue to next provider — this is the core
      // "one provider failing never breaks the platform" guarantee
      continue;
    }
  }

  // Distinguish "nothing was even configured" (a setup/env problem) from
  // "configured providers were tried and actually failed" (an upstream/API
  // problem) — collapsing these into one vague message is what made the
  // last round of debugging slow.
  if (failed.length === 0 && skipped.length === order.length) {
    throw new Error(
      `No AI provider is configured. Missing env vars for: ${skipped.join(", ")}. ` +
        `Check that the relevant API key is set in the environment this process actually reads ` +
        `(.env.local for next dev, .dev.vars for local wrangler, or wrangler secret put for the deployed Worker).`
    );
  }

  const parts: string[] = [];
  if (failed.length) parts.push(`failed: ${failed.join(" | ")}`);
  if (skipped.length) parts.push(`not configured: ${skipped.join(", ")}`);
  throw new Error(`All AI providers failed. ${parts.join(" | ")}`);
}

export function listConfiguredProviders(): string[] {
  return Object.values(REGISTRY)
    .filter((p) => p.isConfigured())
    .map((p) => p.name);
}
