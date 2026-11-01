alter table public.prospects
  add column if not exists channel text not null default '',
  add column if not exists contact_form text not null default '',
  add column if not exists letter text not null default '',
  add column if not exists enrich_level int not null default 0,
  add column if not exists email_source text not null default '',
  add column if not exists dropcontact_req text;
alter table public.workspaces add column if not exists email_credits int not null default 300;
update public.prospects set enrich_level = 1 where enriched_at is not null and enrich_level = 0;
update public.prospects set channel = 'email' where email <> '' and channel = '';
update public.prospects set channel = 'telephone' where email = '' and phone <> '' and enriched_at is not null and channel = '';
