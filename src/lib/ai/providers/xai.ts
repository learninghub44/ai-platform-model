import { createOpenAICompatibleProvider } from "../openai-compatible";

export const xaiProvider = createOpenAICompatibleProvider({
  name: "xai",
  envKey: "XAI_API_KEY",
  baseUrl: "https://api.x.ai/v1/chat/completions",
  model: "grok-4.3",
});
