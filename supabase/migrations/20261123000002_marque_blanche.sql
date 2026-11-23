-- Marque blanche : le badge « Built by Bingoo! » est sur tous les sites et SaaS, sauf pour l'offre du dessus
-- (Lancer Pro, et les anciennes Lancer à plusieurs et Fondateur) quand le membre choisit de le retirer.
-- Le nom de domaine personnalisé fait aussi partie de cette offre : un domaine n'est servi que si l'offre le permet.
create or replace function public.saas_marque_blanche(p_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces w where w.id = p_ws and w.plan in ('lancer_pro', 'business', 'fondateur')
    and coalesce(w.plan_status, '') in ('active', 'trialing', 'past_due'));
$$;

create or replace function public.saas_app_public(p_slug text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object('slug', slug, 'version', version,
    -- Le badge ne disparaît que si l'offre le permet ET que le membre l'a retiré (une offre redescendue le fait revenir)
    'spec', spec || jsonb_build_object('sans_badge', saas_marque_blanche(workspace_id) and coalesce((spec->>'sans_badge')::boolean, false)),
    'domaine', case when domaine_statut = 'ok' and saas_marque_blanche(workspace_id) then domaine end,
    'suspendu', saas_proprio_suspendu(workspace_id),
    'paiement', jsonb_build_object('actif', coalesce((paiement->>'actif')::boolean, false), 'essai_jours', coalesce((paiement->>'essai_jours')::int, 14), 'modele', coalesce(paiement->>'modele', 'abonnement')),
    'ab', jsonb_build_object('actif', coalesce((ab->>'actif')::boolean, false), 'type', coalesce(ab->>'type', 'prix'), 'ecart', coalesce((ab->>'ecart')::int, 20), 'essai_b', (ab->>'essai_b')::int),
    'icone', icones->>'u192',
    'articles', coalesce((select jsonb_agg(jsonb_build_object('slug', x->>'slug', 'titre', x->>'titre', 'resume', x->>'resume')) from jsonb_array_elements(lancement->'articles') x), '[]'::jsonb),
    'validation', case when coalesce((validation->>'actif')::boolean, false) and jsonb_array_length(coalesce(spec->'ecrans', '[]'::jsonb)) = 0 then jsonb_build_object(
        'remise', coalesce((validation->>'remise')::int, 30), 'objectif', coalesce((validation->>'objectif')::int, 10),
        'inscrits', (select count(*) from saas_app_liste l where l.app_id = saas_apps.id),
        'precommandes', (select count(*) from saas_app_liste l where l.app_id = saas_apps.id and l.precommande)) end)
  from saas_apps where slug = p_slug and statut not in ('remplace', 'retire') and (jsonb_array_length(coalesce(spec->'ecrans', '[]'::jsonb)) > 0 or coalesce((validation->>'actif')::boolean, false));
$function$;

-- Un domaine personnalisé n'est servi que tant que l'offre le comprend
create or replace function public.saas_app_par_domaine(p_domaine text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select saas_app_public(slug) from saas_apps where domaine = lower(regexp_replace(p_domaine, '^www\.', '')) and saas_marque_blanche(workspace_id) limit 1;
$function$;
