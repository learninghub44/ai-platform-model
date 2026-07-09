"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Loader2,
  Plus,
  PanelLeft,
  FileText,
  Pen,
  Calendar,
  Book,
  Palette,
  Code,
  Shapes,
  BarChart3,
  Mail,
  Share as ShareIcon,
  Search,
  Paperclip,
  Mic,
  Eraser,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PROMPT_TEMPLATES, getTemplateById } from "@/lib/ai/templates";
import { cn } from "@/lib/utils";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { ShareDialog } from "@/components/chat/share-dialog";
import type { Conversation, ChatMessage } from "@/lib/types/chat";

const ICON_MAP: Record<string, any> = {
  Document: FileText,
  Pen,
  Calendar,
  Book,
  Palette,
  Code,
  Shapes,
  FileText,
  Chart: BarChart3,
  Mail,
  Share: ShareIcon,
  Search,
};

export default function AiPlaygroundPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations ?? []);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(true);
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  async function selectConversation(id: string) {
    setActiveId(id);
    setHistoryLoading(true);
    setMessages([]);
    if (!window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(false);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleNewChat() {
    setActiveId(null);
    setMessages([]);
    setSelectedTemplate(null);
    setInput("");
    if (!window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(false);
  }

  async function sendMessage(content: string, opts?: { systemPrompt?: string }) {
    if (!content.trim() || loading) return;

    const optimisticUser: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSelectedTemplate(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          content,
          systemPrompt: opts?.systemPrompt,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUser.id),
          data.userMessage ?? optimisticUser,
          { id: `err-${Date.now()}`, role: "assistant", content: data.error || "Something went wrong. Please try again.", error: true, created_at: new Date().toISOString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUser.id),
          data.userMessage,
          data.assistantMessage,
        ]);
        if (!activeId && data.conversation) {
          setActiveId(data.conversation.id);
        }
      }
      await loadConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Network error. Please check your connection.", error: true, created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    let finalInput = input;
    let systemPrompt: string | undefined;

    if (selectedTemplate) {
      const template = getTemplateById(selectedTemplate);
      if (template) {
        systemPrompt = template.systemPrompt;
        finalInput = template.userPromptTemplate.replace(/\{[^}]+\}/g, input);
      }
    }

    await sendMessage(finalInput, { systemPrompt });
  }

  async function handleEditMessage(messageId: string, newContent: string) {
    if (!activeId) return;
    setLoading(true);
    try {
      // Persist the edit and drop everything that followed it — the old
      // reply no longer matches the edited question.
      await fetch(`/api/conversations/${activeId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, truncateAfter: true }),
      });

      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === messageId);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx + 1).map((m) => (m.id === messageId ? { ...m, content: newContent } : m))];
      });

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, regenerate: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: data.error || "Something went wrong.", error: true, created_at: new Date().toISOString() },
        ]);
      }
      await loadConversations();
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate() {
    if (!activeId || loading) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    setLoading(true);
    try {
      // Remove the stale reply, both locally and on the server, then ask
      // the model to answer the same last user message again.
      setMessages((prev) => prev.filter((m) => m.id !== lastAssistant.id));
      await fetch(`/api/conversations/${activeId}/messages/${lastAssistant.id}?cascade=true`, {
        method: "DELETE",
      });

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, regenerate: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data.assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: data.error || "Something went wrong.", error: true, created_at: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClearChat() {
    if (!activeId) return;
    setMessages([]);
    await fetch(`/api/conversations/${activeId}/messages`, { method: "DELETE" });
  }

  async function handleRename(id: string, title: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
    await loadConversations();
  }

  async function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) handleNewChat();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  }

  function openShareDialog(id: string) {
    setActiveId(id);
    setShareDialogOpen(true);
  }

  async function handleEnableShare() {
    if (!activeId) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/conversations/${activeId}/share`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, is_shared: true, share_id: data.shareId } : c))
        );
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handleDisableShare() {
    if (!activeId) return;
    setShareLoading(true);
    try {
      await fetch(`/api/conversations/${activeId}/share`, { method: "DELETE" });
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, is_shared: false } : c)));
    } finally {
      setShareLoading(false);
    }
  }

  function selectTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    const template = getTemplateById(templateId);
    if (template) {
      setInput(template.userPromptTemplate);
      textareaRef.current?.focus();
    }
  }

  function autoResizeTextarea() {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }

  const shareUrl =
    activeConversation?.is_shared && activeConversation.share_id && typeof window !== "undefined"
      ? `${window.location.origin}/share/${activeConversation.share_id}`
      : null;

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — conversation history */}
      <aside
        className={cn(
          "border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden flex flex-col",
          "fixed inset-y-0 left-0 z-50 md:static md:z-auto",
          sidebarOpen ? "w-72" : "w-0 border-r-0 md:w-0"
        )}
      >
        <div className="p-4">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <ConversationSidebar
            conversations={conversations}
            activeId={activeId}
            onSelect={selectConversation}
            onRename={handleRename}
            onTogglePin={handleTogglePin}
            onShare={openShareDialog}
            onDelete={handleDelete}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/50 px-6 py-4 bg-background/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-xl hover:bg-accent shrink-0">
              <PanelLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-semibold truncate">
              {activeConversation?.title ?? "New chat"}
            </h1>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-accent">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => openShareDialog(activeId)}>
                    <Share2 className="h-4 w-4" /> Share chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleClearChat}>
                    <Eraser className="h-4 w-4" /> Clear messages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="icon" onClick={handleNewChat} className="rounded-xl hover:bg-accent">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-8">
              {historyLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!historyLoading && messages.length === 0 && (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center px-4">
                  <div className="mb-8 rounded-2xl bg-primary/10 p-6">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-semibold">How can I help you today?</h2>
                  <p className="mb-8 text-muted-foreground max-w-md">
                    Choose a template or start typing your question
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 w-full max-w-2xl">
                    {PROMPT_TEMPLATES.slice(0, 4).map((template) => {
                      const IconComponent = ICON_MAP[template.icon] || FileText;
                      return (
                        <button
                          key={template.id}
                          onClick={() => selectTemplate(template.id)}
                          className="group rounded-2xl border border-border/50 bg-card p-5 text-left hover:border-primary/50 hover:shadow-glass-md transition-all duration-200"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-xl bg-primary/10 p-2">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{template.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChatMessageBubble
                      message={m}
                      isLastAssistant={m.id === lastAssistantId}
                      onEditSubmit={handleEditMessage}
                      onRegenerate={handleRegenerate}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto max-w-3xl px-6 py-4">
              <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-card p-2 shadow-glass">
                <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-accent" disabled>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your message..."
                  className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent px-3 py-2 text-sm focus-visible:ring-0 focus-visible:shadow-none"
                  rows={1}
                />
                <Button variant="ghost" size="icon" className="shrink-0 rounded-xl hover:bg-accent" disabled>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {selectedTemplate && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Template:</span>
                    <span className="font-medium">{getTemplateById(selectedTemplate)?.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)}>
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        isShared={Boolean(activeConversation?.is_shared)}
        shareUrl={shareUrl}
        loading={shareLoading}
        onEnableShare={handleEnableShare}
        onDisableShare={handleDisableShare}
      />
    </div>
  );
}
