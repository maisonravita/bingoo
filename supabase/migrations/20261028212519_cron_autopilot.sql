-- Recopiée depuis l'historique de la base (appliquée le 28/10, absente du dépôt).
-- Remplacée ensuite par 20261101000003_autopilot_m.sql (pilote déplacé vers la fonction « m »).
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.run_autopilot() returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/k/autopilot',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select value from public.app_secrets where name = 'cron_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  );
end $$;
revoke execute on function public.run_autopilot() from public, anon, authenticated;

select cron.schedule('kairo-autopilot', '*/20 6-17 * * 1-5', 'select public.run_autopilot()');
