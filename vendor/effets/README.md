# Effets des sites construits par Bingoo!

Bibliothèques ajoutées le 26/11 à la demande de Jean, assemblées dans `public/lib/bingoo-effets.js` par `scripts/effets/effets.js` :

- **Lenis** 1.3.29 (MIT, darkroom.engineering) : défilement doux.
- **anime.js** 4.5.0 (MIT, Julian Garnier) : mots des titres qui montent, compteurs.
- **OGL** 1.0.11 (Unlicense) : ondulation WebGL des grandes photos (à la souris).
- **curtains.js** 8.1.6 (MIT, Martin Laxenaire) : gardé en réserve (OGL fait le même travail en plus léger), pas encore chargé.

Reconstruire le paquet : installer `lenis@1.3.29 animejs@4.5.0 ogl@1.0.11`, puis lancer esbuild sur `scripts/effets/effets.js` (format iife, minifié) vers `public/lib/bingoo-effets.js`.
Le code généré par l'IA ne charge jamais de script : c'est la page publique qui charge ce fichier et l'applique aux classes du kit.
