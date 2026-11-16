-- Connecteur Claude/ChatGPT : l'abonnement est vérifié à chaque question.
-- Payant (ou Fondateur, ou espace d'un admin) : 5 000 questions par mois, tout visible.
-- Gratuit : 20 questions par mois par espace, revenus masqués, classement et SaaS à vendre réservés aux abonnés.
create or replace function public.saas_cle_payante(p_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.saas_paye_ws(p_ws)
      or exists (select 1 from members m join admins a on a.user_id = m.user_id where m.workspace_id = p_ws);
$$;
revoke all on function public.saas_cle_payante(uuid) from public, anon, authenticated;
grant execute on function public.saas_cle_payante(uuid) to service_role;
