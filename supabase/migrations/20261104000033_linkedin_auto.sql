-- Pilote LinkedIn : l'extension Bingoo! envoie les invitations et le premier message depuis le navigateur du client,
-- avec des quotas prudents. Le client active le pilote lui-même, après avoir accepté le risque de restriction de son compte.
alter table public.workspaces add column if not exists linkedin_auto jsonb not null default '{}'::jsonb;
-- { enabled: bool, accepted_at: iso, started_at: iso, paused_reason: text|null, paused_at: iso|null }

alter table public.prospects drop constraint if exists prospects_linkedin_status_check;
alter table public.prospects add constraint prospects_linkedin_status_check
  check (linkedin_status in ('', 'a_envoyer', 'envoye', 'introuvable', 'invite', 'connecte', 'message_envoye'));

create table if not exists public.linkedin_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  kind text not null check (kind in ('invitation', 'verifier', 'message')),
  status text not null default 'a_faire' check (status in ('a_faire', 'en_cours', 'fait', 'echec', 'annule')),
  due_at timestamptz not null default now(),
  taken_at timestamptz,
  done_at timestamptz,
  result text not null default '',
  created_at timestamptz not null default now(),
  unique (prospect_id, kind)
);
create index if not exists linkedin_actions_queue on public.linkedin_actions (workspace_id, status, due_at);
create index if not exists linkedin_actions_prospect_id_fk on public.linkedin_actions (prospect_id);

alter table public.linkedin_actions enable row level security;
drop policy if exists linkedin_actions_read on public.linkedin_actions;
create policy linkedin_actions_read on public.linkedin_actions for select
  using (workspace_id in (select m.workspace_id from public.members m where m.user_id = (select auth.uid())));
