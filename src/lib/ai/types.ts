export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIGenerateParams {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerateResult {
  provider: string;
  model: string;
  text: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface AIProvider {
  /** Unique key, matches env var naming and AI_PROVIDER_PRIORITY entries */
  name: string;
  /** True if the required API key is configured */
  isConfigured(): boolean;
  generate(params: AIGenerateParams): Promise<AIGenerateResult>;
}

export class AIProviderError extends Error {
  constructor(public provider: string, message: string, public cause?: unknown) {
    super(`[${provider}] ${message}`);
  }
}
