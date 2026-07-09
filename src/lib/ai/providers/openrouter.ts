import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { toOpenAIContent } from "../content";

const MODEL = "openai/gpt-4o-mini";

export const openrouterProvider: AIProvider = {
  name: "openrouter",
  isConfigured: () => hasEnv("OPENROUTER_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const payloadMessages = messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) }));
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages: payloadMessages, max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new AIProviderError("openrouter", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "openrouter",
      model: MODEL,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
