-- ============================================================================
-- 0004_add_conversations.sql
-- Chat history: conversations + messages, with pin, share, and edit support.
-- ============================================================================

do $$ begin
  create type message_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

-- ── conversations ────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New chat',
  pinned boolean not null default false,
  pinned_at timestamptz,
  is_shared boolean not null default false,
  share_id uuid unique,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversations_user on public.conversations(user_id);
create index if not exists idx_conversations_user_last_message
  on public.conversations(user_id, pinned desc, last_message_at desc);
create index if not exists idx_conversations_share_id on public.conversations(share_id)
  where share_id is not null;

-- ── messages ─────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text not null,
  error boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- keep conversations.last_message_at and updated_at in sync automatically
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message on public.messages;
create trigger trg_touch_conversation_on_message
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_own_or_shared_or_admin" on public.conversations;
create policy "conversations_select_own_or_shared_or_admin" on public.conversations
  for select using (user_id = auth.uid() or is_shared = true or public.is_admin());

drop policy if exists "conversations_crud_own" on public.conversations;
create policy "conversations_crud_own" on public.conversations
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "messages_select_own_or_shared_or_admin" on public.messages;
create policy "messages_select_own_or_shared_or_admin" on public.messages
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.is_shared = true
    )
  );

drop policy if exists "messages_crud_own" on public.messages;
create policy "messages_crud_own" on public.messages
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
