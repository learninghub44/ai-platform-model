import { createOpenAICompatibleProvider } from "../openai-compatible";

export const cerebrasProvider = createOpenAICompatibleProvider({
  name: "cerebras",
  envKey: "CEREBRAS_API_KEY",
  baseUrl: "https://api.cerebras.ai/v1/chat/completions",
  model: "llama-3.3-70b",
});
