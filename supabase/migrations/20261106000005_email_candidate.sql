-- E-mail trouvé mais pas relié avec certitude à l'entreprise (autre domaine, autre société) : gardé à part, à valider par le client
alter table prospects add column if not exists email_candidate text not null default '', add column if not exists email_candidate_note text not null default '';
