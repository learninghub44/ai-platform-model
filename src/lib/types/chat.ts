export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  pinned_at: string | null;
  is_shared: boolean;
  share_id: string | null;
  folder_id: string | null;
  last_message_at: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
  /** Set when this image was produced by the image-gen endpoint (not uploaded by the user). */
  generated?: boolean;
  /** The prompt used to produce a generated image — reused for "Regenerate" / "Variations". */
  prompt?: string;
  /** How this image came to exist, for the action row on generated images. */
  genAction?: "generate" | "variation" | "upscale";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  error?: boolean;
  edited_at?: string | null;
  created_at: string;
  attachments?: ChatAttachment[];
  /** Client-only: set while a message is being edited inline */
  pending?: boolean;
  /** Client-only: has this message already finished its stream reveal? */
  streamed?: boolean;
  /** Client-only: thumbs feedback, not persisted */
  feedback?: "up" | "down" | null;
}
