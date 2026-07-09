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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  error?: boolean;
  edited_at?: string | null;
  created_at: string;
  /** Client-only: set while a message is being edited inline */
  pending?: boolean;
}
