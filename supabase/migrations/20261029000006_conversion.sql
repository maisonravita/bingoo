alter table public.meetings add column if not exists reminded_at timestamptz, add column if not exists followup jsonb;
alter table public.quotes add column if not exists reminded_at timestamptz;
