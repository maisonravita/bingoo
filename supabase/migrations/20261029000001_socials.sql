alter table public.workspaces
  add column if not exists socials jsonb not null default '{}'::jsonb,
  add column if not exists social_audit jsonb,
  add column if not exists social_audit_at timestamptz;
grant update (socials) on public.workspaces to authenticated;
