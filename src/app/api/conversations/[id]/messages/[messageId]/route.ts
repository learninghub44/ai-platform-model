import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const truncateAfter = body.truncateAfter === true;

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data: message, error: updateError } = await supabase
    .from("messages")
    .update({ content, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .select("id, role, content, created_at")
    .single();

  if (updateError || !message) {
    return NextResponse.json({ error: updateError?.message ?? "Message not found" }, { status: 404 });
  }

  // Editing a message invalidates everything that came after it (the old
  // reply no longer answers the new question) — this mirrors how ChatGPT's
  // edit feature works, discarding the rest of that branch of the thread.
  if (truncateAfter) {
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .gt("created_at", message.created_at);
  }

  return NextResponse.json({ message });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const { id, messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cascade = req.nextUrl.searchParams.get("cascade") === "true";

  const { data: message } = await supabase
    .from("messages")
    .select("id, created_at")
    .eq("id", messageId)
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  if (cascade) {
    // Used when regenerating a response: drop this message and anything
    // after it (e.g. the assistant reply being regenerated).
    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .gte("created_at", message.created_at);
  } else {
    await supabase.from("messages").delete().eq("id", messageId).eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true });
}
