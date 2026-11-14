-- Appliquée via MCP (audit du 14/11) :
-- 1. saas_acces() : abonné payé, admin, ou appel interne. Les fonctions du catalogue (saas_a_copier, saas_classement,
--    saas_recherche, saas_apercu, saas_micro_*, saas_niche_detail, saas_marches_niche, saas_pour_moi(2), saas_ile,
--    saas_a_vendre, saas_demandes_liste, saas_endormi_de) renvoient NULL sans abonnement ; la vue saas_liste filtre par saas_acces().
-- 2. saas_public n'est plus lisible publiquement (la page d'accueil lit le total via saas_stats_entete).
-- 3. Tâches internes et déclencheurs : EXECUTE retiré à anon/authenticated. search_path fixé sur 5 fonctions.
create or replace function public.saas_acces() returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(auth.role(), 'service_role') = 'service_role' or public.saas_paye() or exists (select 1 from admins a where a.user_id = auth.uid());
$$;

-- 4. Tâches planifiées : les 10 tâches fréquentes passent par un seul répartiteur (bingoo-dispatch, chaque minute),
--    au lieu de démarrer toutes à la même minute (16 % d'échecs « job startup timeout »). Les anciennes tâches sont désactivées, pas supprimées.
create table if not exists public.cron_dispatch (jobname text primary key, every_min int not null, command text not null, actif boolean not null default true);
alter table public.cron_dispatch enable row level security;
create or replace function public.cron_dispatch_run() returns int language plpgsql security definer set search_path to 'public' as $$
declare r record; m int := (extract(epoch from date_trunc('minute', now())) / 60)::int; n int := 0;
begin
  for r in select * from cron_dispatch where actif and m % every_min = 0 order by every_min loop
    begin execute r.command; n := n + 1;
    exception when others then raise warning 'dispatch % : %', r.jobname, sqlerrm; end;
  end loop;
  return n;
end $$;
revoke execute on function public.cron_dispatch_run() from public, anon, authenticated;

-- 5. Performance : index sur les clés étrangères utilisées par l'application
create index if not exists saas_apps_workspace_idx on public.saas_apps(workspace_id);
create index if not exists saas_tiktok_workspace_idx on public.saas_tiktok(workspace_id);
create index if not exists saas_videos_workspace_idx on public.saas_videos(workspace_id);
create index if not exists saas_projets_saas_idx on public.saas_projets(saas_id);
create index if not exists saas_suivis_saas_idx on public.saas_suivis(saas_id);
create index if not exists saas_vues_saas_idx on public.saas_vues(saas_id);
create index if not exists saas_app_rows_user_idx on public.saas_app_rows(user_id);
create index if not exists saas_app_invites_app_idx on public.saas_app_invites(app_id);
create index if not exists saas_demandes_workspace_idx on public.saas_demandes(workspace_id);
create index if not exists saas_annonces_workspace_idx on public.saas_annonces(workspace_id);
create index if not exists saas_api_cles_workspace_idx on public.saas_api_cles(workspace_id);
create index if not exists saas_sans_succes_recent on public.saas (statut, created_at desc) where succes is null;

-- 6. Fiches floutées : ce que fait le SaaS et pour qui, en clair mais sans son nom (saas_masquer, saas.pitch_fr rédigé en français par r/saas-pitch-fr)
alter table public.saas add column if not exists pitch_fr jsonb;

-- 7. Objectif de revenu (Appliqué via MCP) : saas_pour_moi_coeur et saas_pour_moi_apercu filtrent sur mrr >= objectif × 0,8
--    (repli si moins de 6 SaaS), « bonne taille » = entre 0,8 et 5 fois l'objectif ; la liste garde les SaaS en tendance s'il y en a au moins 9.

-- 8. Constructibilité (Appliqué via MCP) : saas_constructible_maj corrigée (les \m \M étaient doublement échappés : 19 exclusions ne marchaient pas),
--    nouvelles exclusions (agents, prospection, intégrations, santé/assurance, livres, services…), et vérification une par une par l'IA
--    (r/saas-pitch-fr, toutes les 3 min) : dès 150 SaaS vérifiés, seuls les SaaS jugés constructibles par cette vérification sont proposés.

-- 9. (Appliqué via MCP) saas_pour_moi_coeur renvoie l'id ; saas_pour_moi_floute renvoie « ref » (id) : le SaaS choisi avant paiement est retrouvé
--    par sa référence après paiement (avant : par son rang, faux s'il était au-delà des 9 premiers ou si la liste avait bougé). Index trigramme sur saas.nom.
create extension if not exists pg_trgm with schema extensions;
create index if not exists saas_nom_trgm on public.saas using gin (nom extensions.gin_trgm_ops);

-- 10. (Appliqué via MCP) L'étape du jour par e-mail (promise dans les formules) : la tâche n'était plus planifiée.
--     Envoyée seulement à ceux qui ont coché « Recevoir l'étape chaque matin ».
select cron.schedule('bingoo-semaine-matin', '5 7 * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-semaine-cron', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=150000)$$);

-- 11. (Appliqué via MCP) Règle n° 1 : seuls les SaaS vérifiés « Bingoo! sait le construire » sont proposés.
--     saas_pour_moi_coeur / saas_pour_moi_apercu : « and exists (select 1 from saas v where v.id = s.id and v.constructible_ia is true) » (lu en direct).
--     saas_constructible_maj : constructible = coalesce(constructible_ia, not (mots-clés exclus)) — le verdict de l'IA prime sur les mots-clés.
--     saas_pitch_a_faire : candidats = tous les SaaS lus (statut ok) pas encore vérifiés, par revenu décroissant.
--     app_secrets : ia_plafond_verif (enveloppe de la vérification, €/jour), ia_plafond_apps (IA des SaaS construits, €/jour).
