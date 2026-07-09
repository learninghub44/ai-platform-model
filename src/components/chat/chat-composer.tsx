"use client";

import { useRef, useState, type RefObject } from "react";
import {
  Paperclip,
  Camera,
  Image as ImageIcon,
  Mic,
  Globe,
  BrainCircuit,
  Plus,
  BookMarked,
  Send,
  Square,
  Loader2,
  ChevronDown,
  X,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UsageLockOverlay } from "./usage-lock-overlay";
import { PROMPT_TEMPLATES, type PromptTemplate } from "@/lib/ai/templates";

export interface ModelOption {
  id: string;
  label: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: "anthropic", label: "Claude" },
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
  { id: "groq", label: "Groq" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "together", label: "Together AI" },
  { id: "cohere", label: "Cohere" },
  { id: "deepseek", label: "DeepSeek" },
];

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  locked: boolean;
  lockResetTime?: string | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
  model: string;
  onModelChange: (model: string) => void;
  webSearch: boolean;
  onWebSearchChange: (v: boolean) => void;
  deepThink: boolean;
  onDeepThinkChange: (v: boolean) => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  attachments: File[];
  onAttachmentsChange: (files: File[]) => void;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  loading,
  locked,
  lockResetTime,
  textareaRef,
  model,
  onModelChange,
  webSearch,
  onWebSearchChange,
  deepThink,
  onDeepThinkChange,
  onSelectTemplate,
  attachments,
  onAttachmentsChange,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);

  const activeModel = MODEL_OPTIONS.find((m) => m.id === model) ?? MODEL_OPTIONS[0];

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    onAttachmentsChange([...attachments, ...Array.from(fileList)]);
  }

  function removeAttachment(idx: number) {
    onAttachmentsChange(attachments.filter((_, i) => i !== idx));
  }

  function toggleVoice() {
    // Voice capture wiring lands in a later batch — this is a visual toggle for now.
    setRecording((r) => !r);
  }

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-[900px] px-4 py-4 sm:px-6">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-1.5 text-xs shadow-sm"
              >
                <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button onClick={() => removeAttachment(idx)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative rounded-[20px] border border-border/50 bg-card shadow-glass-md">
          {locked && <UsageLockOverlay resetTime={lockResetTime ?? null} />}

          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={locked ? "You're out of credit — upgrade to keep chatting" : "Message the assistant..."}
            disabled={locked}
            className="min-h-[56px] max-h-[240px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:shadow-none"
            rows={1}
          />

          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <div className="flex flex-wrap items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Add / attach">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" /> Attach file
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => cameraInputRef.current?.click()}>
                    <Camera className="h-4 w-4" /> Camera
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => galleryInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4" /> Gallery
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="hidden h-8 w-8 rounded-lg sm:inline-flex" onClick={() => fileInputRef.current?.click()} title="Attach file">
                <Paperclip className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-lg", recording && "bg-destructive/10 text-destructive")}
                onClick={toggleVoice}
                title="Voice input"
              >
                <Mic className={cn("h-4 w-4", recording && "animate-pulse")} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                  webSearch && "bg-primary/10 text-primary"
                )}
                onClick={() => onWebSearchChange(!webSearch)}
                title="Web search"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                  deepThink && "bg-primary/10 text-primary"
                )}
                onClick={() => onDeepThinkChange(!deepThink)}
                title="Deep think — more thorough reasoning"
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Deep think</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Prompt library">
                    <BookMarked className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Prompt library</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {PROMPT_TEMPLATES.map((t) => (
                    <DropdownMenuItem key={t.id} onSelect={() => onSelectTemplate(t)}>
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-lg px-2.5 text-xs font-medium">
                    {activeModel.label}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuLabel>Model</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {MODEL_OPTIONS.map((m) => (
                    <DropdownMenuItem key={m.id} onSelect={() => onModelChange(m.id)}>
                      {m.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {loading && onStop ? (
              <Button onClick={onStop} size="icon" variant="destructive" className="h-9 w-9 shrink-0 rounded-xl" title="Stop generating">
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={loading || locked || (!value.trim() && attachments.length === 0)}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                title="Send"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          AI responses can be inaccurate. Verify important information.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.zip,image/*,audio/*,video/*"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
