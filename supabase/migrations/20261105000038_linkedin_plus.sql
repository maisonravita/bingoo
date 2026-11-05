-- Pilote LinkedIn, suite : recherche du profil des décideurs (« trouver »), visite du profil la veille de l'invitation (« visite »),
-- retrait des invitations restées sans réponse 3 semaines (« retirer », prospect en « retire »).
alter table public.linkedin_actions drop constraint if exists linkedin_actions_kind_check;
alter table public.linkedin_actions add constraint linkedin_actions_kind_check
  check (kind in ('invitation', 'verifier', 'message', 'relance', 'trouver', 'visite', 'retirer'));

alter table public.prospects drop constraint if exists prospects_linkedin_status_check;
alter table public.prospects add constraint prospects_linkedin_status_check
  check (linkedin_status in ('', 'a_envoyer', 'envoye', 'introuvable', 'invite', 'connecte', 'message_envoye', 'retire'));
