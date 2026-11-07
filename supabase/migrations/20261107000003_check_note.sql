-- Contrôle des faits avant envoi : affirmations du message que rien ne prouve
alter table public.messages add column if not exists check_note text not null default '';
