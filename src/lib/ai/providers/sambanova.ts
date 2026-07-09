import { createOpenAICompatibleProvider } from "../openai-compatible";

export const sambanovaProvider = createOpenAICompatibleProvider({
  name: "sambanova",
  envKey: "SAMBANOVA_API_KEY",
  baseUrl: "https://api.sambanova.ai/v1/chat/completions",
  model: "Meta-Llama-3.3-70B-Instruct",
});
