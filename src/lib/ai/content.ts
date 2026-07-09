import type { AIMessage, AIContentPart } from "./types";

/** Flattens content to plain text — used by providers with no vision support. */
export function toPlainText(content: string | AIContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .map((p) => (p.type === "text" ? p.text : `[Image attached: ${p.url}]`))
    .join("\n")
    .trim();
}

/** For providers that can't accept image parts: collapse every message to plain text. */
export function flattenToText(messages: AIMessage[]): { role: AIMessage["role"]; content: string }[] {
  return messages.map((m) => ({ role: m.role, content: toPlainText(m.content) }));
}

/** OpenAI-compatible chat APIs (OpenAI, OpenRouter, Together, Groq) share this content shape. */
export function toOpenAIContent(content: string | AIContentPart[]) {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: p.url } }
  );
}

/** Anthropic's Messages API block format. */
export function toAnthropicContent(content: string | AIContentPart[]) {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "text"
      ? { type: "text", text: p.text }
      : { type: "image", source: { type: "url", url: p.url } }
  );
}
