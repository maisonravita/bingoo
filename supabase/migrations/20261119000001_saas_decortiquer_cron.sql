-- Le navigateur dépose les relevés REA. La conception attend une synthèse récente.
create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.saas_projets add column if not exists lancement_demarre_at timestamptz;
create index if not exists saas_projets_attente_analyse_idx
  on public.saas_projets (at) where statut = 'attente_analyse';

create or replace function public.saas_preparer_lancement(
  p_workspace uuid, p_saas uuid, p_angle text
)
returns table(id uuid, statut text, nouveau boolean)
language plpgsql
set search_path = ''
as $$
declare
  source public.saas%rowtype;
begin
  -- Sérialise les doubles clics pour le même espace et le même produit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_workspace::text || ':' || p_saas::text, 0));
  select s.* into strict source from public.saas s where s.id = p_saas and s.constructible_ia is true;

  return query
    select p.id, p.statut, false from public.saas_projets p
    where p.workspace_id = p_workspace and p.saas_id = p_saas
      and (p.statut = 'attente_analyse'
        or (p.statut = 'en_cours' and p.lancement_demarre_at is not null)
        or (p.statut in ('en_cours', 'pret') and p.at >= now() - interval '30 minutes'))
    order by p.at desc limit 1;
  if found then return; end if;

  insert into public.saas_decortique as d (domaine, statut, essais, at, demande_par)
    values (source.domaine, 'attente', 0, now(), p_workspace)
    on conflict (domaine) do update set statut = 'attente', essais = 0, at = now(),
      demande_par = excluded.demande_par, erreur = null, fait_at = null, resultat = null, rea = null
    where d.statut = 'erreur'
       or (d.statut = 'fait' and (d.resultat is null or d.fait_at is null or d.fait_at < now() - interval '30 days'))
       or (d.statut = 'en_cours' and d.essais >= 3 and d.at < now() - interval '12 minutes');

  return query
    insert into public.saas_projets as p (workspace_id, saas_id, statut, data)
      values (p_workspace, p_saas, 'attente_analyse', jsonb_build_object(
        'inspire', jsonb_build_object('nom', coalesce(source.nom, source.domaine), 'domaine', source.domaine),
        'angle', left(p_angle, 400)
      ))
      returning p.id, p.statut, true;
end;
$$;

create or replace function public.saas_prendre_lancement()
returns table(id uuid, workspace_id uuid, saas_id uuid, domaine text, angle text, resultat jsonb)
language plpgsql
set search_path = ''
as $$
begin
  update public.saas_projets p set statut = 'erreur', erreur = 'L’analyse REA n’a pas abouti. Tu peux relancer la préparation.'
    where p.statut = 'attente_analyse'
      and (p.at < now() - interval '30 minutes' or exists (
        select 1 from public.saas s join public.saas_decortique d on d.domaine = s.domaine
        where s.id = p.saas_id and d.statut = 'erreur'
      ));
  update public.saas_projets p set statut = 'erreur', erreur = 'La conception a dépassé son délai. Tu peux relancer la préparation.'
    where p.statut = 'en_cours' and p.lancement_demarre_at < now() - interval '6 minutes';

  return query
    with suivant as (
      select p.id, s.domaine, d.resultat from public.saas_projets p
      join public.saas s on s.id = p.saas_id
      join public.saas_decortique d on d.domaine = s.domaine
      where p.statut = 'attente_analyse' and d.statut = 'fait' and d.resultat is not null
        and d.fait_at >= now() - interval '30 days'
      order by p.at limit 1 for update of p skip locked
    )
    update public.saas_projets p set statut = 'en_cours', lancement_demarre_at = now()
    from suivant
    where p.id = suivant.id
    returning p.id, p.workspace_id, p.saas_id, suivant.domaine, p.data->>'angle', suivant.resultat;
end;
$$;

revoke execute on function public.saas_preparer_lancement(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.saas_prendre_lancement() from public, anon, authenticated;
grant execute on function public.saas_preparer_lancement(uuid, uuid, text) to service_role;
grant execute on function public.saas_prendre_lancement() to service_role;

select cron.schedule(
  'bingoo-rea-synthese', '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-decortiquer-synthese',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key',
      (select value from public.app_secrets where name = 'cron_key')),
    body := '{}'::jsonb, timeout_milliseconds := 140000
  );
  $cron$
);

select cron.schedule(
  'bingoo-saas-lancement', '* * * * *',
  $cron$
  select net.http_post(
    url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-lancement-cron',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key',
      (select value from public.app_secrets where name = 'cron_key')),
    body := '{}'::jsonb, timeout_milliseconds := 10000
  );
  $cron$
);
