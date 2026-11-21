// Règles du chantier design (décisions de Jean, 21 nov. 2026) :
//  - Avant tout changement de design d'un site existant, l'apparence précédente est gardée (apparence.ts :
//    garderApparence) et le membre peut y revenir en un clic (« Revenir au design précédent »).
//  - Portfolio : moitié droite du premier écran jamais vide ; jamais de photo qui n'est pas celle du membre.
//  - Coût : sites, au plus +0,01 € par construction (une construction coûte ~1 centime, un pourcentage n'a pas de sens) ;
//    SaaS (~1 €), au plus +20 %.
//  - Une évolution de design ne s'applique qu'aux NOUVELLES constructions (spec.design présent), ou au clic du membre ;
//    jamais aux sites déjà en ligne sans prévenir (un membre peut avoir montré son site).
//  - Aucune régression : une version déjà validée en ligne reste tirable (variantes maison, scripts/design/precalcul.py).
// Système de design de chaque construction (UI UX Pro Max, licence MIT, vendor/ui-ux-pro-max).
// Le générateur Python est exécuté hors ligne (scripts/design/precalcul.py) : 3 variantes par catégorie de produit,
// rangées dans design-systemes.json. Ici, sans IA : trouver la catégorie, tirer une variante que ni ce membre ni les
// derniers projets du même secteur n'ont eue, et la résumer en ~25 lignes pour le plan.
import systemes from "./design-systemes.json" with { type: "json" };

type Variante = {
  style: string; mots: string; effets: string; mode: "light" | "dark";
  couleurs: Record<string, string>; palette_note: string;
  polices: { titres: string; texte: string; humeur: string };
  allure?: string; maison?: boolean;
};
type Systeme = { categorie: string; mots_cles: string; motif: { nom: string; sections: string; cta: string }; eviter: string[]; variantes: Variante[] };
const SYSTEMES = systemes as unknown as Record<string, Systeme>;
const NOMS = Object.keys(SYSTEMES);

const mots = (t: string) => (t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((m) => m.length > 2);

/** La catégorie UI UX Pro Max la plus proche de quelques mots-clés en anglais (fournis par le plan). */
export function categorieDesign(motsCles: string, repli = "SaaS (General)"): string {
  const q = new Set(mots(motsCles));
  if (!q.size) return repli;
  let meilleur = repli, score = 0;
  for (const nom of NOMS) {
    const s = SYSTEMES[nom];
    const titre = mots(nom), cles = mots(s.mots_cles);
    let sc = 0;
    for (const m of q) {
      if (titre.includes(m)) sc += 3;
      else if (cles.includes(m)) sc += 2;
      else if (cles.some((c) => c.startsWith(m) || m.startsWith(c))) sc += 1;
    }
    sc = sc / Math.sqrt(titre.length + 1);
    if (sc > score) { score = sc; meilleur = nom; }
  }
  return meilleur;
}

export type DesignChoisi = {
  source: "ui-ux-pro-max"; categorie: string; variante: number; style: string; mode: "light" | "dark";
  couleurs: Record<string, string>; polices: { titres: string; texte: string };
  motif: string; sections: string; eviter: string[];
  // Variante maison : l'allure Bingoo! d'origine (mise en page de l'en-tête) qui va avec
  allure?: string;
};

/** Tire une des 3 variantes : jamais celle des projets récents du même secteur ni des projets de ce membre, sinon la moins récente. */
export function tirerDesign(categorie: string, dejaVues: { categorie?: string; variante?: number }[] = [], aleatoire = Math.random): DesignChoisi {
  const s = SYSTEMES[categorie] ?? SYSTEMES["SaaS (General)"];
  const n = s.variantes.length;
  const prises = dejaVues.filter((d) => d?.categorie === s.categorie).map((d) => Number(d.variante));
  let libres = [...Array(n).keys()].filter((i) => !prises.includes(i));
  if (!libres.length) {
    // Toutes déjà vues : celle qui a servi le moins récemment (dejaVues est trié du plus récent au plus ancien)
    const ordre = [...Array(n).keys()].sort((a, b) => prises.indexOf(b) - prises.indexOf(a));
    libres = [ordre[0]];
  }
  const i = libres[Math.floor(aleatoire() * libres.length)];
  const v = s.variantes[i];
  return {
    source: "ui-ux-pro-max", categorie: s.categorie, variante: i, style: v.style, mode: v.mode,
    couleurs: v.couleurs, polices: { titres: v.polices.titres, texte: v.polices.texte },
    motif: s.motif.nom, sections: s.motif.sections, eviter: s.eviter,
    ...(v.allure ? { allure: v.allure } : {}),
  };
}

/** Le résumé injecté dans le plan (~25 lignes, en français). La palette et les polices sont imposées : l'IA ne les choisit plus. */
export function texteDesign(d: DesignChoisi): string {
  const c = d.couleurs;
  return [
    `SYSTÈME DE DESIGN IMPOSÉ (catégorie « ${d.categorie} », ne pas le changer) :`,
    `- Style : ${d.style} ; mode ${d.mode === "dark" ? "sombre" : "clair"}.`,
    `- Couleurs : principale ${c.primary} (texte dessus ${c.on_primary || "#FFFFFF"}), secondaire ${c.secondary}, accent ${c.accent}, fond ${c.background}, texte ${c.foreground}, cartes ${c.card || c.background}, discret ${c.muted_foreground}, bordures ${c.border}.`,
    `- Polices : titres ${d.polices.titres}, texte ${d.polices.texte}.`,
    `- Structure conseillée : ${d.sections}.`,
    d.eviter.length ? `- À éviter : ${d.eviter.join(" ; ")}.` : "",
    `- Contrôles : contraste du texte 4,5:1 minimum, focus visible au clavier, aucun emoji à la place d'une icône, curseur pointeur sur tout ce qui se clique, aucun texte ni badge coupé, rien ne déborde à 390 px.`,
  ].filter(Boolean).join("\n");
}

export const NOMBRE_CATEGORIES = NOMS.length;
