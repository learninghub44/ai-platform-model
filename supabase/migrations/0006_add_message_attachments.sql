-- ============================================================================
-- 0006_add_message_attachments.sql
-- Batch 2: real file attachments on chat messages (drag-and-drop upload).
-- ============================================================================

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Let files be traced back to the conversation they were attached in, so a
-- future "delete conversation" cleanup job can also remove orphaned uploads.
alter table public.files
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

create index if not exists idx_files_conversation on public.files(conversation_id)
  where conversation_id is not null;
