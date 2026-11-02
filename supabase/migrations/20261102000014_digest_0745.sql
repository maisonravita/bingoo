-- E-mail du matin (alertes, 3 du jour) après les passages du Radar : 7 h 45 UTC (8 h 45 à Paris en hiver)
select cron.unschedule('kairo-espion-alertes');
select cron.schedule('kairo-espion-alertes', '45 7 * * *', $$select net.http_post(url:='https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/r/spy-digest', headers:=jsonb_build_object('content-type','application/json','x-cron-key',(select value from public.app_secrets where name='cron_key')), body:='{}'::jsonb, timeout_milliseconds:=120000)$$);
