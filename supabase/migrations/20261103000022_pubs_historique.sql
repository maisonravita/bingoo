-- Espion : historique complet des publicités des concurrents (même arrêtées)
create table if not exists public.competitor_ads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  key text not null,
  platform text not null default 'autre', ext_id text,
  body text not null default '', title text, offer text, format text, link text, snapshot_url text,
  started date, stopped date, reach bigint, source text,
  first_seen date not null default current_date, last_seen date not null default current_date,
  primary key (competitor_id, key)
);
create index if not exists competitor_ads_ws on public.competitor_ads (workspace_id);
alter table public.competitor_ads enable row level security;
drop policy if exists competitor_ads_read on public.competitor_ads;
create policy competitor_ads_read on public.competitor_ads for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
