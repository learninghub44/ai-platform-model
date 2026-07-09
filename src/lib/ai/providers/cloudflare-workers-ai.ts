import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { flattenToText } from "../content";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Workers AI's REST shape doesn't match OpenAI's: the URL is account-scoped
// and the response wraps text under result.response instead of
// choices[0].message.content, so this can't use the shared OpenAI-compatible
// helper.
export const cloudflareWorkersAiProvider: AIProvider = {
  name: "cloudflare-workers-ai",
  isConfigured: () => hasEnv("CLOUDFLARE_ACCOUNT_ID") && hasEnv("CLOUDFLARE_API_TOKEN"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
      // Workers AI's chat models are text-only — image parts are collapsed.
      body: JSON.stringify({
        messages: flattenToText(messages),
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) throw new AIProviderError("cloudflare-workers-ai", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (data.success === false) {
      throw new AIProviderError("cloudflare-workers-ai", JSON.stringify(data.errors ?? "unknown error"));
    }
    return {
      provider: "cloudflare-workers-ai",
      model: MODEL,
      text: data.result?.response ?? "",
    };
  },
};
