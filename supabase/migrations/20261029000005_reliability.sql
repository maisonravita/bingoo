-- Fiabilité des envois : verrou d'envoi et une seule version active par étape
alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages add constraint messages_status_check check (status in ('brouillon','envoi','envoye','echec','ignore'));
alter table public.messages add column if not exists claimed_at timestamptz;
create unique index if not exists messages_one_per_step on public.messages (prospect_id, step) where status in ('brouillon','envoi','envoye');

-- Espace de test Onet : on repasse en validation manuelle (il consommait des crédits IA)
update public.workspaces set autonomy = 'valider' where name = 'Onet' and autonomy = 'auto';
