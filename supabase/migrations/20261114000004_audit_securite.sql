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
