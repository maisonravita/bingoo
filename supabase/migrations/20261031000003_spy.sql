alter table public.competitors add column if not exists social jsonb, add column if not exists social_at timestamptz;
