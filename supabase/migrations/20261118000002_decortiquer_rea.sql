-- « Décortiquer ce SaaS » : analyse REA des pages publiques d'un SaaS (structure, parcours, routes, technologies),
-- puis synthèse en français. Partagée par domaine (un site public analysé une fois sert à tous), relue après 30 jours.
create table if not exists public.saas_decortique (
  domaine text primary key,
  statut text not null default 'attente' check (statut in ('attente','en_cours','analyse','fait','erreur')),
  demande_par uuid references public.workspaces(id) on delete set null,
  rea jsonb,
  resultat jsonb,
  erreur text,
  essais int not null default 0,
  at timestamptz not null default now(),
  fait_at timestamptz
);
alter table public.saas_decortique enable row level security;
create index if not exists saas_decortique_statut on public.saas_decortique (statut, at);
-- Lecture et écriture uniquement par les fonctions serveur (aucune politique : rien d'exposé à l'API publique)
revoke all on public.saas_decortique from anon, authenticated;
