-- Fiche « qui est-ce » du décideur : informations professionnelles publiques (poste depuis, parcours, ville), avec sources.
alter table public.contacts add column if not exists profile jsonb not null default '{}'::jsonb;
