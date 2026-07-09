"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Pencil,
  RefreshCw,
  Sparkles,
  Share2,
  FileDown,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ChevronsDown,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MessageContent } from "./message-content";
import { useStreamingText } from "@/lib/hooks/use-streaming-text";
import { exportConversationAsMarkdown, exportConversationAsPDF } from "@/lib/chat/export";
import type { ChatMessage } from "@/lib/types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isLastAssistant: boolean;
  conversationTitle?: string;
  onEditSubmit: (messageId: string, newContent: string) => void;
  onRegenerate: () => void;
  onShare?: () => void;
  onContinueWriting?: () => void;
  onFeedback?: (messageId: string, feedback: "up" | "down") => void;
}

function ActionButton({
  onClick,
  title,
  active,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn("h-7 w-7 rounded-lg", active && "bg-primary/10 text-primary")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function ChatMessageBubble({
  message,
  isLastAssistant,
  conversationTitle,
  onEditSubmit,
  onRegenerate,
  onShare,
  onContinueWriting,
  onFeedback,
}: ChatMessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isOptimistic = message.id.startsWith("optimistic-");

  const { visible, done } = useStreamingText(
    message.content,
    !isUser && !message.error && !message.streamed && isLastAssistant
  );

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
    <div className={cn("group mb-7", isUser ? "flex justify-end" : "flex justify-start")}>
      <div className={cn("flex w-full flex-col gap-1.5", isUser ? "max-w-[85%] items-end" : "max-w-[95%] items-start")}>
        <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              isUser ? "bg-accent" : "bg-gradient-to-br from-primary to-brand-cyan shadow-sm"
            )}
          >
            {isUser ? <User className="h-4 w-4 text-foreground/70" /> : <Sparkles className="h-4 w-4 text-white" />}
          </div>

          {isUser ? (
            <div className="rounded-2xl rounded-tr-md bg-primary px-5 py-3 text-primary-foreground shadow-sm">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
            </div>
          ) : (
            <div
              className={cn(
                "min-w-0 rounded-2xl rounded-tl-md px-5 py-3.5 shadow-sm",
                message.error
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-card border border-border/50"
              )}
            >
              <MessageContent content={visible} className="text-[15px]" />
              {!done && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Hover / persistent action row */}
        <div
          className={cn(
            "flex items-center gap-0.5 px-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100",
            isUser ? "self-end" : "self-start pl-11",
            isOptimistic && "hidden"
          )}
        >
          <ActionButton onClick={copy} title="Copy">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </ActionButton>

          {isUser && (
            <ActionButton onClick={() => setEditing(true)} title="Edit prompt">
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          )}

          {!isUser && !message.error && (
            <>
              <ActionButton
                onClick={() => onFeedback?.(message.id, "up")}
                title="Good response"
                active={message.feedback === "up"}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                onClick={() => onFeedback?.(message.id, "down")}
                title="Bad response"
                active={message.feedback === "down"}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </ActionButton>
              {isLastAssistant && (
                <>
                  <ActionButton onClick={onRegenerate} title="Regenerate">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </ActionButton>
                  {onContinueWriting && (
                    <ActionButton onClick={onContinueWriting} title="Continue writing">
                      <ChevronsDown className="h-3.5 w-3.5" />
                    </ActionButton>
                  )}
                </>
              )}
              {onShare && (
                <ActionButton onClick={onShare} title="Share">
                  <Share2 className="h-3.5 w-3.5" />
                </ActionButton>
              )}
              <ActionButton
                onClick={() => exportConversationAsMarkdown(conversationTitle ?? "Conversation", [message])}
                title="Export as Markdown"
              >
                <FileText className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton
                onClick={() => exportConversationAsPDF(conversationTitle ?? "Conversation", [message])}
                title="Export as PDF"
              >
                <FileDown className="h-3.5 w-3.5" />
              </ActionButton>
            </>
          )}

          {message.error && (
            <ActionButton onClick={onRegenerate} title="Retry">
              <RotateCcw className="h-3.5 w-3.5" />
            </ActionButton>
          )}

          {message.edited_at && <span className="ml-1 text-[10px] italic">edited</span>}
        </div>
      </div>
    </div>
  );
}
