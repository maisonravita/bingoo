-- Le pilote automatique passe par le nouveau moteur (m/autopilot) : vérification des adresses, respect des missions en pause.
create or replace function public.run_autopilot() returns void language plpgsql security definer set search_path to '' as $function$
begin
  perform net.http_post(
    url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/m/autopilot',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select value from public.app_secrets where name = 'cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
end $function$;
