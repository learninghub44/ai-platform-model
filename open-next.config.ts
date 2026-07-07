import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Default config works for this project — Supabase, Paystack, Cloudinary,
  // and all AI providers are called over fetch(), which Workers supports
  // natively. Extend here if you add incremental static regeneration or
  // KV-backed caching later.
});
