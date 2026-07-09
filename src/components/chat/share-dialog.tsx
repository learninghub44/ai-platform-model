"use client";

import { useState } from "react";
import { Check, Copy, Globe2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isShared: boolean;
  shareUrl: string | null;
  loading: boolean;
  onEnableShare: () => void;
  onDisableShare: () => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  isShared,
  shareUrl,
  loading,
  onEnableShare,
  onDisableShare,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share chat</DialogTitle>
          <DialogDescription>
            Anyone with the link can view a read-only copy of this conversation. They won&apos;t be able to
            continue it or see your other chats.
          </DialogDescription>
        </DialogHeader>

        {isShared && shareUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2">
              <Globe2 className="h-4 w-4 shrink-0 text-primary" />
              <Input readOnly value={shareUrl} className="h-8 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0" />
              <Button size="sm" variant="secondary" onClick={copyLink} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={onDisableShare} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Make private again
            </Button>
          </div>
        ) : (
          <Button onClick={onEnableShare} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
            Create public link
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
