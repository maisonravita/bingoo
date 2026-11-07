-- E-mail du matin : les 3 opportunités du jour, chacune avec un lien vers une page de confirmation d'envoi.
-- Le lien est à usage unique, expire en 48 h, et seule son empreinte (SHA-256) est gardée.
create table if not exists public.liens_envoi (
  token_hash text primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.liens_envoi enable row level security; -- aucun accès direct : seulement par la fonction serveur
create index if not exists liens_envoi_ws on public.liens_envoi(workspace_id, created_at);
-- Planification (jours ouvrés, 7 h 12 heure de Paris en hiver) : voir cron.schedule('bingoo-matin', ...) appliqué en base.
