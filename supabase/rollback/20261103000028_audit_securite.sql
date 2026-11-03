-- Retour de 20261103000028_audit_securite.sql
drop function if exists public.hit(text, date);
grant update (autonomy) on public.workspaces to authenticated;
drop index if exists public.replies_dedupe;
alter table public.replies drop column if exists dedupe_key;
alter table public.workspaces drop constraint if exists workspaces_targets_array;
-- (ai_cost : le search_path figé peut rester, il est sans effet sur le résultat)
