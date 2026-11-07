-- Prix fondateur : les 50 premiers abonnés Solo paient 29 € à vie (au lieu de 39 €).
-- La place est marquée à l'activation de l'abonnement (webhook Stripe) et ne se perd pas tant que l'abonnement vit.
alter table public.workspaces add column if not exists founder_price boolean not null default false;
