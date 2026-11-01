-- Recopiée depuis l'historique de la base (appliquée le 28/10, absente du dépôt).
alter table public.prospects
  add column linkedin_url text not null default '',
  add column linkedin_person text not null default '',
  add column linkedin_note text not null default '',
  add column linkedin_msg text not null default '',
  add column linkedin_status text not null default '' check (linkedin_status in ('','a_envoyer','envoye','introuvable'));
alter table public.messages add column due_at timestamptz;
