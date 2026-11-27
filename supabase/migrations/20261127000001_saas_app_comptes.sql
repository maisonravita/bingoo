-- Place de marché : le compte de versement Stripe (Connect Express) de chaque espace membre d'un SaaS construit
create table if not exists public.saas_app_comptes (
  app_id uuid not null references public.saas_apps(id) on delete cascade,
  espace_id uuid not null,
  acct text not null,
  pret boolean not null default false,
  at timestamptz not null default now(),
  maj timestamptz,
  primary key (app_id, espace_id)
);
alter table public.saas_app_comptes enable row level security;
-- Lu et écrit seulement par le serveur (clé de service) : aucune politique pour les visiteurs
