-- Vérification des adresses (MillionVerifier, si la clé est configurée) : un résultat par adresse, gardé 60 jours,
-- pour ne jamais payer deux fois la même vérification. Lu et écrit seulement par les fonctions.
create table if not exists public.email_verifs (
  email text primary key,
  statut text not null,
  raison text not null default '',
  at timestamptz not null default now()
);
alter table public.email_verifs enable row level security;
-- Retour arrière : drop table public.email_verifs;
