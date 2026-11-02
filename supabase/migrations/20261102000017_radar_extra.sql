-- Radar compléments : clients de tes concurrents (vus sur leur site), outils détectés, partenaires apporteurs d'affaires
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte','client_concurrent']));
alter table public.radar_watch add column if not exists tech jsonb, add column if not exists tech_at timestamptz;

create table if not exists public.radar_partners (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  siren text not null,
  name text not null,
  type text not null,
  pourquoi text, message text, naf text, tranche text, city text, dept text, contact text,
  status text not null default 'nouveau' check (status in ('nouveau','ajoute','ecarte')),
  prospect_id uuid references public.prospects(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (workspace_id, siren)
);
alter table public.radar_partners enable row level security;
drop policy if exists radar_partners_rw on public.radar_partners;
create policy radar_partners_rw on public.radar_partners for all
  using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
