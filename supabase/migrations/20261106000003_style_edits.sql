-- « Bingoo! écrit comme toi » : les corrections faites sur les brouillons (avant / après), lues seulement par le serveur
create table if not exists style_edits (id uuid primary key default gen_random_uuid(), workspace_id uuid not null references workspaces(id) on delete cascade, before text not null, after text not null, created_at timestamptz not null default now());
alter table style_edits enable row level security;
create index if not exists style_edits_ws_idx on style_edits (workspace_id, created_at desc);
