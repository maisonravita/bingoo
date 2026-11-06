-- Recherche gratuite : un prospect n'est repris qu'après 3 jours ; source et date des téléphones
alter table prospects add column if not exists free_tried_at timestamptz;
create index if not exists prospects_free_try_idx on prospects (free_tried_at) where email='';
alter table prospects add column if not exists phone_source text not null default '', add column if not exists phone_checked_at timestamptz;
-- Appel de démarrage offert (30 min) : date de la demande
alter table workspaces add column if not exists onboarding_call_at timestamptz;
