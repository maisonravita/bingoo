-- Les articles de blog prennent l'allure du site : couleurs, polices, logo et photo d'en-tête
CREATE OR REPLACE FUNCTION public.saas_app_article(p_slug text, p_article text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('app', jsonb_build_object('slug', a.slug, 'nom', a.spec->>'nom', 'couleur', a.spec->>'couleur', 'pitch', a.spec->>'pitch',
    'type', a.spec->>'type', 'cta', a.spec->'site'->>'cta', 'domaine', case when a.domaine_statut = 'ok' then a.domaine end,
    'design', jsonb_build_object('couleurs', a.spec->'design'->'couleurs', 'polices', a.spec->'design'->'polices', 'mode', a.spec->'design'->>'mode'),
    'logo', a.spec->>'logo',
    'image', coalesce(a.spec->'site'->'page'->'images'->'PHOTO_1'->>'url', a.spec->'site'->'page'->'images'->'IMG_1'->>'url')), 'article', x)
  from saas_apps a, jsonb_array_elements(a.lancement->'articles') x
  where (a.slug = p_slug or a.domaine = p_slug) and x->>'slug' = p_article limit 1;
$function$;
