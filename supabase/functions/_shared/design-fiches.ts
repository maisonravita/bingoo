// Règles courtes par type de projet, extraites de Taste Skill (licence MIT, vendor/taste-skill : SKILL.md §1-2,
// references/layout-v4.md, sections.md, copy.md, copy-tells.md) et adaptées à Bingoo! : nos pages sont des gabarits
// faits main, l'IA n'en écrit que le contenu. Jamais les ~5 800 lignes d'origine dans une génération : une fiche
// (≈ 15 lignes) selon le type. Palette et polices viennent d'UI UX Pro Max (design.ts) ; la mise en page et la
// finition viennent d'ici. Les règles de démo de Taste (faux noms, contacts .example) ne sont PAS reprises : les
// membres utilisent leurs vraies coordonnées et leur vrai nom.

export type TypeProjet = "software" | "product" | "service" | "place";

/** Taste §1 : le genre d'activité décide de tout. */
export function typeDeProjet(p: { site?: boolean; modele?: string; metier?: string; idee?: string }): TypeProjet {
  if (!p.site) return "software";
  if (p.modele === "lancement") return "software";
  const t = `${p.metier ?? ""} ${p.idee ?? ""}`.toLowerCase();
  // Préfixes (pas de \b final : « boulangerie », « créatrice »…) ; un fabricant qui ouvre sa porte ou donne des cours est un lieu
  if (/(^|[^a-zà-ÿ])(caf[ée]s?\b|bars?\b|salons? de|barbi|boulang|p[âa]tiss|restaura|traiteur|h[ôo]tel|g[îi]te|chambres? d'h[ôo]te|boutique|magasin|fleuris|salle de sport|studio de (yoga|pilates|danse)|librair|[ée]picer|caviste|cave à)/.test(t)) return "place";
  if (/(^|[^a-zà-ÿ])(cr[ée]at(eur|rice)|fabrica|marque de|produits?\b|vend|e-?shop|boutique en ligne|bijou|c[ée]ramiqu|savon|bougie|v[êe]tement)/.test(t)) return "product";
  return "service";
}

const COMMUN = `- Une seule action principale par écran ; le même style de bouton partout.
- Les vraies informations du membre seulement (nom choisi, ville, prix, horaires, coordonnées) ; aucun chiffre, avis, client ou date inventé.
- Une phrase = un fait. Les titres disent ce que contient la section (pas de « X. Y. » en deux fragments, pas de paire de chiffres).`;

export const FICHES: Record<TypeProjet, string> = {
  place: `RÈGLES DE PAGE · LIEU (on vient chez lui) :
- Les photos mènent : la devanture, la salle, ce qu'on y sert ou vend ; la photo d'en-tête dès qu'un cadre s'y prête.
- Dès le deuxième écran : venir (adresse, horaires, accès) ; puis l'offre, puis le lieu, puis réserver ou commander.
- Fonds unis, photos carrées, aucun effet, aucun dégradé, aucune animation de fond ; un seul moment typographique (le nom ou l'adresse en grand).
- Listes et menus en 16 px ; les prix dans la phrase ou la liste, jamais en bandeau de chiffres.
${COMMUN}`,
  service: `RÈGLES DE PAGE · SERVICE (on fait appel à lui) :
- Les photos mènent : la personne, le travail réalisé, le cadre ; deux visuels différents au moins par écran sur le portfolio.
- Ordre : ce qu'il fait et pour qui, les prestations avec prix, le travail réalisé, comment se passe une demande, le contact.
- Fonds unis et une seule bande de couleur de marque ; aucun effet, grain, dégradé ou animation de fond.
- Un même visuel n'apparaît jamais deux fois ; un fait n'est jamais répété.
${COMMUN}`,
  product: `RÈGLES DE PAGE · PRODUIT (on achète une chose) :
- Le produit en grand, entier, dans son cadre ; une image différente par section ; chaque promesse du titre montrée en image.
- Ordre : le produit, ce qui le distingue, les variantes (chaque couleur montrée une fois), le prix, comment l'obtenir.
- Fonds unis, aucune scène ni animation de fond ; un seul fond contrastant sur la page.
${COMMUN}`,
  software: `RÈGLES DE PAGE · LOGICIEL (application, SaaS, lancement) :
- Le vrai produit mène : son interface réelle en HTML montrant ce sur quoi il travaille, à taille lisible ; jamais un tableau de bord générique.
- 60 à 80 mots par écran hors captures de l'interface ; un seul effet visuel sur toute la page, un ou deux moments au plus.
- Ordre : la promesse en une phrase, le produit en action, trois usages concrets, le prix ou l'inscription.
${COMMUN}`,
};

/** Écrans d'application (SaaS) : PAS les règles de site vitrine, seulement les règles générales d'interface. */
export const FICHE_ECRANS = `RÈGLES D'ÉCRANS D'APPLICATION :
- Un seul système de design (couleurs et polices imposées) ; marges égales ; espacements sur une échelle de 4 px.
- Zones tactiles de 44 px minimum ; tout ce qui se clique a un curseur pointeur et un focus visible au clavier.
- États vides soignés : une phrase qui dit quoi faire et le bouton pour le faire, jamais un tableau vide.
- Textes en français, sans jargon ; aucun texte ni badge coupé ; rien ne déborde à 390 px.`;

// ---------------------------------------------------------------- Copy-lint français (plan ET robot)
// Équivalent français de copy-lint.mjs / copy-tells.md (Taste) : ce qui trahit un texte écrit par une IA.
// Une seule source (src/lib/controlesDesign.js) : le plan, le robot de la page et le robot du serveur appliquent les mêmes règles
import { lintFr as lintFrSource } from "../../../src/lib/controlesDesign.js";
export type Accroc = { regle: string; extrait: string };
export const lintFr = (texte: string, corps = true): Accroc[] => lintFrSource(texte, corps);
const INTERDITS = ["révolutionnaire", "sans effort", "de pointe", "incontournable", "booster", "propulser", "sublimer", "à la pointe"];

/** Rappel court donné au plan (les mêmes règles que le contrôle du robot). */
export const CONSIGNE_TEXTES_FR = `TEXTES (français, contrôlés par le robot) : jamais ${INTERDITS.slice(0, 8).map((m) => `« ${m} »`).join(", ")}, ni « à portée de main », « en quelques clics », « Que vous soyez… ou… », « Dites adieu à… », « au cœur de » ; pas de tirets cadratins en série ; pas de point d'exclamation dans les phrases ; aucun reste de modèle ([Nom], lorem, {{…}}, « Je suis application de… »). Écris des faits précis venus de la demande du membre.`;
