-- Accueil : vrais acheteurs publics captés par le Radar (données publiques DECP), un par acheteur, les plus gros marchés à venir.
create or replace function public.radar_live() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from radar_opps) + (select count(*) from prospects) + (select count(*) from radar_found),
    'signaux', (select count(*) from radar_opps),
    'marches', (select count(*) from radar_opps where kind in ('appel_offres','renouvellement')) + (select count(*) from radar_found where kind = 'contrat'),
    'prospects', (select count(*) from prospects),
    'contacts', (select count(*) from contacts),
    'derniere', (select max(created_at) from radar_opps),
    'vitrine', (select coalesce(json_agg(v), '[]'::json) from (
      select * from (
        select distinct on (buyer_name) buyer_name as acheteur, left(objet, 120) as objet, fin, montant
        from public_contracts where fin > now() and buyer_name is not null and buyer_name <> ''
        order by buyer_name, montant desc nulls last) d
      order by montant desc nulls last limit 40) v)
  );
$$;
