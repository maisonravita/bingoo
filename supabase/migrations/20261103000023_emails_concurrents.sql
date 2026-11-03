-- Espion : e-mails marketing reçus des concurrents (adresse de veille de l'espace)
create table if not exists public.competitor_emails (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  from_email text not null default '', from_name text not null default '', subject text not null default '',
  body text not null default '', kind text not null default 'autre', offer text not null default '', summary text not null default '',
  confirm_url text, received_at timestamptz not null default now()
);
create index if not exists competitor_emails_ws on public.competitor_emails (workspace_id, received_at desc);
alter table public.competitor_emails enable row level security;
drop policy if exists competitor_emails_read on public.competitor_emails;
create policy competitor_emails_read on public.competitor_emails for select using (workspace_id in (select workspace_id from public.members where user_id = auth.uid()));
