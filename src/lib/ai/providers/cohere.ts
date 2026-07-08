import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";

const MODEL = "command-r-plus";

export const cohereProvider: AIProvider = {
  name: "cohere",
  isConfigured: () => hasEnv("COHERE_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const systemMsg = messages.find((m) => m.role === "system");
    const last = messages[messages.length - 1];
    const history = messages
      .slice(0, -1)
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "CHATBOT" : "USER", message: m.content }));

    const res = await fetch("https://api.cohere.com/v1/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        message: last?.content ?? "",
        chat_history: history,
        preamble: systemMsg?.content,
        max_tokens: maxTokens,
        temperature,
      }),
    });
    if (!res.ok) throw new AIProviderError("cohere", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "cohere",
      model: MODEL,
      text: data.text ?? "",
      promptTokens: data.meta?.tokens?.input_tokens,
      completionTokens: data.meta?.tokens?.output_tokens,
    };
  },
};
