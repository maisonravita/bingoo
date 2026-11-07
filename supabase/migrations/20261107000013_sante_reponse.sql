-- 1. Santé de l'envoi gardée sur l'espace (DNS du domaine, rebonds, plafond de sécurité). Écrite par le serveur seulement.
alter table public.workspaces add column if not exists sante_envoi jsonb;
-- 2. Lien « Envoyer cette réponse » de l'alerte prospect chaud : même table que les liens du matin, pour une réponse.
alter table public.liens_envoi alter column message_id drop not null;
alter table public.liens_envoi add column if not exists reply_id uuid references public.replies(id) on delete cascade;
alter table public.liens_envoi drop constraint if exists liens_envoi_cible;
alter table public.liens_envoi add constraint liens_envoi_cible check ((message_id is not null) <> (reply_id is not null));
