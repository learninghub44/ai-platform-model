import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";

const MODEL = "gemini-1.5-flash";

export const geminiProvider: AIProvider = {
  name: "gemini",
  isConfigured: () => !!process.env.GOOGLE_GEMINI_API_KEY,
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const systemMsg = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
      }
    );
    if (!res.ok) throw new AIProviderError("gemini", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "gemini",
      model: MODEL,
      text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
    };
  },
};
