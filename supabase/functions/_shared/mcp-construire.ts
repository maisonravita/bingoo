// Mode « Construire avec mon IA » : l'IA du membre (Claude, ChatGPT, Cursor…) construit un SaaS AVEC Bingoo!, par le connecteur.
// Bingoo! fournit le dossier (produit d'origine, famille, kit, règles), héberge, enregistre chaque écran, vérifie et met en ligne.
// Aucun appel d'IA côté Bingoo! : l'IA du membre conçoit et écrit le code ; Bingoo! contrôle la syntaxe et l'identité, puis son robot vérifie.
// deno-lint-ignore-file no-explicit-any
import { admin, limitesDe, limiteMois } from "./core.ts";
import { HttpError } from "./http.ts";
import { FAMILLES, familleParDefaut } from "./familles.ts";
import { DOC, DOC_PUBLIC, ICONES, erreurSyntaxe, nouveauSlug } from "./app-build.ts";
import { sansIdentite } from "./identite.ts";

const SITE = "https://www.bingoo.fr";
const TYPES = ["texte", "nombre", "montant", "date", "choix", "booleen", "email", "telephone", "lien", "json"];
const snake = (x: unknown, d: string) => String(x ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || d;

export const OUTILS_CONSTRUIRE = [
  { name: "guide_construction", description: "À lire EN PREMIER avant de construire un SaaS avec Bingoo! : la marche à suivre, le format du SaaS, les 12 familles de logiciels et leurs règles d'interface, le kit de composants (ui.*, useCollection, email, pdf, ia…) et les règles de qualité. Sans argument.", inputSchema: { type: "object", properties: {} } },
  { name: "preparer_saas", description: "Le dossier pour lancer sa propre version d'un SaaS du catalogue Bingoo! : ce que fait le produit d'origine, ses fonctions relevées sur ses pages publiques, ses prix, sa famille probable et le guide de cette famille. À appeler après avoir choisi un SaaS (chercher_saas, fiche_saas).", inputSchema: { type: "object", properties: { saas_id: { type: "string", description: "Identifiant du SaaS d'origine (champ id de chercher_saas)" } }, required: ["saas_id"] } },
  { name: "creer_saas", description: "Crée le SaaS du membre dans Bingoo! (brouillon hébergé) : nom ORIGINAL, accroche, famille, couleur, collections de données, écrans et pages publiques. Compte comme une construction de l'abonnement. Ensuite, écrire chaque écran avec ecrire_ecran : le SaaS se met en ligne tout seul quand le dernier écran est écrit.", inputSchema: { type: "object", properties: {
    saas_id: { type: "string", description: "SaaS d'origine (facultatif)" }, nom: { type: "string", description: "Nom original, jamais celui du produit d'origine" }, pitch: { type: "string" }, cible: { type: "string" }, slogan: { type: "string" },
    famille: { type: "string", enum: Object.keys(FAMILLES) }, couleur: { type: "string", description: "#xxxxxx, assez foncée pour du texte blanc" },
    style: { type: "string", enum: ["moderne", "doux", "sombre", "editorial", "vif", "rond", "tech", "elegant", "sport", "geometrique"] },
    formules: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, prix: { type: "number" }, pour: { type: "string" }, inclus: { type: "array", items: { type: "string" } } } } },
    collections: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, label: { type: "string" }, partage: { type: "boolean" }, champs: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, type: { type: "string", enum: TYPES }, valeurs: { type: "array", items: { type: "string" } } } } } } } },
    ecrans: { type: "array", description: "Écrans de l'application, le premier est l'espace principal du produit", items: { type: "object", properties: { id: { type: "string" }, titre: { type: "string" }, icone: { type: "string", enum: ICONES }, but: { type: "string" } } } },
    pages_publiques: { type: "array", description: "Pages ouvertes sans compte par les clients du membre (réservation, formulaire, vitrine…)", items: { type: "object", properties: { id: { type: "string" }, titre: { type: "string" }, but: { type: "string" }, lecture: { type: "array", items: { type: "string" } }, ecriture: { type: "string" }, ia: { type: "boolean" } } } },
    demo: { type: "object", description: "Données d'exemple : { <collection>: [ 6 à 12 éléments réalistes ] }" },
  }, required: ["nom", "pitch", "famille", "collections", "ecrans"] } },
  { name: "ecrire_ecran", description: "Enregistre le code d'un écran (une fonction Ecran en Preact + htm, voir guide_construction). Bingoo! vérifie la syntaxe et retire toute trace du produit d'origine. Sert aussi à améliorer un écran d'un SaaS déjà en ligne (nouvelle version publiée aussitôt, puis revérifiée par le robot).", inputSchema: { type: "object", properties: { app_id: { type: "string" }, ecran_id: { type: "string" }, code: { type: "string" } }, required: ["app_id", "ecran_id", "code"] } },
  { name: "modifier_saas", description: "Fait évoluer un SaaS du membre, sans limite : identité (nom, accroche, couleur, style, formules), nouvelles collections ou nouveaux champs, nouveaux écrans ou pages publiques (avec leur code), écrans retirés, renommés ou réordonnés, données d'exemple. Les changements d'un SaaS en ligne sont publiés aussitôt (nouvelle version revérifiée par le robot). Pour réécrire un écran existant, utilise ecrire_ecran.", inputSchema: { type: "object", properties: {
    app_id: { type: "string" }, nom: { type: "string" }, pitch: { type: "string" }, slogan: { type: "string" }, couleur: { type: "string" }, style: { type: "string" },
    formules: { type: "array", items: { type: "object" } },
    ajouter_collections: { type: "array", items: { type: "object", description: "{ nom, label, partage?, champs: [{ nom, type, valeurs? }] }" } },
    ajouter_champs: { type: "array", items: { type: "object", description: "{ collection, champs: [{ nom, type, valeurs? }] }" } },
    ajouter_ecrans: { type: "array", items: { type: "object", description: "{ id, titre, icone, but, code, public?: true, lecture?: [collections], ecriture?: collection } : le code est obligatoire" } },
    retirer_ecrans: { type: "array", items: { type: "string" } },
    renommer_ecrans: { type: "array", items: { type: "object", description: "{ id, titre?, icone? }" } },
    ordre_ecrans: { type: "array", items: { type: "string" }, description: "Nouvel ordre des écrans (ids)" },
    demo: { type: "object", description: "Données d'exemple à remplacer : { <collection>: [éléments] }" },
  }, required: ["app_id"] } },
  { name: "voir_saas", description: "Un SaaS du membre : sa conception, ses écrans (avec leur code si ecran_id est donné), son état et ce que le robot de vérification a trouvé à corriger.", inputSchema: { type: "object", properties: { app_id: { type: "string" }, ecran_id: { type: "string" } }, required: ["app_id"] } },
  { name: "mes_saas", description: "Les SaaS construits par le membre : nom, état, adresse en ligne, résultat de la vérification.", inputSchema: { type: "object", properties: {} } },
];
export const OUTILS_CONSTRUIRE_NOMS = new Set(OUTILS_CONSTRUIRE.map((o) => o.name));

const GUIDE = () => `MARCHE À SUIVRE
1. Choisir un SaaS qui marche (chercher_saas, fiche_saas), puis preparer_saas pour son dossier.
2. Concevoir SA PROPRE version : nom original, identité, textes réécrits ; on reprend la logique fonctionnelle, les parcours et les interactions caractéristiques, jamais le nom, les textes ni le design du produit d'origine.
3. creer_saas : famille, collections (les données), écrans (le premier = l'espace principal du produit), pages publiques, données d'exemple.
4. ecrire_ecran pour chaque écran et chaque page publique (ids renvoyés par creer_saas). Le SaaS se met en ligne quand le dernier est écrit.
5. voir_saas : le robot de Bingoo! ouvre chaque écran dans un vrai navigateur (dans les 10 minutes) ; corrige avec ecrire_ecran ce qu'il signale.
6. Pour rivaliser vraiment : couvre les « indispensables » du plan_pour_rivaliser de preparer_saas, puis ajoute ce qui fait mieux (modifier_saas pour ajouter écrans, données et pages publiques). Ne t'arrête pas à une première version minimale : un membre attend un logiciel complet, au niveau de ses concurrents.
Montre l'adresse du SaaS au membre à la fin.

FAMILLES (choisis celle du produit d'origine ; chacune a sa logique propre, un outil de notes n'est pas un logiciel de gestion)
${Object.entries(FAMILLES).map(([k, f]) => `## ${k} — ${f.label}\nQuand : ${f.quand}\nPremier écran : ${f.accueil}\n${f.guide}`).join("\n\n")}

ÉCRIRE UN ÉCRAN (le kit disponible dans chaque écran)
${DOC}

PAGES PUBLIQUES (écrans dont l'id commence par pub_)
${DOC_PUBLIC({ lecture: ["<collections en lecture>"], ecriture: "<collection en écriture>" })}`;

async function espace(wsId: string) {
  const { data: ws } = await admin.from("workspaces").select("id, plan").eq("id", wsId).single();
  return ws as any;
}
async function appDuMembre(wsId: string, appId: string) {
  const { data: a } = await admin.from("saas_apps").select("id, slug, statut, spec, brouillon, version, verif, projet_id, maj").eq("id", String(appId ?? "")).eq("workspace_id", wsId).maybeSingle();
  if (!a) throw new Error("SaaS introuvable dans ce compte Bingoo! (vérifie app_id avec mes_saas).");
  return a as any;
}
const adresse = (slug: string) => `${SITE}/#/app/${slug}`;

// Contrôle de tout code d'écran envoyé par l'IA du membre : forme, syntaxe, appels interdits, puis retrait de toute trace du produit d'origine
async function codeControle(app: any, spec: any, brut: unknown, id: string) {
  const code = String(brut ?? "").replace(/^```(?:js|javascript|jsx)?\s*|```\s*$/g, "").trim();
  if (code.length > 60000) throw new Error(`Écran ${id} trop long (60 000 caractères au plus) : découpe-le en plusieurs écrans ou factorise.`);
  if (!/function\s+Ecran\s*\(/.test(code)) throw new Error(`L'écran ${id} doit définir function Ecran(props) { … } (voir guide_construction).`);
  const err = erreurSyntaxe(code);
  if (err) throw new Error(`Erreur de syntaxe dans ${id} : ${err}. Corrige et renvoie l'écran.`);
  if (/\bfetch\s*\(|localStorage|window\.parent|document\.cookie|\beval\s*\(/.test(code)) throw new Error("Interdit dans un écran : fetch, localStorage, window.parent, document.cookie, eval. Utilise useCollection, db, email, pdf, ia.");
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app.projet_id).maybeSingle();
  const ins = (pr?.data as any)?.inspire;
  return ins ? sansIdentite(code, { nom: ins.nom, domaine: ins.domaine }, spec.nom).valeur : code;
}
const colDe = (c: any, i: number) => ({
  nom: snake(c?.nom, `donnees_${i + 1}`), label: String(c?.label ?? c?.nom ?? "").slice(0, 40), ...(c?.partage === true ? { partage: true } : {}),
  champs: (Array.isArray(c?.champs) ? c.champs : []).slice(0, 14).map((x: any, j: number) => ({ nom: snake(x?.nom, `champ_${j + 1}`), type: TYPES.includes(x?.type) ? x.type : "texte", ...(x?.type === "choix" && Array.isArray(x?.valeurs) ? { valeurs: x.valeurs.slice(0, 12).map(String) } : {}) })),
});

export async function appelerConstruire(wsId: string, nom: string, a: any) {
  if (nom === "guide_construction") return { guide: GUIDE() };

  if (nom === "mes_saas") {
    const { data } = await admin.from("saas_apps").select("id, slug, statut, etape, spec, verif, maj").eq("workspace_id", wsId).not("statut", "in", "(remplace,retire)").order("maj", { ascending: false }).limit(30);
    return { saas: (data ?? []).map((x: any) => ({ app_id: x.id, nom: x.spec?.nom ?? null, famille: x.spec?.famille ?? null, statut: x.statut, etape: x.etape, adresse: x.statut === "pret" ? adresse(x.slug) : null, verification: x.verif ? { ok: x.verif.ok, a_corriger: (x.verif.resultats ?? []).filter((r: any) => !r.ok).map((r: any) => ({ ecran: r.id, probleme: r.erreur })) } : "pas encore vérifié" })) };
  }

  if (nom === "preparer_saas") {
    const { data: s } = await admin.from("saas").select("id, nom, domaine, description, categorie, cible, prix_entree_eur, formules, micro, pitch_fr, difficulte").eq("id", String(a?.saas_id ?? "")).maybeSingle();
    if (!s) throw new Error("SaaS introuvable : prends l'id renvoyé par chercher_saas.");
    const { data: d } = await admin.from("saas_decortique").select("statut, resultat, fait_at").eq("domaine", (s as any).domaine).maybeSingle();
    const r: any = (d as any)?.resultat ?? null;
    // Pas de relevé détaillé (ou trop ancien) : Bingoo! lance l'analyse des pages publiques du produit (quelques minutes)
    let analyse = (d as any)?.statut ?? null;
    if (!r && !["attente", "en_cours", "analyse"].includes(analyse ?? "")) { await admin.from("saas_decortique").upsert({ domaine: (s as any).domaine, statut: "attente", essais: 0, at: new Date().toISOString(), demande_par: wsId, erreur: null }); analyse = "attente"; }
    const famille = familleParDefaut([s.categorie, s.description, (s as any).micro].join(" "));
    return {
      origine: { nom: s.nom, domaine: s.domaine, description: s.description, categorie: s.categorie, cible: (s as any).cible ?? null, prix_entree_eur: s.prix_entree_eur, formules: (s as any).formules ?? null, en_bref: (s as any).pitch_fr ?? null, difficulte: (s as any).difficulte ?? null },
      releve_pages_publiques: r ? { resume: r.resume ?? null, fonctionnalites: (r.fonctionnalites ?? []).slice(0, 30), parcours: (r.parcours ?? []).slice(0, 12), tarifs: r.tarifs ?? [], integrations: (r.integrations ?? []).slice(0, 20), arguments: (r.arguments ?? []).slice(0, 10) }
        : `Analyse détaillée des pages publiques de ${s.domaine} lancée par Bingoo! : rappelle preparer_saas dans 3 à 5 minutes pour avoir le relevé complet (fonctionnalités, parcours, tarifs, plan). En attendant, appuie-toi sur la description et sur ce que tu sais de ce produit, sans inventer d'écran interne.`,
      plan_pour_rivaliser: r?.plan ? { indispensables: r.plan.indispensables ?? [], pour_faire_mieux: r.plan.pour_faire_mieux ?? [] } : null,
      famille_probable: famille, guide_famille: FAMILLES[famille].guide,
      a_respecter: `Nom, logo, textes et design ORIGINAUX (jamais « ${s.nom} » ni son domaine) ; même logique fonctionnelle, mêmes parcours, mêmes interactions caractéristiques. Lis guide_construction avant creer_saas.`,
    };
  }

  if (nom === "creer_saas") {
    const ws = await espace(wsId);
    if (!(limitesDe(ws?.plan).construire > 0) && ws?.plan !== "fondateur") throw new Error(`Construire un SaaS demande un abonnement Bingoo! « Lancer » : ${SITE}/#/abonnement`);
    const famille = FAMILLES[a?.famille] ? a.famille : familleParDefaut(`${a?.pitch ?? ""} ${a?.cible ?? ""}`);
    const F = FAMILLES[famille];
    const collections = (Array.isArray(a?.collections) ? a.collections : []).slice(0, 10).map(colDe);
    if (!collections.length) throw new Error("Il faut au moins une collection de données.");
    const cols = new Set(collections.map((c: any) => c.nom));
    const ecrans: any[] = (Array.isArray(a?.ecrans) ? a.ecrans : []).slice(0, 12).map((e: any, i: number) => ({ id: snake(e?.id ?? e?.titre, `ecran_${i + 1}`), titre: String(e?.titre ?? `Écran ${i + 1}`).slice(0, 24), icone: ICONES.includes(e?.icone) ? e.icone : "liste", but: String(e?.but ?? "").slice(0, 300) }));
    if (!ecrans.length) throw new Error("Il faut au moins un écran.");
    for (const x of (Array.isArray(a?.pages_publiques) ? a.pages_publiques : []).slice(0, 3)) {
      const ecriture = cols.has(snake(x?.ecriture, "")) ? snake(x.ecriture, "") : null;
      const lecture = [...new Set([...(Array.isArray(x?.lecture) ? x.lecture : []).map((c: any) => snake(c, "")).filter((c: string) => cols.has(c)), ...(ecriture ? [ecriture] : [])])].slice(0, 4);
      ecrans.push({ id: `pub_${snake(x?.id ?? x?.titre, "page")}`, titre: String(x?.titre ?? "Page publique").slice(0, 30), icone: "carte", but: String(x?.but ?? "").slice(0, 300), public: true, lecture, ecriture, ...(x?.ia === true ? { ia: true } : {}) });
    }
    const vus = new Set<string>(); for (const e of ecrans) { while (vus.has(e.id)) e.id += "_2"; vus.add(e.id); }
    const { data: origine } = a?.saas_id ? await admin.from("saas").select("id, nom, domaine, categorie, prix_entree_eur").eq("id", String(a.saas_id)).maybeSingle() : { data: null };
    const nomSaas = String(a?.nom ?? "").trim().slice(0, 40);
    if (!nomSaas) throw new Error("Donne un nom original au SaaS.");
    if (origine && nomSaas.toLowerCase().includes(String((origine as any).nom).toLowerCase())) throw new Error(`Le nom doit être original : pas « ${(origine as any).nom} ».`);
    const demo = a?.demo && typeof a.demo === "object" && !Array.isArray(a.demo) ? Object.fromEntries(Object.entries(a.demo).filter(([k, v]) => cols.has(k) && Array.isArray(v)).map(([k, v]) => [k, (v as any[]).slice(0, 30)])) : {};
    const spec0: any = {
      nom: nomSaas, pitch: String(a?.pitch ?? "").slice(0, 300), cible: String(a?.cible ?? "").slice(0, 200), slogan: String(a?.slogan ?? a?.pitch ?? "").slice(0, 90),
      couleur: /^#[0-9a-f]{6}$/i.test(a?.couleur ?? "") ? a.couleur : "#4338CA", ...(a?.style ? { style: String(a.style) } : {}),
      famille, interface: F.interface, disposition: F.disposition, forme: "arrondi", fond: "blanc",
      formules: (Array.isArray(a?.formules) ? a.formules : []).slice(0, 3).filter((f: any) => f?.nom).map((f: any) => ({ nom: String(f.nom).slice(0, 40), prix: Number(f.prix) || 0, pour: String(f.pour ?? "").slice(0, 120), inclus: (Array.isArray(f.inclus) ? f.inclus : []).slice(0, 5).map((x: any) => String(x).slice(0, 90)) })),
      collections, ecrans, demo, construit_par: "ia_membre",
    };
    const spec = origine ? sansIdentite(spec0, { nom: (origine as any).nom, domaine: (origine as any).domaine }, nomSaas).valeur : spec0;
    await limiteMois(wsId, ws?.plan, "construire");
    const { data: pr, error: e1 } = await admin.from("saas_projets").insert({ workspace_id: wsId, saas_id: (origine as any)?.id ?? null, statut: "pret", data: { nom: nomSaas, pitch: spec.pitch, cible: spec.cible, construction: "ia_membre", ...(origine ? { inspire: { nom: (origine as any).nom, domaine: (origine as any).domaine, categorie: (origine as any).categorie, prix: (origine as any).prix_entree_eur } } : {}) } }).select("id").single();
    if (e1) throw new Error("Création impossible : " + e1.message);
    const { data: app, error: e2 } = await admin.from("saas_apps").insert({ projet_id: pr!.id, workspace_id: wsId, slug: nouveauSlug(nomSaas), statut: "en_cours", brouillon: spec, etape: `Écriture des écrans (0/${ecrans.length})` }).select("id, slug").single();
    if (e2) throw new Error("Création impossible : " + e2.message);
    return { app_id: app!.id, adresse_future: adresse(app!.slug), famille, a_ecrire: ecrans.map((e) => ({ ecran_id: e.id, titre: e.titre, public: !!e.public, ...(e.public ? { lecture: e.lecture, ecriture: e.ecriture } : {}) })), suite: "Écris chaque écran avec ecrire_ecran (une fonction Ecran, voir guide_construction). Le SaaS se met en ligne quand le dernier est écrit." };
  }

  if (nom === "ecrire_ecran") {
    const app = await appDuMembre(wsId, a?.app_id);
    const spec = (app.brouillon ?? app.spec) as any;
    if (!spec?.ecrans?.some((e: any) => e.id === a?.ecran_id)) throw new Error(`Écran inconnu : ${a?.ecran_id}. Écrans : ${(spec?.ecrans ?? []).map((e: any) => e.id).join(", ")}`);
    const propre = await codeControle(app, spec, a?.code, a?.ecran_id);
    if (app.brouillon && app.statut !== "pret") {
      const { data: fin } = await admin.rpc("saas_app_ecran_set", { p_app: app.id, p_id: a.ecran_id, p_code: propre, p_ok: true });
      const { data: apres } = await admin.from("saas_apps").select("brouillon, slug").eq("id", app.id).single();
      const restants = ((apres?.brouillon as any)?.ecrans ?? []).filter((e: any) => !e.code).map((e: any) => e.id);
      return fin === "pret" ? { statut: "en_ligne", adresse: adresse(app.slug), suite: "Le SaaS est en ligne. Le robot de Bingoo! vérifie chaque écran dans les 10 minutes : appelle voir_saas ensuite pour corriger ce qu'il signale." } : { statut: "en_cours", ecrans_restants: restants };
    }
    // SaaS déjà en ligne : nouvelle version de l'écran, publiée aussitôt (puis revérifiée par le robot)
    const nouvelle = { ...spec, ecrans: spec.ecrans.map((e: any) => e.id === a.ecran_id ? { ...e, code: propre, ok: true } : e) };
    await admin.from("saas_apps").update({ spec: nouvelle, version: (app.version ?? 1) + 1, maj: new Date().toISOString() }).eq("id", app.id);
    return { statut: "mis_a_jour", adresse: adresse(app.slug), version: (app.version ?? 1) + 1 };
  }

  if (nom === "modifier_saas") {
    const app = await appDuMembre(wsId, a?.app_id);
    const enBrouillon = !!app.brouillon && app.statut !== "pret";
    const s0 = (enBrouillon ? app.brouillon : app.spec) as any;
    const s: any = structuredClone(s0);
    const fait: string[] = [];
    if (a?.nom) { s.nom = String(a.nom).slice(0, 40); fait.push("nom"); }
    if (a?.pitch) { s.pitch = String(a.pitch).slice(0, 300); fait.push("accroche"); }
    if (a?.slogan) { s.slogan = String(a.slogan).slice(0, 90); fait.push("slogan"); }
    if (/^#[0-9a-f]{6}$/i.test(a?.couleur ?? "")) { s.couleur = a.couleur; fait.push("couleur"); }
    if (a?.style) { s.style = String(a.style).slice(0, 20); fait.push("style"); }
    if (Array.isArray(a?.formules)) { s.formules = a.formules.slice(0, 3).filter((f: any) => f?.nom).map((f: any) => ({ nom: String(f.nom).slice(0, 40), prix: Number(f.prix) || 0, pour: String(f.pour ?? "").slice(0, 120), inclus: (Array.isArray(f.inclus) ? f.inclus : []).slice(0, 5).map((x: any) => String(x).slice(0, 90)) })); fait.push("formules"); }
    s.collections = Array.isArray(s.collections) ? s.collections : [];
    for (const [i, c] of (Array.isArray(a?.ajouter_collections) ? a.ajouter_collections : []).entries()) { const n = colDe(c, s.collections.length + i); if (s.collections.some((x: any) => x.nom === n.nom)) throw new Error(`La collection ${n.nom} existe déjà : utilise ajouter_champs.`); s.collections.push(n); fait.push(`collection ${n.nom}`); }
    if (s.collections.length > 14) throw new Error("14 collections au plus.");
    for (const x of (Array.isArray(a?.ajouter_champs) ? a.ajouter_champs : [])) { const c = s.collections.find((k: any) => k.nom === snake(x?.collection, "")); if (!c) throw new Error(`Collection inconnue : ${x?.collection}`); for (const ch of colDe({ champs: x?.champs }, 0).champs) if (!c.champs.some((k: any) => k.nom === ch.nom)) c.champs.push(ch); fait.push(`champs de ${c.nom}`); }
    const cols = new Set(s.collections.map((c: any) => c.nom));
    const retirer = new Set((Array.isArray(a?.retirer_ecrans) ? a.retirer_ecrans : []).map(String));
    if (retirer.size) { s.ecrans = s.ecrans.filter((e: any) => !retirer.has(e.id)); fait.push(`${retirer.size} écran(s) retiré(s)`); }
    for (const r of (Array.isArray(a?.renommer_ecrans) ? a.renommer_ecrans : [])) { const e = s.ecrans.find((x: any) => x.id === r?.id); if (!e) throw new Error(`Écran inconnu : ${r?.id}`); if (r.titre) e.titre = String(r.titre).slice(0, 30); if (ICONES.includes(r.icone)) e.icone = r.icone; fait.push(`écran ${e.id} renommé`); }
    for (const [i, x] of (Array.isArray(a?.ajouter_ecrans) ? a.ajouter_ecrans : []).entries()) {
      const pub = x?.public === true || String(x?.id ?? "").startsWith("pub_");
      let id = snake(x?.id ?? x?.titre, `ecran_${s.ecrans.length + i + 1}`); if (pub && !id.startsWith("pub_")) id = `pub_${id}`;
      if (s.ecrans.some((e: any) => e.id === id)) throw new Error(`L'écran ${id} existe déjà : utilise ecrire_ecran pour le réécrire.`);
      const code = await codeControle(app, s, x?.code, id);
      const ecriture = pub && cols.has(snake(x?.ecriture, "")) ? snake(x.ecriture, "") : null;
      s.ecrans.push({ id, titre: String(x?.titre ?? id).slice(0, 30), icone: ICONES.includes(x?.icone) ? x.icone : pub ? "carte" : "liste", but: String(x?.but ?? "").slice(0, 300), code, ok: true,
        ...(pub ? { public: true, lecture: [...new Set([...(Array.isArray(x?.lecture) ? x.lecture : []).map((c: any) => snake(c, "")).filter((c: string) => cols.has(c)), ...(ecriture ? [ecriture] : [])])].slice(0, 4), ecriture } : {}) });
      fait.push(`écran ${id} ajouté`);
    }
    if (Array.isArray(a?.ordre_ecrans) && a.ordre_ecrans.length) { const rang = new Map(a.ordre_ecrans.map((id: any, i: number) => [String(id), i])); s.ecrans.sort((x: any, y: any) => (rang.get(x.id) ?? 99) - (rang.get(y.id) ?? 99)); fait.push("ordre des écrans"); }
    if (!s.ecrans.some((e: any) => !e.public)) throw new Error("Il faut garder au moins un écran.");
    if (s.ecrans.length > 16) throw new Error("16 écrans au plus : regroupe des fonctions dans un même écran.");
    if (a?.demo && typeof a.demo === "object") { s.demo = { ...(s.demo ?? {}), ...Object.fromEntries(Object.entries(a.demo).filter(([k, v]) => cols.has(k) && Array.isArray(v)).map(([k, v]) => [k, (v as any[]).slice(0, 30)])) }; fait.push("données d'exemple"); }
    if (!fait.length) return { statut: "inchange", note: "Aucun changement demandé." };
    if (enBrouillon) {
      const n = s.ecrans.length, faits = s.ecrans.filter((e: any) => e.code).length;
      await admin.from("saas_apps").update({ brouillon: s, etape: `Écriture des écrans (${faits}/${n})`, maj: new Date().toISOString() }).eq("id", app.id);
      return { statut: "brouillon_modifie", fait, ecrans_restants: s.ecrans.filter((e: any) => !e.code).map((e: any) => e.id) };
    }
    await admin.from("saas_apps").update({ spec: s, version: (app.version ?? 1) + 1, maj: new Date().toISOString() }).eq("id", app.id);
    return { statut: "mis_a_jour", fait, adresse: adresse(app.slug), version: (app.version ?? 1) + 1, suite: "Nouvelle version en ligne ; le robot la revérifie dans les 10 minutes (voir_saas)." };
  }

  if (nom === "voir_saas") {
    const app = await appDuMembre(wsId, a?.app_id);
    const s = (app.brouillon ?? app.spec) as any;
    const e = a?.ecran_id ? (s?.ecrans ?? []).find((x: any) => x.id === a.ecran_id) : null;
    if (a?.ecran_id && !e) throw new Error(`Écran inconnu : ${a.ecran_id}`);
    const v = app.verif as any, aJour = v && v.version === app.version;
    return {
      app_id: app.id, nom: s?.nom, famille: s?.famille ?? null, statut: app.statut, adresse: app.statut === "pret" ? adresse(app.slug) : null, version: app.version,
      collections: s?.collections ?? [], ecrans: (s?.ecrans ?? []).map((x: any) => ({ ecran_id: x.id, titre: x.titre, public: !!x.public, ecrit: !!x.code, lignes: x.code ? String(x.code).split("\n").length : 0 })),
      ...(e ? { ecran: { ecran_id: e.id, titre: e.titre, but: e.but, code: e.code ?? null } } : {}),
      verification: aJour ? { ok: v.ok, a_corriger: (v.resultats ?? []).filter((r: any) => !r.ok).map((r: any) => ({ ecran_id: r.id, probleme: r.erreur })) } : app.statut === "pret" ? "en attente : le robot vérifie cette version dans les 10 minutes" : "le SaaS n'est pas encore en ligne",
    };
  }
  throw new HttpError(400, `Outil inconnu : ${nom}`);
}
