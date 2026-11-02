-- Radar étape 4 : attribuer un signal à un commercial
alter table public.radar_opps add column if not exists assigned_to uuid references auth.users(id) on delete set null;
