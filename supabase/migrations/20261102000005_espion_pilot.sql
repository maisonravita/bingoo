-- Espion en pilote automatique : contrôle quotidien, rapport complet au besoin, concurrents proposés à valider
alter table public.competitors
  add column if not exists status text not null default 'suivi',
  add column if not exists watched_at timestamptz,
  add column if not exists spy_due boolean not null default false,
  add column if not exists proposal jsonb;
alter table public.workspaces add column if not exists spy_at timestamptz;
