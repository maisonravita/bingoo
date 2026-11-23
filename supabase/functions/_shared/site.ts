// Sites web (étape 2 de « Construire mon idée ») : construction (textes par l'IA, espace gérant fait main), voir site-spec.ts
// deno-lint-ignore-file no-explicit-any
import { categorieDesign, tirerDesign } from "./design.ts";
import { admin, askJson } from "./core.ts";
import { HttpError } from "./http.ts";
import { promptSite, specSite } from "./site-spec.ts";
export { promptSite, specSite };

/** Tirage du système de design d'une construction, avec l'historique du membre et du secteur. */
export async function choisirDesign(appId: string, motsCles: string) {
  const categorie = categorieDesign(motsCles);
  const { data: app } = await admin.from("saas_apps").select("workspace_id").eq("id", appId).maybeSingle();
  const [{ data: siens }, { data: secteur }] = await Promise.all([
    admin.from("saas_apps").select("spec->design").eq("workspace_id", app?.workspace_id ?? "").neq("id", appId).order("maj", { ascending: false }).limit(10),
    admin.from("saas_apps").select("spec->design").eq("spec->design->>categorie", categorie).neq("id", appId).order("maj", { ascending: false }).limit(6),
  ]);
  const vues = [...(siens ?? []), ...(secteur ?? [])].map((x: any) => x.design).filter(Boolean);
  return tirerDesign(categorie, vues);
}

/** Construction d'un site : une seule écriture rapide (les textes), l'espace gérant est déjà écrit et testé. */
export async function construireSite(appId: string, p: any, demarrerVerification: (id: string, spec?: any) => Promise<unknown>, lancerEcran?: (id: string) => Promise<void>) {
  await admin.from("saas_apps").update({ etape: "Écriture des textes du site", maj: new Date().toISOString() }).eq("id", appId);
  const c = await askJson<any>(promptSite(p), { fast: true, maxTokens: 5000 });
  const spec = specSite(c, p);
  if (!spec.logo && typeof p.logo_espace === "string") spec.logo = p.logo_espace; // logo de l'espace
  if (!spec.ecrans.every((e: any) => e.code)) throw new Error("L'espace gérant du site est introuvable");
  // Système de design (UI UX Pro Max) : catégorie tirée des mots-clés du plan, variante jamais vue chez ce membre ni
  // sur les derniers projets du même secteur ; palette et polices imposées (l'IA ne les choisit plus)
  // Le design montré dans l'aperçu de l'idée est celui qui est construit
  const d = (await import("./design.ts")).designNet(p.idee?.apercu?.design) ?? await choisirDesign(appId, String(c?.secteur_en ?? `${spec.site?.metier ?? ""}`));
  spec.design = d;
  spec.couleur = d.couleurs.primary;
  if (d.allure) spec.style = d.allure;
  // « Un site qui te plaît » : sa palette et ses polices, et le logo du membre
  if (p.source) { const { poserSource } = await import("./copie-site.ts"); poserSource(spec, p.source); }
  // Gabarit kit Taste : pour les nouveaux portfolios seulement (validé par Jean le 21/11 après comparaison).
  // Les sites existants gardent leur gabarit ; un changement passe par garderApparence (retour en un clic).
  if (spec.site?.modele === "portfolio") spec.site = { ...spec.site, gabarit: "taste" };
  // Gabarit de secours des nouveaux sites vitrine : l'éditorial, le même que l'aperçu (22/11)
  else if (spec.site?.modele !== "lancement") spec.site = { ...spec.site, gabarit: "editorial" };
  // Moteur de pages sur mesure (chantier « façon Lovable ») : la page publique écrite par l'IA dans sa propre invocation
  // (une invocation est limitée à ~150 s : textes + page ne tiennent pas ensemble). Le gabarit reste en secours.
  // Activé par le secret GEN_SITES : "on" pour tous, "robot" (par défaut) pour les espaces du robot seulement, "off" jamais.
  const surMesure = !!lancerEcran && await genActif(appId);
  // Portfolio sans photos du membre : le nom en grand (Taste : jamais de photos de bibliothèque en en-tête ni de personnes,
  // elles passeraient pour son travail). Les photos libres (photos.ts) restent réservées à des détails, plus tard.
  await admin.from("saas_apps").update({ brouillon: spec, etape: surMesure ? "Écriture de la page sur mesure" : `Écriture des écrans (${spec.ecrans.length - 1}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  // L'écran unique est marqué écrit seulement après la page (le marquer avant publierait le site tout de suite)
  if (surMesure) { await lancerEcran!("__page"); return; }
  // La vérification est posée avant la mise en ligne : le site ne paraît jamais « prêt » sans avoir été testé
  await demarrerVerification(appId, spec).catch((x) => console.error("verification site", x));
  const e0 = spec.ecrans[0];
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
}

/** Le moteur de pages est-il actif pour cette construction ? (secret GEN_SITES : on | robot | off) */
async function genActif(appId: string) {
  // Réglable sans redéploiement : app_secrets « gen_sites » (on | robot | off), sinon le secret GEN_SITES, sinon « robot »
  const { data: r } = await admin.from("app_secrets").select("value").eq("name", "gen_sites").maybeSingle();
  const mode = String(r?.value ?? Deno.env.get("GEN_SITES") ?? "robot");
  if (mode === "on") return true;
  if (mode !== "robot") return false;
  const { data } = await admin.from("saas_apps").select("workspaces(name)").eq("id", appId).maybeSingle();
  return /^Robot construction/.test(String((data as any)?.workspaces?.name ?? ""));
}

/** Étape 2 d'un site sur mesure (sa propre invocation) : la page écrite par l'IA, puis la vérification habituelle. */
export async function pageSurMesure(appId: string, demarrerVerification: (id: string, spec?: any) => Promise<unknown>) {
  const { data: app } = await admin.from("saas_apps").select("brouillon, projet_id").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const p = (pr?.data ?? {}) as any, spec = app?.brouillon as any, idee = p.idee ?? {};
  if (!spec?.ecrans?.length) throw new Error("Brouillon du site introuvable pour la page sur mesure");
  try {
    const { genererPage } = await import("./site-gen.ts");
    const g = await genererPage({
      nom: spec.nom, brief: [idee.texte, ...(Array.isArray(idee.reponses) ? idee.reponses.map((x: any) => `${x.q} : ${x.r}`) : [])].filter(Boolean).join("\n") || String(spec.pitch ?? ""),
      modele: spec.site?.modele, metier: spec.site?.metier, ville: spec.site?.ville, cta: spec.site?.cta, demande: spec.site?.demande,
      design: spec.design, services: spec.demo?.services, horaires: spec.demo?.horaires, infos: (spec.demo?.infos ?? [])[0], faq: spec.faq,
      // Construction en direct : la page en cours est posée dans le brouillon, la page Bingoo! l'affiche section par section
      progres: async (pl) => {
        const n = pl.sections.filter((x) => x.id !== "nav" && x.html).length, tot = pl.sections.filter((x) => x.id !== "nav").length;
        await admin.from("saas_apps").update({ brouillon: { ...spec, site: { ...spec.site, page_live: pl } }, etape: n ? `Écriture de la page (${n}/${tot})` : "Plan de la page", maj: new Date().toISOString() }).eq("id", appId);
      },
    });
    spec.site = { ...spec.site, page: g.page };
    spec.gen = { ...g.mesure, at: new Date().toISOString() };
  } catch (x) {
    // Gabarit de secours : jamais un site cassé ; la raison est gardée pour « Qualité des constructions »
    spec.gen = { echec: String((x as Error)?.message ?? x).slice(0, 240), at: new Date().toISOString() };
    console.error("moteur de pages", x);
  }
  await admin.from("saas_apps").update({ brouillon: spec, etape: `Écriture des écrans (${spec.ecrans.length - 1}/${spec.ecrans.length})`, maj: new Date().toISOString() }).eq("id", appId);
  await demarrerVerification(appId, spec).catch((x) => console.error("verification site", x));
  const e0 = spec.ecrans[0];
  await admin.rpc("saas_app_ecran_set", { p_app: appId, p_id: e0.id, p_code: e0.code, p_ok: true });
}

/** Page de présentation d'un SaaS écrite par le moteur de pages (comme les sites) : en parallèle de l'écriture des écrans.
 *  Elle s'enregistre sans écraser les écrans (saas_app_page_set) ; en cas d'échec, l'ancienne page de présentation reste. */
export async function vitrineSaaS(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("brouillon, spec").eq("id", appId).single();
  const spec = ((app?.brouillon ?? app?.spec) ?? null) as any;
  if (!spec?.nom) return;
  const court = (x: unknown, n: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const ecrans = (spec.ecrans ?? []).filter((e: any) => !e.public);
  const exemples = Object.entries(spec.demo ?? {}).filter(([, xs]) => Array.isArray(xs) && (xs as any[]).length).slice(0, 4)
    .map(([k, xs]: [string, any]) => `${k} : ${(xs as any[]).slice(0, 3).map((x) => court(JSON.stringify(x), 180)).join(" | ")}`).join("\n");
  const brief = [
    `${spec.nom} : ${spec.pitch_site || spec.pitch || ""}`,
    spec.slogan ? `Accroche choisie : ${spec.slogan}` : "",
    `Pour : ${spec.cible ?? ""}`,
    spec.probleme_site || spec.probleme ? `Le problème des clients : ${spec.probleme_site || spec.probleme}` : "",
    spec.nature?.espace_principal ? `Sa journée avec le logiciel : ${court(spec.nature.espace_principal, 400)}` : "",
    (spec.nature?.interactions ?? []).length ? `Ce qu'il y fait vraiment : ${(spec.nature.interactions ?? []).slice(0, 5).join(" ; ")}` : "",
    (spec.atouts ?? []).length ? `Ce qui change pour lui : ${(spec.atouts ?? []).slice(0, 4).map((a: any) => `${a.titre} (${a.texte})`).join(" ; ")}` : "",
    // Les maquettes reprennent les données d'exemple (prix d'une prestation, montants) : elles font partie du brief vérifié
    exemples ? `Données d'exemple du logiciel : ${exemples}` : "",
  ].filter(Boolean).join("\n");
  const consignes = `Page de présentation d'un LOGICIEL EN LIGNE (SaaS) déjà construit, qui vend un essai gratuit.
- Le bouton principal mène à l'essai : <a class="btn btn--primary" href="#essai">${court(spec.cta || "Essayer gratuitement", 30)}</a>. Le lien de connexion des clients existants : <a href="#connexion">Se connecter</a>, dans le header à droite. N'utilise aucun formulaire ni marqueur (pas de data-bingoo) : l'inscription se fait par ces liens.
- Raconte un USAGE, pas une liste de fonctions : à qui ça sert, à quel moment de sa journée, ce qui change pour lui. Jamais une grille qui passe en revue tous les écrans.
- Les visuels sont des MAQUETTES du vrai logiciel dessinées en HTML et CSS (fenêtre d'application, colonnes, lignes, étiquettes de statut), avec des éléments tirés des données d'exemple ci-dessous. Montre 2 ou 3 moments clés, chacun EN GRAND dans sa propre section (l'espace principal dans le premier écran), jamais une rangée de petites maquettes de même taille. Écrans disponibles : ${ecrans.map((e: any) => `${e.titre} (${court(e.but, 100)})`).join(" ; ")}.
- Jamais une capture inventée d'un autre produit, jamais de chiffres d'activité présentés comme réels ; pas d'effet de texte barré.
- Les prix sont ceux des formules données (services) et rien d'autre, par mois ; « Sans carte bancaire » et « 14 jours d'essai » sont vrais et peuvent être dits.
- Aucun avis, logo de client, nombre d'utilisateurs ou statistique de résultat.
Données d'exemple du logiciel (pour remplir les maquettes) :
${exemples}`;
  let page: any = null, gen: any;
  try {
    const { genererPage } = await import("./site-gen.ts");
    const g = await genererPage({
      nom: spec.nom, brief, modele: "saas", metier: court(spec.cible, 80), cta: court(spec.cta || "Essayer gratuitement", 30),
      design: spec.design, faq: spec.faq, consignes,
      services: (spec.formules ?? []).map((f: any) => ({ titre: f.nom, prix: `${f.prix} € par mois`, duree: f.pour })),
    });
    page = g.page; gen = { ...g.mesure, at: new Date().toISOString(), vitrine: true };
  } catch (x) {
    gen = { echec: String((x as Error)?.message ?? x).slice(0, 240), journal: ((x as any)?.journal ?? []).slice(-12), at: new Date().toISOString(), vitrine: true };
    console.error("moteur de pages (SaaS)", x);
  }
  const { data: ou } = await admin.rpc("saas_app_page_set", { p_app: appId, p_page: page, p_gen: gen });
  console.log("vitrine SaaS", appId, ou, page ? `${page.sections.length} sections` : "secours");
}

/** « Appliquer le nouveau design » (au clic du membre, jamais sans le prévenir) : un site existant reçoit le système de
 *  design actuel et, pour un portfolio, le gabarit Taste. L'apparence précédente est gardée (retour en un clic). */
/** SaaS déjà livré : intérieur au gabarit Taste, police de titre avec du caractère, et page de présentation écrite par le moteur.
 *  L'apparence d'avant (couleurs, polices, gabarit, page) est gardée : « Revenir au design précédent » la rend en un clic. */
async function nouveauDesignSaaS(appId: string, app: any) {
  const { garderApparence } = await import("./apparence.ts");
  const { titresAvecCaractere } = await import("./design.ts");
  if (app?.brouillon) throw new HttpError(409, "Une construction est en cours : réessaie quand elle est finie");
  const avant = (app?.spec ?? {}) as any;
  const d = avant.design?.couleurs ? { ...avant.design } : await choisirDesign(appId, String(avant.design?.categorie ?? avant.cible ?? avant.nom ?? ""));
  d.polices = { ...(d.polices ?? {}), titres: titresAvecCaractere(d.polices?.titres ?? "Inter", `${appId}`) };
  const n: any = { ...avant, design: d, gabarit_app: "taste" };
  const spec = garderApparence(avant, n, "Nouveau design de Bingoo! appliqué");
  await admin.from("saas_apps").update({ spec, version: (app?.version ?? 0) + 1, maj: new Date().toISOString() }).eq("id", appId);
  // La page de présentation s'écrit en tâche de fond (moteur de pages, ~1 min) : l'aperçu se recharge quand elle est prête ;
  // en cas d'échec l'ancienne page reste
  const travail = vitrineSaaS(appId).catch((x) => console.error("nouveau design SaaS", x));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(travail); else await travail;
  return { ok: true, saas: true, page_en_cours: true };
}

export async function appliquerNouveauDesign(appId: string) {
  const { garderApparence } = await import("./apparence.ts");
  const { data: app } = await admin.from("saas_apps").select("spec, brouillon, version").eq("id", appId).single();
  const avant = (app?.spec ?? {}) as any;
  if (avant.type !== "site") return await nouveauDesignSaaS(appId, app);
  const d = await choisirDesign(appId, String(avant.design?.categorie ?? avant.site?.metier ?? ""));
  const n: any = { ...avant, design: d, couleur: d.couleurs?.primary ?? avant.couleur };
  delete n.design_avant;
  if (d.allure) n.style = d.allure;
  if (avant.site?.modele === "portfolio") n.site = { ...avant.site, gabarit: "taste" };
  const spec = garderApparence(avant, n, "Nouveau design de Bingoo! appliqué");
  await admin.from("saas_apps").update({ spec, version: (app?.version ?? 0) + 1, maj: new Date().toISOString() }).eq("id", appId);
  return { ok: true, style: d.style, couleur: d.couleurs?.primary };
}
