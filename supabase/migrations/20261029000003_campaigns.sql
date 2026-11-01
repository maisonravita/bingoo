create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  target_id text not null default '',
  goal text not null default 'rdv',
  status text not null default 'active' check (status in ('active','pause','terminee')),
  starts_on date not null default current_date,
  ends_on date,
  followups boolean not null default true,
  variants jsonb not null default '[]'::jsonb,
  winner text,
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_ws_idx on public.campaigns (workspace_id, created_at desc);
alter table public.campaigns enable row level security;
drop policy if exists camp_all on public.campaigns;
create policy camp_all on public.campaigns for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
grant select, insert, update, delete on public.campaigns to authenticated;

alter table public.messages
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null,
  add column if not exists variant text not null default '',
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz,
  add column if not exists opens int not null default 0,
  add column if not exists clicks int not null default 0,
  add column if not exists bounced boolean not null default false;
create index if not exists messages_provider_idx on public.messages (provider_id) where provider_id <> '';
create index if not exists messages_campaign_idx on public.messages (campaign_id) where campaign_id is not null;

alter table public.prospects add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.competitors add column if not exists ads jsonb, add column if not exists ads_at timestamptz;
