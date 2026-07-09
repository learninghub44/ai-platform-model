import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { flattenToText } from "../content";

const MODEL = "deepseek-chat";

export const deepseekProvider: AIProvider = {
  name: "deepseek",
  isConfigured: () => hasEnv("DEEPSEEK_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    // Text-only model — image parts are collapsed to a text note.
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages: flattenToText(messages), max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new AIProviderError("deepseek", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "deepseek",
      model: MODEL,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
