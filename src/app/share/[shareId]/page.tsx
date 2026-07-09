import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SharedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

async function getSharedConversation(shareId: string) {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title, created_at")
    .eq("share_id", shareId)
    .eq("is_shared", true)
    .single();

  if (!conversation) return null;

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, attachments, created_at")
    .eq("conversation_id", conversation.id)
    .neq("role", "system")
    .order("created_at", { ascending: true });

  return { conversation, messages: (messages ?? []) as SharedMessage[] };
}

export default async function SharedChatPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const data = await getSharedConversation(shareId);

  if (!data) notFound();

  const { conversation, messages } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <Link href="/login">
            <Button variant="outline" size="sm" className="rounded-xl">
              Sign in to chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold">{conversation.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Shared read-only conversation</p>
        </div>

        <div className="space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className="flex max-w-[85%] items-start gap-3">
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "rounded-2xl bg-primary px-5 py-3 text-primary-foreground shadow-sm"
                      : "rounded-2xl border border-border/50 bg-card px-5 py-3 shadow-sm"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border/50 bg-card p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Want to continue this conversation or start your own?</p>
          <Link href="/register">
            <Button className="rounded-xl">Try XETU AI free</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
