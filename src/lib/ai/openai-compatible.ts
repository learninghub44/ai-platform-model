import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "./types";
import { hasEnv } from "./env";
import { toOpenAIContent } from "./content";

interface OpenAICompatibleConfig {
  /** Unique key, matches env var naming and AI_PROVIDER_PRIORITY entries */
  name: string;
  /** Env var holding the API key. isConfigured() checks this by default. */
  envKey: string;
  /** Full chat/completions endpoint URL */
  baseUrl: string;
  model: string;
  /** Override for providers whose key isn't a simple Bearer token env var. */
  isConfigured?: () => boolean;
  /** Override/add headers beyond the standard Bearer auth. */
  extraHeaders?: () => Record<string, string>;
  /** Override how the Authorization header is built (default: Bearer <envKey>). */
  authHeader?: () => Record<string, string>;
}

/**
 * Factory for providers whose API is a drop-in match for OpenAI's
 * /chat/completions shape (request body, message roles, response.choices[0]).
 * Cuts out the copy-pasted fetch/parse boilerplate that would otherwise be
 * repeated per-provider — several of the providers below (Cerebras,
 * SambaNova, Fireworks, xAI, Mistral, Nebius, Hugging Face's router) are
 * OpenAI-compatible and only differ in base URL, env var, and model name.
 */
export function createOpenAICompatibleProvider(config: OpenAICompatibleConfig): AIProvider {
  return {
    name: config.name,
    isConfigured: config.isConfigured ?? (() => hasEnv(config.envKey)),
    async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
      const payloadMessages = messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) }));

      const res = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.authHeader?.() ?? { Authorization: `Bearer ${process.env[config.envKey]}` }),
          ...(config.extraHeaders?.() ?? {}),
        },
        body: JSON.stringify({
          model: config.model,
          messages: payloadMessages,
          max_tokens: maxTokens,
          temperature,
        }),
      });

      if (!res.ok) throw new AIProviderError(config.name, `HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return {
        provider: config.name,
        model: config.model,
        text: data.choices?.[0]?.message?.content ?? "",
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      };
    },
  };
}
