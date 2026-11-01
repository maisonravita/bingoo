-- Mission pilotée : Kairo fait avancer chaque mission active tout seul (sans jamais envoyer d'e-mail)
alter table missions add column if not exists auto boolean not null default true,
  add column if not exists journal jsonb not null default '[]'::jsonb,
  add column if not exists run_at timestamptz;
