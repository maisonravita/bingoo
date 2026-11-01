-- Recopiée depuis l'historique de la base (appliquée le 28/10, absente du dépôt).
alter table public.workspaces add column app_url text not null default '';
grant update (app_url) on public.workspaces to authenticated;
