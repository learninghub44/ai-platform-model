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

  const attempts: { provider: string; ok: boolean; error?: string }[] = [];

  try {
    const result = await generateWithFailover({
      messages,
      preferredProvider,
      maxTokens,
      temperature,
      onAttempt: (a) => attempts.push(a),
    });

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
      }))
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "All AI providers failed" },
      { status: 502 }
    );
  }
}
