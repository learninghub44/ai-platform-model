export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  pinned_at: string | null;
  is_shared: boolean;
  share_id: string | null;
  last_message_at: string;
  created_at: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "file";
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
