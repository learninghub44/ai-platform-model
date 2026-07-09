import { createOpenAICompatibleProvider } from "../openai-compatible";

// Hugging Face's Inference Providers router exposes an OpenAI-compatible
// /chat/completions endpoint that fans out across HF's underlying inference
// partners — simpler and more reliable than calling a single model's legacy
// api-inference.huggingface.co endpoint directly.
export const huggingfaceProvider = createOpenAICompatibleProvider({
  name: "huggingface",
  envKey: "HUGGINGFACE_API_KEY",
  baseUrl: "https://router.huggingface.co/v1/chat/completions",
  model: "meta-llama/Llama-3.1-8B-Instruct",
});
