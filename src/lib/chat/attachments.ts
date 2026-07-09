import type { ChatAttachment } from "@/lib/types/chat";

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string | null;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  /** Set once the upload completes — this is what actually gets sent with the message. */
  result?: ChatAttachment;
}

let seq = 0;
export function makeAttachmentId() {
  seq += 1;
  return `att-${Date.now()}-${seq}`;
}

/**
 * Uploads a single file to /api/upload/chat via XHR (not fetch) specifically
 * because XHR exposes upload.onprogress — fetch has no upload progress hook.
 * Resolves with the stored attachment metadata, or rejects with a message.
 */
export function uploadAttachment(
  file: File,
  conversationId: string | null,
  onProgress: (pct: number) => void
): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/chat");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as ChatAttachment);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Upload failed — invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    const form = new FormData();
    form.append("file", file);
    if (conversationId) form.append("conversationId", conversationId);
    xhr.send(form);
  });
}
