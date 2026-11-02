-- Radar V3 : nouveaux signaux (renouvellements de marchés, changement de dirigeant, déménagement, création/ouverture),
-- score « entreprise chaude », date limite, filtre automatique, apprentissage (« pas pertinent »).
alter table public.radar_opps drop constraint if exists radar_opps_kind_check;
alter table public.radar_opps add constraint radar_opps_kind_check check (kind = any (array['appel_offres','croissance','recrutement','besoin','renouvellement','dirigeant','demenagement','creation']));
alter table public.radar_opps drop constraint if exists radar_opps_status_check;
alter table public.radar_opps add constraint radar_opps_status_check check (status = any (array['nouveau','suivi','ajoute','ecarte','expire','filtre']));
alter table public.radar_opps
  add column if not exists siren text,
  add column if not exists expires_at timestamptz,
  add column if not exists score int,
  add column if not exists score_why jsonb,
  add column if not exists group_key text,
  add column if not exists feedback text,
  add column if not exists alerted_at timestamptz;
create index if not exists radar_opps_ws_group on public.radar_opps (workspace_id, group_key);
create index if not exists radar_opps_ws_score on public.radar_opps (workspace_id, score desc);

-- Mise à jour groupée des scores (appelée par le Radar côté serveur uniquement)
create or replace function public.radar_set_scores(p jsonb) returns int language sql security definer set search_path = public as $$
  with x as (select * from jsonb_to_recordset(p) as r(id uuid, score int, score_why jsonb, group_key text, status text, expires_at timestamptz))
  , u as (update public.radar_opps o set score = x.score, score_why = x.score_why, group_key = x.group_key, status = coalesce(x.status, o.status), expires_at = coalesce(x.expires_at, o.expires_at)
          from x where o.id = x.id returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.radar_set_scores(jsonb) from public, anon, authenticated;
grant execute on function public.radar_set_scores(jsonb) to service_role;
