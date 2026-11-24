-- Mode brouillon : quand il est activé, « publie » garde la version en ligne (celle que voient les visiteurs) pendant que
-- « spec » reçoit les modifications de l'atelier. « Publier » recopie spec dans publie. Désactivé (publie nul) : chaque
-- modification part en ligne tout de suite, comme avant.
alter table saas_apps add column if not exists publie jsonb, add column if not exists publie_at timestamptz;

create or replace function public.saas_app_public(p_slug text)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object('slug', slug, 'version', version,
    'spec', coalesce(publie, spec) || jsonb_build_object('sans_badge', saas_marque_blanche(workspace_id) and coalesce((coalesce(publie, spec)->>'sans_badge')::boolean, false)),
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
