-- Clé publique Stripe du créateur (paiements entre membres : jeton de compte fait dans le navigateur)
alter table public.saas_app_secrets add column if not exists stripe_pk text;
