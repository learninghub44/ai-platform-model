"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Paperclip,
  Camera,
  Image as ImageIcon,
  Mic,
  MicOff,
  Globe,
  BrainCircuit,
  Sparkles,
  Plus,
  BookMarked,
  Send,
  Square,
  Loader2,
  X,
  FileIcon,
  UploadCloud,
  AlertCircle,
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
import type { PendingAttachment } from "@/lib/chat/attachments";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";

interface ChatComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  loading: boolean;
  locked: boolean;
  lockResetTime?: string | null;
  textareaRef: RefObject<HTMLTextAreaElement>;
  webSearch: boolean;
  onWebSearchChange: (v: boolean) => void;
  deepThink: boolean;
  onDeepThinkChange: (v: boolean) => void;
  imageMode: boolean;
  onImageModeChange: (v: boolean) => void;
  onSelectTemplate: (template: PromptTemplate) => void;
  attachments: PendingAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function AttachmentChip({ attachment, onRemove }: { attachment: PendingAttachment; onRemove: () => void }) {
  const isImage = attachment.file.type.startsWith("image/");

  return (
    <div className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-border/50 bg-card pr-2 text-xs shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-accent/40">
        {isImage && attachment.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={attachment.previewUrl} alt={attachment.file.name} className="h-full w-full object-cover" />
        ) : attachment.status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <FileIcon className="h-4 w-4 text-primary" />
        )}
      </div>

      <div className="min-w-0 py-1.5">
        <p className="max-w-[130px] truncate font-medium">{attachment.file.name}</p>
        {attachment.status === "uploading" ? (
          <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-accent">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${attachment.progress}%` }}
            />
          </div>
        ) : attachment.status === "error" ? (
          <p className="truncate text-[10px] text-destructive">{attachment.error ?? "Upload failed"}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.file.size)}</p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="ml-1 shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        title="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
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
  webSearch,
  onWebSearchChange,
  deepThink,
  onDeepThinkChange,
  imageMode,
  onImageModeChange,
  onSelectTemplate,
  attachments,
  onAddFiles,
  onRemoveAttachment,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const baseValueRef = useRef(value);

  const anyUploading = attachments.some((a) => a.status === "uploading");

  const {
    isSupported: voiceSupported,
    recording,
    interimTranscript,
    error: speechError,
    toggle: toggleVoice,
  } = useSpeechRecognition({
    onFinalResult: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      onChange(`${baseValueRef.current}${baseValueRef.current && !baseValueRef.current.endsWith(" ") ? " " : ""}${trimmed} `);
    },
  });

  // Track the latest committed value so each finalized speech chunk appends
  // to what's already there, rather than to a stale snapshot from when
  // recording started.
  useEffect(() => {
    baseValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (speechError) setVoiceError(speechError);
  }, [speechError]);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onAddFiles(Array.from(fileList));
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;
    if (e.dataTransfer.types.includes("Files")) {
      dragCounter.current += 1;
      setDragActive(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);
    if (locked) return;
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div
        className="relative mx-auto max-w-[900px] px-4 py-4 sm:px-6"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-1 z-10 flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
            <UploadCloud className="h-6 w-6 text-primary" />
            <p className="text-sm font-medium text-primary">Drop files to attach</p>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} onRemove={() => onRemoveAttachment(att.id)} />
            ))}
          </div>
        )}

        <div className="relative rounded-[20px] border border-border/50 bg-card shadow-glass-md">
          {locked && <UsageLockOverlay resetTime={lockResetTime ?? null} />}

          <Textarea
            ref={textareaRef}
            value={recording && interimTranscript ? `${value}${value && !value.endsWith(" ") ? " " : ""}${interimTranscript}` : value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            onPaste={(e) => {
              const files = e.clipboardData.files;
              if (files && files.length > 0) addFiles(files);
            }}
            placeholder={
              locked
                ? "You're out of credit — upgrade to keep chatting"
                : imageMode
                ? "Describe the image you want to generate..."
                : "Message the assistant..."
            }
            disabled={locked}
            className="min-h-[56px] max-h-[240px] resize-none border-0 bg-transparent px-4 pt-4 pb-2 text-[1rem] leading-relaxed focus-visible:ring-0 focus-visible:shadow-none"
            rows={1}
          />

          {recording && (
            <div className="flex items-center gap-1.5 px-4 pb-1 text-xs text-destructive">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
              Listening...
            </div>
          )}
          {voiceError && !recording && (
            <div className="flex items-center gap-1.5 px-4 pb-1 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {voiceError}
            </div>
          )}
          {imageMode && !recording && (
            <div className="flex items-center gap-1.5 px-4 pb-1 text-xs text-primary">
              <Sparkles className="h-3 w-3 shrink-0" />
              Image mode — your message will be sent as an image prompt
            </div>
          )}

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
                onClick={() => {
                  setVoiceError(null);
                  toggleVoice();
                }}
                title={voiceSupported ? "Voice input" : "Voice input isn't supported in this browser"}
              >
                {recording ? (
                  <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
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

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium",
                  imageMode && "bg-primary/10 text-primary"
                )}
                onClick={() => onImageModeChange(!imageMode)}
                title="Generate an image from your message instead of chatting"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Image</span>
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
            </div>

            {loading && onStop ? (
              <Button onClick={onStop} size="icon" variant="destructive" className="h-9 w-9 shrink-0 rounded-xl" title="Stop generating">
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={onSend}
                disabled={loading || locked || anyUploading || (!value.trim() && attachments.length === 0)}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                title={anyUploading ? "Waiting for attachments to finish uploading" : imageMode ? "Generate image" : "Send"}
              >
                {loading || anyUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : imageMode ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          XETU AI can make mistakes. Verify important information.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.csv,.xls,.xlsx,.zip,image/*,audio/*,video/*"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
