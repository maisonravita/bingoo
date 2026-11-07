-- La question produit qui compte : sur les opportunités proposées, combien partent telles quelles ?
-- edited = le client a modifié le message avant de l'envoyer.
alter table public.messages add column if not exists edited boolean not null default false;

create or replace function public.admin_acceptation(p_jours int default 30)
returns table(workspace_id uuid, name text, proposees bigint, envoyees_telles bigint, envoyees_modifiees bigint, ecartees bigint, en_attente bigint, taux_tel_quel numeric, magique_oui bigint, magique_non bigint)
language sql stable security definer set search_path to 'public' as $$
  with m as (
    select * from messages where step = 0 and created_at > now() - make_interval(days => p_jours) and public.is_admin()
  ), u as (
    select workspace_id, count(*) filter (where detail = 'oui') oui, count(*) filter (where detail = 'non') non
    from usage_events where kind = 'moment_magique' and at > now() - make_interval(days => p_jours) and public.is_admin() group by 1
  )
  select w.id, w.name,
    count(m.id),
    count(m.id) filter (where m.status = 'envoye' and not m.edited),
    count(m.id) filter (where m.status = 'envoye' and m.edited),
    count(m.id) filter (where m.status = 'ignore' and coalesce(m.error, '') = ''),
    count(m.id) filter (where m.status = 'brouillon'),
    round(100.0 * count(m.id) filter (where m.status = 'envoye' and not m.edited)
      / nullif(count(m.id) filter (where m.status = 'envoye' or (m.status = 'ignore' and coalesce(m.error, '') = '')), 0), 0),
    coalesce(max(u.oui), 0), coalesce(max(u.non), 0)
  from workspaces w join m on m.workspace_id = w.id left join u on u.workspace_id = w.id
  group by w.id, w.name order by count(m.id) desc;
$$;
revoke all on function public.admin_acceptation(int) from public, anon;
grant execute on function public.admin_acceptation(int) to authenticated;
