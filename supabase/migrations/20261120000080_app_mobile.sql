-- Étape 3 : l'app mobile. La coque Expo publiée pour l'aperçu dans Expo Go (identifiant du Snack, SDK, date, version de l'app).
alter table public.saas_apps add column if not exists mobile jsonb;
