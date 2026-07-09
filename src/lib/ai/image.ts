import { hasEnv } from "./env";
import { AIProviderError } from "./types";
import { uploadFile } from "@/lib/cloudinary";

/**
 * Image generation is a separate, narrower surface than the chat failover
 * chain in ./index.ts — today it's backed by OpenAI's images API only.
 * Every result is re-hosted on Cloudinary (like uploaded attachments) rather
 * than pointing at OpenAI's short-lived URLs, so generated images keep
 * working in chat history after the source URL expires.
 */

export function isImageGenConfigured(): boolean {
  return hasEnv("OPENAI_API_KEY");
}

interface RehostedImage {
  url: string;
  width?: number;
  height?: number;
}

async function rehostBase64(b64: string, userId: string): Promise<RehostedImage> {
  const dataUrl = `data:image/png;base64,${b64}`;
  const result = await uploadFile(dataUrl, `generated-images/${userId}`, `generated-${Date.now()}.png`);
  return { url: result.secure_url, width: result.width, height: result.height };
}

/**
 * Text -> image. `size` follows OpenAI's accepted values; "upscale" reuses
 * this with the largest supported canvas rather than a true super-resolution
 * pass, since OpenAI doesn't expose one — see the "upscale" branch in the
 * API route for the rationale.
 */
export async function generateImage(
  prompt: string,
  userId: string,
  size: "1024x1024" | "1536x1024" | "1024x1536" = "1024x1024"
): Promise<RehostedImage> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size, n: 1 }),
  });

  if (!res.ok) throw new AIProviderError("openai-images", `HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new AIProviderError("openai-images", "No image returned");
  return rehostBase64(b64, userId);
}

/**
 * Image -> variation. Takes a source image URL (already-hosted, e.g. on
 * Cloudinary), fetches its bytes, and asks OpenAI for a visually-similar
 * remix. Uses dall-e-2's /variations endpoint, which is the only OpenAI
 * endpoint that accepts an image without a text prompt.
 */
export async function generateVariation(sourceUrl: string, userId: string): Promise<RehostedImage> {
  const sourceRes = await fetch(sourceUrl);
  if (!sourceRes.ok) throw new AIProviderError("openai-images", "Could not fetch source image for variation");
  const sourceBuf = Buffer.from(await sourceRes.arrayBuffer());

  const form = new FormData();
  form.append("image", new Blob([sourceBuf], { type: "image/png" }), "source.png");
  form.append("model", "dall-e-2");
  form.append("size", "1024x1024");
  form.append("n", "1");
  form.append("response_format", "b64_json");

  const res = await fetch("https://api.openai.com/v1/images/variations", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) throw new AIProviderError("openai-images", `HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new AIProviderError("openai-images", "No image returned");
  return rehostBase64(b64, userId);
}
