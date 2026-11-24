-- « Tu ne paies jamais nos erreurs » : la dernière modification payée de l'atelier (version d'avant, quand),
-- pour la rendre si le membre l'annule (modification du mois ou crédit restitué)
alter table public.saas_apps add column if not exists paiement_modif jsonb;
