// Troisième type de projet : l'OUTIL ou le JEU (à côté du site vitrine et du logiciel par abonnement).
// Une seule page, ouverte directement : pas de compte, pas de page de vente, pas de formules. Tout se passe dans le navigateur
// du visiteur ; ses scores et ses réglages restent sur son appareil (useMemoire). Le design est libre, propre à chaque idée.
// L'écran passe par le même moteur que les logiciels (écriture, contrôle de syntaxe, réparation, modifications de l'atelier).
// deno-lint-ignore-file no-explicit-any
import { admin } from "./core.ts";

export const DOC_OUTIL = (spec: any) => `Tu écris UN ${spec.outil?.genre === "jeu" ? "jeu" : "outil"} web complet en Preact avec htm (pas de JSX, pas de build), ouvert directement par n'importe qui, sans compte. Le code est évalué tel quel.
Écris exactement une fonction nommée Ecran (function Ecran() { ... }) et, au-dessus, les constantes et petites fonctions d'aide utiles. Pas d'import, pas d'export.
Variables déjà disponibles (ne les redéclare pas) :
- html : gabarit htm. Attributs : class=, style=, onClick=, onInput=, value=. Listes : \${xs.map((x) => html\`<li key=\${x.id}>…</li>\`)}.
- useState, useEffect, useMemo, useRef, useCallback (hooks Preact).
- useMemoire(cle, valeurInitiale) → [valeur, setValeur] : comme useState, mais gardé dans le navigateur du visiteur d'une visite à l'autre (meilleur score, historique, réglages, données qu'il a saisies). setValeur accepte une valeur ou une fonction (ancienne) => nouvelle.
- toast(message, "ok"|"bad") : petite notification. demander(message, { ok, danger }) → Promise<boolean> pour confirmer (jamais confirm ni alert).
- fmt.eur(n), fmt.num(n), fmt.date(iso), fmt.pct(n).
- Tailwind CSS est chargé (valeurs libres acceptées : bg-[#0B1020], text-[clamp(2rem,8vw,5rem)], shadow-[0_20px_60px_-20px_rgba(0,0,0,.6)]).

CE QUE C'EST : un objet qu'on ouvre et qu'on utilise tout de suite. PAS un logiciel de gestion.
- Aucun compte, aucun bouton « S'inscrire », aucune page de vente, aucun prix, aucune formule, aucun menu de logiciel, aucune barre latérale, aucun tableau de bord.
- Pas de serveur : pas de base de données, pas d'e-mail, pas de données communes entre visiteurs. Tout se calcule dans la page.
- Données du monde réel : fetch est permis UNIQUEMENT vers ces sources publiques sans clé — taux de change de la Banque centrale européenne : https://api.frankfurter.dev/v1/latest?base=EUR (réponse { date, rates: { USD: 1.08, … } }) ; météo : https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code,wind_speed_10m. Affiche alors la date des données et leur source. Prévois TOUJOURS un secours si l'appel échoue : des valeurs de départ écrites en dur, affichées avec la mention « valeurs indicatives, à vérifier » (jamais présentées comme à jour). Aucune autre donnée réelle inventée.

DESIGN LIBRE (c'est ce qui fait la différence) :
- La page entière est l'objet : racine <div class="min-h-screen …"> avec SON fond (couleur profonde, dégradé ou texture en CSS), le contenu centré, à l'aise au téléphone (360 px, au doigt) comme sur ordinateur.
- Une direction visuelle forte et propre à l'idée, tenue partout : ${spec.outil?.ambiance?.esprit ? `« ${spec.outil.ambiance.esprit} », ` : ""}fond ${spec.outil?.ambiance?.fond ?? "au choix"}, couleur d'accent ${spec.outil?.ambiance?.accent ?? "au choix"} (aussi disponible en var(--c)). Deux ou trois couleurs, pas plus.
- Grande typographie pour le titre et les chiffres importants (font-black, tracking-tight, chiffres en tabular-nums), formes généreuses, ombres douces, états visibles (hover, active:scale-95, focus), transitions courtes (transition, duration-200). Texte toujours lisible sur son fond.
- Le nom « ${spec.nom} » apparaît une fois, discret, en haut. Pas d'emoji à la place d'une icône de bouton (un jeu peut en utiliser pour ses pièces).
${spec.outil?.genre === "jeu" ? `JEU : plateau ou scène dessinés en CSS (grille, cercles, dégradés, ombres portées) ou sur un <canvas> ; règles JUSTES et complètes (tour du joueur, coups interdits refusés, victoire dans tous les sens, égalité, fin de partie annoncée clairement, pièces gagnantes mises en valeur) ; score et meilleur score gardés avec useMemoire ; bouton « Rejouer » ; clavier (flèches, espace) quand le jeu s'y prête, avec des boutons tactiles pour le téléphone ; adversaire ordinateur simple mais pas idiot si le jeu se joue à deux (choix « 2 joueurs » ou « contre l'ordinateur »). Toute boucle (requestAnimationFrame, setInterval) est arrêtée dans le retour du useEffect. Chaque case cliquable est un <button> avec un aria-label.` : `OUTIL : le résultat se met à jour à chaque saisie, sans bouton « Calculer » inutile ; valeurs de départ sensées pour que l'écran ne soit jamais vide ; le résultat principal est le plus gros élément de la page ; un bouton Copier quand c'est utile ; l'historique ou les favoris gardés avec useMemoire quand l'idée s'y prête ; saisies protégées (nombre vide ou négatif → 0, jamais « NaN » ni « undefined » à l'écran).`}
Règles : tout en français, tutoiement ou formulation neutre ; chaque bouton fait une vraie action ; valeurs par défaut partout (Number(x) || 0) ; aucun texte de remplissage.`;

/** Construction : la fiche de l'outil dans le brouillon, puis l'écriture de son unique écran dans sa propre invocation. */
export async function construireOutil(appId: string, p: any, lancerEcran: (id: string) => Promise<void>) {
  const ap = p.idee?.apercu ?? {};
  const court = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const hex = (x: unknown, d: string) => (/^#[0-9a-f]{6}$/i.test(String(x ?? "")) ? String(x) : d);
  const genre = ap.genre === "jeu" ? "jeu" : "outil";
  const parties = (Array.isArray(ap.ecrans) ? ap.ecrans : []).slice(0, 5);
  const spec: any = {
    type: "outil", nom: court(p.nom || ap.nom || "Mon outil", 40), pitch: court(ap.pitch, 220), cible: court(ap.cible, 90),
    slogan: court(ap.pitch, 90), couleur: hex(ap.ambiance?.accent, "#F59E0B"),
    outil: { genre, ambiance: { esprit: court(ap.ambiance?.esprit, 120), fond: hex(ap.ambiance?.fond, "#0F172A"), accent: hex(ap.ambiance?.accent, "#F59E0B") }, idee: court(p.idee?.texte, 400), precisions: (p.idee?.reponses ?? []).slice(0, 3).map((x: any) => `${court(x?.q, 120)} → ${court(x?.r, 160)}`) },
    ...(p.offert === true ? { offert: true } : {}),
    collections: [], demo: {}, formules: [], atouts: [], faq: [],
    ecrans: [{ id: "outil", titre: genre === "jeu" ? "Le jeu" : "L'outil", icone: "etoile", but: court(ap.pitch, 220), fonctions: parties.map((e: any) => `${court(e?.titre, 30)} : ${court(e?.role, 160)}`) }],
  };
  await admin.from("saas_apps").update({ brouillon: spec, etape: genre === "jeu" ? "Écriture du jeu" : "Écriture de l'outil", maj: new Date().toISOString() }).eq("id", appId);
  await lancerEcran("outil");
}
