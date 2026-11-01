-- Kairo Radar : opportunités réelles et sourcées (appels d'offres BOAMP, signaux de croissance, recrutements)
create table if not exists public.radar_opps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  kind text not null check (kind in ('appel_offres','croissance','recrutement')),
  title text not null default '',
  company text not null default '',
  summary text not null default '',
  why text not null default '',
  city text not null default '',
  dept text not null default '',
  url text not null default '',
  source text not null default '',
  published date,
  deadline timestamptz,
  status text not null default 'nouveau' check (status in ('nouveau','suivi','ajoute','ecarte')),
  prospect_id uuid references public.prospects(id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);
create index if not exists radar_ws_idx on public.radar_opps (workspace_id, created_at desc);
alter table public.radar_opps enable row level security;
create policy radar_select on public.radar_opps for select to authenticated using (public.is_member(workspace_id));
create policy radar_update on public.radar_opps for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
alter table public.workspaces add column if not exists radar_cfg jsonb;
alter table public.workspaces add column if not exists radar_at timestamptz;
