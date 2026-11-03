-- Durées de conservation promises dans la politique de confidentialité, appliquées chaque nuit (03:40) :
-- 1. Prospect sans échange : supprimé 3 ans après le dernier contact (jamais un client, un rendez-vous ou un prospect qui a répondu).
-- 2. Espace dont l'abonnement est arrêté (ou l'essai terminé sans abonnement) : supprimé 30 jours après.
-- 3. Compteurs techniques : nettoyés après 60 jours. La liste d'opposition (suppressions) n'est jamais effacée.
create or replace function public.purge_old_data() returns jsonb language plpgsql security definer set search_path = public as $$
declare n_p int := 0; n_w int := 0; n_h int := 0;
begin
  with gone as (
    delete from prospects p
    where p.status not in ('client', 'rdv', 'repondu')
      and greatest(p.created_at, coalesce(p.updated_at, p.created_at),
                   coalesce((select max(m.sent_at) from messages m where m.prospect_id = p.id), p.created_at)) < now() - interval '3 years'
      and not exists (select 1 from meetings mt where mt.prospect_id = p.id)
      and not exists (select 1 from quotes q where q.prospect_id = p.id)
    returning 1)
  select count(*) into n_p from gone;

  with gone as (
    delete from workspaces w
    where coalesce(w.plan, 'essai') <> 'fondateur'
      and (
        (coalesce(w.plan, 'essai') = 'essai' and w.trial_ends is not null and w.trial_ends < (now() - interval '30 days')::date)
        or (coalesce(w.plan, 'essai') <> 'essai' and w.plan_status in ('canceled', 'incomplete_expired') and coalesce(w.period_end, w.created_at) < now() - interval '30 days')
      )
    returning 1)
  select count(*) into n_w from gone;

  delete from free_hits where day < current_date - 60;
  get diagnostics n_h = row_count;

  return jsonb_build_object('prospects', n_p, 'espaces', n_w, 'compteurs', n_h, 'at', now());
end $$;
revoke all on function public.purge_old_data() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'bingoo-nettoyage';
select cron.schedule('bingoo-nettoyage', '40 3 * * *', $$select public.purge_old_data()$$);
