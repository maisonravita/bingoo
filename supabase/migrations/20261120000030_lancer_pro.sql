-- 20 nov. 2026 : formule « Lancer Pro » (lancer_pro) comptée comme payée
create or replace function public.saas_paye() returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from members m join workspaces w on w.id = m.workspace_id
    where m.user_id = auth.uid() and (w.plan = 'fondateur' or (w.plan in ('explorer','explorer_pro','lancer_pro','business','solo','pro') and w.plan_status in ('active','trialing','past_due'))));
$$;
create or replace function public.saas_paye_ws(p_ws uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from workspaces w where w.id = p_ws and (w.plan = 'fondateur' or (w.plan in ('explorer','explorer_pro','lancer_pro','business','solo','pro') and w.plan_status in ('active','trialing','past_due'))));
$$;
