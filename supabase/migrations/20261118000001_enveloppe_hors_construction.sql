-- L'enveloppe IA du mois d'un client ne compte plus les constructions (déjà limitées par leur propre quota) :
-- construire son SaaS ne doit pas couper l'assistant, les scripts vidéo ni la recherche de clients.
create or replace function public.ai_spent_usage(p_ws uuid, p_since timestamptz)
returns numeric language sql stable security definer set search_path to 'public' as $$
  select coalesce(sum(cost_eur), 0) from public.ai_usage
  where at >= p_since and workspace_id = p_ws and feature not like 'construire%' and feature not like 'video%';
$$;
revoke execute on function public.ai_spent_usage(uuid, timestamptz) from anon, authenticated, public;
