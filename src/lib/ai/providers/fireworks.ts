import { createOpenAICompatibleProvider } from "../openai-compatible";

export const fireworksProvider = createOpenAICompatibleProvider({
  name: "fireworks",
  envKey: "FIREWORKS_API_KEY",
  baseUrl: "https://api.fireworks.ai/inference/v1/chat/completions",
  model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
});
