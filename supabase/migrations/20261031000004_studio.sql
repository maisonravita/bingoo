create table if not exists public.studio_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null default 'social',
  brief text not null default '',
  params jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists studio_ws_idx on public.studio_items (workspace_id, created_at desc);
alter table public.studio_items enable row level security;
create policy studio_select on public.studio_items for select to authenticated using (public.is_member(workspace_id));
create policy studio_update on public.studio_items for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy studio_delete on public.studio_items for delete to authenticated using (public.is_member(workspace_id));
