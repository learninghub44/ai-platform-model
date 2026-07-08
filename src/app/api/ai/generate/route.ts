import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWithFailover } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, preferredProvider, maxTokens, temperature } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
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

  // Check if daily limit needs reset
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

  // Check if user has reached daily limit
  if (profile.daily_requests_count >= profile.daily_requests_limit) {
    return NextResponse.json(
      {
        error: "Daily limit reached",
        limit: profile.daily_requests_limit,
        resetTime: profile.daily_requests_reset,
      },
      { status: 429 }
    );
  }

  const attempts: { provider: string; ok: boolean; error?: string }[] = [];

  try {
    const result = await generateWithFailover({
      messages,
      preferredProvider,
      maxTokens,
      temperature,
      onAttempt: (a) => attempts.push(a),
    });

    // Increment daily usage count
    await supabase.rpc("increment_daily_usage", { user_id: user.id });

    // Log every attempt (success and failures) for observability, without
    // ever blocking the response on logging errors.
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

    return NextResponse.json(result);
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "All AI providers failed" },
      { status: 502 }
    );
  }
}
