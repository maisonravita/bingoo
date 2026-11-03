select cron.unschedule(jobid) from cron.job where jobname = 'bingoo-erreurs-nettoyage';
drop function if exists public.purge_client_errors();
drop table if exists public.client_errors;
-- puis réappliquer 20261103000030_nettoyage_rgpd.sql pour l'ancienne version de purge_old_data
