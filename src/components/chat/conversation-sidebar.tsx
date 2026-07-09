"use client";

import { useMemo, useState } from "react";
import {
  Pin,
  PinOff,
  Pencil,
  Share2,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types/chat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onShare: (id: string) => void;
  onDelete: (id: string) => void;
}

function groupConversations(conversations: Conversation[]) {
  const pinned: Conversation[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const last7Days: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const conversation of conversations) {
    if (conversation.pinned) {
      pinned.push(conversation);
      continue;
    }
    const lastMessageDate = new Date(conversation.last_message_at);
    if (lastMessageDate >= startOfToday) today.push(conversation);
    else if (lastMessageDate >= startOfYesterday) yesterday.push(conversation);
    else if (lastMessageDate >= sevenDaysAgo) last7Days.push(conversation);
    else older.push(conversation);
  }

  return [
    { label: "Pinned", items: pinned },
    { label: "Today", items: today },
    { label: "Yesterday", items: yesterday },
    { label: "Previous 7 days", items: last7Days },
    { label: "Older", items: older },
  ].filter((group) => group.items.length > 0);
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onRename,
  onTogglePin,
  onShare,
  onDelete,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  function startRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title);
  }

  function commitRename(id: string) {
    const trimmed = draftTitle.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-6 w-6 opacity-50" />
        <p>No conversations yet. Start a new chat to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
          {group.items.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group relative flex items-center rounded-xl",
                activeId === conversation.id ? "bg-accent" : "hover:bg-accent/60"
              )}
            >
              {editingId === conversation.id ? (
                <div className="flex w-full items-center gap-1 px-2 py-1">
                  <Input
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(conversation.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-8 rounded-lg text-sm"
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => commitRename(conversation.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(conversation.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"
                  >
                    {conversation.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                    <span className="truncate">{conversation.title}</span>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mr-1 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onSelect={() => onTogglePin(conversation.id, !conversation.pinned)}>
                        {conversation.pinned ? (
                          <>
                            <PinOff className="h-4 w-4" /> Unpin
                          </>
                        ) : (
                          <>
                            <Pin className="h-4 w-4" /> Pin
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => startRename(conversation)}>
                        <Pencil className="h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onShare(conversation.id)}>
                        <Share2 className="h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {confirmDeleteId === conversation.id ? (
                        <DropdownMenuItem
                          destructive
                          onSelect={(e) => {
                            e.preventDefault();
                            onDelete(conversation.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Confirm delete?
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          destructive
                          onSelect={(e) => {
                            e.preventDefault();
                            setConfirmDeleteId(conversation.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
