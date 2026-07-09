import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { flattenToText } from "../content";

// {owner}/{name} of an "official model" — stable API, always warm, no
// version hash required (unlike community models on Replicate).
const MODEL_PATH = process.env.REPLICATE_MODEL || "meta/meta-llama-3-70b-instruct";

/** Turns our role-based message list into the single flattened prompt most
 *  Replicate LLMs expect, keeping the last system message separate since
 *  that's the input shape official chat models use. */
function toReplicateInput(messages: AIGenerateParams["messages"]) {
  const flat = flattenToText(messages);
  const systemMsg = flat.find((m) => m.role === "system");
  const prompt = flat
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
    .join("\n\n");
  return { prompt, system_prompt: systemMsg?.content };
}

export const replicateProvider: AIProvider = {
  name: "replicate",
  isConfigured: () => hasEnv("REPLICATE_API_TOKEN"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const { prompt, system_prompt } = toReplicateInput(messages);

    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL_PATH}/predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        // Holds the connection open up to 60s and returns the finished
        // prediction directly — avoids a create-then-poll loop, which
        // doesn't fit cleanly into a single request/response API route.
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          system_prompt,
          max_new_tokens: maxTokens,
          temperature,
        },
      }),
    });

    if (!res.ok) throw new AIProviderError("replicate", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();

    if (data.status !== "succeeded") {
      throw new AIProviderError(
        "replicate",
        `Prediction did not complete within the sync window (status: ${data.status})`
      );
    }

    // Most Replicate LLMs stream output as an array of string chunks.
    const text = Array.isArray(data.output) ? data.output.join("") : (data.output ?? "");
    return { provider: "replicate", model: MODEL_PATH, text };
  },
};
