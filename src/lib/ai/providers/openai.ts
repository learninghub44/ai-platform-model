import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";

const MODEL = "gpt-4o-mini";

export const openaiProvider: AIProvider = {
  name: "openai",
  isConfigured: () => !!process.env.OPENAI_API_KEY,
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new AIProviderError("openai", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "openai",
      model: MODEL,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
