"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Eraser,
  Share2,
  MoreHorizontal,
  Copy,
  LayoutDashboard,
  CreditCard,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { PROMPT_TEMPLATES, getTemplateById, type PromptTemplate } from "@/lib/ai/templates";
import { cn } from "@/lib/utils";
import { ConversationSidebar } from "@/components/chat/conversation-sidebar";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ShareDialog } from "@/components/chat/share-dialog";
import { exportConversationAsMarkdown, exportConversationAsPDF } from "@/lib/chat/export";
import { uploadAttachment, makeAttachmentId, type PendingAttachment } from "@/lib/chat/attachments";
import { Logo } from "@/components/logo";
import type { Conversation, ChatMessage, Folder } from "@/lib/types/chat";

const APP_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

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

interface PlaygroundClientProps {
  isAdmin: boolean;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  initiallyLocked?: boolean;
  resetTime?: string | null;
}

export function PlaygroundClient({
  isAdmin,
  email,
  fullName,
  avatarUrl,
  initiallyLocked = false,
  resetTime = null,
}: PlaygroundClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initials = (fullName || email || "?").slice(0, 2).toUpperCase();
  const firstName = fullName?.split(" ")[0] || email?.split("@")[0];

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [locked, setLocked] = useState(initiallyLocked);
  const [lockResetTime, setLockResetTime] = useState<string | null>(resetTime);
  const [webSearch, setWebSearch] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [imageActionLoading, setImageActionLoading] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

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

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders ?? []);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(true);
    loadConversations();
    loadFolders();
  }, [loadConversations, loadFolders]);

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
    setAttachments([]);
    if (!window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(false);
  }

  function addAttachmentFiles(files: File[]) {
    const pending: PendingAttachment[] = files.map((file) => ({
      id: makeAttachmentId(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "uploading",
      progress: 0,
    }));
    setAttachments((prev) => [...prev, ...pending]);

    for (const att of pending) {
      uploadAttachment(att.file, activeId, (pct) => {
        setAttachments((prev) => prev.map((a) => (a.id === att.id ? { ...a, progress: pct } : a)));
      })
        .then((result) => {
          setAttachments((prev) =>
            prev.map((a) => (a.id === att.id ? { ...a, status: "done", progress: 100, result } : a))
          );
        })
        .catch((err) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === att.id ? { ...a, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : a
            )
          );
        });
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  async function sendMessage(content: string, opts?: { systemPrompt?: string }) {
    if ((!content.trim() && attachments.length === 0) || loading || locked) return;
    if (attachments.some((a) => a.status === "uploading")) return;

    const uploaded = attachments.filter((a) => a.status === "done" && a.result).map((a) => a.result!);

    const optimisticUser: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content,
      attachments: uploaded,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setSelectedTemplate(null);
    setAttachments([]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          content,
          attachments: uploaded,
          webSearch,
          systemPrompt: opts?.systemPrompt,
          temperature: deepThink ? 0.3 : undefined,
          maxTokens: deepThink ? 4096 : undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 429) {
        // Out of daily requests — pull the message back out of the thread
        // (nothing was actually sent) and lock the composer.
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setInput(content);
        setLocked(true);
        setLockResetTime(data.resetTime ?? null);
      } else if (!res.ok) {
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

  async function sendImageGeneration(action: "generate" | "variation" | "upscale", prompt?: string, sourceUrl?: string) {
    if (loading || locked) return;
    if ((action === "generate" || action === "upscale") && !prompt?.trim()) return;

    const label =
      action === "variation" ? "Generate a variation" : action === "upscale" ? `Upscale: ${prompt}` : prompt!;
    const optimisticUser: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: label,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, action, prompt, sourceUrl }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        if (action === "generate") setInput(prompt ?? "");
        setLocked(true);
        setLockResetTime(data.resetTime ?? null);
      } else if (!res.ok) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUser.id),
          { id: `err-${Date.now()}`, role: "assistant", content: data.error || "Image generation failed.", error: true, created_at: new Date().toISOString() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticUser.id),
          data.userMessage ?? optimisticUser,
          data.assistantMessage,
        ]);
        if (!activeId && data.conversation) setActiveId(data.conversation.id);
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

  async function handleImageAction(action: "upscale" | "variation" | "regenerate", attachment: NonNullable<ChatMessage["attachments"]>[number]) {
    setImageActionLoading(`${attachment.id}-${action}`);
    try {
      if (action === "variation") {
        await sendImageGeneration("variation", undefined, attachment.url);
      } else if (action === "upscale") {
        await sendImageGeneration("upscale", attachment.prompt ?? "");
      } else {
        await sendImageGeneration("generate", attachment.prompt ?? "");
      }
    } finally {
      setImageActionLoading(null);
    }
  }

  async function handleSend() {
    if (locked) return;

    if (imageMode) {
      const prompt = input.trim();
      if (!prompt) return;
      await sendImageGeneration("generate", prompt);
      return;
    }

    let finalInput = input;
    let systemPrompt: string | undefined;

    if (selectedTemplate) {
      const template = getTemplateById(selectedTemplate);
      if (template) {
        systemPrompt = template.systemPrompt;
        finalInput = template.userPromptTemplate.replace(/\{[^}]+\}/g, input);
      }
    }

    if (!finalInput.trim() && attachments.length > 0) {
      finalInput = "Take a look at the attached file(s).";
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
    if (!activeId || loading || locked) return;
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

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/conversations/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      await loadConversations();
      if (data.conversation) selectConversation(data.conversation.id);
    }
  }

  async function handleMoveToFolder(id: string, folderId: string | null) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, folder_id: folderId } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder_id: folderId }),
    });
  }

  async function handleCreateFolder(name: string) {
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) await loadFolders();
  }

  async function handleRenameFolder(id: string, name: string) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function handleDeleteFolder(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setConversations((prev) => prev.map((c) => (c.folder_id === id ? { ...c, folder_id: null } : c)));
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
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

  function selectTemplateFromLibrary(template: PromptTemplate) {
    selectTemplate(template.id);
  }

  function handleFeedback(messageId: string, feedback: "up" | "down") {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback: m.feedback === feedback ? null : feedback } : m))
    );
  }

  async function handleContinueWriting() {
    if (!activeId || loading || locked) return;
    await sendMessage("Continue writing from exactly where you left off.");
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

      {/* Sidebar — logo, conversation history, and app navigation */}
      <aside
        className={cn(
          "border-r border-border/50 bg-background/95 backdrop-blur-xl transition-all duration-300 ease-out overflow-hidden flex flex-col",
          "fixed inset-y-0 left-0 z-50 md:static md:z-auto",
          sidebarOpen ? "w-72" : "w-0 border-r-0 md:w-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
        </div>

        <div className="p-4 pb-2">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-2">
          <ConversationSidebar
            conversations={conversations}
            folders={folders}
            activeId={activeId}
            onSelect={selectConversation}
            onRename={handleRename}
            onTogglePin={handleTogglePin}
            onShare={openShareDialog}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onMoveToFolder={handleMoveToFolder}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* App navigation — this is the only nav on this page, so it lives
            in the same sidebar as chat history rather than a separate,
            overlapping app shell. */}
        <nav className="shrink-0 space-y-1 border-t border-border/50 px-3 py-3">
          {APP_NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                  active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Admin
            </Link>
          )}
        </nav>

        <div className="shrink-0 border-t border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-border/50">
              <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? email} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {firstName ? `Welcome back, ${firstName}` : "Your account"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive transition-colors disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/50 px-4 py-4 bg-background/95 backdrop-blur-xl sm:px-6">
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
                  <DropdownMenuItem onSelect={() => handleDuplicate(activeId)}>
                    <Copy className="h-4 w-4" /> Duplicate chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => exportConversationAsMarkdown(activeConversation?.title ?? "Conversation", messages)}
                  >
                    <FileText className="h-4 w-4" /> Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => exportConversationAsPDF(activeConversation?.title ?? "Conversation", messages)}
                  >
                    <FileText className="h-4 w-4" /> Export as PDF
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
            <div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
              {historyLoading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!historyLoading && messages.length === 0 && (
                <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 text-center">
                  <div className="mb-6 rounded-2xl bg-primary/10 p-5">
                    <Sparkles className="h-10 w-10 text-primary sm:h-12 sm:w-12" />
                  </div>
                  <h2 className="mb-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    {getGreeting()}
                    {firstName ? `, ${firstName}` : ""}
                  </h2>
                  <p className="mb-8 max-w-md text-base text-muted-foreground sm:text-lg">
                    How can I help you today? Choose a template below or just start typing.
                  </p>
                  <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
                    {PROMPT_TEMPLATES.slice(0, 4).map((template) => {
                      const IconComponent = ICON_MAP[template.icon] || FileText;
                      return (
                        <button
                          key={template.id}
                          onClick={() => selectTemplate(template.id)}
                          className="group rounded-2xl border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-glass-md sm:p-5"
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-xl bg-primary/10 p-2">
                              <IconComponent className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="text-sm font-medium">{template.name}</div>
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
                      conversationTitle={activeConversation?.title}
                      onEditSubmit={handleEditMessage}
                      onRegenerate={handleRegenerate}
                      onShare={activeId ? () => openShareDialog(activeId) : undefined}
                      onContinueWriting={m.id === lastAssistantId ? handleContinueWriting : undefined}
                      onFeedback={handleFeedback}
                      onImageAction={handleImageAction}
                      imageActionLoading={imageActionLoading}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <div className="mb-6 flex items-center gap-3 pl-11 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                  </span>
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>

          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            loading={loading}
            locked={locked}
            lockResetTime={lockResetTime}
            textareaRef={textareaRef}
            webSearch={webSearch}
            onWebSearchChange={setWebSearch}
            deepThink={deepThink}
            onDeepThinkChange={setDeepThink}
            imageMode={imageMode}
            onImageModeChange={setImageMode}
            onSelectTemplate={selectTemplateFromLibrary}
            attachments={attachments}
            onAddFiles={addAttachmentFiles}
            onRemoveAttachment={removeAttachment}
          />
        </div>
      </main>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        isShared={Boolean(activeConversation?.is_shared)}
        shareUrl={shareUrl}
        conversationTitle={activeConversation?.title}
        loading={shareLoading}
        onEnableShare={handleEnableShare}
        onDisableShare={handleDisableShare}
      />
    </div>
  );
}
