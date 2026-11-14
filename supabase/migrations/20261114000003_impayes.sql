-- Appliquée via MCP : abonnements impayés ou arrêtés
-- saas_proprio_suspendu(ws) : abonnement Bingoo! arrêté/impayé depuis plus de 7 jours après la fin de période → le SaaS du créateur est mis en pause (rien n'est effacé)
-- saas_app_public renvoie « suspendu » ; purge_old_data : espaces résiliés supprimés après 90 jours (au lieu de 30)
create or replace function public.saas_proprio_suspendu(p_ws uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from workspaces w where w.id = p_ws and coalesce(w.plan,'') <> 'fondateur'
    and w.plan_status in ('canceled','unpaid','incomplete_expired')
    and coalesce(w.period_end, w.created_at) < now() - interval '7 days');
$$;
revoke all on function public.saas_proprio_suspendu(uuid) from public, anon, authenticated;

-- Mise à jour : 5 jours d'impayé → Bingoo! et le SaaS du créateur bloqués (workspaces.impaye_depuis, posé par trigger)
alter table workspaces add column if not exists impaye_depuis timestamptz;
create or replace function public.set_impaye_depuis() returns trigger language plpgsql as $$
begin
  if new.plan_status in ('past_due','unpaid') then
    if coalesce(old.plan_status,'') not in ('past_due','unpaid') or new.impaye_depuis is null then new.impaye_depuis := coalesce(new.impaye_depuis, now()); end if;
  else new.impaye_depuis := null; end if;
  return new;
end $$;
drop trigger if exists trg_impaye_depuis on workspaces;
create trigger trg_impaye_depuis before insert or update of plan_status on workspaces for each row execute function set_impaye_depuis();
create or replace function public.saas_proprio_suspendu(p_ws uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from workspaces w where w.id = p_ws and coalesce(w.plan,'') <> 'fondateur' and (
    (w.plan_status in ('past_due','unpaid') and w.impaye_depuis < now() - interval '5 days')
    or (w.plan_status in ('canceled','incomplete_expired') and coalesce(w.period_end, w.created_at) < now() - interval '5 days')));
$$;
