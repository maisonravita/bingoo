-- Compteur public de la page d'accueil : ce que le Radar a trouvé, tous comptes confondus (totaux seulement, aucune donnée nominative).
create or replace function public.radar_live() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'signaux', (select count(*) from radar_opps),
    'marches', (select count(*) from radar_opps where kind in ('appel_offres','renouvellement')),
    'prospects', (select count(*) from prospects),
    'contacts', (select count(*) from contacts),
    'derniere', (select max(created_at) from radar_opps)
  );
$$;
revoke all on function public.radar_live() from public;
grant execute on function public.radar_live() to anon, authenticated;
