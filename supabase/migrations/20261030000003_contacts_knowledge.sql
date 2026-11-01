-- Chercheur de contacts : plusieurs décideurs par entreprise, avec la source de chaque coordonnée
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete cascade,
  name text not null default '',
  role text not null default '',
  linkedin_url text not null default '',
  email text not null default '',
  email_status text not null default '' check (email_status in ('', 'publie', 'verifie', 'probable', 'introuvable', 'en_cours')),
  email_source text not null default '',
  phone text not null default '',
  source text not null default '',
  provider_req jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (prospect_id, name)
);
create index if not exists contacts_ws_idx on public.contacts (workspace_id, prospect_id);
alter table public.contacts enable row level security;
create policy contacts_select on public.contacts for select to authenticated using (public.is_member(workspace_id));
create policy contacts_update on public.contacts for update to authenticated using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
create policy contacts_delete on public.contacts for delete to authenticated using (public.is_member(workspace_id));

-- Fiche « Ce que Kairo peut répondre » : connaissances produit utilisées dans les e-mails, réponses et devis
alter table public.workspaces add column if not exists knowledge text not null default '';
