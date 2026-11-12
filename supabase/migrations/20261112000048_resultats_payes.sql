-- saas_paye() : l'utilisateur connecté a un espace payé (ou Fondateur offert)
create or replace function public.saas_paye() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m join workspaces w on w.id = m.workspace_id
    where m.user_id = auth.uid() and (w.plan = 'fondateur' or (w.plan in ('explorer','explorer_pro','business','solo','pro') and w.plan_status in ('active','trialing','past_due'))));
$$;
grant execute on function public.saas_paye() to authenticated;
-- saas_pour_moi3 : « limit case when public.saas_paye() then 15 else 1 end » (appliqué via MCP)
