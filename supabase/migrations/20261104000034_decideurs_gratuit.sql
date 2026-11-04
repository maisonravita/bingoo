-- Passe gratuite (sans IA) chaque nuit, 01 h – 05 h à Paris : site retrouvé par le nom, e-mail publié sur ce site.
-- Annulation : select cron.unschedule('bingoo-decideurs-gratuit');
select cron.unschedule(jobid) from cron.job where jobname = 'bingoo-decideurs-gratuit';
select cron.schedule('bingoo-decideurs-gratuit', '7-57/10 0-4 * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/free-enrich', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')), body:='{"n":15}'::jsonb, timeout_milliseconds:=150000)$$);
