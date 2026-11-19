-- Bilan de santé : calculé toutes les 15 min en coulisses (60 s permises), lu instantanément par le test de nuit.
-- Avant, il prenait 5 à 6 s et dépassait la limite des requêtes publiques (3 s) quand les tâches de fond chargeaient la base.
alter function public.bingoo_sante() rename to bingoo_sante_calcul;
revoke execute on function public.bingoo_sante_calcul() from public, anon, authenticated;
create table if not exists public.bingoo_sante_cache (id int primary key default 1 check (id = 1), r json not null, at timestamptz not null default now());
alter table public.bingoo_sante_cache enable row level security;
create or replace function public.bingoo_sante_maj() returns void language plpgsql security definer set search_path = public set statement_timeout = '60s' as $$
begin
  insert into bingoo_sante_cache (id, r, at) values (1, bingoo_sante_calcul(), now())
  on conflict (id) do update set r = excluded.r, at = excluded.at;
end $$;
revoke execute on function public.bingoo_sante_maj() from public, anon, authenticated;
create or replace function public.bingoo_sante() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('checks', coalesce((select json_agg(x) from json_array_elements(c.r->'checks') x), '[]'::json)::jsonb
      || jsonb_build_array(jsonb_build_object('nom', 'Bilan de santé calculé il y a moins d''1 heure', 'ok', c.at > now() - interval '1 hour', 'grave', true, 'valeur', to_char(c.at at time zone 'Europe/Paris', 'DD/MM HH24:MI'))),
    'at', c.at)
  from (select r, at from bingoo_sante_cache where id = 1 union all select '{"checks":[]}'::json, '-infinity'::timestamptz limit 1) c;
$$;
grant execute on function public.bingoo_sante() to anon, authenticated;
select cron.schedule('bingoo-sante', '*/15 * * * *', 'select public.bingoo_sante_maj()');
