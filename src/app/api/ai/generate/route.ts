import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai";
import { webSearch, formatSearchContext } from "@/lib/ai/search";
import type { AIMessage, AIContentPart } from "@/lib/ai/types";
import type { ChatAttachment } from "@/lib/types/chat";

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
    attachments,
    webSearch: webSearchEnabled,
  }: {
    conversationId?: string;
    content?: string;
    regenerate?: boolean;
    systemPrompt?: string;
    preferredProvider?: string;
    maxTokens?: number;
    temperature?: number;
    attachments?: ChatAttachment[];
    webSearch?: boolean;
  } = await req.json();

  if (!regenerate && (!content || !content.trim())) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (regenerate && !conversationId) {
    return NextResponse.json({ error: "conversationId is required to regenerate" }, { status: 400 });
  }

  // Daily-limit check reads/writes public.profiles via the SERVICE ROLE
  // client rather than the user's session-scoped client. This is an
  // internal quota check, not a user-facing read, so it should never be
  // able to fail due to RLS policy misconfiguration or a lost table GRANT
  // (this project has hit that class of bug on profiles/conversations/etc
  // more than once — see 0005_fix_table_grants.sql, 0008_ensure_grants.sql).
  // Bypassing RLS here removes an entire failure mode permanently: as long
  // as the row exists, this lookup succeeds regardless of policy/grant state.
  const serviceClient = createServiceRoleClient();

  // Self-heal: if the profiles row is somehow still missing for this user
  // (e.g. the handle_new_user() trigger didn't fire, or ran before this
  // migration existed), create it here instead of failing the request.
  let { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("daily_requests_count, daily_requests_limit, daily_requests_reset")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("profile lookup failed, attempting self-heal", {
      userId: user.id,
      code: profileError?.code,
      message: profileError?.message,
    });

    const { data: created, error: createError } = await serviceClient
      .from("profiles")
      .insert({ id: user.id, email: user.email ?? "" })
      .select("daily_requests_count, daily_requests_limit, daily_requests_reset")
      .single();

    if (createError || !created) {
      console.error("profile self-heal failed", {
        userId: user.id,
        code: createError?.code,
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
      });
      return NextResponse.json(
        {
          error: "Could not load or create your profile. Please try again or contact support.",
          debugCode: createError?.code ?? profileError?.code ?? null,
          debugMessage: createError?.message ?? profileError?.message ?? null,
        },
        { status: 500 }
      );
    }

    // Wallet row too, matching what handle_new_user() would have done.
    await serviceClient.from("wallets").insert({ user_id: user.id, balance_kobo: 0 }).select().single();

    profile = created;
  }

  if (profile.daily_requests_reset && new Date(profile.daily_requests_reset) <= new Date()) {
    await serviceClient
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

  let userMessage: { id: string; role: string; content: string; created_at: string; attachments?: ChatAttachment[] } | null = null;

  if (!regenerate) {
    const { data, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        user_id: user.id,
        role: "user",
        content: content!,
        attachments: attachments ?? [],
      })
      .select("id, role, content, created_at, attachments")
      .single();

    if (userMsgError || !data) {
      return NextResponse.json({ error: userMsgError?.message ?? "Failed to save message" }, { status: 500 });
    }
    userMessage = data;
  }

  // The current turn's image attachments ride along as vision content parts.
  // Attachments on *prior* turns stay as plain text (the note already saved
  // alongside them) to keep history payloads bounded.
  const imageAttachments = (attachments ?? []).filter((a) => a.kind === "image");
  const currentUserContent: string | AIContentPart[] =
    imageAttachments.length > 0
      ? [
          { type: "text", text: content! },
          ...imageAttachments.map((a) => ({ type: "image" as const, url: a.url, mimeType: a.mimeType })),
        ]
      : content!;

  // Web search runs once, up front, against the user's latest message —
  // never throws, degrades to "no results" on failure or missing key.
  let searchContext = "";
  if (!regenerate && webSearchEnabled && content) {
    const results = await webSearch(content);
    searchContext = formatSearchContext(results);
  }

  const historyForModel: AIMessage[] = [
    ...(systemPrompt && (!priorMessages || priorMessages.length === 0)
      ? [{ role: "system" as const, content: systemPrompt }]
      : []),
    ...(priorMessages ?? []).map((m) => ({ role: m.role as AIMessage["role"], content: m.content })),
    ...(searchContext ? [{ role: "system" as const, content: searchContext }] : []),
    ...(regenerate ? [] : [{ role: "user" as const, content: currentUserContent }]),
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

    await serviceClient.rpc("increment_daily_usage", { user_id: user.id });

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

    // Full detail (provider names, HTTP status, upstream error body) is
    // logged server-side only — via ai_usage_logs above and console.error
    // here. The user never sees raw provider/API errors; they see a single
    // friendly message and can hit Retry (which re-runs the whole failover
    // chain, so a transient or since-fixed provider issue clears on its own).
    const rawError = err instanceof Error ? err.message : "All AI providers failed";
    console.error("[ai/generate] all providers failed:", rawError);

    const userFacingText =
      "I couldn't get a response right now. Please try again in a moment.";

    const { data: errorMessage } = await supabase
      .from("messages")
      .insert({ conversation_id: conversation.id, user_id: user.id, role: "assistant", content: userFacingText, error: true })
      .select("id, role, content, error, created_at")
      .single();

    return NextResponse.json(
      { conversation, userMessage, assistantMessage: errorMessage, error: userFacingText },
      { status: 502 }
    );
  }
}
