-- CH02 : délais des relances réglables (par défaut J+5 et J+12, comme avant)
alter table public.workspaces add column if not exists followup_days integer[] not null default '{5,12}';
grant update (followup_days) on public.workspaces to authenticated;
