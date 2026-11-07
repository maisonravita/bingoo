-- Mesure de l'usage (pilotes) : quelle vue, quels bâtiments, où l'on hésite, où l'on cherche de l'aide
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid default auth.uid(),
  kind text not null check (kind in ('vue', 'lieu', 'hesitation', 'aide', 'serie')),
  detail text not null default '' check (length(detail) <= 80),
  at timestamptz not null default now()
);
create index if not exists usage_events_ws_at on public.usage_events (workspace_id, at desc);
alter table public.usage_events enable row level security;
drop policy if exists usage_insert on public.usage_events;
create policy usage_insert on public.usage_events for insert to authenticated
  with check (exists (select 1 from public.members m where m.workspace_id = usage_events.workspace_id and m.user_id = auth.uid()) and user_id = auth.uid());
-- admin_usage(p_jours) : voir la migration appliquée (résumé par espace)
