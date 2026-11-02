-- Radar étape 1 : comptes surveillés, nouveaux types de signaux, « ce que le Radar t'a rapporté »
create table if not exists public.radar_watch (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  siren text not null,
  name text not null default '',
  url text,
  city text,
  dept text,
  naf text,
  source text not null default 'manuel',
  site_hash text,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, siren)
);
alter table public.radar_watch enable row level security;
drop policy if exists radar_watch_rw on public.radar_watch;
create policy radar_watch_rw on public.radar_watch for all
  using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));

alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array[
  'appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation',
  'site','levee','permis','aide','budget','salon','difficulte']));

-- Ce que le Radar a rapporté : du signal au devis signé, sur une période
create or replace function public.radar_roi(p_ws uuid, p_since timestamptz) returns jsonb language sql stable security definer set search_path = public as $$
  with ok as (select 1 where exists (select 1 from public.members where workspace_id = p_ws and user_id = auth.uid()) or auth.role() = 'service_role'),
  o as (select * from public.radar_opps where workspace_id = p_ws and created_at >= p_since and exists (select 1 from ok)),
  p as (select distinct prospect_id id from o where prospect_id is not null),
  sent as (select distinct prospect_id from public.messages where prospect_id in (select id from p) and status = 'envoye'),
  rep as (select distinct prospect_id from public.replies where prospect_id in (select id from p)),
  pos as (select distinct prospect_id from public.replies where prospect_id in (select id from p) and class in ('interesse','question','prix','rappel')),
  rdv as (select distinct prospect_id from public.meetings where prospect_id in (select id from p)),
  won as (select prospect_id, sum(total_ht) ca from public.quotes where prospect_id in (select id from p) and status = 'signe' group by 1)
  select jsonb_build_object(
    'signaux', (select count(*) from o),
    'prospects', (select count(*) from p),
    'contactes', (select count(*) from sent),
    'reponses', (select count(*) from rep),
    'positives', (select count(*) from pos),
    'rdv', (select count(*) from rdv),
    'signes', (select count(*) from won),
    'ca', (select coalesce(sum(ca), 0) from won),
    'par_type', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select o.kind, jsonb_build_object('signaux', count(*), 'prospects', count(o.prospect_id), 'rdv', count(*) filter (where o.prospect_id in (select prospect_id from rdv)), 'ca', coalesce(sum(w.ca), 0)) n from o left join won w on w.prospect_id = o.prospect_id group by o.kind) x)
  );
$$;
grant execute on function public.radar_roi(uuid, timestamptz) to authenticated, service_role;
