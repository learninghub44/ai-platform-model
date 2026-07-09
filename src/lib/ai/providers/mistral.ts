import { createOpenAICompatibleProvider } from "../openai-compatible";

export const mistralProvider = createOpenAICompatibleProvider({
  name: "mistral",
  envKey: "MISTRAL_API_KEY",
  baseUrl: "https://api.mistral.ai/v1/chat/completions",
  // "-latest" aliases auto-track Mistral's current flagship without needing
  // a code change every time they ship a new dated model.
  model: "mistral-large-latest",
});
