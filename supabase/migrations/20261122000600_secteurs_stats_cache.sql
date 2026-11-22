-- « Tu viens sur Bingoo! pour quoi ? » : les aperçus des 4 cartes lisaient saas_secteurs_stats (3 s) à chaque affichage.
-- Le résultat est préparé une fois par nuit (avec la vitrine) et la fonction lit la ligne prête.
create table if not exists public.saas_stats_cache (cle text primary key, data json not null, at timestamptz not null default now());
alter table public.saas_stats_cache enable row level security;

create or replace function public.saas_secteurs_stats_calcul()
 returns json language sql stable security definer set search_path to 'public'
as $function$
  with base as (
    select categorie, domaine, nom, case when succes->>'type' = 'revenu_verifie' then (succes->>'montant')::numeric / 12 end v,
      greatest(coalesce((succes->>'montant')::numeric / 12, 0), coalesce((estimation->>'centre')::numeric, 0)) m
    from saas where not coalesce(revenu_suspect, false) and statut = 'ok' and categorie is not null
      and (coalesce((succes->>'montant')::numeric / 12, 0) >= 2000 or coalesce((estimation->>'centre')::numeric, 0) >= 2000)
  ), rk as (select *, row_number() over (partition by categorie order by v desc nulls last, m desc) r from base)
  select coalesce(json_object_agg(categorie, json_build_object('n', n, 'top', top, 'logos', logos)), '{}'::json) from (
    select categorie, count(*) n, round(max(v)) top, json_agg(domaine order by r) filter (where r <= 3) logos from rk group by categorie) x;
$function$;
revoke all on function public.saas_secteurs_stats_calcul() from public, anon, authenticated;

insert into public.saas_stats_cache (cle, data) values ('secteurs', public.saas_secteurs_stats_calcul())
  on conflict (cle) do update set data = excluded.data, at = now();

create or replace function public.saas_secteurs_stats()
 returns json language sql stable security definer set search_path to 'public'
as $$ select coalesce((select data from saas_stats_cache where cle = 'secteurs'), '{}'::json) $$;
grant execute on function public.saas_secteurs_stats() to anon, authenticated;

-- Rafraîchi chaque nuit avec la vitrine (cron bingoo-vitrine)
create or replace function public.saas_stats_cache_maj() returns void
 language sql security definer set search_path to 'public'
as $$ insert into saas_stats_cache (cle, data) values ('secteurs', saas_secteurs_stats_calcul()) on conflict (cle) do update set data = excluded.data, at = now() $$;
revoke all on function public.saas_stats_cache_maj() from public, anon, authenticated;
