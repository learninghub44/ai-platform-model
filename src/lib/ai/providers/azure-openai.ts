import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { toOpenAIContent } from "../content";

// Azure's endpoint is per-account (resource + deployment name baked into the
// URL) and auth uses an "api-key" header rather than Bearer, so it needs its
// own implementation rather than the shared OpenAI-compatible helper even
// though the request/response body shape is otherwise identical to OpenAI's.
const REQUIRED = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_DEPLOYMENT", "AZURE_OPENAI_API_KEY"];
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

export const azureOpenAiProvider: AIProvider = {
  name: "azure-openai",
  isConfigured: () => REQUIRED.every(hasEnv),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT!.replace(/\/$/, "");
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!;
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;

    const payloadMessages = messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) }));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.AZURE_OPENAI_API_KEY!,
      },
      body: JSON.stringify({ messages: payloadMessages, max_tokens: maxTokens, temperature }),
    });

    if (!res.ok) throw new AIProviderError("azure-openai", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "azure-openai",
      model: deployment,
      text: data.choices?.[0]?.message?.content ?? "",
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
    };
  },
};
