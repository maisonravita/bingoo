-- Étape 2 : sites web. La mesure par entrée distingue les idées de site (aperçus et refus comptés à part).
create or replace function public.admin_mesures_entrees(p_jours integer default 30)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'Accès réservé à l''administrateur'; end if;
  return (select coalesce(jsonb_agg(x order by (x->>'projets')::int desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'entree', e.entree,
      'apercus', case when e.entree in ('idee', 'site') then (select count(*) from activity where kind = e.entree || '_apercu' and created_at > now() - make_interval(days => p_jours)) end,
      'refus', case when e.entree in ('idee', 'site') then (select count(*) from activity where kind = e.entree || '_refus' and created_at > now() - make_interval(days => p_jours)) end,
      'projets', e.projets, 'constructions', e.constructions, 'livrees_ok', e.ok) x
    from (
      select coalesce(p.data->>'entree', case when p.data ? 'modele_force' then 'modele' else 'explorer' end) entree,
        count(distinct p.id) projets, count(distinct a.id) constructions,
        count(distinct a.id) filter (where (a.verif->>'ok')::boolean and a.verif->>'phase' = 'fini') ok
      from saas_projets p left join saas_apps a on a.projet_id = p.id
      where p.at > now() - make_interval(days => p_jours)
      group by 1
    ) e
  ) t);
end $$;
