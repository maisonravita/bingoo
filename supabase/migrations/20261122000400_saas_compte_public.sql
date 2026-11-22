-- Le compteur de l'accueil (SaaS + applis mobiles), léger : saas_stats_entete calcule aussi pays et catégories et dépasse le délai des visiteurs
create or replace function public.saas_compte_public() returns bigint
 language sql stable security definer set search_path to 'public'
as $$ select (select count(*) from saas where statut = 'ok') + (select count(*) from saas_mobiles) $$;
revoke all on function public.saas_compte_public() from public;
grant execute on function public.saas_compte_public() to anon, authenticated;
