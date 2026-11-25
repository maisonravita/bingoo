-- Audit du 25 novembre 2026 (appliquée en production le jour même).
-- 1. saas_public : la vue appartient à postgres (elle passe outre les règles d'accès de la table saas) et restait
--    modifiable par un visiteur anonyme (INSERT, UPDATE, DELETE). Plus aucun droit d'écriture, pour personne côté client.
revoke insert, update, delete, truncate, references, trigger on public.saas_public from anon, authenticated, public;
revoke insert, update, delete, truncate, references, trigger on public.saas_liste from anon, authenticated, public;

-- 2. Plan du site : les projets de test du robot ne sont plus proposés aux moteurs de recherche.
create or replace function public.saas_apps_plan_du_site()
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'domaine', case when domaine_statut = 'ok' then domaine end, 'maj', maj,
    'articles', coalesce((select jsonb_agg(x->>'slug') from jsonb_array_elements(lancement->'articles') x), '[]'::jsonb)) order by maj desc), '[]'::jsonb)
  from saas_apps a where statut = 'pret' and jsonb_array_length(coalesce(spec->'ecrans', '[]'::jsonb)) > 0 and not saas_proprio_suspendu(workspace_id)
    and not exists (select 1 from workspaces w where w.id = a.workspace_id and w.name like 'Robot %');
$function$;
