drop table if exists public.public_contracts;
drop table if exists public.company_names;
alter table public.workspaces drop column if exists market_at;
select cron.unschedule('kairo-marche-public');
