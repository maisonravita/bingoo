-- Synthèse des relevés REA : traite jusqu'à deux SaaS analysés par minute.
-- L'analyse navigateur reste exécutée par GitHub Actions (explorer-decortiquer.yml).
-- Cette tâche transforme les preuves REA en fiche fonctionnelle consommée par saasLancer().
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule(jobid)
from cron.job
where jobname = 'bingoo-rea-synthese';

select cron.schedule(
  'bingoo-rea-synthese',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/saas-decortiquer-synthese',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key', (select value from public.app_secrets where name = 'cron_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
  $$
);
