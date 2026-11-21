-- Vérification des apps lancée à la demande : au lieu d'un robot GitHub toutes les 10 minutes (minutes payantes si le
-- dépôt devient privé, et charge inutile), Supabase regarde toutes les 10 minutes s'il y a quelque chose à vérifier
-- (même règle que scripts/verif-apps.mjs, aperçus de l'atelier compris) et ne lance le robot GitHub que dans ce cas.
-- Jeton GitHub : app_secrets « github_dispatch_token » (jeton à granularité fine, dépôt bingoo, droit Actions en écriture).
create or replace function public.verif_a_la_demande() returns text
language plpgsql security definer set search_path = public as $$
declare
  jeton text;
  dernier timestamptz;
  a_faire int;
begin
  select value into jeton from app_secrets where name = 'github_dispatch_token';
  if jeton is null or jeton = '' then return 'pas de jeton'; end if;
  select count(*) into a_faire from saas_apps
   where (statut = 'pret' and maj < now() - interval '1 minute'
          and (verif is null or coalesce((verif->>'version')::int, -1) <> version
               or (verif->>'phase' = 'en_cours' and jsonb_array_length(coalesce(verif->'en_reparation', '[]'::jsonb)) = 0)))
      or (brouillon->'_test'->>'phase' = 'en_cours' and jsonb_array_length(coalesce(brouillon->'_test'->'en_reparation', '[]'::jsonb)) = 0
          and maj < now() - interval '1 minute');
  if a_faire = 0 then return 'rien à vérifier'; end if;
  -- Pas plus d'un lancement toutes les 9 minutes (le robot traite toute la file en un passage)
  select (value)::timestamptz into dernier from app_secrets where name = 'verif_dernier_lancement';
  if dernier is not null and dernier > now() - interval '9 minutes' then return 'déjà lancé'; end if;
  insert into app_secrets(name, value) values ('verif_dernier_lancement', now()::text)
    on conflict (name) do update set value = excluded.value;
  perform net.http_post(
    url := 'https://api.github.com/repos/maisonravita/bingoo/actions/workflows/verif-apps.yml/dispatches',
    body := jsonb_build_object('ref', 'main'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || jeton, 'Accept', 'application/vnd.github+json',
                                  'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'bingoo-verif', 'Content-Type', 'application/json'),
    timeout_milliseconds := 20000);
  return 'robot lancé (' || a_faire || ' à vérifier)';
end $$;
revoke all on function public.verif_a_la_demande() from public, anon, authenticated;
select cron.schedule('bingoo-verif-demande', '*/10 * * * *', 'select public.verif_a_la_demande()');
