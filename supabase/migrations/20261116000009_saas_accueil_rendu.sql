-- Accueil affiché par un vrai navigateur (workflow « Explorer – rendu »), utilisé une fois par la lecture puis effacé
alter table public.saas add column if not exists accueil_rendu text, add column if not exists accueil_rendu_at timestamptz;
