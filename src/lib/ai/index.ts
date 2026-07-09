import { AIProvider, AIGenerateParams, AIGenerateResult } from "./types";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { anthropicProvider } from "./providers/anthropic";
import { openrouterProvider } from "./providers/openrouter";
import { groqProvider } from "./providers/groq";
import { togetherProvider } from "./providers/together";
import { cohereProvider } from "./providers/cohere";
import { deepseekProvider } from "./providers/deepseek";
import { cerebrasProvider } from "./providers/cerebras";
import { sambanovaProvider } from "./providers/sambanova";
import { fireworksProvider } from "./providers/fireworks";
import { xaiProvider } from "./providers/xai";
import { mistralProvider } from "./providers/mistral";
import { nebiusProvider } from "./providers/nebius";
import { huggingfaceProvider } from "./providers/huggingface";
import { cloudflareWorkersAiProvider } from "./providers/cloudflare-workers-ai";
import { azureOpenAiProvider } from "./providers/azure-openai";
import { bedrockProvider } from "./providers/bedrock";
import { replicateProvider } from "./providers/replicate";

const REGISTRY: Record<string, AIProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
  groq: groqProvider,
  together: togetherProvider,
  cohere: cohereProvider,
  deepseek: deepseekProvider,
  cerebras: cerebrasProvider,
  sambanova: sambanovaProvider,
  fireworks: fireworksProvider,
  xai: xaiProvider,
  mistral: mistralProvider,
  nebius: nebiusProvider,
  huggingface: huggingfaceProvider,
  "cloudflare-workers-ai": cloudflareWorkersAiProvider,
  "azure-openai": azureOpenAiProvider,
  bedrock: bedrockProvider,
  replicate: replicateProvider,
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getPriorityOrder(): string[] {
  const configured = (process.env.AI_PROVIDER_PRIORITY || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const all = Object.keys(REGISTRY);
  // Anything not explicitly listed in AI_PROVIDER_PRIORITY is shuffled
  // rather than following REGISTRY's declaration order — otherwise whichever
  // provider happens to be listed first in the object (openai, as it turns
  // out) becomes a silent, unintentional default any time its key is set,
  // even though every configured provider is equally valid. Set
  // AI_PROVIDER_PRIORITY explicitly if you want a deliberate, stable order.
  const rest = shuffle(all.filter((p) => !configured.includes(p)));
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

  // preferredProvider is a priority *hint*, not an exclusive restriction —
  // it's tried first, but failure still falls through to the rest of the
  // priority order. Treating it as exclusive (the old `[preferredProvider]`
  // behavior) meant any caller that sends a preferred provider — including
  // the AI Playground, which defaults to "anthropic" — got zero failover:
  // if that one provider was unconfigured or hit a limit, the request
  // failed outright even when other providers (e.g. Groq) were configured
  // and working fine.
  const order = preferredProvider
    ? [preferredProvider, ...getPriorityOrder().filter((p) => p !== preferredProvider)]
    : getPriorityOrder();
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
