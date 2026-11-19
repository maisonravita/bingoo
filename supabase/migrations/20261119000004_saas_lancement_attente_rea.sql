-- Un projet dont les pages publiques sont illisibles sans navigateur attend la synthèse REA (Chrome).
-- La tâche minute ne reprend un projet en attente que si REA a fini, ou après 2 minutes s'il n'est pas marqué illisible.
create or replace function public.saas_prendre_lancement(p_id uuid default null)
returns table(id uuid, workspace_id uuid, saas_id uuid, domaine text, angle text, resultat jsonb)
language plpgsql
set search_path = ''
as $$
begin
  update public.saas_projets p set statut = 'erreur', erreur = 'La préparation n’a pas pu démarrer dans le délai prévu. Tu peux la relancer.'
    where p.statut = 'attente_analyse'
      and p.at < now() - interval '30 minutes';
  update public.saas_projets p set statut = 'erreur', erreur = 'La conception a dépassé son délai. Tu peux relancer la préparation.'
    where p.statut = 'en_cours' and p.lancement_demarre_at < now() - interval '6 minutes';

  return query
    with suivant as (
      select p.id, s.domaine, d.resultat from public.saas_projets p
      join public.saas s on s.id = p.saas_id
      left join public.saas_decortique d on d.domaine = s.domaine
        and d.statut = 'fait' and d.resultat is not null and d.fait_at >= now() - interval '30 days'
      where p.statut = 'attente_analyse'
        and (p.id = p_id or (p_id is null and (d.resultat is not null
          or (coalesce((p.data->>'pages_illisibles')::boolean, false) = false and p.at <= now() - interval '2 minutes'))))
      order by p.at limit 1 for update of p skip locked
    )
    update public.saas_projets p set statut = 'en_cours', lancement_demarre_at = now()
    from suivant
    where p.id = suivant.id
    returning p.id, p.workspace_id, p.saas_id, suivant.domaine, p.data->>'angle', suivant.resultat;
end;
$$;

revoke execute on function public.saas_prendre_lancement(uuid) from public, anon, authenticated;
grant execute on function public.saas_prendre_lancement(uuid) to service_role;
