-- Outils gratuits : compteurs d'usage par jour (empreinte salée de l'adresse IP, jamais l'adresse elle-même)
create table if not exists public.free_hits (
  key text not null, day date not null, n int not null default 0,
  primary key (key, day)
);
alter table public.free_hits enable row level security; -- serveur uniquement
