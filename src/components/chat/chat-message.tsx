"use client";

import { useState } from "react";
import { Check, Copy, Pencil, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  onEditSubmit: (messageId: string, newContent: string) => void;
  onRegenerate: () => void;
}

export function ChatMessageBubble({ message, isLastAssistant, onEditSubmit, onRegenerate }: ChatMessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function submitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onEditSubmit(message.id, trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mb-6 flex justify-end">
        <div className="w-full max-w-[85%] rounded-2xl border border-primary/40 bg-card p-3 shadow-sm">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitEdit}>
              Save &amp; submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group mb-6", isUser ? "flex justify-end" : "flex justify-start")}>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        <div className="flex items-start gap-3">
          {!isUser && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          )}
          <div
            className={cn(
              "rounded-2xl px-5 py-3 shadow-sm",
              isUser
                ? "bg-primary text-primary-foreground"
                : message.error
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-card border border-border/50"
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </div>
        </div>

        {/* Hover actions */}
        <div
          className={cn(
            "flex items-center gap-1 px-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "self-end" : "self-start pl-11"
          )}
        >
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copy} title="Copy">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          {isUser && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {!isUser && isLastAssistant && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRegenerate} title="Regenerate">
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {message.edited_at && <span className="text-[10px] italic">edited</span>}
        </div>
      </div>
    </div>
  );
}
