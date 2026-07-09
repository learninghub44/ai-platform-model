import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateImage, generateVariation, isImageGenConfigured } from "@/lib/ai/image";
import type { ChatAttachment } from "@/lib/types/chat";

function deriveTitle(prompt: string) {
  const clean = prompt.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean || "New chat";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isImageGenConfigured()) {
    return NextResponse.json(
      { error: "Image generation isn't configured on this deployment (missing OPENAI_API_KEY)." },
      { status: 503 }
    );
  }

  const {
    conversationId,
    action = "generate",
    prompt,
    sourceUrl,
  }: {
    conversationId?: string;
    action?: "generate" | "variation" | "upscale";
    prompt?: string;
    sourceUrl?: string;
  } = await req.json();

  if ((action === "generate" || action === "upscale") && (!prompt || !prompt.trim())) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }
  if (action === "variation" && !sourceUrl) {
    return NextResponse.json({ error: "sourceUrl is required for a variation" }, { status: 400 });
  }

  // Image generations spend from the same daily allowance as chat requests
  // — one shared credit meter, no separate limit to configure.
  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_requests_count, daily_requests_limit, daily_requests_reset")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.daily_requests_reset && new Date(profile.daily_requests_reset) <= new Date()) {
    await supabase
      .from("profiles")
      .update({
        daily_requests_count: 0,
        daily_requests_reset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", user.id);
    profile.daily_requests_count = 0;
  }

  if (profile.daily_requests_count >= profile.daily_requests_limit) {
    return NextResponse.json(
      { error: "Daily limit reached", limit: profile.daily_requests_limit, resetTime: profile.daily_requests_reset },
      { status: 429 }
    );
  }

  let conversation: { id: string; title: string } | null = null;
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();
    if (!data) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    conversation = data;
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: deriveTitle(prompt || "Generated image") })
      .select("id, title")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Failed to create conversation" }, { status: 500 });
    conversation = data;
  }

  try {
    let image: { url: string };
    let effectivePrompt = prompt ?? "";

    if (action === "variation") {
      image = await generateVariation(sourceUrl!, user.id);
      effectivePrompt = prompt ?? "";
    } else if (action === "upscale") {
      // OpenAI's images API has no true super-resolution endpoint, so
      // "upscale" re-renders the same prompt at the largest supported
      // canvas (1536x1024) rather than doing pixel-level upscaling of the
      // existing image. It's labeled accordingly in the UI.
      image = await generateImage(prompt!, user.id, "1536x1024");
    } else {
      image = await generateImage(prompt!, user.id, "1024x1024");
    }

    const attachment: ChatAttachment = {
      id: crypto.randomUUID(),
      name: `${action}-${Date.now()}.png`,
      url: image.url,
      mimeType: "image/png",
      sizeBytes: 0,
      kind: "image",
      generated: true,
      prompt: effectivePrompt,
      genAction: action,
    };

    const userLabel =
      action === "variation" ? "Generate a variation" : action === "upscale" ? `Upscale: ${effectivePrompt}` : effectivePrompt;

    const { data: userMessage, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: userLabel,
        attachments: action === "variation" ? [{ ...attachment, url: sourceUrl, generated: false }] : [],
      })
      .select("id, role, content, created_at, attachments")
      .single();

    if (userMsgError) return NextResponse.json({ error: userMsgError.message }, { status: 500 });

    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "assistant",
        content: action === "upscale" ? "Here's a larger render:" : "Here you go:",
        attachments: [attachment],
      })
      .select("id, role, content, created_at, attachments")
      .single();

    if (assistantMsgError) return NextResponse.json({ error: assistantMsgError.message }, { status: 500 });

    await supabase.rpc("increment_daily_usage", { user_id: user.id });
    await supabase.from("ai_usage_logs").insert({
      user_id: user.id,
      provider: "openai-images",
      model: "gpt-image-1",
      succeeded: true,
      is_daily_tracked: true,
    });

    return NextResponse.json({ conversation, userMessage, assistantMessage });
  } catch (err) {
    const errorText = err instanceof Error ? err.message : "Image generation failed";
    await supabase.from("ai_usage_logs").insert({
      user_id: user.id,
      provider: "openai-images",
      succeeded: false,
      error_message: errorText,
      is_daily_tracked: true,
    });

    const { data: errorMessage } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", content: errorText, error: true })
      .select("id, role, content, error, created_at")
      .single();

    return NextResponse.json({ conversation, assistantMessage: errorMessage, error: errorText }, { status: 502 });
  }
}
