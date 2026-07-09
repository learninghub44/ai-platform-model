-- ============================================================================
-- 0007_add_folders_and_image_gen.sql
-- Batch 3: conversation folders, and metadata for AI-generated images
-- (upscale / variations / regenerate live entirely in the attachments jsonb,
-- so no new column is needed on messages for that part).
-- ============================================================================

-- ── folders ──────────────────────────────────────────────────────────────────
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_folders_user on public.folders(user_id, position);

alter table public.conversations
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists idx_conversations_folder on public.conversations(folder_id)
  where folder_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.folders enable row level security;

drop policy if exists "folders_crud_own" on public.folders;
create policy "folders_crud_own" on public.folders
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Deleting a folder shouldn't delete its conversations — just drop them back
-- to "no folder" so nothing is silently lost.
-- (the on delete set null above already covers this at the DB level)
