-- V2 / V3 : réponses, rendez-vous, devis, appels, concurrents, rentabilité, pilote automatique
create extension if not exists btree_gist with schema extensions;

alter table public.workspaces
  add column booking_slug text unique default substr(md5(random()::text), 1, 10),
  add column availability jsonb not null default '{"1":[["09:00","12:00"],["14:00","18:00"]],"2":[["09:00","12:00"],["14:00","18:00"]],"3":[["09:00","12:00"],["14:00","18:00"]],"4":[["09:00","12:00"],["14:00","18:00"]],"5":[["09:00","12:00"],["14:00","17:00"]]}'::jsonb,
  add column meeting_minutes int not null default 30 check (meeting_minutes between 10 and 180),
  add column meeting_location text not null default 'Visioconférence (lien envoyé avant le rendez-vous)',
  add column catalog jsonb not null default '[]'::jsonb,
  add column vat_rate numeric not null default 20,
  add column autonomy text not null default 'valider' check (autonomy in ('valider','auto')),
  add column reply_domain text not null default '',
  add column reply_domain_id text not null default '',
  add column reply_status text not null default '',
  add column reply_records jsonb not null default '[]'::jsonb,
  add column legal_name text not null default '',
  add column siret text not null default '';

grant update (availability, meeting_minutes, meeting_location, catalog, vat_rate, autonomy, legal_name, siret)
  on public.workspaces to authenticated;

alter table public.prospects
  add column public_token uuid not null default gen_random_uuid(),
  add column next_action_at date,
  add column next_action text not null default '',
  add column notes text not null default '',
  add column signals jsonb not null default '[]'::jsonb,
  add column insight jsonb,
  add column insight_at timestamptz,
  add column score int,
  add column deal_value numeric,            -- chiffre d'affaires mensuel HT
  add column margin_pct numeric,            -- marge estimée en %
  add column won_at timestamptz,
  add column churned_at timestamptz,
  add column source text not null default 'registre';
create unique index prospects_token_idx on public.prospects (public_token);
create index prospects_next_idx on public.prospects (workspace_id, next_action_at);

-- Réponses reçues
create table public.replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  from_email text not null default '',
  from_name text not null default '',
  subject text not null default '',
  body text not null default '',
  class text not null default 'autre',
  summary text not null default '',
  needs_human boolean not null default true,
  reply_subject text not null default '',
  reply_body text not null default '',
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index replies_ws_idx on public.replies (workspace_id, handled, created_at desc);

-- Rendez-vous
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  company text not null default '',
  notes text not null default '',
  status text not null default 'confirme' check (status in ('confirme','tenu','qualifie','absent','annule')),
  brief text not null default '',
  booked_by text not null default 'prospect',
  created_at timestamptz not null default now(),
  constraint meetings_no_overlap exclude using gist (workspace_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'confirme')
);
create index meetings_ws_idx on public.meetings (workspace_id, starts_at);

-- Devis
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  token uuid not null default gen_random_uuid() unique,
  number text not null default '',
  title text not null default '',
  lines jsonb not null default '[]'::jsonb,   -- [{label, qty, unit, price}]
  recurring boolean not null default false,  -- montant mensuel
  notes text not null default '',
  total_ht numeric not null default 0,
  vat_rate numeric not null default 20,
  status text not null default 'brouillon' check (status in ('brouillon','envoye','vu','signe','refuse')),
  valid_until date,
  sent_at timestamptz, viewed_at timestamptz, signed_at timestamptz,
  signed_name text not null default '', signed_ip text not null default '',
  created_at timestamptz not null default now()
);
create index quotes_ws_idx on public.quotes (workspace_id, created_at desc);

-- Appels
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  outcome text not null check (outcome in ('pas_joignable','rappeler','interesse','rdv','refus','mauvais_numero')),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index calls_ws_idx on public.calls (workspace_id, created_at desc);

-- Concurrents
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null default '',
  url text not null default '',
  summary jsonb,
  text_hash text not null default '',
  history jsonb not null default '[]'::jsonb,
  checked_at timestamptz,
  changed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Secrets internes (webhook des réponses, tâche planifiée) : serveur uniquement
create table public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets values ('inbound_key', encode(extensions.gen_random_bytes(24), 'hex')), ('cron_key', encode(extensions.gen_random_bytes(24), 'hex'));

alter table public.replies enable row level security;
alter table public.meetings enable row level security;
alter table public.quotes enable row level security;
alter table public.calls enable row level security;
alter table public.competitors enable row level security;
create policy rep_all on public.replies for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy mee_all on public.meetings for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy quo_all on public.quotes for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy cal_all on public.calls for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy com_all on public.competitors for all to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
revoke all on public.replies, public.meetings, public.quotes, public.calls, public.competitors from anon;
