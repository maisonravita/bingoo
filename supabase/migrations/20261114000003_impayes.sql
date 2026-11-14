-- Appliquée via MCP : abonnements impayés ou arrêtés
-- saas_proprio_suspendu(ws) : abonnement Bingoo! arrêté/impayé depuis plus de 7 jours après la fin de période → le SaaS du créateur est mis en pause (rien n'est effacé)
-- saas_app_public renvoie « suspendu » ; purge_old_data : espaces résiliés supprimés après 90 jours (au lieu de 30)
create or replace function public.saas_proprio_suspendu(p_ws uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from workspaces w where w.id = p_ws and coalesce(w.plan,'') <> 'fondateur'
    and w.plan_status in ('canceled','unpaid','incomplete_expired')
    and coalesce(w.period_end, w.created_at) < now() - interval '7 days');
$$;
revoke all on function public.saas_proprio_suspendu(uuid) from public, anon, authenticated;
