"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Loader2, Plus, MessageSquare, X, FileText, Pen, Calendar, Book, Palette, Code, Shapes, BarChart3, Mail, Share, Search, Paperclip, Mic, Copy, RefreshCw, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { PROMPT_TEMPLATES, getTemplateById, getAllCategories } from "@/lib/ai/templates";
import { cn } from "@/lib/utils";

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
  Share,
  Search,
};

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  templateId?: string;
}

export default function AiPlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    
    let finalInput = input;
    let systemPrompt: string | undefined;
    
    if (selectedTemplate) {
      const template = getTemplateById(selectedTemplate);
      if (template) {
        systemPrompt = template.systemPrompt;
        finalInput = template.userPromptTemplate.replace(/\{[^}]+\}/g, input);
      }
    }
    
    const userMessage: Message = { 
      role: "user", 
      content: finalInput,
      templateId: selectedTemplate || undefined
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSelectedTemplate(null);
    setLoading(true);

    try {
      const messagesToSend = systemPrompt 
        ? [{ role: "system" as const, content: systemPrompt }, ...nextMessages.map((m) => ({ role: m.role, content: m.content }))]
        : nextMessages.map((m) => ({ role: m.role, content: m.content }));
      
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesToSend,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Something went wrong. Please try again.", error: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.text },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Please check your connection.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setSelectedTemplate(null);
    setInput("");
    setUploadedFile(null);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  }

  function removeUploadedFile() {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function selectTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    const template = getTemplateById(templateId);
    if (template) {
      setInput(template.userPromptTemplate);
      textareaRef.current?.focus();
    }
    if (!window.matchMedia("(min-width: 768px)").matches) {
      setSidebarOpen(false);
    }
  }

  function autoResizeTextarea() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }

  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  const categories = getAllCategories();

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
            variant="default"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3">
          <div className="mb-4">
            <h3 className="mb-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Templates
            </h3>
            {categories.map((category) => (
              <div key={category} className="mb-4">
                <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{category}</p>
                {PROMPT_TEMPLATES.filter(t => t.category === category).map((template) => {
                  const IconComponent = ICON_MAP[template.icon] || FileText;
                  return (
                    <button
                      key={template.id}
                      onClick={() => selectTemplate(template.id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-3",
                        selectedTemplate === template.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <IconComponent className="h-4 w-4 shrink-0" />
                      <span className="truncate">{template.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/50 px-6 py-4 bg-background/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl hover:bg-accent"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-lg font-semibold">AI Assistant</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            className="rounded-xl hover:bg-accent"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-8">
              {messages.length === 0 && (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center px-4">
                  <div className="mb-8 rounded-2xl bg-primary/10 p-6">
                    <Sparkles className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="mb-3 text-2xl font-semibold">How can I help you today?</h2>
                  <p className="mb-8 text-muted-foreground max-w-md">
                    Choose a template from the sidebar or start typing your question
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
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`mb-6 ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                  >
                    <div className="flex items-start gap-3 max-w-[85%]">
                      {m.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-5 py-3 shadow-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : m.error
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-card border border-border/50"
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                      </div>
                    </div>
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

          {/* Input Area - Sticky */}
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto max-w-3xl px-6 py-4">
              {uploadedFile && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/50 bg-muted/50 px-4 py-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{uploadedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={removeUploadedFile}
                    className="h-6 w-6 rounded-lg"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="relative flex items-end gap-2 rounded-2xl border border-border/50 bg-card p-2 shadow-glass">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx,.md"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-xl hover:bg-accent"
                >
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "shrink-0 rounded-xl hover:bg-accent",
                    isRecording && "text-destructive"
                  )}
                >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(null)}
                    className="h-7 text-xs rounded-lg"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
