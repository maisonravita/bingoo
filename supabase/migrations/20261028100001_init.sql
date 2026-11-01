-- =====================================================================
-- Machine d'acquisition multi-entreprises
--   workspaces : une entreprise cliente (profil business, cibles, expéditeur)
--   members    : utilisateurs d'un espace
--   prospects  : établissements trouvés dans le registre des entreprises
--   messages   : e-mails rédigés, validés, envoyés
--   activity   : journal de ce que la machine a fait
-- =====================================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  website text not null default '',
  profile jsonb not null default '{}'::jsonb,      -- ce que l'IA a compris du business
  targets jsonb not null default '[]'::jsonb,      -- cibles (codes NAF, tranches, angle)
  zone text[] not null default '{}',                -- départements prospectés
  sender_name text not null default '',
  sender_email text not null default '',
  signature text not null default '',
  postal_address text not null default '',
  domain text not null default '',
  domain_id text not null default '',
  domain_status text not null default '',           -- '', pending, verified, failed
  domain_records jsonb not null default '[]'::jsonb,
  daily_limit int not null default 20 check (daily_limit between 1 and 200),
  onboarded boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  target text not null default '',
  name text not null,
  org text not null default '',
  siren text,
  siret text,
  activity text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  contact_name text not null default '',
  contact_role text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  status text not null default 'nouveau' check (status in
    ('nouveau','sans_email','pret','a_valider','envoye','repondu','rdv','client','refus','ignore')),
  enriched_at timestamptz,
  enrich_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, siret)
);
create index prospects_ws_idx on public.prospects (workspace_id, status, created_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  step int not null default 0,
  subject text not null default '',
  body text not null default '',
  status text not null default 'brouillon' check (status in ('brouillon','envoye','echec','ignore')),
  error text not null default '',
  provider_id text not null default '',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_ws_idx on public.messages (workspace_id, status, created_at desc);

create table public.activity (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index activity_ws_idx on public.activity (workspace_id, created_at desc);

-- updated_at automatique
create function public.touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger prospects_touch before update on public.prospects for each row execute function public.touch();

-- Appartenance (security definer pour éviter la récursion RLS)
create function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;

-- Création d'un espace : l'utilisateur en devient propriétaire
create function public.create_workspace(p_name text, p_website text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  insert into public.workspaces (name, website, created_by) values (coalesce(p_name,''), coalesce(p_website,''), auth.uid()) returning id into ws;
  insert into public.members (workspace_id, user_id, role) values (ws, auth.uid(), 'owner');
  return ws;
end $$;
revoke execute on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

alter table public.workspaces enable row level security;
alter table public.members enable row level security;
alter table public.prospects enable row level security;
alter table public.messages enable row level security;
alter table public.activity enable row level security;

create policy ws_select on public.workspaces for select to authenticated using (public.is_member(id));
create policy ws_update on public.workspaces for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy mem_select on public.members for select to authenticated using (user_id = (select auth.uid()) or public.is_member(workspace_id));
create policy pr_all on public.prospects for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy msg_all on public.messages for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy act_select on public.activity for select to authenticated using (public.is_member(workspace_id));

-- Champs sensibles du domaine : modifiables seulement par le serveur
revoke insert, update, delete on public.workspaces from authenticated, anon;
grant update (name, website, profile, targets, zone, sender_name, sender_email, signature, postal_address, daily_limit, onboarded)
  on public.workspaces to authenticated;
revoke insert, update, delete on public.members, public.activity from authenticated, anon;
