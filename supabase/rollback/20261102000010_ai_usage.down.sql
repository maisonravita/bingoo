drop function if exists public.ai_overview(timestamptz);
drop function if exists public.ai_spent(uuid, timestamptz);
drop table if exists public.ai_usage;
alter table public.workspaces drop column if exists ai_budget_eur;
drop function if exists public.ai_month(uuid);
