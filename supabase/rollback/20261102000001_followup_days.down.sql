-- Retour arrière de 20261102000001_followup_days.sql (délais de relance réglables).
-- Sans effet sur les relances : le code revient alors à J+5 / J+12 par défaut.
revoke update (followup_days) on public.workspaces from authenticated;
alter table public.workspaces drop column if exists followup_days;
