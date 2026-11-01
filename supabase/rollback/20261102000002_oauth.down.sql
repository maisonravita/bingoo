-- Retour arrière de 20261102000002_oauth.sql (les boîtes connectées par Google/Microsoft devront être reconnectées)
alter table public.workspace_secrets drop column if exists oauth;
