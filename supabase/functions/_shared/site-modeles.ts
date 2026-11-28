// Bibliothèque de modèles de sites (28 nov. 2026, choix de Jean) : un site client n'est plus inventé de zéro,
// il part du site de la bibliothèque le plus proche de sa demande (même premier écran, mêmes mises en page,
// mêmes polices et couleurs), avec SES textes et SES images. L'aperçu propose les 3 modèles les plus proches.
import { admin } from "./core.ts";

export type ModeleSite = { id: string; nom: string; slug: string; pour: string; mots: RegExp; genre?: "vitrine" | "portfolio" | "lancement" };

export const MODELES_SITE: ModeleSite[] = [
  { id: "atelier-meche", nom: "Atelier Mèche", slug: "atelier-meche-6i09", pour: "Salon, beauté, bien-être",
    mots: /coiff|barb|salon|beaut|esth[ée]ti|onglerie|ongles|spa\b|massage|institut|maquill|tatou|cils|soins? du visage|perruqu/ },
  { id: "hotel-des-quais", nom: "Hôtel des Quais", slug: "hotel-des-quais-6u5r", pour: "Hôtel, gîte, hébergement",
    mots: /h[ôo]tel|g[îi]te|chambres? d.h[ôo]tes|h[ée]bergement|camping|r[ée]sidence|auberge|location (saisonni|de vacances)|conciergerie|s[ée]jour/ },
  { id: "cap-lointain", nom: "Cap Lointain", slug: "cap-lointain-6a2v", pour: "Voyage, tourisme, activités",
    mots: /voyage|tourisme|excursion|randonn|guide|surf|plong|ski|kayak|parapente|escalade|croisi[èe]re|safari|trek|aventure|activit[ée]s? (de )?plein air/ },
  { id: "maison-rive", nom: "Maison Rive", slug: "maison-rive-4y5y", pour: "Immobilier, conseil, cabinet",
    mots: /immobili|agence|notaire|avocat|courtier|expert[- ]comptable|comptab|cabinet|conseil|patrimoine|assurance|gestion locative|syndic|banque|finance/ },
  { id: "atelier-nord", nom: "Atelier Nord", slug: "atelier-nord-0y1j", pour: "Artisan, architecte, travaux",
    mots: /architect|d[ée]corat|int[ée]rieur|menuis|[ée]b[ée]nist|plomb|[ée]lectric|r[ée]nov|ma[çc]on|peintre|paysag|jardin|charpent|couvreur|carrel|chauffag|artisan|btp|travaux|cuisiniste|serrur|garage|m[ée]cani|carross/ },
  { id: "domaine-trois-collines", nom: "Domaine des Trois Collines", slug: "domaine-des-trois-collines-4o4k", pour: "Domaine, producteur, terroir",
    mots: /vign|domaine|vin\b|vins\b|cave|ch[âa]teau|brasser|distill|ferme|producteur|terroir|mara[îi]ch|apicult|miel|olive|fromag|[ée]levage|haras|[ée]quitation|centre [ée]questre/ },
  { id: "studio-brume", nom: "Studio Brume", slug: "studio-brume-4y2q", pour: "Créatif, studio, portfolio", genre: "portfolio",
    mots: /design|graphis|photograph|vid[ée]ast|studio|cr[ée]ati|artiste|illustrat|portfolio|agence (web|de communication|cr[ée]ative)|d[ée]veloppeu|motion|architecte d.int|styliste|mode\b|couturi/ },
  { id: "studio-souffle", nom: "Studio Souffle", slug: "studio-souffle-2s58", pour: "Sport, yoga, coaching",
    mots: /yoga|pilates|sport|coach|danse|fitness|salle de (sport|gym)|musculation|m[ée]ditation|sophro|bien-[êe]tre|kin[ée]|ost[ée]o|naturopath|psycho|th[ée]rapeut|di[ée]t[ée]ti|boxe|arts martiaux|natation|[ée]cole de/ },
  { id: "comptoir-de-lina", nom: "Le Comptoir de Lina", slug: "le-comptoir-de-lina-0k2d", pour: "Restaurant, café, métier de bouche",
    mots: /restaurant|bistrot|brasserie|caf[ée]\b|bar\b|boulang|p[âa]tiss|traiteur|pizz|burger|cr[êe]pe|food|cuisine|chocolat|glac|[ée]picerie|boucher|charcut|poissonn|sushi|cantine/ },
  { id: "vallee-verte", nom: "Vallée Verte", slug: "vallee-verte-modele", pour: "Immobilier nature, campagne",
    mots: /campagne|montagne|nature|vall[ée]e|chalet|maison(s)? (de|à|en) (campagne|montagne)|[ée]colo|for[êe]t|lac\b|rural|village|vercors|alpes|pyr[ée]n|jura|vosges/ },
  { id: "onde", nom: "Onde", slug: "onde-modele", pour: "Galerie, boutique d'œuvres, enchères", genre: "portfolio",
    mots: /galerie|[œo]euvres?|art\b|artistes?|ench[èe]re|collection|boutique|e-?commerce|vente en ligne|march[ée] en ligne|place de march[ée]|tirages?|affiches?|cr[ée]ations? num[ée]riques|nft|objets? d.art|antiquit|brocante|vintage/ },
  { id: "orbe", nom: "Orbe", slug: "orbe-modele", pour: "Outil créatif, IA, logiciel", genre: "lancement",
    mots: /\bia\b|intelligence artificielle|cr[ée]ateurs?|retouche|montage|[ée]dition (photo|vid[ée]o)|logiciel|saas|outil en ligne|automatis|start-?up|tech|d[ée]veloppeur|no-?code|futur|espace|cin[ée]ma/ },
  { id: "lyra", nom: "Lyra", slug: "lyra-modele", pour: "Appli, assistant, produit mobile", genre: "lancement",
    mots: /\bappli|application mobile|assistant|iphone|android|t[ée]l[ée]chargement|abonnement|produit num[ée]rique|\bia\b/ },
  { id: "seuil", nom: "Seuil", slug: "seuil-modele", pour: "Agence immobilière, biens à vendre",
    mots: /immobili|appartements?|maisons? [àa] vendre|achat|vente|location|biens?\b|logement|promoteur|r[ée]sidence|neuf\b|courtier/ },
  { id: "faite", nom: "Faîte", slug: "faite-modele", pour: "Architecte, constructeur, maisons d'exception",
    mots: /architect|constructeur|construction|maisons? d.architecte|b[âa]tisseur|ma[îi]tre d.[œo]euvre|bureau d.[ée]tudes|paysagiste|chalet|maison contemporaine/ },
  { id: "teinte", nom: "Teinte", slug: "teinte-modele", pour: "Garage, carrosserie, automobile",
    mots: /carross|peinture auto|garage|m[ée]cani|automobile|voitures?|v[ée]hicules?|\bauto\b|motos?\b|pneu|d[ée]bosselage|covering|detailing|lavage auto|concession/ },
  { id: "escale", nom: "Escale", slug: "escale-modele", pour: "Véhicule, produit phare, constructeur", genre: "lancement",
    mots: /vans?\b|camping-car|v[ée]lo|trottinette|bateau|voilier|constructeur|fabricant|mod[èe]le phare|produit phare|[ée]lectrique|lancement d.un produit|pr[ée]commande|engin|drone/ },
  { id: "houle", nom: "Houle", slug: "houle-modele", pour: "Surf, sport de glisse, mer",
    mots: /surf|glisse|plage|oc[ée]an|mer\b|voile|kitesurf|plong[ée]e|paddle|cano[ëe]|kayak|bodyboard|nautique|[ée]cole de (surf|voile)/ },
  { id: "relais", nom: "Relais", slug: "relais-modele", pour: "Livraison, logistique, transport",
    mots: /livraison|livreur|colis|logistique|transport|d[ée]m[ée]nag|coursier|exp[ée]di|fret|entrep[ôo]t|stockage|taxi|vtc|chauffeur/ },
  { id: "altiere", nom: "Altière", slug: "altiere-modele", pour: "Groupe immobilier, hôtellerie, prestige",
    mots: /groupe|h[ôo]tellerie|promotion immobili|investissement|patrimoine|prestige|luxe|r[ée]sidences?|bureaux|immeubles?|fonci[èe]re|syndic/ },
  { id: "cadran", nom: "Cadran", slug: "cadran-modele", pour: "Agence marketing, communication, publicité",
    mots: /agence|marketing|communication|publicit|r[ée]seaux sociaux|growth|acquisition|seo|r[ée]f[ée]rencement|community|brand|branding/ },
  { id: "halo", nom: "Halo", slug: "halo-modele", pour: "Logiciel SaaS, application, outil en ligne",
    mots: /saas|logiciel|application|app\b|outil en ligne|plateforme|startup|tableau de bord|dashboard|ia\b|intelligence artificielle|productivit/ },
  { id: "nocta", nom: "Nocta", slug: "nocta-2v0n", pour: "Appli, produit, lancement", genre: "lancement",
    mots: /\bappli|application|startup|produit|logiciel|lancement|plateforme|[ée]v[ée]nement|festival|conf[ée]rence|salon professionnel|pr[ée]commande|liste d.attente|jeu vid[ée]o|podcast|newsletter/ },
];

/** Les modèles les plus proches de la demande, du plus proche au moins proche (3 par défaut, jamais deux fois le même). */
export function modelesSitePour(texte: string, genre = "vitrine", n = 3): ModeleSite[] {
  const t = String(texte ?? "").toLowerCase();
  const score = (m: ModeleSite) => (t.match(new RegExp(m.mots.source, "g")) ?? []).length * 10 + (m.genre === genre ? 4 : 0);
  const tries = MODELES_SITE.map((m, i) => ({ m, s: score(m), i })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.m);
  // Rien de reconnu : un portfolio va au studio, un lancement à Nocta, une vitrine à l'artisan (le plus polyvalent)
  if (!tries.length || score(tries[0]) <= 4) {
    const defaut = genre === "portfolio" ? "studio-brume" : genre === "lancement" ? "nocta" : "atelier-nord";
    const d = MODELES_SITE.find((m) => m.id === defaut)!;
    return [d, ...tries.filter((m) => m.id !== defaut)].slice(0, n);
  }
  return tries.slice(0, n);
}

export const modeleSiteParId = (id?: string | null) => MODELES_SITE.find((m) => m.id === id) ?? null;

/** Ce qu'on reprend d'un modèle : premier écran, plan, mises en page des sections, design, HTML de référence et photo d'en-tête. */
export type RefModele = { id: string; nom: string; compo: string | null; plan: string[]; mises: Record<string, string>; design: any; sections: { id: string; html: string }[]; nav: { mot: string; ancre: string }[]; photo: string | null; prompts: Record<string, string> };

const NOMS_COMPO: Record<string, string> = { "Cinéma": "cinema", "Mot géant": "mot-geant", "Hublot": "hublot", "Lueur": "lueur", "Galerie courbe": "galerie", "Bento vivant": "bento", "Affiche": "affiche", "Carte": "carte", "Ruban": "ruban", "Moitié": "moitie", "Arche": "arche", "Bandeau": "bandeau", "Mosaïque": "mosaique", "Paysage illustré": "paysage", "Vitrine en duo": "vitrine-duo", "Horizon": "horizon" };

export async function refModele(id: string): Promise<RefModele | null> {
  const m = modeleSiteParId(id);
  if (!m) return null;
  const { data } = await admin.from("saas_apps").select("spec").eq("slug", m.slug).maybeSingle();
  const spec = (data as any)?.spec;
  const page = spec?.site?.page;
  if (!page?.sections?.length) return null;
  const journal: string[] = Array.isArray(spec?.gen?.journal) ? spec.gen.journal.map(String) : [];
  const nomCompo = journal.find((j) => j.startsWith("Premier écran : composition"))?.replace("Premier écran : composition ", "").trim() ?? "";
  const plan = (journal.find((j) => j.startsWith("Plan :"))?.replace("Plan :", "") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const mises: Record<string, string> = {};
  for (const x of (journal.find((j) => j.startsWith("Sections :"))?.replace("Sections :", "") ?? "").split(",")) { const [k, v] = x.split("=").map((y) => y?.trim()); if (k && v) mises[k] = v; }
  const prompts: Record<string, string> = {};
  for (const [k, v] of Object.entries(page.images ?? {})) prompts[k] = String((v as any)?.prompt ?? "").slice(0, 600);
  return {
    id: m.id, nom: m.nom, compo: NOMS_COMPO[nomCompo] ?? null, plan: plan.length ? plan : page.sections.map((s: any) => s.id).filter((x: string) => x !== "nav"),
    mises, design: spec.design ?? null, sections: page.sections.map((s: any) => ({ id: String(s.id), html: String(s.html ?? "") })), nav: page.nav ?? [],
    photo: (page.images?.IMG_1 as any)?.url ?? null, prompts,
  };
}

/** Les modèles proposés dans l'aperçu, avec la photo d'en-tête de chacun (aucune IA : ce sont de vrais sites déjà construits). */
export async function modelesApercu(texte: string, genre = "vitrine", prefere: string | null = null) {
  // Modèle choisi dans la galerie (« Partir de celui-ci ») : il passe en premier
  const p = modeleSiteParId(prefere);
  const ms = p ? [p, ...modelesSitePour(texte, genre, 3).filter((m) => m.id !== p.id)].slice(0, 3) : modelesSitePour(texte, genre, 3);
  const { data } = await admin.from("saas_apps").select("slug, spec->site->page->images->IMG_1->>url").in("slug", ms.map((m) => m.slug));
  const photo = new Map((data ?? []).map((x: any) => [x.slug, x.url ?? null]));
  return ms.map((m) => ({ id: m.id, nom: m.nom, pour: m.pour, slug: m.slug, photo: photo.get(m.slug) ?? null }));
}
