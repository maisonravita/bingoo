-- Kairo Mission : un objectif commercial suivi dans le temps (clients signés et RDV comptés séparément)
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  objective text not null default '',
  goal_type text not null default 'clients' check (goal_type in ('clients','rdv')),
  goal_count int not null default 10 check (goal_count between 1 and 10000),
  deadline date,
  target_ids text[] not null default '{}',
  zone text[] not null default '{}',
  plan jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','pause','terminee')),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists missions_ws_idx on public.missions (workspace_id, status);
alter table public.missions enable row level security;
create policy missions_select on public.missions for select to authenticated using (public.is_member(workspace_id));
create policy missions_update on public.missions for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
alter table public.prospects add column if not exists mission_id uuid references public.missions(id) on delete set null;
create index if not exists prospects_mission_idx on public.prospects (mission_id) where mission_id is not null;
