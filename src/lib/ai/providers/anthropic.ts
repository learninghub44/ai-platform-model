import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";

const MODEL = "claude-sonnet-4-6";

export const anthropicProvider: AIProvider = {
  name: "anthropic",
  isConfigured: () => !!process.env.ANTHROPIC_API_KEY,
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const systemMsg = messages.find((m) => m.role === "system");
    const rest = messages.filter((m) => m.role !== "system");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        temperature,
        system: systemMsg?.content,
        messages: rest,
      }),
    });
    if (!res.ok) throw new AIProviderError("anthropic", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "anthropic",
      model: MODEL,
      text: data.content?.map((b: any) => b.text ?? "").join("") ?? "",
      promptTokens: data.usage?.input_tokens,
      completionTokens: data.usage?.output_tokens,
    };
  },
};
