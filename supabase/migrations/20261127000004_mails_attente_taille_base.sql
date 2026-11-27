-- Solidité : e-mails mis en attente quand Resend refuse un moment (quota, panne), renvoyés par la tâche planifiée ;
-- taille de la base lue par le serveur seulement (alerte avant le quota de la formule)
create table if not exists public.mails_attente (
  id bigserial primary key,
  corps jsonb not null,
  extra jsonb not null default '{}'::jsonb,
  essais int not null default 0,
  prochain timestamptz not null default now(),
  derniere_erreur text,
  statut text not null default 'attente',
  at timestamptz not null default now()
);
create index if not exists mails_attente_prochain on public.mails_attente (statut, prochain);
alter table public.mails_attente enable row level security;
create or replace function public.taille_base() returns bigint language sql security definer set search_path = public as $$ select pg_database_size(current_database()) $$;
revoke all on function public.taille_base() from public, anon, authenticated;
