-- Résultats « Trouver mon SaaS » : chaque SaaS arrive avec sa description française (ce qu'il fait, pour qui),
-- au lieu d'une phrase générique tirée de sa catégorie
create or replace function public.saas_pour_moi3(p jsonb) returns json language sql stable security definer set search_path to 'public' as $$
  select case when public.saas_paye() then (
    select coalesce(json_agg((e::jsonb || jsonb_build_object('pitch_fr', (select s.pitch_fr - 'verifie' from saas s where s.id::text = e->>'id')))::json order by i), '[]')
    from json_array_elements(public.saas_pour_moi_coeur(p)) with ordinality t(e, i)) else '[]'::json end
$$;
