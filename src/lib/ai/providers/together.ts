import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { flattenToText } from "../content";

const MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

export const togetherProvider: AIProvider = {
  name: "together",
  isConfigured: () => hasEnv("TOGETHER_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    // The default model here isn't vision-capable, so image parts are
    // collapsed to a text note rather than sent as image content.
    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages: flattenToText(messages), max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new AIProviderError("together", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "together",
      model: MODEL,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
