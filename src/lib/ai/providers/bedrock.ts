import { AwsClient } from "aws4fetch";
import { AIProvider, AIGenerateParams, AIGenerateResult, AIProviderError } from "../types";
import { hasEnv } from "../env";
import { toPlainText } from "../content";

const MODEL = process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0";
const REGION = process.env.AWS_REGION || "us-east-1";

// Bedrock requests must be SigV4-signed. aws4fetch is a ~5KB signer built
// for fetch-based runtimes (Workers, Deno, browsers) — the full @aws-sdk
// clients are Node-oriented and would drag heavy dependencies back into the
// Cloudflare Worker bundle we just spent effort trimming down.
export const bedrockProvider: AIProvider = {
  name: "bedrock",
  isConfigured: () => hasEnv("AWS_ACCESS_KEY_ID") && hasEnv("AWS_SECRET_ACCESS_KEY"),
  async generate({ messages, maxTokens = 1000, temperature = 0.7 }: AIGenerateParams): Promise<AIGenerateResult> {
    const client = new AwsClient({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      sessionToken: process.env.AWS_SESSION_TOKEN, // only needed for temporary/STS credentials
      region: REGION,
      service: "bedrock",
    });

    const systemMsg = messages.find((m) => m.role === "system");
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: [{ text: toPlainText(m.content) }] }));

    const url = `https://bedrock-runtime.${REGION}.amazonaws.com/model/${encodeURIComponent(MODEL)}/converse`;

    const res = await client.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation,
        system: systemMsg ? [{ text: toPlainText(systemMsg.content) }] : undefined,
        inferenceConfig: { maxTokens, temperature },
      }),
    });

    if (!res.ok) throw new AIProviderError("bedrock", `HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "bedrock",
      model: MODEL,
      text: data.output?.message?.content?.map((b: any) => b.text ?? "").join("") ?? "",
      promptTokens: data.usage?.inputTokens,
      completionTokens: data.usage?.outputTokens,
    };
  },
};
