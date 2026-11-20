// Captures des pages CONNECTÉES de Bingoo! (construction, atelier, admin…), avec un compte de test dédié.
// Lancé à la main depuis GitHub (workflow « Captures connectées ») ; les images sont jointes au résultat du workflow.
//  - Compte « robot-captures@bingoo.fr » : créé au premier passage, nouveau mot de passe à chaque passage (jamais stocké)
//  - Son espace a la formule Lancer Pro et un SaaS de démo (copie d'un SaaS livré), pour que les pages aient du contenu
//  - Droits d'administrateur seulement le temps de photographier l'admin, retirés ensuite
//  - CONSTRUIRE=modele|ia : en plus, une VRAIE construction (consomme du crédit IA), photographiée toutes les 20 s
//    jusqu'à la fin de la vérification, dans un espace neuf
import { createRequire } from "node:module";
import fs from "node:fs";
import crypto from "node:crypto";

const REF = "fbsjbnnmzazylmquzryo", SB = `https://${REF}.supabase.co`, SITE = process.env.SITE || "https://www.bingoo.fr";
// Une adresse qui reçoit vraiment (domaine maisonravita.fr, réception par Resend) : les e-mails envoyés au robot sont vérifiables
const TOK = process.env.SUPABASE_ACCESS_TOKEN, EMAIL = "robot-captures@maisonravita.fr";
const SOURCE = process.env.DEMO_SOURCE || "pointa-6d37", CONSTRUIRE = process.env.CONSTRUIRE || "";
const DOSSIER = "captures"; fs.mkdirSync(DOSSIER, { recursive: true });
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`SQL ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}
const cles = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${TOK}` } })).json();
const SERVICE = cles.find((k) => k.name === "service_role")?.api_key, ANON = cles.find((k) => k.name === "anon")?.api_key;
if (!SERVICE || !ANON) throw new Error("Clés du projet introuvables");
const adminAuth = (path, method, body) => fetch(`${SB}/auth/v1/admin/${path}`, { method, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new Error(`auth ${r.status} ${await r.text()}`); return r.json(); });

// 1) Le compte de test, avec un nouveau mot de passe
const MDP = crypto.randomBytes(18).toString("base64url");
let [u] = await q(`select id from auth.users where email = ${lit(EMAIL)}`);
if (!u) u = await adminAuth("users", "POST", { email: EMAIL, password: MDP, email_confirm: true, user_metadata: { name: "Robot captures" } });
else await adminAuth(`users/${u.id}`, "PUT", { password: MDP });
const session = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: MDP }) })).json();
if (!session.access_token) throw new Error("Connexion du compte de test impossible");
const uid = session.user.id;
const creerEspace = async (nom) => { const r = await fetch(`${SB}/rest/v1/rpc/create_workspace`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ p_name: nom, p_website: "" }) }); if (!r.ok) throw new Error(`espace ${r.status} ${await r.text()}`); return (await r.json()); };

// 2) Son espace (Lancer Pro) et un SaaS de démo déjà construit
let [m] = await q(`select m.workspace_id id from members m join workspaces w on w.id = m.workspace_id where m.user_id = ${lit(uid)} and w.name = 'Robot captures' limit 1`);
const ws = m?.id ?? await creerEspace("Robot captures");
await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(ws)}`);
const [deja] = await q(`select id, slug from saas_apps where workspace_id = ${lit(ws)} limit 1`);
if (!deja) {
  const slug = "demo-robot-" + crypto.randomBytes(2).toString("hex");
  await q(`with src as (select * from saas_apps where slug = ${lit(SOURCE)}),
    p as (insert into saas_projets select (jsonb_populate_record(null::saas_projets, to_jsonb(x) || jsonb_build_object('id', gen_random_uuid(), 'workspace_id', ${lit(ws)}))).* from saas_projets x where x.id = (select projet_id from src) returning id)
    insert into saas_apps select (jsonb_populate_record(null::saas_apps, to_jsonb(a) || jsonb_build_object('id', gen_random_uuid(), 'workspace_id', ${lit(ws)}, 'projet_id', (select id from p), 'slug', ${lit(slug)}, 'domaine', null, 'domaine_statut', null, 'public', false))).* from src a`);
  console.log("SaaS de démo créé :", slug);
}

// 3) Le navigateur, déjà connecté
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const ouvrir = async (wsId, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", deviceScaleFactor: 1,
    storageState: { cookies: [], origins: [{ origin: SITE, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(session) }, { name: "kairo-ws", value: wsId }, ...Object.entries(extra).map(([name, v]) => ({ name, value: JSON.stringify(v) }))] }] } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("   erreur JS :", e.message.slice(0, 160)));
  return { ctx, page };
};
const photo = async (page, nom, chemin, attente = 5000) => {
  await page.goto(`${SITE}/?c=${Date.now()}${chemin}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(attente);
  await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true });
  console.log("✓", nom);
};

// Page d'accueil telle qu'un visiteur la voit (sans session)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await ctx.newPage();
  await page.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${DOSSIER}/accueil.png` }); console.log("✓ accueil"); await ctx.close();
}
// IDEE=1 : le parcours « Construire mon idée » (aperçu gratuit : 1 petit appel d'IA par idée), une idée claire, une floue, une refusée
if (["1", "site", "app"].includes(process.env.IDEE)) {
  const IDEES_SAAS = [["idee-claire", "Une app de réservation pour les coiffeurs à domicile, avec rappel la veille"], ["idee-floue", "Une appli comme Uber"], ["idee-refusee", "Un faux site de connexion de ma banque pour récupérer les identifiants"]].map(([n, t]) => [n, t, "saas"]);
  // Sites web (étape 2) : une idée claire et une floue
  const IDEES_SITE = [["site-claire", "Le site de mon salon de coiffure à domicile à Lyon"], ["site-floue", "Un beau site pour mon entreprise"]].map(([n, t]) => [n, t, "site"]);
  // Apps mobiles (étape 3)
  const IDEES_APP = [["app-claire", "Une app pour suivre mes séances de sport et mes progrès"]].map(([n, t]) => [n, t, "app"]);
  const LISTE = process.env.IDEE === "site" ? IDEES_SITE : process.env.IDEE === "app" ? IDEES_APP : [...IDEES_SAAS, ...IDEES_SITE, ...IDEES_APP];
  for (const [nom, texte, type] of LISTE) {
    const { ctx, page } = await ouvrir(ws, { "bingoo-idee": { texte, type, at: Date.now() } });
    await page.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    const pret = () => page.waitForFunction(() => !/étudie ton idée|prépare l'aperçu/i.test(document.body.innerText) && /Construire \S+ \S|Le nom affiché|précisions|ne peut pas construire|réessaie|Réessayer/i.test(document.querySelector("main")?.innerText ?? document.body.innerText), null, { timeout: 120000 }).catch(() => null);
    await pret(); await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom);
    // Questions de clarification : le robot répond (premier choix) pour photographier aussi l'aperçu qui suit
    if (await page.getByText("Voir mon aperçu").count()) {
      for (const g of await page.locator("section, div").filter({ has: page.locator("input[placeholder='Ou écris ta réponse…']") }).locator("button[aria-pressed]").all()) { await g.click().catch(() => null); }
      await page.getByText("Voir mon aperçu").click().catch(() => null);
      await page.waitForFunction(() => !/étudie ton idée|prépare l'aperçu/i.test(document.body.innerText) && /Son nom|Le nom affiché|réessaie/i.test(document.body.innerText), null, { timeout: 120000 }).catch(() => null); await page.waitForTimeout(1500);
      await page.screenshot({ path: `${DOSSIER}/${nom}-apercu.png`, fullPage: true }); console.log("✓", nom, "aperçu");
    }
    await ctx.close();
  }
}
if (CONSTRUIRE === "atelier") {
  // Robot de l'atelier, de bout en bout sur le dernier site construit par le robot :
  // DOMAINE=casse : une modification qui casse l'écran « Demandes » est mise en ligne par le vrai bouton (endpoint) ;
  //   le robot doit la tester, voir l'écran cassé, remettre la version d'avant et rendre la modification.
  // DOMAINE=texte : une modification sans danger (un titre d'écran) doit être testée et rester en ligne.
  const CAS = process.env.DOMAINE === "texte" ? "texte" : "casse";
  const [a0] = await q(`select a.id, a.slug, a.workspace_id ws, a.version, a.spec from saas_apps a join members m on m.workspace_id = a.workspace_id
    where m.user_id = ${lit(uid)} and a.spec->>'type' = 'site' and a.statut = 'pret' order by a.maj desc limit 1`);
  if (!a0) throw new Error("Aucun site du robot à modifier");
  const spec = a0.spec, cible = (spec.ecrans ?? []).find((e) => e.id === "demandes") ?? spec.ecrans[1];
  const avant = { version: a0.version, code: cible.code, titre: cible.titre };
  const br = structuredClone(spec);
  const e2 = br.ecrans.find((e) => e.id === cible.id);
  if (CAS === "casse") e2.code = "export default function Ecran() { const lignes = null; return lignes.map((x) => x); }";
  else e2.titre = (cible.titre === "Mes demandes" ? "Demandes" : "Mes demandes");
  br._modif = { demande: CAS === "casse" ? "Test du robot : écran cassé exprès" : "Renommer l'écran", titre: CAS === "casse" ? `écran « ${cible.titre} » modifié (cassé exprès pour le test)` : `écran renommé « ${e2.titre} »`, faits: ["test"], rates: [], at: new Date().toISOString() };
  await q(`update saas_apps set brouillon = ${lit(JSON.stringify(br))}::jsonb where id = ${lit(a0.id)}`);
  const rep = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a0.ws, app_id: a0.id, quoi: "brouillon-valider" }) });
  console.log(`Cas ${CAS} sur ${a0.slug} (v${a0.version}) : mise en ligne →`, rep.status, (await rep.text()).slice(0, 120));
  const { ctx, page } = await ouvrir(a0.ws);
  await page.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  const t0 = Date.now(); let fin = null, n = 0;
  while (Date.now() - t0 < 14 * 60e3) {
    await page.waitForTimeout(20000);
    const [v] = await q(`select version, verif->'dernier_atelier' d, verif->>'phase' p, (select jsonb_agg(x->>'t') from jsonb_array_elements(verif->'journal') x) j, spec from saas_apps where id = ${lit(a0.id)}`);
    if (++n % 3 === 1) await page.screenshot({ path: `${DOSSIER}/atelier-${CAS}-${String(n).padStart(2, "0")}.png` }).catch(() => null);
    if (v?.d) { fin = v; break; }
  }
  if (!fin) { console.log("✗ Le robot n'a pas conclu en 14 min"); process.exitCode = 1; }
  else {
    const e3 = fin.spec.ecrans.find((e) => e.id === cible.id);
    const remis = e3.code === avant.code;
    console.log(`Conclusion : annulée=${fin.d.annule} · version ${avant.version} → ${fin.version} · code d'origine remis=${remis} · titre=${e3.titre}`);
    console.log("Journal :\n" + (fin.j ?? []).slice(-4).join("\n"));
    const attendu = CAS === "casse" ? fin.d.annule === true && remis : fin.d.annule === false && e3.titre !== avant.titre;
    console.log(attendu ? "✓ ROBOT DE L'ATELIER : comportement attendu" : "✗ ROBOT DE L'ATELIER : comportement inattendu");
    if (!attendu) process.exitCode = 1;
    await page.reload({ waitUntil: "networkidle" }).catch(() => null); await page.waitForTimeout(6000);
    await page.screenshot({ path: `${DOSSIER}/atelier-${CAS}-fin.png`, fullPage: true }).catch(() => null);
    if (CAS === "texte") await q(`update saas_apps set brouillon = null where id = ${lit(a0.id)}`);
  }
  await ctx.close();
} else if (!CONSTRUIRE) {
  const { ctx, page } = await ouvrir(ws);
  for (const [nom, chemin] of [["mon-saas", "#/explorer/mon-saas"], ["atelier", "#/explorer/atelier"], ["modeles", "#/explorer/modeles"], ["connecteur", "#/explorer/connecteur"], ["abonnement", "#/abonnement"]]) await photo(page, nom, chemin);
  // L'app sur téléphone : le QR code direct, puis la coque Expo publiée (vrai Snack) et son QR code
  await photo(page, "app-telephone", "#/explorer/reglages-saas?onglet=mobile");
  if (await page.getByText("Préparer l'aperçu Expo Go").count()) {
    await page.getByText("Préparer l'aperçu Expo Go").click();
    await page.waitForFunction(() => /Ouvrir dans Expo Go|ne répond pas|Expo :/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(1500); await page.screenshot({ path: `${DOSSIER}/app-expo.png`, fullPage: true }); console.log("✓ app-expo");
  }
  // L'admin : droits donnés le temps de la photo, puis retirés
  await q(`insert into admins (user_id) values (${lit(uid)}) on conflict do nothing`);
  try { await photo(page, "admin", "#/admin", 8000); } finally { await q(`delete from admins where user_id = ${lit(uid)}`); }
  await ctx.close();
} else {
  // 4) Une vraie construction, dans un espace neuf (un SaaS par abonnement), photographiée jusqu'à la fin de la vérification
  // CONSTRUIRE=site : un site web né d'une idée (étape 2), formule Site
  // Trois modèles de site : DOMAINE=portfolio ou lancement (sinon la vitrine)
  const SITES = {
    portfolio: { texte: "Le portfolio de mon activité de photographe de mariage à Bordeaux", apercu: { type: "site", modele: "portfolio", nom: "Atelier Lumen", pitch: "Photographe de mariage et de famille à Bordeaux.", cible: "Futurs mariés et familles", metier: "Photographe de mariage", accroche: "Vos souvenirs en lumière naturelle", cta: "Parler de mon projet", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Réalisations", role: "Les photos" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Projets et demandes" }], services: [], plus_tard: [], limites: [] } },
    lancement: { texte: "Une page pour annoncer mon appli de repas de la semaine et recueillir les e-mails avant le lancement", apercu: { type: "site", modele: "lancement", nom: "Mealo", pitch: "Une appli qui prépare vos menus et votre liste de courses.", cible: "Familles pressées", metier: "Appli de repas", accroche: "Vos repas de la semaine en 2 minutes", cta: "Être prévenu", ecrans: [{ titre: "Accueil", role: "L'inscription" }, { titre: "Comment ça marche", role: "Les étapes" }, { titre: "Espace gérant", role: "Les inscrits" }], services: [], plus_tard: [], limites: [] } },
  };
  const SITE_IDEE = SITES[process.env.DOMAINE] ?? { texte: "Le site de mon activité de coiffeuse à domicile à Lyon", apercu: { type: "site", nom: "Coupe Chez Vous", pitch: "Coiffeuse à domicile à Lyon : coupes, couleurs et brushings chez vous, sur rendez-vous.", cible: "Familles et particuliers lyonnais", metier: "Coiffeuse à domicile", accroche: "Votre coiffeuse vient chez vous", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche et le bouton de rendez-vous" }, { titre: "Services et tarifs", role: "Les prestations et leurs prix" }, { titre: "Contact", role: "Le formulaire de demande" }, { titre: "Espace gérant", role: "Les demandes reçues" }], services: [], plus_tard: [], limites: [] } };
  const cible = CONSTRUIRE === "site" ? { idee: true, domaine: "idee.bingoo.fr", nom: SITE_IDEE.apercu.nom, categorie: "", ideeTexte: SITE_IDEE.texte, type: "site", reponses: [], apercu: SITE_IDEE.apercu }
    : CONSTRUIRE === "ia"
    ? { domaine: process.env.DOMAINE || "circle.so", nom: "Circle", categorie: "Communauté" }
    : { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration", modele: "reservation", couleur: "#1F3D33", allure: "nature" };
  const ws2 = await creerEspace(`Robot construction ${new Date().toISOString().slice(0, 16)}`);
  await q(`update workspaces set plan = ${lit(CONSTRUIRE === "site" ? "site" : "lancer_pro")}, plan_status = 'active', onboarded = true where id = ${lit(ws2)}`);
  const nomVoulu = CONSTRUIRE === "ia" ? "Cerclo" : CONSTRUIRE === "site" ? SITE_IDEE.apercu.nom : "Sublima";
  let { ctx, page } = await ouvrir(ws2, {
    [`bingoo-reponses-${cible.domaine}`]: { nom: nomVoulu, clients: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Instituts de beauté", mieux: "", angle: `Nom souhaité, à utiliser tel quel : ${nomVoulu}` },
    "bingoo-chantier": { ...cible, ws: ws2, metier: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Institut de beauté" },
  });
  const t0 = Date.now();
  await page.goto(`${SITE}/?c=${t0}#/explorer/revelation`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  let n = 0, fin = false, figee = 0;
  while (Date.now() - t0 < 25 * 60e3 && !fin) {
    await page.waitForTimeout(20000);
    // Délais bornés : une page figée (boucle infinie) ne doit pas bloquer le robot, elle doit être signalée
    const borne = (p, ms, quoi) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(new Error(`${quoi} : la page ne répond plus après ${ms / 1000} s`)), ms))]);
    let texte = "";
    try {
      await borne(page.screenshot({ path: `${DOSSIER}/construction-${String(++n).padStart(2, "0")}.png`, timeout: 15000 }), 20000, "Capture");
      texte = await borne(page.evaluate(() => document.body.innerText), 15000, "Lecture");
    } catch (e) { console.log("⚠ PAGE FIGÉE :", e.message, "· URL", page.url()); figee = (figee ?? 0) + 1; }
    fin = /Tout est propre|Je livre ton SaaS|tests continuent en arrière-plan|La construction a échoué/.test(texte);
    // Ou la base le dit : vérification finie (le texte de la page varie selon le genre d'app)
    if (!fin) { const [v] = await q(`select verif->>'phase' p, statut from saas_apps where workspace_id = ${lit(ws2)}`); fin = v?.p === "fini" || v?.statut === "erreur"; if (fin && !figee) { await page.waitForTimeout(4000); await page.screenshot({ path: `${DOSSIER}/construction-fin.png`, timeout: 15000 }).catch(() => null); } }
  }
  if (figee) { console.log(`⚠ La page de construction s'est figée ${figee} fois : bug à corriger côté Bingoo!`); fs.writeFileSync(`${DOSSIER}/PAGE-FIGEE.txt`, String(figee)); page = await ctx.newPage(); }
  console.log(`Construction ${fin ? "terminée" : "toujours en cours"} après ${Math.round((Date.now() - t0) / 1000)} s`);
  { const [v] = await q(`select verif->'journal' j, verif->>'at' quand from saas_apps where workspace_id = ${lit(ws2)}`); console.log("Vérification :", JSON.stringify(v ?? null)); }
  const [a] = await q(`select slug, statut, version, verif from saas_apps where workspace_id = ${lit(ws2)}`);
  fs.writeFileSync(`${DOSSIER}/resultat.json`, JSON.stringify({ duree_s: Math.round((Date.now() - t0) / 1000), app: a ?? null }, null, 2));
  console.log(JSON.stringify(a?.verif?.mesure ?? null), (a?.verif?.journal ?? []).map((j) => j.t).join("\n"));
  // Le site en ligne tel que le voit un visiteur, puis le plan « premiers clients » du commerce
  if (CONSTRUIRE === "site" && a?.slug) {
    // Référencement : les balises que lisent Google et les aperçus de partage, sur le lien à partager /s/<site>
    const html = await (await fetch(`${SITE}/s/${a.slug}`)).text();
    const balises = (html.match(/<title>[^<]*<\/title>|<meta (?:name|property)="(?:description|og:[a-z:_]+|twitter:[a-z]+)"[^>]*>|<script type="application\/ld\+json">[\s\S]*?<\/script>/g) ?? []).join("\n");
    fs.writeFileSync(`${DOSSIER}/site-balises.txt`, balises); console.log("Balises du site :\n" + balises);
    for (const [nom, vp] of [["site-en-ligne", { width: 1440, height: 900 }], ["site-en-ligne-mobile", { width: 390, height: 844 }]]) {
      const c2 = await browser.newContext({ viewport: vp, locale: "fr-FR" }); const p2 = await c2.newPage();
      await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(8000);
      const f = p2.frames().find((x) => x !== p2.mainFrame());
      if (f) { const h = await f.evaluate(() => document.body.scrollHeight).catch(() => 0); if (h > vp.height) await p2.setViewportSize({ width: vp.width, height: Math.min(h + 80, 9000) }); await p2.waitForTimeout(1500); }
      await p2.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom); await c2.close();
    }
    // L'espace gérant, vu par le gérant : il crée son accès (adresse de son compte Bingoo!), les demandes reçues avant l'attendent
    const API = `${SB}/functions/v1/t/app/${a.slug}`;
    const mdpG = crypto.randomBytes(15).toString("base64url");
    let acces = await fetch(`${API}/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: mdpG, nom: "Robot gérant" }) }).then((r) => r.json());
    console.log("Accès gérant :", acces.token ? "créé" : JSON.stringify(acces).slice(0, 200));
    if (acces.token) {
      const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", storageState: { cookies: [], origins: [{ origin: SITE, localStorage: [{ name: `bingoo-app:${a.slug}`, value: acces.token }] }] } });
      const p3 = await c3.newPage();
      for (const [nom, ecran] of [["site-gerant-accueil", ""], ["site-gerant-demandes", "demandes"]]) {
        await p3.goto(`${SITE}/?c=${Date.now()}${ecran ? "&ecran=" + ecran : ""}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p3.waitForTimeout(7000);
        await p3.screenshot({ path: `${DOSSIER}/${nom}.png` }); console.log("✓", nom);
      }
      await c3.close();
    }
    await photo(page, "site-premiers-clients", "#/explorer/clients");
    await photo(page, "site-mon-saas", "#/explorer/mon-saas");
  }
  await ctx.close();
}
await browser.close();
