import { createOpenAICompatibleProvider } from "../openai-compatible";

export const nebiusProvider = createOpenAICompatibleProvider({
  name: "nebius",
  envKey: "NEBIUS_API_KEY",
  baseUrl: "https://api.studio.nebius.com/v1/chat/completions",
  model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
});
