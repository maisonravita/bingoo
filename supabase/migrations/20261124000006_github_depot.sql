-- Code envoyé sur le dépôt GitHub du membre : le jeton reste dans la table des secrets (illisible depuis le navigateur),
-- le projet ne garde que le nom du dépôt et le dernier envoi.
alter table saas_app_secrets add column if not exists github_token text;
alter table saas_apps add column if not exists github jsonb;
