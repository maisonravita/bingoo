-- Grille par quota (business plan) : recharges de prospects contactés (+100 pour 19 €) et index du compteur
create table if not exists prospect_topups (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade, prospects int not null, paid_eur numeric not null default 0, stripe_session text unique, note text not null default '', created_at timestamptz not null default now());
alter table prospect_topups enable row level security;
create policy prospect_topups_read on prospect_topups for select using (exists (select 1 from members m where m.workspace_id = prospect_topups.workspace_id and m.user_id = auth.uid()));
create index if not exists messages_first_sent_idx on messages (workspace_id, sent_at) where step = 0 and status = 'envoye';
