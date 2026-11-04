-- Annule 20261104000033_linkedin_auto.sql
drop table if exists public.linkedin_actions;
update public.prospects set linkedin_status = 'envoye' where linkedin_status in ('invite', 'connecte', 'message_envoye');
alter table public.prospects drop constraint if exists prospects_linkedin_status_check;
alter table public.prospects add constraint prospects_linkedin_status_check
  check (linkedin_status in ('', 'a_envoyer', 'envoye', 'introuvable'));
alter table public.workspaces drop column if exists linkedin_auto;
