-- Plusieurs boîtes d'envoi par espace (en plus de la boîte principale). Identifiants chiffrés comme ceux de la principale ;
-- lus et écrits seulement par les fonctions (clé de service), jamais par le navigateur.
create table if not exists public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  integration jsonb not null default '{}'::jsonb,
  secrets jsonb not null default '{}'::jsonb,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);
alter table public.mailboxes enable row level security;
-- Retour arrière : drop table public.mailboxes;

-- Séquences modifiables : étapes après le premier e-mail ({ etapes: [{ apres, canal, texte, si }] }) et avancement par prospect
alter table public.workspaces add column if not exists sequence jsonb;
alter table public.prospects add column if not exists seq_etape integer;
-- Retour arrière : alter table public.workspaces drop column sequence; alter table public.prospects drop column seq_etape;
