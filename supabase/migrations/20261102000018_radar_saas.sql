-- Radar adapté au métier + signaux SaaS : outils des sites (historique), pages carrières, abonnements, obligations, etc.
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte','client_concurrent',
  'obligation','abonnement','outil','avis','etablissement','demande','champion','essai']));

-- Lecture des sites des entreprises suivies (outils, page carrières, offres)
create table if not exists public.company_scan (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  name text not null default '', siren text, url text not null default '',
  prospect_id uuid references public.prospects(id) on delete set null,
  watch_id uuid references public.radar_watch(id) on delete set null,
  tech text[] not null default '{}',
  ats text, ats_slug text, jobs_n int, jobs jsonb, jobs_at timestamptz,
  scanned_at timestamptz,
  primary key (workspace_id, key)
);
-- Historique des outils : première et dernière fois vus, date d'arrivée estimée (archives du web)
create table if not exists public.tech_seen (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null, tool text not null,
  source text not null default 'site',
  first_seen date not null default current_date, last_seen date not null default current_date,
  adopted date, adopted_how text, adopted_at timestamptz,
  primary key (workspace_id, key, tool)
);
create index if not exists tech_seen_tool on public.tech_seen (workspace_id, tool);

alter table public.company_scan enable row level security;
alter table public.tech_seen enable row level security;
drop policy if exists company_scan_read on public.company_scan;
create policy company_scan_read on public.company_scan for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
drop policy if exists tech_seen_read on public.tech_seen;
create policy tech_seen_read on public.tech_seen for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
