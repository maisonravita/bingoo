select cron.unschedule(jobid) from cron.job where jobname = 'bingoo-nettoyage';
drop function if exists public.purge_old_data();
