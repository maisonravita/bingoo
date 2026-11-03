# Sauvegardes de la base

Chaque dimanche, GitHub Actions (« Sauvegarde de la base ») fait une copie complète de la base, chiffrée, gardée 30 jours.

## Restaurer une copie

1. GitHub → Actions → « Sauvegarde de la base » → dernière exécution → télécharger `sauvegarde-base`.
2. Déchiffrer : `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in bingoo-AAAA-MM-JJ.dump.enc -out bingoo.dump -pass pass:'TA_PHRASE'`
3. Restaurer (sur un projet Supabase vide de préférence) : `pg_restore --no-owner --no-privileges -d "ADRESSE_DE_CONNEXION" bingoo.dump`

Sans la phrase secrète `BACKUP_PASSPHRASE`, les copies sont illisibles : garde-la dans ton gestionnaire de mots de passe.
