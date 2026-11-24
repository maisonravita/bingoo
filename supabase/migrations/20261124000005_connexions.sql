-- Connexions sortantes d'un projet (adresses à prévenir, secret de signature, journal des derniers envois).
-- Colonne à part de « spec » : spec est lu par les visiteurs, les adresses et les secrets ne doivent jamais l'être.
alter table saas_apps add column if not exists connexions jsonb;
