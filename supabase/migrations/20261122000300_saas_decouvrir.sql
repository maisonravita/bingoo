-- Page publique « Découvre les SaaS qui marchent » (sans compte) : les SaaS en clair de la vitrine en entier,
-- les autres réduits à leur catégorie (rien d'identifiable), plus le nombre total de SaaS suivis
create or replace function public.saas_decouvrir()
 returns json language sql stable security definer set search_path to 'public'
as $$
  select json_build_object(
    'clairs', coalesce((select json_agg(x order by x.ordre, x.montant desc) from (
      select s.domaine, s.nom, s.categorie, s.description, s.pays, s.prix_entree_eur, s.sur_devis, s.gratuit, s.essai, s.image, s.cible, s.difficulte, s.copiable, s.succes, s.genre,
             v.ordre, coalesce((s.succes->>'montant')::numeric, 0) montant
      from saas_vitrine v join saas s on s.id = v.id where v.en_clair and s.statut = 'ok') x), '[]'),
    'floutes', coalesce((select json_agg(json_build_object('categorie', x.categorie) order by x.ordre) from (
      select s.categorie, v.ordre from saas_vitrine v join saas s on s.id = v.id where not v.en_clair and s.statut = 'ok' order by v.ordre limit 24) x), '[]'),
    'total', (select count(*) from saas where statut = 'ok'));
$$;
revoke all on function public.saas_decouvrir() from public;
grant execute on function public.saas_decouvrir() to anon, authenticated;
