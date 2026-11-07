-- Plus d'essai long : un aperçu gratuit de 7 jours (on voit ses messages ; l'envoi démarre avec l'abonnement),
-- et le premier mois est remboursé sans rendez-vous ni réponse positive (garantie, voir garantie.ts).
drop trigger if exists essai_premier_rdv on meetings;
drop function if exists public.essai_premier_rdv();
alter table workspaces alter column trial_ends set default (current_date + 7);
