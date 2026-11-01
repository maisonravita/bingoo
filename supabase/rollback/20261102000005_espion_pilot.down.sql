select cron.unschedule('kairo-espion');
alter table public.competitors drop column if exists status, drop column if exists watched_at, drop column if exists spy_due, drop column if exists proposal;
alter table public.workspaces drop column if exists spy_at;
