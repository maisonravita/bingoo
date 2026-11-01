alter table public.missions add column if not exists signal_focus text[] not null default '{}', add column if not exists signal_exclude text[] not null default '{}';
