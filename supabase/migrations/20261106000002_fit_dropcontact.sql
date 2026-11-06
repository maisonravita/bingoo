-- Filtre de cible (oui / non / doute + raison) et e-mails à la demande (Dropcontact essayé une seule fois)
alter table prospects add column if not exists fit text not null default '', add column if not exists fit_reason text not null default '', add column if not exists dc_tried_at timestamptz;
create index if not exists prospects_fit_todo_idx on prospects (workspace_id) where fit = '';
