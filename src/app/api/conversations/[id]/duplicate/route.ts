import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: source, error: sourceError } = await supabase
    .from("conversations")
    .select("id, title, folder_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("role, content, error, attachments, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  // Duplicates always start private — sharing state and pin status are
  // deliberately not carried over, since a copy isn't the same chat.
  const { data: newConversation, error: createError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title: `${source.title} (copy)`.slice(0, 120),
      folder_id: source.folder_id,
    })
    .select("id, title, pinned, pinned_at, is_shared, share_id, folder_id, last_message_at, created_at")
    .single();

  if (createError || !newConversation) {
    return NextResponse.json({ error: createError?.message ?? "Failed to duplicate conversation" }, { status: 500 });
  }

  if (messages && messages.length > 0) {
    const { error: insertError } = await supabase.from("messages").insert(
      messages.map((m) => ({
        conversation_id: newConversation.id,
        user_id: user.id,
        role: m.role,
        content: m.content,
        error: m.error,
        attachments: m.attachments ?? [],
      }))
    );

    if (insertError) {
      // Best-effort cleanup — don't leave an empty orphaned conversation
      // behind if copying the messages failed partway through.
      await supabase.from("conversations").delete().eq("id", newConversation.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ conversation: newConversation });
}
