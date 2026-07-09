import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { flattenToText } from "../content";

// llama-3.3-70b-versatile was deprecated by Groq on 2026-06-17.
// openai/gpt-oss-120b is Groq's recommended general-purpose replacement.
// https://console.groq.com/docs/deprecations
const MODEL = "openai/gpt-oss-120b";

export const groqProvider: AIProvider = {
  name: "groq",
  isConfigured: () => hasEnv("GROQ_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    // Text-only model — image parts are collapsed to a text note.
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages: flattenToText(messages), max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) throw new AIProviderError("groq", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "groq",
      model: MODEL,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
