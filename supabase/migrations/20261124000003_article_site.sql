-- Articles de blog : la page sait si l'app est un site (bouton du commerçant au lieu de « Essai gratuit »)
create or replace function public.saas_app_article(p_slug text, p_article text) returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object('app', jsonb_build_object('slug', a.slug, 'nom', a.spec->>'nom', 'couleur', a.spec->>'couleur', 'pitch', a.spec->>'pitch',
    'type', a.spec->>'type', 'cta', a.spec->'site'->>'cta', 'domaine', case when a.domaine_statut = 'ok' then a.domaine end), 'article', x)
  from saas_apps a, jsonb_array_elements(a.lancement->'articles') x
  where (a.slug = p_slug or a.domaine = p_slug) and x->>'slug' = p_article limit 1;
$function$;
