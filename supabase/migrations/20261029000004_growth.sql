-- =====================================================================
-- Croissance : préchauffage, équipe, CRM, agenda, abonnements, boîte mail
-- =====================================================================

-- Préchauffage du domaine : date du premier envoi réel
alter table public.workspaces add column if not exists warmup_started date;

-- Abonnement (modifiable uniquement par le serveur)
alter table public.workspaces
  add column if not exists plan text not null default 'essai',
  add column if not exists plan_status text not null default 'trialing',
  add column if not exists trial_ends date default (current_date + 14),
  add column if not exists stripe_customer text not null default '',
  add column if not exists stripe_subscription text not null default '',
  add column if not exists period_end timestamptz;

-- Intégrations : état visible (jamais les clés)
alter table public.workspaces
  add column if not exists integrations jsonb not null default '{}'::jsonb,
  add column if not exists calendar_token uuid not null default gen_random_uuid();

-- Clés et mots de passe : table lisible seulement par le serveur
create table if not exists public.workspace_secrets (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  hubspot_token text not null default '',
  pipedrive_token text not null default '',
  pipedrive_domain text not null default '',
  smtp jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.workspace_secrets enable row level security;
revoke all on public.workspace_secrets from anon, authenticated;

-- Équipe
alter table public.members add column if not exists email text not null default '';
alter table public.members drop constraint if exists members_role_check;
alter table public.members add constraint members_role_check check (role in ('owner','admin','member'));
update public.members m set email = coalesce(u.email, '') from auth.users u where u.id = m.user_id and m.email = '';

create or replace function public.create_workspace(p_name text, p_website text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  insert into public.workspaces (name, website, created_by) values (coalesce(p_name,''), coalesce(p_website,''), auth.uid()) returning id into ws;
  insert into public.members (workspace_id, user_id, role, email)
    values (ws, auth.uid(), 'owner', coalesce((select email from auth.users where id = auth.uid()), ''));
  return ws;
end $$;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email text not null default '',
  role text not null default 'member' check (role in ('admin','member')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);
alter table public.invites enable row level security;
create policy inv_select on public.invites for select to authenticated using (public.is_member(workspace_id));
revoke insert, update, delete on public.invites from authenticated, anon;

alter table public.prospects
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists crm_ids jsonb not null default '{}'::jsonb;
create index if not exists prospects_owner_idx on public.prospects (workspace_id, owner_id);

-- Boîte d'envoi utilisée pour chaque message
alter table public.messages add column if not exists sent_via text not null default '';

-- Les fondateurs (espaces existants) ne paient pas
update public.workspaces set plan = 'fondateur', plan_status = 'active', trial_ends = null where plan = 'essai';
