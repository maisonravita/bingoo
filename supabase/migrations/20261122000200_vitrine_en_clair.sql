-- Partie gratuite de l'Explorer : un aperçu en clair de quelques SaaS de la vitrine
-- (4 gros SaaS compliqués à refaire + 2 faciles à lancer), le reste flouté avec un cadenas.
alter table public.saas_vitrine add column if not exists en_clair boolean not null default false;

create or replace function public.saas_vitrine_maj()
 returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare n int;
begin
  delete from saas_vitrine;
  insert into saas_vitrine (id, ordre)
  select id, rg from (
    select s.id,
      row_number() over (order by vitrine_niveau(s.*), (s.succes->>'type') = 'revenu_verifie' desc, coalesce((s.succes->>'montant')::numeric, (s.estimation->>'centre')::numeric * 12) desc nulls last, s.id) rg,
      row_number() over (partition by s.categorie order by vitrine_niveau(s.*), (s.succes->>'type') = 'revenu_verifie' desc, coalesce((s.succes->>'montant')::numeric, (s.estimation->>'centre')::numeric * 12) desc nulls last, s.id) rgc,
      vitrine_niveau(s.*) niv
    from saas s where s.statut = 'ok') x
  where rg <= 20 or (rgc <= 20 and niv <= 1);
  get diagnostics n = row_count;
  -- En clair dans la partie gratuite : 4 géants impossibles à refaire seul (Salesforce, Stripe…), puis les 2 plus faciles à lancer
  delete from saas_vitrine where id in (select id from saas where statut = 'ok' and coalesce((succes->>'montant')::numeric, 0) >= 1e9 order by (succes->>'montant')::numeric desc limit 4);
  insert into saas_vitrine (id, ordre, en_clair)
  select id, 0, true from saas where statut = 'ok' and coalesce((succes->>'montant')::numeric, 0) >= 1e9 order by (succes->>'montant')::numeric desc limit 4;
  update saas_vitrine v set en_clair = true where v.id in (
    select v2.id from saas_vitrine v2 join saas s on s.id = v2.id where not v2.en_clair and coalesce(s.copiable, 0) >= 75 and coalesce(s.difficulte, 9) <= 3 and s.succes->>'type' = 'revenu_verifie' order by v2.ordre limit 2);
  return n;
end $function$;
revoke all on function public.saas_vitrine_maj() from public, anon, authenticated;

create or replace function public.saas_libre(sid uuid) returns boolean
 language sql stable security definer set search_path to 'public'
as $$ select coalesce((select en_clair from saas_vitrine where id = sid), false) $$;
grant execute on function public.saas_libre(uuid) to anon, authenticated;

create or replace view public.saas_liste as
 SELECT s.id, s.domaine, s.nom, s.categorie, s.description, s.pays, s.prix_entree_eur, s.gratuit, s.essai, s.sur_devis, s.recrute, s.postes, s.nouveaute, s.score_croissance, s.lu_at, s.created_at, s.tags, s.modele_prix,
    CASE WHEN s.modele_prix = ANY (ARRAY['usage'::text, 'commission'::text]) THEN s.prix_affiche ELSE NULL::text END AS prix_usage,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN s.rang_web ELSE NULL::integer END AS rang_web,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN s.rang_web_avant ELSE NULL::integer END AS rang_web_avant,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN s.succes ELSE NULL::jsonb END AS succes,
    s.succes IS NOT NULL AND COALESCE((s.succes ->> 'annee'::text)::integer, 9999) >= (EXTRACT(year FROM now())::integer - 4) AND NOT ((s.succes ->> 'type'::text) = 'revenu_verifie'::text AND COALESCE((s.succes ->> 'montant'::text)::numeric, 0::numeric) < 12000::numeric) AS a_succes,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN COALESCE((s.succes ->> 'montant'::text)::numeric, CASE WHEN s.succes IS NOT NULL THEN 0 ELSE NULL::integer END::numeric) ELSE NULL::numeric END AS succes_montant,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN s.estimation ELSE NULL::jsonb END AS estimation,
    CASE WHEN ( SELECT saas_acces()) THEN COALESCE((s.succes ->> 'montant'::text)::numeric, ((s.estimation ->> 'centre'::text)::numeric) * 12::numeric)
         ELSE (- v.ordre)::numeric + CASE WHEN coalesce(v.en_clair, false) THEN 100000 ELSE 0 END END AS revenu_tri,
    s.genre, s.copiable,
    CASE WHEN ( SELECT saas_acces()) OR coalesce(v.en_clair, false) THEN s.copiable_raisons ELSE NULL::text[] END AS copiable_raisons,
    COALESCE((s.succes ->> 'annee'::text)::integer, 9999) < (EXTRACT(year FROM now())::integer - 4) AS preuve_ancienne,
    s.constructible, s.niche,
    (s.succes ->> 'type'::text) = 'revenu_verifie'::text AND COALESCE((s.succes ->> 'montant'::text)::numeric, 0::numeric) >= 1200::numeric AND COALESCE((s.succes ->> 'montant'::text)::numeric, 0::numeric) < 12000::numeric AS en_decollage,
    NOT (( SELECT saas_acces()) OR coalesce(v.en_clair, false)) AS vitrine,
    s.image, s.cible, s.difficulte,
    (NOT ( SELECT saas_acces()) AND coalesce(v.en_clair, false)) AS libre
   FROM (
     -- Abonné : toute la base ; compte gratuit : seulement la vitrine (490 lignes lues au lieu de 26 000)
     SELECT s1.*, v1.ordre, v1.en_clair FROM saas s1 LEFT JOIN saas_vitrine v1 ON v1.id = s1.id WHERE ( SELECT saas_acces()) AND s1.statut = 'ok'::text
     UNION ALL
     SELECT s2.*, v2.ordre, v2.en_clair FROM saas_vitrine v2 JOIN saas s2 ON s2.id = v2.id WHERE NOT ( SELECT saas_acces()) AND s2.statut = 'ok'::text
   ) s
   CROSS JOIN LATERAL (SELECT s.ordre, s.en_clair) v
  WHERE ( SELECT saas_liste_ok());

-- La fiche complète aussi pour les SaaS en clair de la vitrine
create or replace function public.saas_fiche(ws uuid, d text)
 returns json language plpgsql security definer set search_path to 'public'
as $function$
declare s public.saas;
begin
  if not public.is_member(ws) then raise exception 'Accès refusé' using errcode = '42501'; end if;
  select * into s from public.saas where domaine = lower(d) and statut = 'ok';
  if not found then return null; end if;
  if not public.saas_acces() and not public.saas_libre(s.id) then
    return json_build_object('limite', true, 'max', 0, 'plan', 'gratuit', 'nom', s.nom, 'domaine', s.domaine);
  end if;
  insert into public.saas_vues (workspace_id, saas_id) values (ws, s.id);
  return json_build_object(
    'saas', row_to_json(s)::jsonb - 'prix_rendu',
    'releves', coalesce((select json_agg(r order by r.at) from (select at, prix_entree_eur, postes, recrute, nouveaute from public.saas_releves where saas_id = s.id) r), '[]'),
    'evenements', coalesce((select json_agg(e order by e.at desc) from (select at, type, avant, apres from public.saas_evenements where saas_id = s.id order by at desc limit 30) e), '[]'),
    'histoire', (select row_to_json(h) from (select annee_creation, fondateurs, chiffres, histoire, lecons, at from public.saas_histoires where saas_id = s.id and statut = 'ok') h),
    'vues', null, 'max', null, 'libre', not public.saas_acces());
end $function$;

select public.saas_vitrine_maj();
