import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { toPlainText } from "../content";
import type { AIContentPart } from "../types";

const MODEL = "gemini-1.5-flash";

// Gemini's generateContent only accepts image bytes (inlineData) or a Files
// API URI — not arbitrary hosted URLs — so images are fetched and
// base64-inlined here. If the fetch fails, that image degrades to a text
// note rather than dropping the whole request.
async function toGeminiParts(content: string | AIContentPart[]) {
  if (typeof content === "string") return [{ text: content }];

  const parts: Record<string, unknown>[] = [];
  for (const part of content) {
    if (part.type === "text") {
      parts.push({ text: part.text });
      continue;
    }
    try {
      const res = await fetch(part.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      parts.push({ inlineData: { mimeType: part.mimeType || "image/jpeg", data: base64 } });
    } catch {
      parts.push({ text: `[Image attached: ${part.url}]` });
    }
  }
  return parts;
}

export const geminiProvider: AIProvider = {
  name: "gemini",
  isConfigured: () => hasEnv("GOOGLE_GEMINI_API_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const systemMsg = messages.find((m) => m.role === "system");
    const contents = await Promise.all(
      messages
        .filter((m) => m.role !== "system")
        .map(async (m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: await toGeminiParts(m.content),
        }))
    );

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: systemMsg ? { parts: [{ text: toPlainText(systemMsg.content) }] } : undefined,
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
