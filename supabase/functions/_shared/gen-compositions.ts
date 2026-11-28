// Compositions signatures du premier écran (26/11) : six mises en scène de studio, inspirées des meilleures pages du
// moment (jamais recopiées : aucune marque, aucun texte, aucune image d'autrui). Le rendu est entièrement dans
// public/taste-system.css (classes hero-cine, hero-mot, hero-hublot, hero-lueur, hero-galerie, hero-bento) : l'IA écrit
// seulement la structure ci-dessous avec les vrais textes du membre. C'est ce qui rend le résultat fiable.
import type { TypeProjet } from "./design-fiches.ts";

export type Composition = {
  id: "cinema" | "mot-geant" | "hublot" | "lueur" | "galerie" | "bento" | "affiche" | "carte" | "ruban" | "moitie" | "arche" | "bandeau" | "paysage" | "vitrine-duo" | "horizon" | "mosaique";
  nom: string;
  /** Il faut une photo d'en-tête (générée ou du membre) */
  photo: boolean;
  /** Nombre de photos du premier écran (1 par défaut, 3 pour la galerie et la mosaïque) */
  nbImages?: number;
  /** La photo d'en-tête doit être détourée (sujet au premier plan, mot géant derrière) */
  detourage?: boolean;
  /** Consigne pour le prompt de la photo d'en-tête */
  image?: string;
  structure: string;
};

const HONNETE = "Tous les textes viennent du brief : aucun chiffre, prix, note, nombre de clients, date, zone ou rayon d'intervention inventés (pas de « partout en France » si le brief ne le dit pas). Une ligne d'infos ou une carte sans fait réel du brief n'existe pas (retire-la).";

export const COMPOSITIONS: Record<Composition["id"], Composition> = {
  // 28 nov. 2026 : image sombre plein cadre, lumière à droite ; badge, titre fin sur 3 lignes et bouton en haut à gauche ; phrase et preuve en bas à gauche
  horizon: {
    id: "horizon", nom: "Horizon", photo: true,
    image: "IMG_1 is a wide cinematic artwork, dark on the left third (near black with a few faint stars) so white text reads there, and on the right a huge luminous curved wall of light with streaks of coral red, orange and pale cyan bleeding like an aurora into bright white, above a calm reflective water surface; one small lone figure in a simple rounded helmet walking towards the camera on the water in the middle right, reflected below, dreamy, high contrast, soft film grain, no text, no logo.",
    structure: `<section id="hero" class="hero hero-horizon">
  <img class="hero-horizon__fond" src="IMG_1" alt="(l'image en une phrase)">
  <div class="hero-horizon__haut">
    <p class="hero-horizon__badge">(une accroche courte, 3 à 5 mots)</p>
    <h1 class="hero-horizon__titre">(ce qu'il propose, 6 à 9 mots, sur trois lignes)</h1>
    <a class="btn hero-horizon__btn" href="#contact">(le bouton principal, 2 mots)</a>
  </div>
  <div class="hero-horizon__bas">
    <p>(ce que fait le produit ou le service, 15 à 25 mots)</p>
    <p class="hero-horizon__preuve"><span class="hero-horizon__ronds" aria-hidden="true"><i></i><i></i><i></i><i></i></span>(une preuve tirée du brief, sinon retire ce paragraphe)</p>
  </div>
</section>`,
  },
  // 28 nov. 2026 : texte à gauche, deux visuels carrés qui se chevauchent à droite, chiffres sous les boutons (galerie, boutique)
  "vitrine-duo": {
    id: "vitrine-duo", nom: "Vitrine en duo", photo: true,
    image: "IMG_1 is a square studio render: one soft abstract 3D sculpture (stacked translucent discs, frosted glass and matte ceramic) in pastel peach, sky blue and pearl white, floating on a pale pastel gradient background, soft diffused light, gentle shadows, centered, minimal, premium, no text, no logo.",
    structure: `<section id="hero" class="hero hero-duo">
  <div class="hero-duo__texte">
    <h1 class="hero-duo__titre">(ce qu'il propose, 4 à 6 mots, sur deux lignes)</h1>
    <p>(une phrase concrète, 15 à 25 mots, un chiffre en <b>gras</b> si le brief en donne un)</p>
    <div class="hero-duo__btns"><a class="btn btn--primary" href="#contact">(bouton principal)</a><a class="btn btn--ghost" href="#contact">(bouton secondaire)</a></div>
    <dl class="hero-duo__chiffres"><div><dt>(chiffre)</dt><dd>(ce qu'il compte)</dd></div><div><dt>(chiffre)</dt><dd>(…)</dd></div><div><dt>(chiffre)</dt><dd>(…)</dd></div></dl>
  </div>
  <div class="hero-duo__visuels" aria-hidden="true">
    <img class="hero-duo__un" src="IMG_1" alt="">
    <span class="hero-duo__deux"></span>
    <span class="hero-duo__points"></span>
  </div>
</section>
Les chiffres viennent du brief ; sans chiffre dans le brief, retire le bloc dl.`,
  },
  // 28 nov. 2026 : paysage illustré plein cadre (titre centré, bouton vert), le bas de l'illustration se fond dans la page
  paysage: {
    id: "paysage", nom: "Paysage illustré", photo: true,
    image: "IMG_1 is a FLAT VECTOR ILLUSTRATION, not a photograph: a wide digital landscape artwork in a modern flat illustration style, layered stylised mountains in deep teal, pine green and sage green, a pale minty sky with a few soft rounded cream clouds near the top, a bright green valley in the middle third with a winding light path and a few small simple buildings matching the activity, rows of dark rounded pine trees framing the left and right edges, the whole lower quarter getting darker and ending in a deep forest green (#173B34) so it melts into a dark page, clean vector shapes, subtle grain, calm, no people, no text, no logo.",
    structure: `<section id="hero" class="hero hero-paysage">
  <img class="hero-paysage__fond" src="IMG_1" alt="(le paysage en une phrase)">
  <div class="hero-paysage__contenu">
    <h1 class="hero-paysage__titre">(ce qu'il propose, 5 à 8 mots, sur deux lignes)</h1>
    <p>(une phrase concrète du brief, 15 à 25 mots)</p>
    <a class="btn btn--primary hero-paysage__btn" href="#contact">(le bouton principal)</a>
  </div>
</section>
Le titre est centré, en deux lignes de longueur proche. Rien d'autre dans ce premier écran.`,
  },
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
    id: "galerie", nom: "Galerie courbe", photo: true, nbImages: 3,
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
Les mots des tuiles : un mot court et réel du métier, 7 lettres au plus (jamais une phrase, jamais les mots « mot », « initiale » ou un texte entre parenthèses de ce modèle). Pas de légende chiffrée inventée.`,
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
Chaque widget correspond à une fonction décrite dans le brief ; les valeurs sont des exemples d'usage, jamais des résultats du membre. widget__valeur ne contient qu'un nombre, une heure ou un mot court (8 lettres au plus), jamais une phrase ; une phrase va dans widget__note. Remplis exactement les 6 colonnes : par exemple 1 grand (3×2) + 2 larges (3×1), puis 3 petits (2×1).`,
  },
  // ---- Sans photo : restauration et métiers où l'on n'invente pas d'image, ou quand le membre n'en a pas encore
  affiche: {
    id: "affiche", nom: "Affiche", photo: false,
    structure: `<section id="hero" class="hero hero-affiche">
  <div class="hero-affiche__formes" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="hero-affiche__haut"><span class="t-label">(métier · ville)</span><span class="t-label">(un fait réel du brief : horaires, quartier, spécialité ; sinon retire ce span)</span></div>
  <h1 class="hero-affiche__titre"><span>(2 à 3 mots)</span><span>(2 à 3 mots)</span></h1>
  <div class="hero-affiche__bas">
    <p>(une phrase concrète du brief, 15 à 25 mots)</p>
    <div class="btn-row"><a class="btn btn--clair" href="#contact">(bouton principal)</a><a class="link" href="#(ancre de la section suivante)">(lien court)</a></div>
  </div>
</section>
Une affiche typographique sur la couleur de la marque : le titre est énorme et court (6 mots au plus en tout). Aucune image.`,
  },
  carte: {
    id: "carte", nom: "Carte", photo: false,
    structure: `<section id="hero" class="hero hero-carte">
  <div class="hero-carte__texte">
    <span class="t-label">(métier · ville)</span>
    <h1>(la promesse, 3 à 7 mots)</h1>
    <p>(une phrase concrète du brief)</p>
    <div class="btn-row"><a class="btn btn--primary" href="#contact">(bouton principal)</a><a class="link" href="#(ancre)">(lien secondaire)</a></div>
  </div>
  <div class="hero-carte__papier">
    <p class="hero-carte__entete">(« La carte », « Nos prestations », « Nos tarifs »… selon le métier)</p>
    <ul>
      <li><span>(un plat, un produit ou une prestation RÉELLE du brief)</span><i></i><b>(son prix s'il est dans le brief, sinon rien)</b></li>
      (3 à 6 lignes en tout, uniquement ce que le brief cite)
    </ul>
    <p class="hero-carte__pied">(un fait réel : horaires, adresse ou « sur réservation » si le brief le dit ; sinon retire ce paragraphe)</p>
  </div>
</section>
La carte ne liste QUE des éléments du brief, avec leur prix seulement s'il est donné (sinon la balise <b> reste vide). S'il y a moins de 3 éléments, écris à la place les grandes familles de l'offre citées par le brief. Aucune image.`,
  },
  ruban: {
    id: "ruban", nom: "Ruban", photo: false,
    structure: `<section id="hero" class="hero hero-ruban">
  <div class="hero-ruban__tete">
    <span class="t-label">(métier · ville)</span>
    <h1>(le nom du membre)</h1>
    <p>(ce qu'il fait et pour qui, une phrase)</p>
    <div class="btn-row"><a class="btn btn--clair" href="#contact">(bouton principal)</a></div>
  </div>
  <div class="hero-ruban__bandes" aria-hidden="true">
    <div class="hero-ruban__bande"><div class="hero-ruban__piste"><span>(mot du métier)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span></div></div>
    <div class="hero-ruban__bande hero-ruban__bande--b"><div class="hero-ruban__piste"><span>(mot)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span><span>(mot)</span></div></div>
  </div>
</section>
Les mots des rubans : 12 mots courts et réels de l'activité (spécialités, gestes, produits, quartiers cités), 14 lettres au plus chacun, jamais de chiffre inventé. Aucune image.`,
  },
  // ---- Avec photo : de nouvelles familles de métiers
  moitie: {
    id: "moitie", nom: "Moitié", photo: true,
    image: "IMG_1 is a vertical editorial photograph for the right half of a website: the place, the workspace, the tools or the materials of the activity, natural window light, calm composition with one clear subject, shallow depth of field, warm and honest colours, full-frame camera, 50mm lens, no people facing the camera, no text.",
    structure: `<section id="hero" class="hero hero-moitie">
  <div class="hero-moitie__texte">
    <span class="t-label">(métier · ville)</span>
    <h1>(la promesse, 4 à 9 mots)</h1>
    <p>(une phrase concrète du brief)</p>
    <div class="btn-row"><a class="btn btn--primary" href="#contact">(bouton principal)</a><a class="link" href="#(ancre)">(lien secondaire)</a></div>
    <ul class="hero-moitie__faits"><li><b>(fait réel 1, ex. la ville)</b>(précision)</li><li><b>(fait réel 2)</b>(précision)</li></ul>
  </div>
  <figure class="hero-moitie__photo"><img src="IMG_1" alt="(la scène en une phrase)"></figure>
</section>
hero-moitie__faits n'a que des faits du brief (ville, horaires, téléphone, spécialité) ; s'il y en a moins de deux, retire la liste.`,
  },
  arche: {
    id: "arche", nom: "Arche", photo: true,
    image: "IMG_1 is a vertical photograph framed for an arch-shaped window: the activity's OWN place or tools (for a hair salon: a styling chair and mirror; for a spa: a treatment room; for a yoga studio: mats in a calm room; a pool or a villa ONLY for a hotel or a spa that has one), soft diffused light, pastel and natural tones, one clear subject in the centre, calm and luxurious, full-frame camera, 35mm lens, no text.",
    structure: `<section id="hero" class="hero hero-arche">
  <span class="t-label hero-arche__label">(métier · ville)</span>
  <h1 class="hero-arche__titre"><span>(2 à 3 mots)</span><span>(2 à 3 mots)</span></h1>
  <figure class="hero-arche__cadre"><img src="IMG_1" alt="(la scène en une phrase)"></figure>
  <div class="hero-arche__bas">
    <p>(une phrase concrète du brief)</p>
    <a class="btn btn--primary" href="#contact">(bouton principal)</a>
  </div>
</section>
Le titre se lit comme une seule phrase coupée en deux ; la photo passe sous la deuxième ligne. Rien d'autre dans ce premier écran.`,
  },
  bandeau: {
    id: "bandeau", nom: "Bandeau", photo: true,
    image: "IMG_1 is a very wide panoramic photograph of the activity's world: a workshop, a work site, a vehicle bay, a sports hall, a storefront street or a landscape, strong horizontal composition, clean and well lit, realistic, no people facing the camera, no text, no logo, full-frame camera, 24mm lens.",
    structure: `<section id="hero" class="hero hero-bandeau">
  <div class="hero-bandeau__haut">
    <div><span class="t-label">(métier · ville)</span><h1>(la promesse, 4 à 9 mots)</h1></div>
    <div class="hero-bandeau__action"><p>(une phrase concrète du brief)</p><div class="btn-row"><a class="btn btn--primary" href="#contact">(bouton principal)</a></div></div>
  </div>
  <figure class="hero-bandeau__photo"><img src="IMG_1" alt="(la scène en une phrase)"><figcaption><b>(fait réel, ex. la ville ou le téléphone du brief)</b><span>(précision courte)</span></figcaption></figure>
</section>
Le figcaption n'a qu'un fait réel du brief ; sans fait, retire le figcaption.`,
  },
  mosaique: {
    id: "mosaique", nom: "Mosaïque", photo: true, nbImages: 3,
    image: "IMG_1, IMG_2 and IMG_3 are three different photographs of the activity's world (the place, a detail of materials, an atmosphere), consistent colour grading between them, natural light, one clear subject each, no people facing the camera, no text, full-frame camera.",
    structure: `<section id="hero" class="hero hero-mosaique">
  <div class="hero-mosaique__texte">
    <span class="t-label">(métier · ville)</span>
    <h1>(la promesse, 3 à 7 mots)</h1>
    <p>(une phrase concrète du brief)</p>
    <div class="btn-row"><a class="btn btn--primary" href="#contact">(bouton principal)</a><a class="link" href="#(ancre)">(lien secondaire)</a></div>
  </div>
  <div class="hero-mosaique__grille">
    <figure><img src="IMG_1" alt="(une phrase)"></figure>
    <figure><img src="IMG_2" alt="(une phrase)"></figure>
    <figure><img src="IMG_3" alt="(une phrase)"></figure>
    <p class="hero-mosaique__mot">(un mot du métier, 10 lettres au plus)</p>
  </div>
</section>
Trois photos différentes, dans cet ordre. Rien d'autre dans ce premier écran.`,
  },
};

/** Les mises en scène qui vont à une activité, de la plus adaptée à la moins (une valeur répétée pèse plus au tirage). */
function listePour(type: TypeProjet, a: (...m: string[]) => boolean, images: boolean): Composition["id"][] | null {
  const bouche = a("restaura", "bistro", "brasser", "caf[ée]", "bar\\b", "traiteur", "boulang", "p[âa]tiss", "[ée]picer", "fromag", "boucher", "chocolat", "glac", "pizz", "burger", "sushi", "cr[êe]pe", "food", "cuisin", "chef\\b", "cave\\b", "caviste", "bi[èe]re", "brunch", "salon de th[ée]");
  if (type === "software") return a("widget", "suivi", "sant[ée]", "sport", "m[ée]t[ée]o", "finance", "budget", "habitude", "tableau de bord", "dashboard", "statisti", "sommeil") ? ["bento", "bento", "lueur"] : a("communaut", "[ée]v[ée]nement", "festival", "billet", "musique", "jeu", "[ée]tudiant", "association") ? ["affiche", "lueur", "bento"] : ["lueur", "lueur", "bento"];
  // Sans photo possible (restauration sans photos du membre, image indisponible) : affiche, carte ou rubans
  if (!images) {
    if (bouche) return ["carte", "carte", "affiche", "ruban"];
    if (a("coiff", "barbier", "esth[ée]t", "institut", "onglerie", "massage", "spa\\b", "tarif")) return ["carte", "affiche", "ruban"];
    return ["affiche", "affiche", "ruban", "ruban"];
  }
  // Avec photo : chaque famille de métier a ses mises en scène
  if (bouche) return ["mosaique", "mosaique", "moitie", "bandeau"];
  if (a("design", "graphi", "studio de (design|cr[ée]a)", "agence (de )?(cr[ée]a|com|design)", "photograph", "illustrat", "c[ée]ramiq", "typograph", "identit[ée]s? visuel", "bijou", "mode\\b", "cr[ée]atri", "cr[ée]ateur")) return ["galerie", "galerie", "mosaique", "hublot"];
  if (a("coiff", "barbier", "esth[ée]t", "institut", "onglerie", "massage", "spa\\b", "bien-[êe]tre", "yoga", "pilates", "sophro", "naturo", "beaut[ée]", "maquill", "soin")) return ["arche", "arche", "moitie", "cinema"];
  if (a("avocat", "notaire", "juris", "cabinet", "comptab", "expert", "conseil", "consult", "m[ée]decin", "docteur", "kin[ée]", "ost[ée]o", "dentist", "psych", "th[ée]rap", "infirmi", "pharmac", "v[ée]t[ée]rin", "coach", "formation", "assurance", "banque", "patrimoine", "recrut")) return ["moitie", "moitie", "bandeau", "arche"];
  if (a("plomb", "[ée]lectric", "chauffag", "garage", "m[ée]canique", "carross", "menuis", "charpent", "peintre", "peinture", "couvr", "toiture", "ma[çc]on", "serrur", "vitri", "nettoyage", "m[ée]nage", "d[ée]m[ée]nag", "jardinier", "[ée]lagu", "artisan", "r[ée]novation", "travaux", "btp", "auto[- ]?[ée]cole", "taxi", "vtc", "transport", "livraison", "salle de sport", "fitness", "musculation", "club", "conciergerie")) return ["bandeau", "bandeau", "moitie", "cinema"];
  if (a("immobili", "architect", "villa", "chalet", "h[ôo]tel", "g[îi]te", "r[ée]sidence", "domaine", "ch[âa]teau", "construct", "b[âa]tisseur", "vign", "ferme", "maison d'h[ôo]tes", "chambre d'h[ôo]tes")) return ["mot-geant", "mot-geant", "cinema", "arche"];
  if (a("voyage", "exp[ée]dition", "croisi", "observatoire", "astronom", "plong", "navig", "voile\\b", "aventure", "aurore", "fjord", "safari")) return ["hublot", "hublot", "cinema"];
  if (a("vins?\\b", "campagne\\b", "nature", "montagne", "randonn", "mer\\b", "plage", "s[ée]jour", "retraite", "jardin", "paysag", "camping")) return ["cinema", "cinema", "hublot", "bandeau"];
  if (a("boutique", "magasin", "fleur", "d[ée]co", "mariage", "[ée]v[ée]nement", "traiteur", "cadeau", "librair", "galerie d'art", "artisanat", "cr[ée]ation")) return ["mosaique", "mosaique", "galerie", "arche"];
  return type === "product" ? ["galerie", "mosaique", "cinema"] : ["cinema", "moitie", "bandeau", "hublot", "arche", "mosaique"];
}

/** Le choix se fait dans le code (jamais deux fois la même chose de suite) selon le genre d'activité et les images possibles. */
export function choisirComposition(o: { type: TypeProjet; texte: string; images: boolean; aleatoire?: () => number }): Composition | null {
  const t = ` ${o.texte.toLowerCase()} `;
  const r = o.aleatoire ?? Math.random;
  // Début de mot obligatoire (« mer » ne doit pas se trouver dans « premier », ni « vin » dans « province »)
  const a = (...mots: string[]) => new RegExp(`(?:^|[^a-zà-ÿ])(?:${mots.join("|")})`).test(t);
  const liste = listePour(o.type, a, o.images);
  if (!liste) return null;
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
  horizon: ["hero-horizon__fond", "hero-horizon__titre", "hero-horizon__bas"],
  "vitrine-duo": ["hero-duo__titre", "hero-duo__visuels", "hero-duo__un"],
  paysage: ["hero-paysage__fond", "hero-paysage__titre", "hero-paysage__btn"],
  cinema: ["hero-cine__fond", "hero-cine__titre", "hero-cine__bas"],
  "mot-geant": ["hero-mot__fond", "hero-mot__mot", "hero-mot__carte"],
  hublot: ["hero-hublot__tete", "hero-hublot__cadre", "hero-hublot__bas"],
  lueur: ["hero-lueur__tete", "hero-lueur__arc", "hero-lueur__ecran"],
  galerie: ["hero-galerie__tete", "hero-galerie__piste", "tuile"],
  bento: ["hero-bento__texte", "hero-bento__widgets", "widget"],
  affiche: ["hero-affiche__titre", "hero-affiche__bas"],
  carte: ["hero-carte__texte", "hero-carte__papier"],
  ruban: ["hero-ruban__tete", "hero-ruban__bande", "hero-ruban__piste"],
  moitie: ["hero-moitie__texte", "hero-moitie__photo"],
  arche: ["hero-arche__titre", "hero-arche__cadre", "hero-arche__bas"],
  bandeau: ["hero-bandeau__haut", "hero-bandeau__photo"],
  mosaique: ["hero-mosaique__texte", "hero-mosaique__grille"],
};
/** La classe principale de chaque mise en scène (hero-cine pour Cinéma…) */
export const CLASSE_COMPO: Record<Composition["id"], string> = { cinema: "hero-cine", "mot-geant": "hero-mot", hublot: "hero-hublot", lueur: "hero-lueur", galerie: "hero-galerie", bento: "hero-bento", affiche: "hero-affiche", carte: "hero-carte", ruban: "hero-ruban", moitie: "hero-moitie", arche: "hero-arche", bandeau: "hero-bandeau", mosaique: "hero-mosaique" };
/** Ce qui manque à la structure imposée (vide si tout y est) */
export function controlerCompo(c: Composition, html: string): string[] {
  const manque = [CLASSE_COMPO[c.id], ...CLES[c.id]].filter((k) => !new RegExp(`class="[^"]*\\b${k}\\b`).test(html));
  return manque.length ? [`Composition « ${c.nom} » non respectée : il manque ${manque.join(", ")}. Reprends EXACTEMENT la structure imposée, sans <style>.`] : [];
}

// ---------------------------------------------------------------- Sections signatures (le bas de page)
export type MiseSection = "recit" | "manifeste" | "liste" | "duo" | "etapes";
export const SECTIONS: Record<MiseSection, { nom: string; photo: boolean; structure: string }> = {
  recit: { nom: "Récit photo", photo: true, structure: `<section id="ID" class="s-recit">
  <img src="IMG_n" alt="(la scène en une phrase)">
  <div class="s-recit__texte"><span class="t-label">(2 à 4 mots)</span><h2>(phrase forte, 4 à 9 mots)</h2><p>(deux phrases concrètes du brief)</p></div>
</section>` },
  manifeste: { nom: "Manifeste", photo: false, structure: `<section id="ID" class="section s-manifeste"><div class="wrap">
  <span class="t-label">(2 à 4 mots)</span>
  <h2>(une phrase de 10 à 18 mots qui dit la promesse, avec UN fragment de 2 à 4 mots dans <em>…</em>)</h2>
  <div class="s-manifeste__pied"><p>(une ou deux phrases concrètes du brief)</p><a class="btn btn--primary" href="#contact">(action)</a></div>
</div></section>` },
  liste: { nom: "Liste éditoriale", photo: false, structure: `<section id="ID" class="section s-liste"><div class="wrap">
  <div class="s-liste__tete"><h2>(titre de la section)</h2><p>(une phrase)</p></div>
  <div class="s-liste__ligne"><span class="s-liste__num">01</span><h3>(élément réel du brief)</h3><p>(ce que c'est, une ou deux phrases)</p></div>
  (2 à 5 lignes en tout, une par élément réel du brief. Si la section porte le marqueur services : n'écris AUCUNE ligne, le marqueur affiche déjà les prestations ; pose seulement <div data-bingoo="services"></div> sous la tête de section)
</div></section>` },
  duo: { nom: "Duo photo", photo: true, structure: `<section id="ID" class="s-duo">
  <figure><img src="IMG_n" alt="(la scène en une phrase)"></figure>
  <div class="s-duo__texte"><span class="t-label">(2 à 4 mots)</span><h2>(titre, 4 à 8 mots)</h2><p>(deux phrases concrètes)</p>
    <ul class="s-duo__points"><li>(fait réel du brief)</li> (2 à 4 points)</ul></div>
</section>
(ajoute la classe s-duo--inverse sur la section pour mettre la photo à droite)` },
  etapes: { nom: "Étapes", photo: false, structure: `<section id="ID" class="section s-etapes"><div class="wrap">
  <h2>(comment ça se passe, 4 à 8 mots)</h2>
  <div class="s-etapes__rang"><div class="s-etape"><h3>(étape)</h3><p>(une phrase)</p></div> (3 ou 4 étapes, celles que le brief permet de décrire)</div>
</div></section>` },
};

/** Une mise en page par section du milieu (ni premier écran, ni fin, ni FAQ, ni formulaire) ; jamais deux voisines identiques ;
 *  les photos vont aux sections « récit » et « duo » tant qu'il en reste. */
export function choisirSections(sections: { id: string; role?: string; marqueurs?: string[] }[], photosLibres: string[], aleatoire: () => number = Math.random): Record<string, { mise: MiseSection; image?: string; inverse?: boolean }> {
  const out: Record<string, { mise: MiseSection; image?: string; inverse?: boolean }> = {};
  let duos = 0;
  const libres = [...photosLibres];
  let prec: MiseSection | null = null;
  const deja = new Set<MiseSection>();
  for (const s of sections) {
    const role = String(s.role ?? "").toLowerCase(), m = s.marqueurs ?? [], q = `${role} ${s.id}`;
    if (s.id === "hero" || /hero|closing|faq|question|contact|inscription/.test(role) || m.includes("contact") || m.includes("inscription")) { prec = null; continue; }
    let options: MiseSection[];
    if (m.some((x) => ["adresse", "horaires", "realisations"].includes(x))) options = libres.length ? ["duo"] : [];
    else if (/fonctionnement|methode|m[ée]thode|etape|[ée]tape|process|comment|d[ée]roul/.test(q)) options = ["etapes"];
    else if (m.includes("services") || /offre|prestation|service|prix|tarif|carte|vins?\b|chambres?|voyages?|destinations?|produits?|savoir/.test(q)) options = ["liste"];
    else if (/promesse|manifeste|citation|valeur|vision|pourquoi/.test(q)) options = ["manifeste"];
    else options = libres.length ? ["recit", "duo"] : ["manifeste"];
    // Un manifeste et un récit par page au plus : au-delà, la page redevient libre (les règles Taste)
    let choix = options.filter((o) => o !== prec && !((o === "manifeste" || o === "recit") && deja.has(o)));
    if (!choix.length) { prec = null; continue; }
    const mise = choix[Math.floor(aleatoire() * choix.length)];
    const image = SECTIONS[mise].photo ? libres.shift() : undefined;
    if (SECTIONS[mise].photo && !image) { prec = null; continue; }
    out[s.id] = { mise, ...(image ? { image } : {}), ...(mise === "duo" && duos++ % 2 === 1 ? { inverse: true } : {}) };
    deja.add(mise); prec = mise;
  }
  return out;
}

export function consigneSections(choix: Record<string, { mise: MiseSection; image?: string; inverse?: boolean }>, ids: string[]): string {
  const lignes = ids.filter((id) => choix[id]).map((id) => `### Section « ${id} » : mise en page « ${SECTIONS[choix[id].mise].nom} »${choix[id].image ? ` (photo ${choix[id].image})` : ""}\n${SECTIONS[choix[id].mise].structure.replace(/\bID\b/g, id).replace(/IMG_n/g, choix[id].image ?? "IMG_n").replace('class="s-duo"', choix[id].inverse ? 'class="s-duo s-duo--inverse"' : 'class="s-duo"')}`);
  return lignes.length ? `\nMISES EN PAGE IMPOSÉES (garde exactement ces balises et ces classes, remplace les parenthèses par les vrais textes, n'ajoute AUCUNE balise <style> ni attribut style dans ces sections ; tu peux ajouter un marqueur data-bingoo à l'endroit indiqué) :\n${lignes.join("\n\n")}\n` : "";
}

/** Une section signature : jamais de style écrit à la main (le kit fait le rendu) */
export function estSectionSignature(html: string) { return /class="[^"]*\bs-(recit|manifeste|liste|duo|etapes)\b/.test(String(html ?? "")); }

/** Les mises en scène à proposer dans l'aperçu (3 au plus, la plus adaptée d'abord, jamais deux fois la même) */
export function compositionsPour(o: { type: TypeProjet; texte: string; images: boolean }): Composition["id"][] {
  const vus: Composition["id"][] = [];
  // Le tirage pondéré, répété, donne l'ordre d'adéquation ; puis on complète avec les autres mises en scène du même genre
  for (let i = 0; i < 60 && vus.length < 3; i++) { const c = choisirComposition({ ...o, aleatoire: () => (i % 7) / 7 }); if (c && !vus.includes(c.id)) vus.push(c.id); }
  const autres: Composition["id"][] = o.type === "software" ? ["lueur", "bento", "affiche"] : o.images ? ["moitie", "cinema", "bandeau", "arche", "hublot", "mosaique"] : ["affiche", "ruban", "carte"];
  for (const a of autres) if (vus.length < 3 && !vus.includes(a)) vus.push(a);
  return vus;
}
