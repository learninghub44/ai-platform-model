import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai";
import type { AIMessage } from "@/lib/ai/types";

function deriveTitle(content: string) {
  const clean = content.trim().replace(/\s+/g, " ");
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

  const {
    conversationId,
    content,
    regenerate,
    systemPrompt,
    preferredProvider,
    maxTokens,
    temperature,
  }: {
    conversationId?: string;
    content?: string;
    regenerate?: boolean;
    systemPrompt?: string;
    preferredProvider?: string;
    maxTokens?: number;
    temperature?: number;
  } = await req.json();

  if (!regenerate && (!content || !content.trim())) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (regenerate && !conversationId) {
    return NextResponse.json({ error: "conversationId is required to regenerate" }, { status: 400 });
  }

  // Check daily limits
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

  // Resolve the conversation this message belongs to. Regenerate always
  // targets an existing conversation; a fresh message may create one.
  let conversation: { id: string; title: string } | null = null;

  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single();
    if (!data) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
    conversation = data;
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: deriveTitle(content!) })
      .select("id, title")
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to create conversation" }, { status: 500 });
    }
    conversation = data;
  }

  // Load prior history (before inserting any new message) to build AI context.
  const { data: priorMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  let userMessage: { id: string; role: string; content: string; created_at: string } | null = null;

  if (!regenerate) {
    const { data, error: userMsgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, user_id: user.id, role: "user", content: content! })
      .select("id, role, content, created_at")
      .single();

    if (userMsgError || !data) {
      return NextResponse.json({ error: userMsgError?.message ?? "Failed to save message" }, { status: 500 });
    }
    userMessage = data;
  }

  const historyForModel: AIMessage[] = [
    ...(systemPrompt && (!priorMessages || priorMessages.length === 0)
      ? [{ role: "system" as const, content: systemPrompt }]
      : []),
    ...(priorMessages ?? []).map((m) => ({ role: m.role as AIMessage["role"], content: m.content })),
    ...(regenerate ? [] : [{ role: "user" as const, content: content! }]),
  ];

  if (historyForModel.length === 0 || historyForModel[historyForModel.length - 1].role !== "user") {
    return NextResponse.json({ error: "Nothing to regenerate — conversation has no prior message" }, { status: 400 });
  }

  const attempts: { provider: string; ok: boolean; error?: string }[] = [];

  try {
    const result = await generateWithFailover({
      messages: historyForModel,
      preferredProvider,
      maxTokens,
      temperature,
      onAttempt: (a) => attempts.push(a),
    });

    await supabase.rpc("increment_daily_usage", { user_id: user.id });

    await supabase.from("ai_usage_logs").insert(
      attempts.map((a) => ({
        user_id: user.id,
        provider: a.provider,
        model: a.provider === result.provider ? result.model : null,
        succeeded: a.ok,
        error_message: a.error ?? null,
        prompt_tokens: a.provider === result.provider ? result.promptTokens : null,
        completion_tokens: a.provider === result.provider ? result.completionTokens : null,
        is_daily_tracked: true,
      }))
    );

    const { data: assistantMessage, error: assistantMsgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", content: result.text })
      .select("id, role, content, created_at")
      .single();

    if (assistantMsgError) {
      return NextResponse.json({ error: assistantMsgError.message }, { status: 500 });
    }

    return NextResponse.json({ conversation, userMessage, assistantMessage, ...result });
  } catch (err) {
    await supabase.from("ai_usage_logs").insert(
      attempts.map((a) => ({
        user_id: user.id,
        provider: a.provider,
        succeeded: false,
        error_message: a.error ?? null,
        is_daily_tracked: true,
      }))
    );

    const errorText = err instanceof Error ? err.message : "All AI providers failed";

    const { data: errorMessage } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", content: errorText, error: true })
      .select("id, role, content, error, created_at")
      .single();

    return NextResponse.json({ conversation, userMessage, assistantMessage: errorMessage, error: errorText }, { status: 502 });
  }
}
