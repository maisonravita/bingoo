# Ton équipe cette nuit (/qg/)

La nuit de l'équipe Bingoo!, rejouée en pixel art dans la vraie ville du client. Page à part, construite par
`vite build -c vite.qg.config.js` (lancé par `npm run build:site`) dans `dist-single/qg/`.

- Moteur : [QG des agents](https://github.com/devlikemasta/qg-des-agents) (licence MIT, voir THIRD_PARTY_QG_DES_AGENTS_LICENSE.txt),
  adapté : personnages de l'équipe Bingoo!, logo Bingoo! sur le QG, pas de serveur local.
- `src/data.js` : la nuit à partir des données Supabase de l'espace (prospects trouvés ou complétés en 24 h, signaux,
  décideurs, e-mails vérifiés, brouillons). Rien d'inventé ; sans activité récente, les derniers prospects, annoncés comme tels.
- `src/api.js` : remplace le serveur du QG (tuiles OpenFreeMap, immeubles et arbres OpenStreetMap via Overpass, gardés 7 jours
  dans le navigateur ; positions via la Base Adresse Nationale, gardées dans le navigateur).
- Aucune action réelle depuis cette page : valider ou ouvrir un prospect renvoie vers Bingoo!.
