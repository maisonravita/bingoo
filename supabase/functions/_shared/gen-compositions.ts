// Compositions signatures du premier écran (26/11) : six mises en scène de studio, inspirées des meilleures pages du
// moment (jamais recopiées : aucune marque, aucun texte, aucune image d'autrui). Le rendu est entièrement dans
// public/taste-system.css (classes hero-cine, hero-mot, hero-hublot, hero-lueur, hero-galerie, hero-bento) : l'IA écrit
// seulement la structure ci-dessous avec les vrais textes du membre. C'est ce qui rend le résultat fiable.
import type { TypeProjet } from "./design-fiches.ts";

export type Composition = {
  id: "cinema" | "mot-geant" | "hublot" | "lueur" | "galerie" | "bento";
  nom: string;
  /** Il faut une photo d'en-tête (générée ou du membre) */
  photo: boolean;
  /** La photo d'en-tête doit être détourée (sujet au premier plan, mot géant derrière) */
  detourage?: boolean;
  /** Consigne pour le prompt de la photo d'en-tête */
  image?: string;
  structure: string;
};

const HONNETE = "Tous les textes viennent du brief : aucun chiffre, prix, note, nombre de clients ou date inventés. Une ligne d'infos ou une carte sans fait réel du brief n'existe pas (retire-la).";

export const COMPOSITIONS: Record<Composition["id"], Composition> = {
  cinema: {
    id: "cinema", nom: "Cinéma", photo: true,
    image: "IMG_1 is the full-screen hero: a wide cinematic landscape or place at golden hour or blue hour, soft atmospheric haze, layered depth (foreground, middle, far horizon), calm open sky in the upper third for a large title, rich but natural colour grading, shot on a full-frame camera with a 35mm lens, ultra detailed.",
    structure: `<section id="hero" class="hero hero-cine">
  <img class="hero-cine__fond" src="IMG_1" alt="(la scène en une phrase)">
  <div class="hero-cine__contenu">
    <h1 class="hero-cine__titre"><span>(2 à 3 mots)</span><span>(2 à 3 mots, en italique automatiquement)</span><span>(1 à 3 mots)</span></h1>
    <div class="hero-cine__bas">
      <p>(une phrase concrète du brief, 20 à 30 mots)</p>
      <a class="btn btn--clair" href="#contact">(le bouton principal)</a>
    </div>
  </div>
</section>
Le h1 se lit comme une seule phrase coupée en trois lignes (« L'architecture / de vos chalets / à Annecy »). Rien d'autre dans ce premier écran.`,
  },
  "mot-geant": {
    id: "mot-geant", nom: "Mot géant", photo: true, detourage: true,
    image: "IMG_1 is the full-screen hero: ONE strong subject (a building, a house, a chalet, a mountain, a boat, an object) standing in the LOWER 60% of the frame, seen straight on at eye level, its top edge reaching about the middle of the image, with a clean open sky or plain backdrop above it. Blue hour or golden hour, warm interior lights if it is a building, crisp edges, high detail, full-frame camera, 24mm lens.",
    structure: `<section id="hero" class="hero hero-mot">
  <img class="hero-mot__fond" src="IMG_1" alt="(la scène en une phrase)">
  <p class="hero-mot__mot" aria-hidden="true" style="--lettres:N">(le nom du membre en minuscules, ou son mot le plus court s'il fait plus de 9 lettres ; N = son nombre de lettres)</p>
  <img class="hero-mot__sujet" src="IMG_6" alt="">
  <div class="hero-mot__carte">
    <span class="t-label">(la ville ou le métier, en 2 à 4 mots)</span>
    <h1>(ce qu'il fait et où, 9 mots au plus)</h1>
    <p>(un fait concret du brief, une ligne)</p>
    <a class="btn btn--clair" href="#contact">(le bouton principal)</a>
  </div>
  <p class="hero-mot__phrase">(une phrase qui donne envie, 15 à 25 mots)<br><a href="#(ancre de la section suivante)">(lien court) →</a></p>
</section>
IMG_6 est la même photo détourée (le sujet sans le ciel) : les deux images sont superposées exactement, le mot passe derrière le sujet. Ne change ni l'ordre ni les classes.`,
  },
  hublot: {
    id: "hublot", nom: "Hublot", photo: true,
    image: "IMG_1 is seen through a large panoramic window: an extraordinary wide view (sea horizon, mountain range, desert, lake, city at night, forest canopy) with a strong horizon line across the middle, dramatic but natural light, deep shadows, no window frame visible, full-frame camera, 50mm lens, cinematic colour grading.",
    structure: `<section id="hero" class="hero hero-hublot">
  <div class="hero-hublot__tete">
    <span class="t-label">(catégorie · ville, en capitales normales)</span>
    <h1>(promesse, 2 à 5 mots)<span class="discret">(la suite, 3 à 5 mots)</span></h1>
  </div>
  <figure class="hero-hublot__cadre"><img src="IMG_1" alt="(la vue en une phrase)"></figure>
  <div class="hero-hublot__bas">
    <p><strong>(titre court)</strong>(une phrase concrète du brief)</p>
    <div class="btn-row"><a class="btn btn--clair" href="#contact">(bouton principal)</a></div>
    <p><strong>(le nom)</strong>(téléphone ou ville du brief)</p>
  </div>
  <div class="hero-hublot__infos"><span>(fait réel 1, ex. la ville)</span><span>(fait réel 2, ex. les horaires du brief)</span><span>(fait réel 3)</span></div>
</section>
La ligne hero-hublot__infos n'a que des faits du brief (ville, horaires, téléphone, zone) ; s'il y en a moins de deux, retire-la.`,
  },
  lueur: {
    id: "lueur", nom: "Lueur", photo: false,
    structure: `<section id="hero" class="hero hero-lueur">
  <div class="hero-lueur__tete">
    <span class="hero-lueur__pilule">(un fait du brief : essai gratuit, sortie, public visé)</span>
    <h1>(la promesse du produit, 9 mots au plus)</h1>
    <p>(ce qu'il fait, concrètement, une phrase)</p>
    <div class="btn-row"><a class="btn btn--verre" href="#(ancre)">(second bouton)</a><a class="btn btn--clair" href="#essai">(bouton principal) →</a></div>
  </div>
  <div class="hero-lueur__arc" aria-hidden="true"></div>
  <div class="hero-lueur__ecran" role="img" aria-label="(l'écran principal du produit en une phrase)">
    <div class="ecran__cote"><b>(nom du produit)</b><span class="actif">(rubrique)</span><span>(rubrique)</span><span>(rubrique)</span><span>(rubrique)</span><span>(rubrique)</span></div>
    <div class="ecran__corps">
      <div class="ecran__haut"><strong>(titre de l'écran)</strong><span class="ecran__bouton">(action)</span></div>
      <div class="ecran__kpis"><div class="ecran__kpi"><small>(libellé)</small><strong>(valeur d'exemple)</strong></div> ×3, puis <div class="ecran__kpi ecran__kpi--fort">…</div></div>
      <div class="ecran__bloc"><svg viewBox="0 0 600 140">(une courbe ou des barres en path, stroke="currentColor")</svg></div>
      <div class="ecran__bloc ecran__lignes"><div><span>(élément)</span><span>(état)</span></div> ×4</div>
    </div>
  </div>
</section>
L'écran montre le VRAI usage du produit décrit (ses rubriques, ses objets : rendez-vous, recettes, dossiers…) avec des exemples plausibles, jamais des résultats présentés comme ceux du membre. Les boutons href="#essai" ouvrent l'inscription.`,
  },
  galerie: {
    id: "galerie", nom: "Galerie courbe", photo: true,
    image: "IMG_1, IMG_2 and IMG_3 are three different art-directed still lifes or details tied to the activity (materials, textures, tools, a corner of a space), each with ONE dominant colour, studio light, minimal composition, vertical framing, high detail.",
    structure: `<section id="hero" class="hero hero-galerie">
  <div class="hero-galerie__tete">
    <span class="t-label">(métier · ville)</span>
    <h1>(2 à 4 mots) <span class="discret">(2 à 4 mots)</span></h1>
    <p>(une phrase concrète du brief)</p>
    <div class="btn-row"><a class="btn btn--primary" href="#contact">(bouton principal)</a><a class="link" href="#(ancre)">(lien secondaire)</a></div>
  </div>
  <div class="hero-galerie__rail" aria-hidden="true"><div class="hero-galerie__piste">
    (EXACTEMENT 11 tuiles, dans cet ordre : 1 <figure class="tuile"><img src="IMG_1" alt=""></figure>, 2 <div class="tuile tuile--aplat">(mot du métier)</div>, 3 <div class="tuile tuile--cercles"></div>, 4 <figure class="tuile"><img src="IMG_2" alt=""></figure>, 5 <div class="tuile tuile--encre">(initiale)</div>, 6 <div class="tuile tuile--italique">(un mot)</div>, 7 <div class="tuile tuile--points"></div>, 8 <div class="tuile tuile--clair">01</div>, 9 <div class="tuile tuile--aplat">(mot)</div>, 10 <div class="tuile tuile--encre">(mot)</div>, 11 <figure class="tuile"><img src="IMG_3" alt=""></figure>)
  </div></div>
</section>
Les mots des tuiles : un ou deux mots courts du métier (jamais une phrase). Pas de légende chiffrée inventée.`,
  },
  bento: {
    id: "bento", nom: "Bento vivant", photo: false,
    structure: `<section id="hero" class="hero hero-bento">
  <div class="hero-bento__grille">
    <div class="hero-bento__texte">
      <span class="t-label">(ce que c'est, 2 à 4 mots)</span>
      <h1>(le nom ou la promesse, 2 à 4 mots)</h1>
      <p>(ce que le produit fait pour qui, une phrase)</p>
      <div class="hero-bento__pilules"><span>(fonction réelle)</span><span>(fonction réelle)</span><span>(fonction réelle)</span></div>
      <div class="btn-row" style="margin-top:28px"><a class="btn btn--primary" href="#essai">(bouton principal)</a></div>
    </div>
    <div class="hero-bento__widgets" role="img" aria-label="(les écrans du produit en une phrase)">
      (5 ou 6 widgets, un par fonction RÉELLE du produit, avec des exemples plausibles d'usage :
       <div class="widget widget--grand widget--vert"><div class="widget__titre">(titre)<span class="widget__pastille">(état)</span></div><div class="widget__valeur">(valeur)<small>(unité)</small></div><svg viewBox="0 0 300 90"><path class="trace" d="(courbe)"/></svg></div>
       <div class="widget widget--large widget--ambre">… <div class="widget__barres"><span style="--h:40%"></span>… <span class="fort" style="--h:90%"></span></div></div>
       <div class="widget widget--petit widget--violet">… <div class="widget__anneau" style="--p:72">72 %</div></div>
       <div class="widget widget--petit widget--nuit"><div class="widget__titre">(titre)<i class="widget__point"></i></div>…</div>
       Teintes possibles : widget--vert, --ambre, --rouge, --violet, --bleu, --nuit, --marque ; tailles : widget--grand (3×2), widget--large (3×1), widget--petit (2×1) ; la grille fait 6 colonnes, remplis-la sans trou.)
    </div>
  </div>
</section>
Chaque widget correspond à une fonction décrite dans le brief ; les valeurs sont des exemples d'usage, jamais des résultats du membre.`,
  },
};

/** Le choix se fait dans le code (jamais deux fois la même chose de suite) selon le genre d'activité et les images possibles. */
export function choisirComposition(o: { type: TypeProjet; texte: string; images: boolean; aleatoire?: () => number }): Composition | null {
  const t = o.texte.toLowerCase();
  const r = o.aleatoire ?? Math.random;
  let liste: Composition["id"][];
  if (o.type === "software") liste = /\b(widget|suivi|sant[ée]|sport|m[ée]t[ée]o|finance|budget|habitude|tableau de bord|dashboard|statisti)/.test(t) ? ["bento", "bento", "lueur"] : ["lueur", "lueur", "bento"];
  else if (!o.images) return null;
  else if (/(immobili|architect|maison|villa|chalet|h[ôo]tel|g[îi]te|r[ée]sidence|domaine|ch[âa]teau|construct|b[âa]tisseur)/.test(t)) liste = ["mot-geant", "mot-geant", "cinema"];
  else if (/(vin|vign|domaine|campagne|ferme|nature|montagne|randonn|mer|plage|voyage|s[ée]jour|retraite|yoga|spa|bien-[êe]tre|jardin|paysag)/.test(t)) liste = ["cinema", "cinema", "hublot"];
  else if (/(voyage|exp[ée]dition|croisi|observatoire|astronom|plong|navig|voile|vol |montgolfi|aventure|nuit|club|studio d'enregistrement)/.test(t)) liste = ["hublot", "cinema"];
  else if (/(design|graphi|studio|agence|cr[ée]ati|photograph|illustrat|c[ée]ramiq|artisan|atelier|marque|mode|bijou|architecte d'int)/.test(t)) liste = ["galerie", "galerie", "cinema"];
  else liste = o.type === "product" ? ["galerie", "cinema"] : ["cinema", "hublot", "galerie"];
  return COMPOSITIONS[liste[Math.floor(r() * liste.length)]];
}

export function consigneComposition(c: Composition): string {
  return `## Premier écran imposé : composition « ${c.nom} » (passe avant toute autre règle de premier écran, y compris « aucun effet » des fiches)
Écris la section hero EXACTEMENT avec cette structure et ces classes (le rendu, les animations et le téléphone sont déjà réglés par system.css :
n'ajoute AUCUNE balise <style> à cette section, ne change aucune classe, n'ajoute rien d'autre) :
${c.structure}
${HONNETE}
L'en-tête (nav) reste celui du kit : il devient transparent tout seul au-dessus de ce premier écran.
La section juste après le premier écran est calme (fond de page, beaucoup d'air, un grand texte ou une photo large) pour laisser respirer cette ouverture.`;
}

/** La section hero d'une composition : aucune feuille de style ni style écrit à la main (le kit fait tout) ; seules les
 *  variables de réglage (--lettres, --h, --p) restent. Sans cela l'IA réécrit la mise en page et casse la composition. */
export function nettoyerHeroCompo(html: string): string {
  return String(html ?? "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\sstyle\s*=\s*("|')([^"']*)\1/gi, (_m, q, css) => { const garde = String(css).split(";").map((x) => x.trim()).filter((x) => /^--(lettres|h|p)\s*:/.test(x)); return garde.length ? ` style=${q}${garde.join(";")}${q}` : ""; });
}
const CLES: Record<Composition["id"], string[]> = {
  cinema: ["hero-cine__fond", "hero-cine__titre", "hero-cine__bas"],
  "mot-geant": ["hero-mot__fond", "hero-mot__mot", "hero-mot__carte"],
  hublot: ["hero-hublot__tete", "hero-hublot__cadre", "hero-hublot__bas"],
  lueur: ["hero-lueur__tete", "hero-lueur__arc", "hero-lueur__ecran"],
  galerie: ["hero-galerie__tete", "hero-galerie__piste", "tuile"],
  bento: ["hero-bento__texte", "hero-bento__widgets", "widget"],
};
/** Ce qui manque à la structure imposée (vide si tout y est) */
export function controlerCompo(c: Composition, html: string): string[] {
  const manque = [`hero-${{ cinema: "cine", "mot-geant": "mot", hublot: "hublot", lueur: "lueur", galerie: "galerie", bento: "bento" }[c.id]}`, ...CLES[c.id]].filter((k) => !new RegExp(`class="[^"]*\\b${k}\\b`).test(html));
  return manque.length ? [`Composition « ${c.nom} » non respectée : il manque ${manque.join(", ")}. Reprends EXACTEMENT la structure imposée, sans <style>.`] : [];
}
