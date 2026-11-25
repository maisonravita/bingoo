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
else for (let k = 1; ; k++) { try { await adminAuth(`users/${u.id}`, "PUT", { password: MDP }); break; } catch (e) { if (k >= 3 || !/ 50[234] /.test(e.message)) throw e; console.log(`Service d'authentification lent (${e.message.slice(0, 40)}), nouvel essai dans 20 s`); await new Promise((r) => setTimeout(r, 20000)); } }
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
const ouvrir = async (wsId, extra = {}, plus = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", deviceScaleFactor: 1, ...plus,
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
// CONSTRUIRE=audit : audit de la page d'accueil (ordinateur et téléphone) : vitesse, erreurs, débordements, images, vidéo
if (CONSTRUIRE === "audit") {
  for (const [nom, vp, mobile] of [["ordi", { width: 1440, height: 900 }, false], ["tel", { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, locale: "fr-FR" });
    const p = await ctx.newPage(); const err = [], echecs = [];
    p.on("console", (m) => { if (m.type() === "error") err.push(m.text().slice(0, 160)); });
    p.on("pageerror", (e) => err.push("JS " + e.message.slice(0, 160)));
    p.on("response", (r) => { if (r.status() >= 400) echecs.push(r.status() + " " + r.url().slice(0, 110)); });
    const t0 = Date.now(); await p.goto(`${SITE}/?c=${t0}`, { waitUntil: "load", timeout: 60000 }); const charge = Date.now() - t0;
    const lcp = await p.evaluate(() => new Promise((r) => { new PerformanceObserver((l) => { const e = l.getEntries(); r(Math.round(e[e.length - 1].startTime)); }).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => r(null), 3000); }));
    await p.waitForTimeout(2000); await p.screenshot({ path: `${DOSSIER}/audit-${nom}-haut.jpg`, type: "jpeg", quality: 80 });
    const info = await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
      const vw = window.innerWidth;
      const deborde = [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 2 || r.left < -2) && getComputedStyle(e).position !== "fixed" && !e.closest(".overflow-hidden,.fx-aurore"); }).slice(0, 8).map((e) => e.tagName + "." + String(e.className).slice(0, 60) + " → " + Math.round(e.getBoundingClientRect().right));
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 90));
      const petits = [...document.querySelectorAll("button, a")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 30 && e.innerText.trim(); }).map((e) => e.innerText.trim().slice(0, 30)).slice(0, 10);
      const v = document.querySelector("video");
      return { hauteur: document.body.scrollHeight, largeurPage: document.documentElement.scrollWidth, deborde, imgsCassees: imgs, petitsBoutons: petits, compteur: document.body.innerText.match(/Pars des ([^S]+) SaaS/)?.[1], video: v ? { pret: v.readyState, duree: Math.round(v.duration), src: v.currentSrc.slice(-28) } : null, h2: [...document.querySelectorAll("h2")].map((h) => h.innerText.replace(/\s+/g, " ").slice(0, 60)) };
    });
    await p.evaluate(() => { document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")); window.scrollTo(0, 0); }); await p.waitForTimeout(800);
    await p.screenshot({ path: `${DOSSIER}/audit-${nom}-page.jpg`, type: "jpeg", quality: 70, fullPage: true });
    console.log("AUDIT " + JSON.stringify({ nom, charge, lcp, ...info, erreurs: err.slice(0, 8), echecs: echecs.slice(0, 8) }));
    await ctx.close();
  }
}
// CONSTRUIRE=gratuit : l'Explorer vu par un compte gratuit (un autre compte de test, sans abonnement)
if (CONSTRUIRE === "gratuit") {
  // La page publique « Découvre les SaaS qui marchent », vue par un visiteur sans compte, puis le clic sur un SaaS
  if (CONSTRUIRE === "quatre") { const c0 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p0 = await c0.newPage();
    await p0.goto(`${SITE}/?c=${Date.now()}#/decouvrir`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p0.waitForTimeout(5000);
    await p0.screenshot({ path: `${DOSSIER}/decouvrir.png`, fullPage: true }); console.log("✓ decouvrir");
    await p0.getByRole("button", { name: /Ouvrir la fiche/ }).first().click().catch((e) => console.log("✗ fiche", e.message)); await p0.waitForTimeout(1200);
    await p0.screenshot({ path: `${DOSSIER}/decouvrir-compte.png` }); console.log("✓ decouvrir-compte");
    await p0.setViewportSize({ width: 390, height: 844 }); await p0.goto(`${SITE}/?c=${Date.now()}#/decouvrir`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p0.waitForTimeout(4000);
    await p0.screenshot({ path: `${DOSSIER}/decouvrir-mobile.png` }); await c0.close(); }
  const E2 = "robot-gratuit@maisonravita.fr", M2 = crypto.randomBytes(18).toString("base64url");
  let [u2] = await q(`select id from auth.users where email = ${lit(E2)}`);
  if (!u2) u2 = await adminAuth("users", "POST", { email: E2, password: M2, email_confirm: true, user_metadata: { name: "Robot gratuit" } });
  else await adminAuth(`users/${u2.id}`, "PUT", { password: M2 });
  const s2 = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email: E2, password: M2 }) })).json();
  let [m2] = await q(`select m.workspace_id id from members m where m.user_id = ${lit(s2.user.id)} limit 1`);
  let w2 = m2?.id;
  if (!w2) { const r = await fetch(`${SB}/rest/v1/rpc/create_workspace`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${s2.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ p_name: "Robot gratuit", p_website: "" }) }); w2 = await r.json(); }
  await q(`update workspaces set plan = 'essai', plan_status = 'trialing', onboarded = true where id = ${lit(w2)}`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", storageState: { cookies: [], origins: [{ origin: SITE, localStorage: [{ name: `sb-${REF}-auth-token`, value: JSON.stringify(s2) }, { name: "kairo-ws", value: w2 }, { name: "bingoo-guide", value: "fini" }, { name: "bingoo-parcours-vu", value: "1" }, { name: "bingoo-vue-liste", value: "cartes" }] }] } });
  const page = await ctx.newPage();
  // « Tu viens sur Bingoo! pour quoi ? » : photographiée 2 s après l'ouverture, pour voir si les aperçus des cartes sont déjà là
  { const t0 = Date.now(); await page.goto(`${SITE}/?c=${t0}#/explorer/trouver`, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
    await page.getByText("Tu viens sur Bingoo!").waitFor({ timeout: 20000 }).catch(() => null); await page.waitForTimeout(2000);
    await page.screenshot({ path: `${DOSSIER}/trouver-2s.png` }); console.log(`✓ trouver-2s (page affichée en ${Math.round((Date.now() - t0) / 100) / 10} s)`); }
  for (const [nom, chemin] of [["gratuit-explorer", "#/explorer"], ["gratuit-fiche-geant", "#/explorer/salesforce.com"], ["gratuit-fiche-facile", "#/explorer/pmsuite.co"]]) {
    await page.goto(`${SITE}/?c=${Date.now()}${chemin}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await page.waitForTimeout(5000);
    if (nom === "gratuit-explorer") await page.getByText(/Vitrine gratuite/).waitFor({ timeout: 30000 }).catch(() => console.log("✗ liste vide"));
    await page.waitForTimeout(2000); await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom);
  }
  await ctx.close();
}
// CONSTRUIRE=copie : l'accueil d'un visiteur qui colle une adresse, puis l'étape « compte » (avant toute construction)
if (CONSTRUIRE === "copie") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const page = await ctx.newPage();
  await page.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await page.waitForTimeout(2500);
  await page.locator("#idee").fill(process.env.DOMAINE || "cal.com"); await page.waitForTimeout(600);
  await page.screenshot({ path: `${DOSSIER}/accueil-adresse.png` }); console.log("✓ accueil-adresse");
  await page.getByRole("button", { name: /Faire ma version/ }).click().catch((e) => console.log("✗ Faire ma version", e.message));
  await page.waitForTimeout(1500); await page.screenshot({ path: `${DOSSIER}/accueil-compte.png` }); console.log("✓ accueil-compte :", (await page.evaluate(() => document.querySelector("form")?.innerText ?? "")).replace(/\s+/g, " ").slice(0, 200));
  // Une idée de site écrite en toutes lettres : le genre « Mon site web » se coche tout seul
  await page.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await page.waitForTimeout(2000);
  await page.locator("#idee").fill("je veux un site pour la vente de mes formations"); await page.waitForTimeout(600);
  await page.locator("#idee").scrollIntoViewIfNeeded().catch(() => null); await page.screenshot({ path: `${DOSSIER}/accueil-idee-site.png` }); console.log("✓ accueil-idee-site");
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${DOSSIER}/accueil-mobile.png` }); await ctx.close();
  // Connecté : l'aperçu d'une idée de site, avec le choix du genre en haut
  { const { ctx: c2, page: p2 } = await ouvrir(ws, { "bingoo-idee": { texte: "je veux un site pour la vente de mes formations", type: "site", at: Date.now() } });
    await p2.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await p2.getByText(/Voir mon aperçu|Construire /).first().waitFor({ timeout: 90000 }).catch(() => null); await p2.waitForTimeout(1500);
    await p2.screenshot({ path: `${DOSSIER}/idee-site-apercu.png`, fullPage: true }); console.log("✓ idee-site-apercu"); await c2.close(); }
  // La lecture sans IA de plusieurs sites (logiciels, vitrines), résultats dans le journal
  for (const u of (process.env.SCANS || "cal.com,notion.so,linear.app,www.boulangerie-paul.fr,alan.com,qonto.com").split(",")) {
    const r = await fetch(`${SB}/functions/v1/r/site-scan`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: ws, url: u }) });
    const j = await r.json().catch(() => ({}));
    console.log(`SCAN ${u} → ${r.status}`, r.ok ? JSON.stringify({ nom: j.nom, type: j.type, couleurs: j.couleurs, mode: j.mode, polices: j.polices, rubriques: j.rubriques?.slice(0, 6), boutons: j.boutons?.slice(0, 3), css: j.css_lus }) : JSON.stringify(j).slice(0, 200));
  }
}
// IDEE=1 : le parcours « Construire mon idée » (aperçu gratuit : 1 petit appel d'IA par idée), une idée claire, une floue, une refusée
if (["1", "site", "app", "saas", "varie"].includes(process.env.IDEE)) {
  const IDEES_SAAS = [["idee-claire", "Une app de réservation pour les coiffeurs à domicile, avec rappel la veille"], ["idee-floue", "Une appli comme Uber"], ["idee-refusee", "Un faux site de connexion de ma banque pour récupérer les identifiants"]].map(([n, t]) => [n, t, "saas"]);
  // Sites web (étape 2) : une idée claire et une floue
  const IDEES_SITE = [["site-barber", "site pour les barber"], ["site-claire", "Le site de mon salon de coiffure à domicile à Lyon"], ["site-floue", "Un beau site pour mon entreprise"]].map(([n, t]) => [n, t, "site"]);
  // Apps mobiles (étape 3)
  const IDEES_APP = [["app-claire", "Une app pour suivre mes séances de sport et mes progrès"]].map(([n, t]) => [n, t, "app"]);
  // Grand test : dix idées très différentes (grand public, sport, gestion, création, local…), aucune ne doit ressembler à un CRM
  const IDEES_VARIE = [["v-sport", "Une app de course à pied avec défis entre amis et classement de la semaine", "saas"], ["v-recettes", "Un site de recettes végétariennes où chacun publie ses plats", "saas"], ["v-cours", "Une plateforme de cours de guitare en ligne avec suivi des progrès", "saas"], ["v-asso", "Un outil pour gérer les adhérents et les cotisations de mon club de foot", "saas"], ["v-photo", "Le site de mon studio de photographe de mariage à Bordeaux", "site"], ["v-resto", "Le site de mon restaurant japonais à Nantes avec la carte", "site"], ["v-plombier", "Le site de mon entreprise de plomberie à Lille, dépannage 7j/7", "site"], ["v-budget", "Une app pour suivre mon budget du mois et mes dépenses", "app"], ["v-langues", "Une app pour réviser le vocabulaire anglais avec des cartes", "app"], ["v-ia", "Un outil qui écrit les annonces immobilières à partir de quelques infos", "saas"]];
  const LISTE = process.env.IDEE === "varie" ? IDEES_VARIE : process.env.IDEE === "site" ? IDEES_SITE : process.env.IDEE === "saas" ? [...IDEES_SAAS, ["idee-crm", "Un CRM simple pour les agents immobiliers"]] : process.env.IDEE === "app" ? IDEES_APP : [...IDEES_SAAS, ...IDEES_SITE, ...IDEES_APP];
  // Grand test : un espace neuf (Lancer Pro) pour ne pas dépendre de la limite du jour de l'espace habituel du robot
  let wsI = ws;
  if (process.env.IDEE === "varie") { wsI = await creerEspace("Robot idées " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsI)}`); }
  for (const [nom, texte, type] of LISTE) {
    const { ctx, page } = await ouvrir(wsI, { "bingoo-idee": { texte, type, at: Date.now() } });
    await page.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    const pret = () => page.waitForFunction(() => !/étudie ton idée|prépare l'aperçu/i.test(document.body.innerText) && /Construire \S+ \S|Le nom affiché|précisions|ne peut pas construire|réessaie|Réessayer/i.test(document.querySelector("main")?.innerText ?? document.body.innerText), null, { timeout: 120000 }).catch(() => null);
    await pret(); await page.waitForTimeout(type === "app" ? 1500 : 7000);
    await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom);
    // Site : le vrai gabarit tourne dans un cadre ; on le fait défiler pour photographier la suite de la page
    if (type === "saas") { await page.locator("iframe").first().screenshot({ path: `${DOSSIER}/${nom}-cadre.png` }).catch(() => null); }
    if (type === "site") { const f = page.frameLocator("iframe").first(); for (const [i, y] of [[2, 620], [3, 1240]]) { await f.locator("body").evaluate((b, y) => window.scrollTo(0, y), y).catch(() => null); await page.waitForTimeout(900); await page.locator("iframe").first().screenshot({ path: `${DOSSIER}/${nom}-${i}.png` }).catch(() => null); } }
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
// CONSTRUIRE=motion : le produit « Vidéo motion design » : une phrase venue de l'accueil, la vidéo qui joue, une retouche, l'export
if (CONSTRUIRE === "video-produit") {
  // Vidéo qui montre les vrais écrans du SaaS de démo du robot
  const texte = process.env.TEXTE_IDEE || "Une pub pour présenter mon logiciel aux kinés et ostéos";
  const { page } = await ouvrir(ws, { "bingoo-idee": { texte, type: "video", at: Date.now() } });
  const t0 = Date.now();
  await page.goto(`${SITE}/?c=${t0}#/explorer/motion`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await page.locator("canvas").first().waitFor({ timeout: 120000 }).catch(() => console.log("✗ la vidéo n'est pas apparue"));
  console.log(`Vidéo prête en ${Math.round((Date.now() - t0) / 1000)} s`);
  const [v] = await q(`select script from saas_videos where workspace_id = ${lit(ws)} and app_id is null order by at desc limit 1`);
  console.log(v?.script?.produit ? `✓ vidéo liée au SaaS ${v.script.produit.slug}, allure ${v.script.look}` : "✗ vidéo sans le SaaS");
  console.log("Scènes :", (v?.script?.scenes ?? []).map((x) => x.type + (x.ecran ? `(${x.ecran})` : "")).join(" › "));
  // IDEE=carre ou paysage : la même vidéo exportée dans ce format
  const FMT = { carre: "1:1", paysage: "16:9" }[process.env.IDEE ?? ""]; if (FMT) { await page.waitForTimeout(3000); await page.getByRole("button", { name: FMT, exact: true }).click().catch(() => console.log("✗ format")); console.log("Format :", FMT); }
  await page.waitForTimeout(9000);
  for (let k = 1; k <= 12; k++) { await page.waitForTimeout(2300); await page.locator("canvas").first().screenshot({ path: `${DOSSIER}/produit-${String(k).padStart(2, "0")}.png` }).catch(() => null); }
  // Le vrai fichier vidéo, exporté par le studio comme le ferait le membre
  const dl = page.waitForEvent("download", { timeout: 600000 }).catch(() => null);
  const te = Date.now(); await page.getByRole("button", { name: "Télécharger" }).click().catch(() => null);
  const d = await dl; console.log(`Export en ${Math.round((Date.now() - te) / 1000)} s`);
  if (d) { const f = `${DOSSIER}/video-produit-${d.suggestedFilename()}`; await d.saveAs(f).catch(() => null); console.log("✓ Export :", d.suggestedFilename(), fs.existsSync(f) ? fs.statSync(f).size + " octets" : "?"); } else console.log("✗ export");
} else if (CONSTRUIRE === "motion") {
  const texte = process.env.TEXTE_IDEE || "Une pub pour mon salon de barbier Lame à Lyon, coupe homme 20 €, sur rendez-vous";
  const { ctx, page } = await ouvrir(ws, { "bingoo-idee": { texte, type: "video", at: Date.now() } });
  const t0 = Date.now();
  await page.goto(`${SITE}/?c=${t0}#/explorer/motion`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2500); await page.screenshot({ path: `${DOSSIER}/motion-0-ecriture.png` }).catch(() => null);
  await page.locator("canvas").first().waitFor({ timeout: 90000 }).catch(() => console.log("✗ la vidéo n'est pas apparue"));
  console.log(`Vidéo prête en ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const k of [1, 2, 3, 4, 5, 6, 7, 8, 9]) { await page.waitForTimeout(2700); await page.screenshot({ path: `${DOSSIER}/motion-${k}.png` }).catch(() => null); }
  const scen = await page.evaluate(() => document.body.innerText).catch(() => ""); console.log("Page :", scen.replace(/\s+/g, " ").slice(0, 700));
  // Son logo (dessiné à la volée, fond transparent) envoyé avec le trombone
  const logo = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 520; c.height = 200; const g = c.getContext("2d"); g.fillStyle = "#0F3D2E"; g.beginPath(); g.arc(100, 100, 90, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "800 90px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("L", 100, 106); g.fillStyle = "#0F3D2E"; g.font = "800 84px sans-serif"; g.textAlign = "left"; g.fillText("Lame", 210, 106); return c.toDataURL("image/png").split(",")[1]; });
  await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(logo, "base64") }).catch((e) => console.log("✗ logo", e.message));
  await page.getByText("Ton logo est dans la vidéo").waitFor({ timeout: 60000 }).then(() => console.log("✓ Logo posé")).catch(() => console.log("✗ logo non posé"));
  for (const k of [20, 21, 22, 23]) { await page.waitForTimeout(3100); await page.screenshot({ path: `${DOSSIER}/motion-${k}.png` }).catch(() => null); }
  // Une retouche dans la discussion
  await page.locator("textarea").first().fill("Fond blanc, et ajoute un mot géant qui claque").catch(() => null);
  await page.keyboard.press("Enter").catch(() => null);
  const t1 = Date.now();
  await page.getByText("C'est fait, regarde la nouvelle version.").waitFor({ timeout: 90000 }).catch(() => console.log("✗ retouche sans réponse"));
  console.log(`Retouche en ${Math.round((Date.now() - t1) / 1000)} s`);
  for (const k of [10, 11, 12, 13]) { await page.waitForTimeout(3300); await page.screenshot({ path: `${DOSSIER}/motion-${k}.png` }).catch(() => null); }
  // Format paysage
  await page.getByRole("button", { name: "16:9" }).click().catch(() => null); await page.waitForTimeout(5000); await page.screenshot({ path: `${DOSSIER}/motion-8-paysage.png` }).catch(() => null);
  // Export dans le navigateur
  const dl = page.waitForEvent("download", { timeout: 120000 }).catch(() => null);
  await page.getByRole("button", { name: "Télécharger" }).click().catch(() => null);
  const d = await dl;
  if (d) { const f = `${DOSSIER}/motion-export-${d.suggestedFilename()}`; await d.saveAs(f).catch(() => null); console.log("✓ Export :", d.suggestedFilename(), fs.existsSync(f) ? fs.statSync(f).size + " octets" : "?"); } else console.log("✗ export sans fichier");
  await ctx.close();
}
// CONSTRUIRE=film : le film de l'accueil, filmé pour de vrai (accueil → idée tapée → construction en direct → site en ligne)
if (CONSTRUIRE === "film") {
  const DIR = `${DOSSIER}/film`; fs.mkdirSync(DIR, { recursive: true });
  const video = { recordVideo: { dir: DIR, size: { width: 1440, height: 900 } } };
  const texte = process.env.TEXTE_IDEE || (String(process.env.IDEE ?? "").length > 8 ? process.env.IDEE : "Le site de mon salon de coiffure à domicile à Lyon");
  const marques = {}; const t00 = Date.now(); const marque = (k) => { marques[k] = (Date.now() - t00) / 1000; console.log("FILM", k, marques[k]); };
  // A. L'accueil, sans compte : on tape l'idée
  { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...video }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p.waitForTimeout(1800);
    const z = p.locator("textarea").first(); await z.click().catch(() => null); await z.pressSequentially(texte, { delay: 55 }).catch(() => null); await p.waitForTimeout(1600);
    const v = p.video(); await c.close(); if (v) fs.renameSync(await v.path(), `${DIR}/a-accueil.webm`); }
  // B. Un vrai compte : l'aperçu de l'idée, « Construire », la construction en direct jusqu'à la mise en ligne
  const ws3 = await creerEspace(`Robot film ${new Date().toISOString().slice(0, 16)}`);
  await q(`update workspaces set plan = 'site', plan_status = 'active', onboarded = true where id = ${lit(ws3)}`);
  const { ctx: c2, page: p2 } = await ouvrir(ws3, { "bingoo-idee": { texte, type: "site", at: Date.now() }, "bingoo-guide": "fini" }, video);
  const tB = Date.now(); const rel = () => (Date.now() - tB) / 1000;
  await p2.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  const bouton = p2.getByRole("button", { name: /^Construire / }); await bouton.first().waitFor({ timeout: 120000 }).catch(() => null);
  marques.apercu = rel(); await p2.waitForTimeout(6000); await p2.mouse.wheel(0, 500).catch(() => null); await p2.waitForTimeout(2500);
  await bouton.first().click().catch(() => null); marques.construire = rel();
  let slug = null;
  for (let i = 0; i < 120; i++) { await p2.waitForTimeout(5000); const [a] = await q(`select slug, statut, verif->>'phase' ph from saas_apps where workspace_id = ${lit(ws3)}`); slug = a?.slug ?? slug; if (a?.ph === "fini" || a?.statut === "erreur") break; }
  marques.fini = rel(); await p2.waitForTimeout(4000);
  // C. Le site en ligne, comme un visiteur
  if (slug) { await p2.goto(`${SITE}/?c=${Date.now()}#/app/${slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); marques.site = rel(); await p2.waitForTimeout(3500);
    for (let k = 0; k < 14; k++) { await p2.mouse.wheel(0, 260).catch(() => null); await p2.waitForTimeout(450); } await p2.waitForTimeout(1500); }
  marques.finB = rel();
  const v2 = p2.video(); await c2.close(); if (v2) fs.renameSync(await v2.path(), `${DIR}/b-construction.webm`);
  fs.writeFileSync(`${DIR}/marques.json`, JSON.stringify(marques, null, 2)); console.log("FILM marques", JSON.stringify(marques));
}
if (CONSTRUIRE === "lien-public") {
  // Marque blanche : le badge est sur la page en ligne (sans bouton pour le fermer) ; domaine et retrait du badge refusés hors Lancer Pro
  { const appelR = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); return r.status; };
    const [x] = await q(`select a.id, a.slug, a.workspace_id, w.plan from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' order by a.maj desc limit 1`);
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}#/app/${x.slug}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(7000);
    const fr = p.frames().find((f) => f !== p.mainFrame()) ?? p.mainFrame();
    const badge = await fr.getByText("Built by").count().catch(() => 0), croix = await fr.getByRole("button", { name: "Masquer" }).count().catch(() => 0);
    console.log(badge && !croix ? `✓ badge « Built by Bingoo! » affiché, sans bouton pour le fermer (offre ${x.plan})` : `✗ badge : ${badge} trouvé(s), ${croix} bouton(s) fermer`);
    await p.screenshot({ path: `${DOSSIER}/badge-site.png` }); await c.close();
    const d = await appelR({ workspace_id: x.workspace_id, app_id: x.id, quoi: "domaine", domaine: "exemple-robot.fr" }); console.log(d === 402 ? "✓ nom de domaine refusé hors Lancer Pro (402)" : `✗ domaine : ${d}`);
    const b = await appelR({ workspace_id: x.workspace_id, app_id: x.id, quoi: "badge", sans: true }); console.log(b === 402 ? "✓ retrait du badge refusé hors Lancer Pro (402)" : `✗ badge : ${b}`); }
  // Le lien public d'un site fini : vu par un visiteur, puis par son créateur connecté (qui sortait de l'atelier)
  const [a] = await q(`select a.slug, a.workspace_id from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' order by a.maj desc limit 1`);
  console.log("site :", a?.slug);
  const etat = async (p, nom) => { await p.waitForTimeout(6000); const r = await p.evaluate(() => ({ url: location.href.replace(location.origin, ""), atelier: !!document.querySelector('iframe[title^="Aperçu"]') || /Demander à Bingoo|Construction/.test(document.body.innerText.slice(0, 400)), titre: document.title, texte: document.body.innerText.replace(/\s+/g, " ").slice(0, 120) })); console.log(nom, JSON.stringify(r)); await p.screenshot({ path: `${DOSSIER}/lien-${nom}.png` }); };
  { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", recordVideo: { dir: `${DOSSIER}/film`, size: { width: 1440, height: 900 } } }); const p = await c.newPage(); await p.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await etat(p, "visiteur");
    // Le site en ligne filmé comme un visiteur le parcourt (pour le film de présentation)
    const fr = p.frames().find((f) => f !== p.mainFrame()) ?? p.mainFrame();
    for (let k = 0; k < 16; k++) { await p.mouse.move(720, 500); await p.mouse.wheel(0, 240).catch(() => null); await fr.evaluate(() => window.scrollBy(0, 240)).catch(() => null); await p.waitForTimeout(420); }
    await p.waitForTimeout(1200); const v = p.video(); await c.close(); if (v) { fs.mkdirSync(`${DOSSIER}/film`, { recursive: true }); fs.renameSync(await v.path(), `${DOSSIER}/film/c-visiteur.webm`); console.log("✓ visite filmée"); } }
  { const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" }); await p.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(5000);
    await p.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await etat(p, "createur");
    await p.evaluate((s) => { location.hash = `#/app/${s}`; }, a.slug); await etat(p, "createur-hash"); await c.close(); }
}
if (CONSTRUIRE === "pages") {
  // Site de plusieurs pages : une page « À propos » écrite par l'IA, puis ouverte depuis le menu du site (vue visiteur)
  const [a] = await q(`select a.id, a.slug, a.workspace_id, jsonb_array_length(coalesce(a.spec->'site'->'pages','[]')) n from saas_apps a where a.slug = 'salon-gourmand-3130'`);
  if (a.n < 2) {
    const t0 = Date.now();
    const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, quoi: "page-ajouter", titre: "Privatisation", consigne: "On peut privatiser le salon pour un anniversaire, un baby shower ou une réunion, jusqu'à 20 personnes. On prépare un buffet de pâtisseries sur mesure." }) });
    const j = await r.json().catch(() => ({}));
    console.log(r.status === 200 ? `✓ page écrite en ${Math.round((Date.now() - t0) / 1000)} s : ${JSON.stringify(j.pages)}` : `✗ page : ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  }
  const [v] = await q(`select (select string_agg(x->>'id', ', ') from jsonb_array_elements(spec->'site'->'pages'->-1->'sections') x) ids, left(regexp_replace(regexp_replace((select string_agg(x->>'html',' ') from jsonb_array_elements(spec->'site'->'pages'->-1->'sections') x), '<style[^<]*</style>', ' ', 'g'), '<[^>]+>', ' ', 'g'), 900) txt from saas_apps where id = ${lit(a.id)}`);
  console.log("sections :", v.ids); console.log("texte :", String(v.txt ?? "").replace(/\s+/g, " ").slice(0, 800));
  for (const [nom, vp, mobile] of [["ordi", { width: 1440, height: 900 }, false], ["tel", { width: 390, height: 844 }, true]]) {
    const c = await browser.newContext({ viewport: vp, locale: "fr-FR", isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(8000);
    const fr = p.frameLocator("iframe").first();
    if (mobile) await fr.locator(".nav__toggle").click().catch(() => null);
    await p.waitForTimeout(600); await p.screenshot({ path: `${DOSSIER}/pages-${nom}-0-menu.png` });
    await fr.getByRole("link", { name: "Privatisation" }).first().click().catch((e) => console.log("✗ lien", e.message.slice(0, 100)));
    await p.waitForTimeout(2500); await p.screenshot({ path: `${DOSSIER}/pages-${nom}-1-apropos.png` });
    const h1 = await fr.locator("h1").first().innerText().catch(() => "?"); console.log(`✓ ${nom} : h1 de la page = « ${h1.replace(/\s+/g, " ")} »`);
    if (!mobile) { await p.mouse.wheel(0, 900); await p.waitForTimeout(1200); await p.screenshot({ path: `${DOSSIER}/pages-${nom}-2-suite.png` }); await fr.locator('a[href="#accueil-contact"]').first().click().catch((e) => console.log("✗ bouton contact", e.message.slice(0, 80))); await p.waitForTimeout(2500); await p.screenshot({ path: `${DOSSIER}/pages-${nom}-3-retour-contact.png` }); }
    await c.close();
  }
}
if (CONSTRUIRE === "blog") {
  // Blog d'un site : un article écrit à partir d'un sujet, puis sa page publique (lue par Google)
  const [a] = await q(`select a.id, a.slug, a.workspace_id from saas_apps a where a.slug = 'fleuriste-rennes-382a'`);
  const t0 = Date.now();
  const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, quoi: "article-ecrire", sujet: "Comment choisir les fleurs d'un bouquet de mariage selon la saison" }) });
  const j = await r.json().catch(() => ({}));
  const art = (j.articles ?? [])[0];
  console.log(r.status === 200 && art ? `✓ article écrit en ${Math.round((Date.now() - t0) / 1000)} s : « ${art.titre} » (${String(art.contenu ?? "").split(/\s+/).length} mots)` : `✗ article : ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  if (art) {
    console.log("début :", String(art.contenu).replace(/\s+/g, " ").slice(0, 600));
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
    const u = `${SITE}/a/${a.slug}/${art.slug}`; const rep = await p.goto(u, { waitUntil: "load", timeout: 60000 }).catch(() => null);
    console.log(`page publique ${u} : ${rep?.status()}`); await p.waitForTimeout(1500); await p.screenshot({ path: `${DOSSIER}/blog-article.png`, fullPage: false }); await c.close();
  }
}
if (CONSTRUIRE === "support-ecran") {
  // La bulle d'aide dans l'appli, et la promesse dans les tarifs de l'accueil
  const [a] = await q(`select a.workspace_id from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' order by a.maj desc limit 1`);
  const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(8000);
  await p.getByRole("button", { name: "Ouvrir l'aide" }).click().catch((e) => console.log("✗ bulle", e.message.slice(0, 80)));
  await p.getByLabel("Ta question").fill("Comment je change la photo de mon site ?").catch(() => null);
  await p.getByLabel("Ta question").press("Enter").catch(() => null);
  await p.waitForTimeout(14000); await p.screenshot({ path: `${DOSSIER}/support-bulle.png` }); console.log("✓ bulle");
  await c.close();
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p2 = await c2.newPage();
  await p2.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(3000);
  await p2.locator("#prix").scrollIntoViewIfNeeded().catch(() => null); await p2.waitForTimeout(2500);
  await p2.locator("#prix").screenshot({ path: `${DOSSIER}/promesse-tarifs.png` }).catch((e) => console.log("✗ tarifs", e.message.slice(0, 80))); console.log("✓ tarifs");
  await c2.close();
}
if (CONSTRUIRE === "support") {
  // Support : réponse immédiate de l'assistant, puis transmission à un humain (un e-mail de test part vers l'équipe)
  const [a] = await q(`select a.workspace_id from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' order by a.maj desc limit 1`);
  const appel = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/support`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, ...corps }) }); return [r.status, await r.json().catch(() => ({}))]; };
  for (const question of ["Comment je change la photo de mon site ?", "Une modification ne me plaît pas, je l'ai payée pour rien ?", "Je veux être remboursé de mon abonnement"]) {
    const t0 = Date.now(), [st, j] = await appel({ question });
    console.log(`${st === 200 ? "✓" : "✗"} « ${question} » en ${Math.round((Date.now() - t0) / 1000)} s : ${String(j.reponse ?? j.error ?? "").replace(/\s+/g, " ").slice(0, 400)}`);
  }
  const [st2] = await appel({ question: "[TEST DU ROBOT, rien à faire] Je voudrais parler à quelqu'un", humain: true, echange: [{ qui: "moi", texte: "test" }] });
  console.log(st2 === 200 ? "✓ transmis à un humain (e-mail de test envoyé à l'équipe)" : `✗ humain : ${st2}`);
}
if (CONSTRUIRE === "modif-rendue") {
  // « Tu ne paies jamais nos erreurs » : une modification payée (simulée, sans IA) puis annulée doit être rendue
  const [a] = await q(`select a.id, a.slug, a.workspace_id from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' order by a.maj desc limit 1`);
  const [v] = await q(`select min(version) v from saas_app_versions where app_id = ${lit(a.id)}`);
  const debut = new Date(Date.now() - 60000).toISOString();
  await q(`insert into activity (workspace_id, kind, summary) values (${lit(a.workspace_id)}, 'modifier_app', 'Modification (test du robot)')`);
  await q(`update saas_apps set paiement_modif = jsonb_build_object('version_avant', ${Number(v.v)}, 'at', ${lit(debut)}) where id = ${lit(a.id)}`);
  const [avant] = await q(`select count(*)::int n from activity where workspace_id = ${lit(a.workspace_id)} and kind = 'modifier_app' and created_at >= date_trunc('month', now())`);
  const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, quoi: "restaurer", version: Number(v.v) }) });
  const j = await r.json().catch(() => ({}));
  const [apres] = await q(`select count(*)::int n from activity where workspace_id = ${lit(a.workspace_id)} and kind = 'modifier_app' and created_at >= date_trunc('month', now())`);
  console.log(`modifications du mois : ${avant.n} avant, ${apres.n} après ; réponse ${r.status} ${JSON.stringify(j.rendue ?? null)}`);
  console.log(j.rendue && apres.n === avant.n - 1 ? "✓ modification annulée et rendue" : "✗ pas rendue");
  // Une 2e annulation de la même modification ne rend plus rien
  const r2 = await (await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, quoi: "restaurer", version: Number(v.v) }) })).json().catch(() => ({}));
  console.log(r2.rendue ? "✗ rendue deux fois" : "✓ pas rendue une deuxième fois");
}
if (CONSTRUIRE === "edition-directe") {
  // Les 3 outils d'édition directe de l'atelier, sur le dernier site du robot : sections, image, police
  const [a] = await q(`select a.id, a.slug, a.workspace_id, a.version from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' and a.spec->'site'->'page'->'sections' is not null order by a.maj desc limit 1`);
  console.log("site :", a?.slug, "version", a?.version);
  const ordreDe = async () => (await q(`select spec->'site'->'page'->'sections' s, spec->>'police_titres' t, spec->>'police' x, version from saas_apps where id = ${lit(a.id)}`))[0];
  const avant = await ordreDe(); console.log("ordre avant :", (avant.s ?? []).map((x) => x.id).join(" › "));
  const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(9000);
  // L'aperçu affiche la page de l'app, qui contient elle-même l'application dans un second cadre
  const cadre = () => p.frameLocator('iframe[title^="Aperçu"]').frameLocator("iframe").first();
  const outil = async (nom) => { await p.getByRole("button", { name: nom }).first().click().catch((e) => console.log("✗ bouton", nom, e.message.slice(0, 80))); await p.waitForTimeout(1500); };
  await p.screenshot({ path: `${DOSSIER}/edition-0-atelier.png` });
  // 1. Sections : les poignées, puis la 2e section glissée tout en bas
  await outil("⠿ Sections");
  await cadre().locator("main").first().evaluate(() => window.scrollTo(0, 0)).catch(() => null);
  await p.waitForTimeout(800); await p.screenshot({ path: `${DOSSIER}/edition-1-sections.png` });
  const ifr = await p.locator('iframe[title^="Aperçu"]').boundingBox();
  const prises = cadre().getByText("⠿ Glisser");
  console.log("poignées visibles :", await prises.count());
  const fr = p.frames().find((f) => f.url().includes("/app") || f !== p.mainFrame());
  // Descendre la 1re section du contenu avec le bouton ↓ (geste simple), puis glisser à la souris
  await cadre().getByRole("button", { name: "Descendre cette section" }).first().click().catch((e) => console.log("✗ descendre", e.message.slice(0, 80)));
  await p.waitForTimeout(2500); await p.screenshot({ path: `${DOSSIER}/edition-2-section-deplacee.png` });
  const b1 = await prises.first().boundingBox().catch(() => null);
  if (b1 && ifr) { await p.mouse.move(b1.x + 20, b1.y + 10); await p.mouse.down(); for (let k = 1; k <= 12; k++) { await p.mouse.move(b1.x + 20, b1.y + 10 + k * 55); await p.waitForTimeout(60); } await p.screenshot({ path: `${DOSSIER}/edition-3-glisse.png` }); await p.mouse.up(); await p.waitForTimeout(2500); }
  const apres1 = await ordreDe(); console.log("ordre après :", (apres1.s ?? []).map((x) => x.id).join(" › "), "version", apres1.version);
  // 2. Image : clic sur la première image, une photo de test choisie
  await outil("▣ Image");
  await cadre().locator("main").first().evaluate(() => window.scrollTo(0, 0)).catch(() => null); await p.waitForTimeout(800);
  const img = cadre().locator("main img").first(); await img.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(800); const bi = await img.boundingBox().catch(() => null);
  if (bi) {
    const fc = p.waitForEvent("filechooser", { timeout: 15000 }).catch(() => null);
    await p.mouse.click(bi.x + bi.width / 2, bi.y + bi.height / 2); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${DOSSIER}/edition-4a-image-choisie.png` });
    await p.getByRole("button", { name: "Choisir ma photo" }).click().catch((e) => console.log("✗ choisir", e.message.slice(0, 80)));
    const ch = await fc; if (ch) { await ch.setFiles("public/vitrine/tablio.jpg"); console.log("✓ photo choisie"); } else console.log("✗ pas de choix de fichier");
    await p.waitForTimeout(12000); await p.screenshot({ path: `${DOSSIER}/edition-4-image.png` });
  } else console.log("✗ aucune image dans la page");
  // 3. Police : essai en direct, capture, puis enregistrement
  await outil("Aa Police");
  await p.getByRole("button", { name: "Playfair Display" }).first().click().catch(() => null); await p.waitForTimeout(800);
  await p.getByRole("button", { name: "Lato" }).first().click().catch(() => null); await p.waitForTimeout(3000);
  await p.screenshot({ path: `${DOSSIER}/edition-5-police-essai.png` });
  await p.getByRole("button", { name: /Garder ces polices/ }).click().catch((e) => console.log("✗ garder", e.message.slice(0, 80)));
  await p.waitForTimeout(9000); await p.screenshot({ path: `${DOSSIER}/edition-6-police-gardee.png` });
  const fin = await ordreDe(); console.log("polices enregistrées :", fin.t, "/", fin.x, "version", fin.version);
  console.log("images remplacées :", JSON.stringify(fin.s ?? []).includes("/apps/images/") ? "oui" : "non");
  await c.close();
}
if (CONSTRUIRE === "vitrine-accueil") {
  // La vitrine des réalisations sur la page d'accueil, telle qu'un visiteur la voit (ordinateur puis téléphone)
  for (const [nom, vp, mobile] of [["ordi", { width: 1440, height: 900 }, false], ["tel", { width: 390, height: 844 }, true]]) {
    const c = await browser.newContext({ viewport: vp, locale: "fr-FR", isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(4000);
    const sec = p.locator('section[aria-label="SaaS construits avec Bingoo!"]');
    await sec.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(3500);
    await sec.screenshot({ path: `${DOSSIER}/vitrine-accueil-${nom}.png` }).catch((e) => console.log("✗", e.message));
    await p.waitForTimeout(6000); await sec.screenshot({ path: `${DOSSIER}/vitrine-accueil-${nom}-b.png` }).catch(() => null);
    console.log(`✓ vitrine ${nom}`); await c.close();
  }
}
if (CONSTRUIRE === "rdv-photos") {
  // Photos du membre posées sur sa page (sans IA) et prise de rendez-vous par créneaux, sur deux sites du robot.
  // Les photos d'essai viennent d'un autre site du robot ; elles sont retirées à la fin, comme le rendez-vous d'essai.
  const [sP, sR] = String(/-/.test(process.env.IDEE ?? "") ? process.env.IDEE : "le-comptoir-de-lina-0k2d,atelier-meche-2j0d").split(",").map((x) => x.trim());
  const [a] = await q(`select id, slug, workspace_id from saas_apps where slug = ${lit(sP)}`);
  const reg = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, ...corps }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
  const fr = () => p.frames().find((f) => f !== p.mainFrame()) ?? p.mainFrame();
  const voir = async (nom) => { await p.goto(`${SITE}/?c=${Date.now()}#/app/${sP}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(9000); await p.screenshot({ path: `${DOSSIER}/photos-${nom}.png` }); if (await fr().locator("#photos-membre").count()) { await fr().locator("#photos-membre").scrollIntoViewIfNeeded(); await fr().evaluate(() => window.scrollBy(0, 200)); await p.waitForTimeout(2500); await p.screenshot({ path: `${DOSSIER}/photos-${nom}-bande.png` }); } };
  await voir("avant");
  const src = await q(`select jsonb_path_query(spec->'site'->'page'->'images', '$.*.url') #>> '{}' u from saas_apps where slug in ('hotel-lumiere-lyon-144n', 'atelier-meche-2j0d', 'hotel-des-quais-1m24', 'studio-souffle-5u4p')`);
  const sources = [...new Set(src.map((x) => x.u).filter((u) => /^https:/.test(u ?? "")))].slice(0, 4);
  console.log("photos d'essai trouvées :", sources.length);
  const posees = [];
  for (const u of sources) {
    const data = await p.evaluate(async (u) => { const b = await (await fetch(u)).blob(), im = await createImageBitmap(b), k = Math.min(1, 1600 / Math.max(im.width, im.height)), cv = document.createElement("canvas"); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL("image/jpeg", 0.85); }, u).catch(() => null);
    if (!data) continue;
    const r = await reg({ quoi: "image", image: data }); if (r.j.url) posees.push(r.j.url); else console.log("✗ dépôt :", r.status);
  }
  const po = await reg({ quoi: "photos", photos: posees });
  console.log("photos posées :", po.status === 200 && (po.j.photos ?? []).length === posees.length && posees.length >= 2 ? `✓ ${posees.length}` : `✗ ${po.status} ${JSON.stringify(po.j).slice(0, 160)}`);
  const ref = await reg({ quoi: "photos", photos: ["https://exemple.org/x.jpg"] });
  console.log("adresse d'image étrangère :", (ref.j.photos ?? []).length === 0 ? "✓ écartée" : "✗ acceptée");
  await reg({ quoi: "photos", photos: posees });
  await voir("apres");
  const { ctx: c2, page: p2 } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p2.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=photos`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(7000);
  console.log("onglet Photos :", (await p2.getByText("Haut de page").count().catch(() => 0)) ? "✓ affiché" : "✗ absent");
  await p2.screenshot({ path: `${DOSSIER}/photos-reglages.png`, fullPage: true }); await c2.close();
  await reg({ quoi: "photos", photos: [] });
  const [fin] = await q(`select (spec->'site'->'page')::text like '%data-bingoo-membre%' reste, jsonb_array_length(spec->'site'->'page'->'sections') n from saas_apps where id = ${lit(a.id)}`);
  console.log("photos retirées, page comme avant :", fin.reste === false ? "✓" : "✗");
  // Rendez-vous par créneaux, comme un visiteur
  const j = new Date(Date.now() + 8 * 864e5); while (j.getDay() !== 3) j.setDate(j.getDate() + 1);
  const jour = j.toISOString().slice(0, 10);
  const ouvrirForm = async () => { await p.goto(`${SITE}/?c=${Date.now()}#/app/${sR}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(9000); await fr().locator(".bingoo-form").first().scrollIntoViewIfNeeded(); await fr().locator(".bingoo-form input[type=date]").first().fill(jour); await p.waitForTimeout(800); };
  await ouvrirForm();
  const nb = await fr().locator(".bingoo-creneaux button").count();
  console.log("créneaux proposés :", nb > 4 ? `✓ ${nb}` : `✗ ${nb}`);
  await fr().locator(".bingoo-creneaux button", { hasText: /^10 h$/ }).first().click();
  await fr().locator(".bingoo-form input").nth(0).fill("Robot rendez-vous"); await fr().locator(".bingoo-form input[type=tel]").first().fill("06 00 00 00 00");
  await p.waitForTimeout(500); await p.screenshot({ path: `${DOSSIER}/rdv-creneaux.png` });
  await fr().locator(".bingoo-form button[type=submit]").first().click(); await p.waitForTimeout(5000);
  console.log("rendez-vous demandé :", (await fr().getByText("Ce créneau vous est gardé").count()) ? "✓" : "✗");
  await p.screenshot({ path: `${DOSSIER}/rdv-confirme.png` });
  await ouvrirForm();
  console.log("créneau repris :", (await fr().locator(".bingoo-creneaux button", { hasText: /^10 h$/ }).first().isDisabled().catch(() => false)) ? "✓ barré" : "✗ encore proposé");
  await p.screenshot({ path: `${DOSSIER}/rdv-pris.png` });
  const dbl = await fetch(`${SB}/functions/v1/t/app/${sR}/site-contact`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ data: { nom: "Robot rendez-vous", telephone: "06 00 00 00 00", date_souhaitee: jour, heure: "10:00" } }) });
  console.log("même créneau demandé deux fois :", dbl.status === 409 ? "✓ refusé" : `✗ ${dbl.status}`);
  await q(`delete from saas_app_rows where col = 'demandes' and data->>'nom' = 'Robot rendez-vous'`); await q(`delete from saas_app_attente where col = 'demandes' and data->>'nom' = 'Robot rendez-vous'`);
  await c.close(); console.log("sites de test remis en état");
}
if (CONSTRUIRE === "automatisations") {
  // Automatisations d'un logiciel, jouées par le serveur : réglées par le propriétaire, déclenchées par un utilisateur de démonstration
  const slug = /-/.test(process.env.IDEE ?? "") ? process.env.IDEE : "changeo-5u0t";
  const [a] = await q(`select id, slug, workspace_id from saas_apps where slug = ${lit(slug)}`);
  const reg = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, ...corps }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const pose = await reg({ quoi: "automatisations", liste: [
    { nom: "Repérer les grosses conversions", evenement: "fiche_creee", collection: "conversions", si: { champ: "montant", op: ">", valeur: "500" }, alors: [{ type: "modifier", champ: "note", valeur: "Grosse conversion" }] },
    { nom: "Garder en favori", evenement: "fiche_modifiee", collection: "conversions", si: { champ: "note", op: "=", valeur: "favori" }, alors: [{ type: "creer", collection: "favoris", data: { devise_depart: "{{devise_depart}}", devise_arrivee: "{{devise_arrivee}}", nom_favori: "{{devise_depart}} vers {{devise_arrivee}}" } }] },
    { nom: "Liste inconnue", evenement: "fiche_creee", collection: "pirates", alors: [{ type: "modifier", champ: "x", valeur: "y" }] },
  ] });
  console.log("automatisations enregistrées :", (pose.j.automatisations ?? []).length === 2 ? "✓ 2 gardées, 1 refusée (liste inconnue)" : `✗ ${pose.status} ${JSON.stringify(pose.j).slice(0, 200)}`);
  const API = `${SB}/functions/v1/t/app/${a.slug}`;
  const demo = await fetch(`${API}/demo`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: "{}" }).then((r) => r.json()).catch(() => ({}));
  console.log("utilisateur de démonstration :", demo.token ? "✓" : `✗ ${JSON.stringify(demo).slice(0, 160)}`);
  const app = async (action, corps) => { const r = await fetch(`${API}/${action}`, { method: "POST", headers: { apikey: ANON, "x-app-token": demo.token, "content-type": "application/json" }, body: JSON.stringify(corps) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  const fav = async () => (await app("list", { col: "favoris" })).j;
  const avant = (await fav()).length ?? 0;
  const g = await app("add", { col: "conversions", data: { montant: 800, devise_depart: "EUR", devise_arrivee: "USD", note: "" } });
  console.log("création au-dessus du seuil :", JSON.stringify(g.j).includes("Grosse conversion") ? "✓ note posée par le serveur" : `✗ ${g.status} ${JSON.stringify(g.j).slice(0, 200)}`);
  const pt = await app("add", { col: "conversions", data: { montant: 100, devise_depart: "EUR", devise_arrivee: "GBP", note: "" } });
  console.log("création sous le seuil :", !JSON.stringify(pt.j).includes("Grosse conversion") && pt.status === 200 ? "✓ rien" : `✗ ${pt.status}`);
  const m1 = await app("update", { col: "conversions", id: pt.j.id, data: { note: "favori" } });
  const apres = await fav();
  console.log("modification qui remplit la condition :", m1.status === 200 && apres.length === avant + 1 && JSON.stringify(apres).includes("EUR vers GBP") ? "✓ favori créé (« EUR vers GBP »)" : `✗ ${m1.status} ${apres.length}/${avant}`);
  await app("update", { col: "conversions", id: pt.j.id, data: { montant: 120 } });
  console.log("nouvelle retouche de la même fiche :", (await fav()).length === avant + 1 ? "✓ pas de second favori" : "✗ doublon");
  const { ctx: c2, page: p2 } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p2.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=automatisations`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(7000);
  console.log("onglet Automatisations :", (await p2.getByText("Repérer les grosses conversions").count().catch(() => 0)) ? "✓ affiché" : "✗ absent");
  await p2.screenshot({ path: `${DOSSIER}/automatisations.png`, fullPage: true });
  await p2.getByText("Ajouter une automatisation").click().catch(() => null); await p2.waitForTimeout(800);
  await p2.screenshot({ path: `${DOSSIER}/automatisations-ajout.png`, fullPage: true }); await c2.close();
  await reg({ quoi: "automatisations", liste: [] });
  for (const id of [g.j.id, pt.j.id].filter(Boolean)) await q(`delete from saas_app_rows where id = ${lit(id)}`);
  await q(`delete from saas_app_rows where app_id = ${lit(a.id)} and col = 'favoris' and data->>'nom_favori' = 'EUR vers GBP'`);
  console.log("logiciel de test remis en état");
}
if (CONSTRUIRE === "video-clip") {
  // Essai d'un clip animé : une image de départ, puis un clip de 5 s où l'objet bouge ; le journal ne montre que des états
  const appel = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/video-clip-essai`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* texte */ } return { ok: r.ok, j, t: t.slice(0, 200) }; };
  const wsC = await creerEspace("Robot clips " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsC)}`);
  const [image, mouvement] = /\|/.test(process.env.IDEE ?? "") ? process.env.IDEE.split("|").map((x) => x.trim()) : ["an empty clear drinking glass standing on a plain cream background, studio product shot, soft light", "fresh orange juice is poured from above and the glass slowly fills up to the top"];
  const l = await appel({ workspace_id: wsC, image, mouvement });
  console.log(l.ok ? "✓ clip lancé" : `✗ lancement : ${l.t}`);
  if (l.ok) {
    const fs2 = await import("node:fs"); const b0 = await fetch(l.j.image).then((x) => x.arrayBuffer()).catch(() => null); if (b0) fs2.writeFileSync(`${DOSSIER}/clip-depart.jpg`, Buffer.from(b0));
    let fin = null; for (let i = 0; i < 48 && !fin; i++) { await new Promise((r) => setTimeout(r, 10000)); const e = await appel({ workspace_id: wsC, etape: "etat", suivi: l.j.suivi, resultat: l.j.resultat }); if (!e.ok) { fin = { etat: "echec", detail: e.t }; } else if (e.j.etat !== "en_cours") fin = e.j; }
    console.log(fin?.etat === "pret" ? `✓ clip prêt (${fin.cout?.toFixed(2)} €)` : `✗ clip : ${fin?.etat ?? "trop long"} ${fin?.detail ?? ""}`);
    if (fin?.url) { const b = await fetch(fin.url).then((x) => x.arrayBuffer()); fs2.writeFileSync(`${DOSSIER}/clip.mp4`, Buffer.from(b)); }
  }
}
if (CONSTRUIRE === "video-images") {
  // Une vidéo avec les images de ce que la personne décrit : le scénario est écrit dans le journal, les images créées sont rangées
  // dans le dossier de captures (ce sont des images faites par Bingoo!, aucune donnée privée)
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* texte */ } return { ok: r.ok, j, t: t.slice(0, 200) }; };
  const wsV = await creerEspace("Robot vidéos " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsV)}`);
  const idees = /\s/.test(process.env.IDEE ?? "") ? process.env.IDEE.split("|").map((x) => x.trim()).filter(Boolean).slice(0, 8) : ["Une pub pour ma boulangerie artisanale à Rennes : baguettes, croissants et pains au levain, sortis du four chaque matin"];
  const fs2 = await import("node:fs");
  for (const [n, idee] of idees.entries()) {
    const r = await appel("video-creer", { workspace_id: wsV, texte: idee, format: "vertical" });
    const sc = r.j?.script ?? null, ims = Object.entries(sc?.images ?? {});
    console.log(r.ok && sc ? `✓ vidéo ${n + 1} : allure ${sc.look}, ${sc.scenes?.length} scènes : ${sc.scenes?.map((x) => x.type).join(" › ")} ; images ${ims.length}` : `✗ vidéo ${n + 1} : ${r.t}`);
    if (sc) { fs2.writeFileSync(`${DOSSIER}/video-${n + 1}-script.json`, JSON.stringify(sc)); for (const [k, v] of ims) { const b = await fetch(v.url).then((x) => x.arrayBuffer()).catch(() => null); if (b) fs2.writeFileSync(`${DOSSIER}/video-${n + 1}-${k}.jpg`, Buffer.from(b)); } }
  }
}
if (CONSTRUIRE === "galerie") {
  // Galerie : les pages publiques demandées (IDEE = slugs séparés par des virgules), vues par un visiteur, sur ordinateur et sur téléphone
  const slugs = String(process.env.IDEE ?? "").split(",").map((x) => x.trim()).filter((x) => /^[a-z0-9-]+$/.test(x)).slice(0, 30);
  const premierEcran = slugs.length > 4; // beaucoup de pages : seulement leur premier écran, sur ordinateur
  for (const slug of slugs) {
    for (const [nom, vp, mobile] of premierEcran ? [["ordi", { width: 1440, height: 900 }, false]] : [["ordi", { width: 1440, height: 900 }, false], ["tel", { width: 390, height: 844 }, true]]) {
      const c = await browser.newContext({ viewport: vp, locale: "fr-FR", isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 }); const p = await c.newPage();
      await p.goto(`${SITE}/?c=${Date.now()}#/app/${slug}`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(8000);
      await p.screenshot({ path: `${DOSSIER}/galerie-${slug}-${nom}.png` });
      if (premierEcran) { console.log(`✓ ${slug}`); await c.close(); continue; }
      // La page entière, en descendant pour réveiller les animations au défilement
      const fr = p.frames().find((f) => f !== p.mainFrame()) ?? p.mainFrame();
      // La page est dans un cadre : on la fait défiler écran par écran (8 au plus), chaque écran est photographié
      const H = await fr.evaluate(() => document.documentElement.scrollHeight).catch(() => vp.height);
      for (let k = 0, y = 0; k < 8 && y < H; k++, y += vp.height) {
        await fr.evaluate((yy) => window.scrollTo(0, yy), y).catch(() => null); await p.waitForTimeout(900);
        await p.screenshot({ path: `${DOSSIER}/galerie-${slug}-${nom}-${k}.png` });
      }
      console.log(`✓ ${slug} (${nom})`); await c.close();
    }
  }
}
if (CONSTRUIRE === "stores") {
  // Publication sur les stores, sur le SaaS de démo du robot : clés d'essai fabriquées sur place (sans valeur), file d'attente, nettoyage
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, j, t: t.slice(0, 160) }; };
  const [a] = await q(`select id, slug from saas_apps where workspace_id = ${lit(ws)} and statut = 'pret' order by maj desc limit 1`);
  const { page: pm } = await ouvrir(ws, { "bingoo-guide": "fini" });
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=mobile`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(5000);
  const vu = await pm.getByText("Sur les stores").count(); console.log(vu ? "✓ bloc « Sur les stores » affiché" : "✗ bloc stores absent");
  await pm.getByText("Sur les stores").scrollIntoViewIfNeeded().catch(() => null); await pm.screenshot({ path: `${DOSSIER}/stores-0.png` });
  await pm.getByRole("button", { name: "Brancher mon compte" }).first().click().catch(() => null); await pm.waitForTimeout(800); await pm.screenshot({ path: `${DOSSIER}/stores-1.png` });
  const mauvais = await appel("saas-app-stores", { workspace_id: ws, app_id: a.id, plateforme: "ios", quoi: "cle", issuer_id: "x", key_id: "y", team_id: "z", p8: "rien" });
  console.log(!mauvais.ok ? "✓ clé mal formée refusée" : "✗ clé mal formée acceptée");
  const p8 = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" });
  const r1 = await appel("saas-app-stores", { workspace_id: ws, app_id: a.id, plateforme: "ios", quoi: "cle", issuer_id: crypto.randomUUID(), key_id: "TESTROBOT1", team_id: "TESTROBOT2", p8 });
  console.log(r1.ok && r1.j?.ios?.cle?.apercu ? "✓ clé d'essai rangée, aperçu seul renvoyé" : `✗ clé : ${r1.t}`);
  const fuite = JSON.stringify(r1.j ?? {}).includes("PRIVATE KEY"); console.log(fuite ? "✗ la clé revient au navigateur" : "✓ la clé ne revient jamais au navigateur");
  const [cofre] = await q(`select count(*)::int n from app_stores_cles where app_id = ${lit(a.id)} and plateforme = 'ios'`); console.log(cofre.n === 1 ? "✓ clé dans le coffre" : "✗ coffre");
  const r2 = await appel("saas-app-stores", { workspace_id: ws, app_id: a.id, plateforme: "ios", quoi: "publier" });
  console.log(r2.ok && r2.j?.ios?.derniere?.statut === "attente" ? `✓ publication en file (${r2.j.identifiant}, n°${r2.j.ios.derniere.numero})` : `✗ publier : ${r2.t}`);
  const r3 = await appel("saas-app-stores", { workspace_id: ws, app_id: a.id, plateforme: "ios", quoi: "publier" }); console.log(!r3.ok ? "✓ pas de double publication" : "✗ double publication");
  await pm.reload({ waitUntil: "networkidle" }).catch(() => null); await pm.waitForTimeout(5000); await pm.getByText("Sur les stores").scrollIntoViewIfNeeded().catch(() => null); await pm.screenshot({ path: `${DOSSIER}/stores-2.png` });
  // Nettoyage : la demande d'essai et la clé d'essai disparaissent
  await q(`delete from app_publications where app_id = ${lit(a.id)}`);
  const r4 = await appel("saas-app-stores", { workspace_id: ws, app_id: a.id, plateforme: "ios", quoi: "retirer" });
  const [reste] = await q(`select count(*)::int n from vault.secrets where name like ${lit("stores:" + a.id + "%")}`); console.log(r4.ok && !r4.j?.ios?.cle && reste.n === 0 ? "✓ clé retirée du coffre" : "✗ retrait");
}
if (CONSTRUIRE === "gratuit-ia") {
  // Offre gratuite : 3 aperçus par mois sans images IA, aucune construction, moins de 2 centimes d'IA
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, status: r.status, j, t: t.slice(0, 160) }; };
  const wsG = await creerEspace("Robot gratuit " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'essai', plan_status = 'trialing', onboarded = true where id = ${lit(wsG)}`);
  const idees = ["Une app de réservation pour les coiffeurs à domicile", "Un logiciel de devis pour les plombiers", "Un outil de suivi des stocks pour les fleuristes", "Un planning pour les profs de yoga"];
  for (let i = 0; i < 3; i++) {
    const r = await appel("saas-idee-apercu", { workspace_id: wsG, texte: idees[i], type: "saas" });
    const img = JSON.stringify(r.j ?? {}).includes("\"ia\":true");
    console.log(i < 2 ? (r.ok && r.j?.apercu ? `✓ aperçu gratuit ${i + 1}/2${img ? " ✗ avec images IA" : ", sans images IA"}` : `✗ aperçu ${i + 1} : ${r.t}`) : (r.status === 402 ? "✓ 3e aperçu refusé (402)" : `✗ 3e aperçu : ${r.status} ${r.t}`));
  }
  const c = await appel("saas-construire", { workspace_id: wsG, projet_id: crypto.randomUUID() }); console.log(c.status === 402 ? "✓ construction refusée à l'offre gratuite" : `✗ construction : ${c.status}`);
  const v = await appel("video-creer", { workspace_id: wsG, texte: "Une pub pour ma boulangerie", format: "vertical" }); console.log(!v.ok ? `✓ vidéo IA refusée (${v.status})` : "✗ vidéo créée en gratuit");
  const [d] = await q(`select coalesce(sum(cost_eur), 0)::float c from ai_usage where workspace_id = ${lit(wsG)}`); console.log(d.c <= 0.02 ? `✓ coût IA de ce compte gratuit : ${(d.c * 100).toFixed(2)} centime(s)` : `✗ coût : ${(d.c * 100).toFixed(2)} centimes`);
}
if (CONSTRUIRE === "connexions") {
  // Connexions sortantes, panier et GitHub : ce qui se vérifie sans compte extérieur (aucune clé n'est saisie par le robot)
  const [a] = await q(`select a.id, a.slug, a.workspace_id from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' and a.spec->'site'->'page'->'sections' is not null order by a.maj desc limit 1`);
  const reg = async (corps) => { const r = await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a.workspace_id, app_id: a.id, ...corps }) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
  // Adresses refusées : pas de https, réseau interne, adresse IP
  for (const u of ["http://exemple.org/x", "https://localhost/x", "https://10.0.0.1/x", "https://www.bingoo.fr/x"]) { const r = await reg({ quoi: "connexion-ajouter", url: u, evenements: ["demande"] }); console.log(`adresse ${u} :`, r.status === 400 ? "✓ refusée" : `✗ acceptée (${r.status})`); }
  const aj = await reg({ quoi: "connexion-ajouter", url: "https://httpbin.org/post", evenements: ["demande"] });
  const id = aj.j.liste?.at(-1)?.id;
  console.log("connexion ajoutée :", aj.status === 200 && id ? "✓" : `✗ ${aj.status} ${JSON.stringify(aj.j).slice(0, 160)}`);
  const es = await reg({ quoi: "connexion-tester", id });
  console.log("envoi d'essai :", es.j.recu ? `✓ reçu (réponse ${es.j.code})` : `✗ ${es.status} ${JSON.stringify(es.j).slice(0, 160)}`);
  // Une vraie demande déposée sur le site, comme un visiteur : la connexion doit être prévenue
  const dm = await fetch(`${SB}/functions/v1/t/app/${a.slug}/site-contact`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ data: { nom: "Robot connexions", email: "robot-connexions@bingoo.fr", message: "Demande d'essai du robot." } }) });
  console.log("demande déposée sur le site :", dm.status);
  await new Promise((ok) => setTimeout(ok, 9000));
  const [jl] = await q(`select connexions->'journal' j from saas_apps where id = ${lit(a.id)}`);
  console.log("journal (événement et code seulement) :", JSON.stringify((jl.j ?? []).map((x) => `${x.evenement}:${x.code}`)));
  console.log("demande réelle transmise :", (jl.j ?? []).some((x) => x.evenement === "demande" && x.code >= 200 && x.code < 300) ? "✓" : "✗");
  // GitHub : un faux jeton est refusé proprement (aucun vrai jeton n'est saisi ici)
  const g1 = await reg({ quoi: "github-brancher", depot: "exemple/projet", jeton: "mon-mot-de-passe" });
  console.log("GitHub, mot de passe à la place du jeton :", g1.status === 400 ? `✓ refusé (« ${String(g1.j.error ?? "").slice(0, 80)} »)` : `✗ ${g1.status}`);
  const g2 = await reg({ quoi: "github-brancher", depot: "exemple/projet", jeton: "github_pat_" + "A".repeat(40) });
  console.log("GitHub, jeton inconnu :", g2.status === 400 ? `✓ refusé (« ${String(g2.j.error ?? "").slice(0, 80)} »)` : `✗ ${g2.status}`);
  // Captures des deux écrans
  const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=connecteurs`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(7000);
  await p.getByText("Relier tes autres outils").scrollIntoViewIfNeeded().catch(() => console.log("✗ bloc « Relier tes autres outils » absent"));
  await p.screenshot({ path: `${DOSSIER}/connexions.png`, fullPage: true });
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=code`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(6000);
  console.log("bloc GitHub :", (await p.getByText("Ton code sur GitHub").count().catch(() => 0)) ? "✓ affiché" : "✗ absent");
  await p.screenshot({ path: `${DOSSIER}/github.png`, fullPage: true });
  await c.close();
  // Remise en état : connexion retirée, demande d'essai effacée
  await reg({ quoi: "connexion-supprimer", id });
  await q(`delete from saas_app_rows where app_id = ${lit(a.id)} and col = 'demandes' and data->>'nom' = 'Robot connexions'`);
  await q(`update saas_apps set connexions = null where id = ${lit(a.id)}`);
  console.log("site de test remis en état");
}
if (CONSTRUIRE === "brouillon") {
  // Mode brouillon : on l'active, on modifie, les visiteurs gardent l'ancienne version, puis « Publier mes changements »
  const [a] = await q(`select a.id, a.slug, a.workspace_id, a.spec->'design'->'couleurs'->>'primary' prim, a.spec->'design'->'couleurs'->>'on_primary' onp, a.spec->>'couleur' couleur from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' and a.spec->'site'->'page'->'sections' is not null order by a.maj desc limit 1`);
  const etat = async (quand) => { const [e] = await q(`select spec->'design'->'couleurs'->>'primary' atelier, saas_app_public(slug)->'spec'->'design'->'couleurs'->>'primary' visiteurs, publie is not null brouillon from saas_apps where id = ${lit(a.id)}`); console.log(`${quand} · couleur dans l'atelier ${e.atelier} · vue par les visiteurs ${e.visiteurs} · mode brouillon ${e.brouillon ? "oui" : "non"}`); return e; };
  const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(9000);
  await etat("Départ");
  await p.getByRole("button", { name: "Publié · Partager" }).click().catch((e) => console.log("✗ bouton Partager", e.message.slice(0, 80))); await p.waitForTimeout(1000);
  await p.getByRole("checkbox").first().check().catch((e) => console.log("✗ case brouillon", e.message.slice(0, 80))); await p.waitForTimeout(5000);
  await p.screenshot({ path: `${DOSSIER}/brouillon-1-active.png` });
  await p.keyboard.press("Escape"); await p.getByRole("button", { name: "Partager", exact: true }).click().catch(() => null); await p.waitForTimeout(600);
  await p.getByRole("button", { name: "Aa Style" }).first().click().catch((e) => console.log("✗ Style", e.message.slice(0, 80))); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: "Couleur #1D4ED8" }).click().catch((e) => console.log("✗ pastille", e.message.slice(0, 80))); await p.waitForTimeout(1500);
  await p.getByRole("button", { name: /Garder ce style/ }).click().catch((e) => console.log("✗ garder", e.message.slice(0, 80))); await p.waitForTimeout(9000);
  const e1 = await etat("Après la modification");
  console.log(e1.atelier !== e1.visiteurs ? "✓ les visiteurs gardent la version publiée" : "✗ la modification est partie en ligne");
  await p.screenshot({ path: `${DOSSIER}/brouillon-2-a-publier.png` });
  { const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p2 = await c2.newPage(); await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(6000); await p2.screenshot({ path: `${DOSSIER}/brouillon-3-visiteur-avant.png` }); await c2.close(); }
  await p.getByRole("button", { name: "Publier mes changements" }).click().catch((e) => console.log("✗ Publier", e.message.slice(0, 80))); await p.waitForTimeout(6000);
  const e2 = await etat("Après « Publier »");
  console.log(e2.atelier === e2.visiteurs ? "✓ publié : les visiteurs voient la nouvelle version" : "✗ pas publié");
  await p.screenshot({ path: `${DOSSIER}/brouillon-4-publie.png` });
  { const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p2 = await c2.newPage(); await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(6000); await p2.screenshot({ path: `${DOSSIER}/brouillon-5-visiteur-apres.png` }); await c2.close(); }
  // Remise en état du site de test : couleur d'origine, mode brouillon éteint
  await q(`update saas_apps set publie = null, spec = jsonb_set(jsonb_set(jsonb_set(spec, '{design,couleurs,primary}', to_jsonb(${lit(a.prim)}::text)), '{design,couleurs,on_primary}', to_jsonb(${lit(a.onp ?? "#FFFFFF")}::text)), '{couleur}', to_jsonb(${lit(a.couleur ?? a.prim)}::text)) where id = ${lit(a.id)}`);
  await etat("Remis en état");
  // Onglet Référencement
  await p.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=seo`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(7000);
  console.log("onglet Référencement :", (await p.getByText(/points? sur \d+ en place/).count().catch(() => 0)) ? "✓ affiché" : "✗ absent", "· URL", p.url().slice(-50));
  await p.screenshot({ path: `${DOSSIER}/referencement.png`, fullPage: true });
  await c.close();
}
if (CONSTRUIRE === "style-outil") {
  // 1. Accueil : une idée d'outil écrite par un visiteur choisit toute seule le raccourci « Un outil ou un jeu »
  { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await p.locator("#idee").fill("Un simulateur de prêt immobilier"); await p.waitForTimeout(1200);
    console.log("raccourci choisi tout seul :", await p.locator('button[aria-pressed="true"]').first().innerText().catch(() => "?"));
    await p.locator("#idee").scrollIntoViewIfNeeded().catch(() => null); await p.screenshot({ path: `${DOSSIER}/style-1-raccourcis.png` }); await c.close(); }
  const [a] = await q(`select a.id, a.slug, a.workspace_id, a.spec->'design'->'couleurs'->>'primary' prim, a.spec->'design'->'couleurs'->>'on_primary' onp, a.spec->>'couleur' couleur from saas_apps a join workspaces w on w.id = a.workspace_id where w.name like 'Robot film%' and a.statut = 'pret' and a.spec->'site'->'page'->'sections' is not null order by a.maj desc limit 1`);
  console.log("site :", a?.slug, "couleur avant :", a?.prim, a?.couleur);
  // 2. Aperçu d'une idée de petit outil demandée comme un logiciel : Bingoo! propose de lui-même l'outil
  { const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini", "bingoo-idee": { texte: "Un outil pour calculer le pourboire et partager l'addition entre amis", type: "saas", at: Date.now() } });
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await p.getByRole("button", { name: /^Construire / }).first().waitFor({ timeout: 120000 }).catch(() => null); await p.waitForTimeout(1500);
    const b = p.getByRole("button", { name: /Construire un outil ou un jeu à la place/ });
    console.log("bandeau « plutôt un outil » :", (await b.count().catch(() => 0)) ? "✓ affiché" : "✗ absent");
    if (await b.count().catch(() => 0)) await b.first().scrollIntoViewIfNeeded().catch(() => null);
    await p.screenshot({ path: `${DOSSIER}/style-2-bandeau-outil.png` }); await c.close(); }
  // 3. Atelier, outil Style : couleur principale essayée en direct, puis gardée (et remise ensuite : c'est un site de test)
  { const { ctx: c, page: p } = await ouvrir(a.workspace_id, { "bingoo-guide": "fini" });
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "load", timeout: 60000 }).catch(() => null); await p.waitForTimeout(9000);
    await p.screenshot({ path: `${DOSSIER}/style-3-atelier-avant.png` });
    await p.getByRole("button", { name: "Aa Style" }).first().click().catch((e) => console.log("✗ bouton Style", e.message.slice(0, 80))); await p.waitForTimeout(1500);
    await p.getByRole("button", { name: "Couleur #1D4ED8" }).click().catch((e) => console.log("✗ pastille", e.message.slice(0, 80))); await p.waitForTimeout(2500);
    await p.screenshot({ path: `${DOSSIER}/style-4-couleur-essai.png` });
    await p.getByRole("button", { name: /Garder ce style/ }).click().catch((e) => console.log("✗ garder", e.message.slice(0, 80)));
    await p.waitForTimeout(9000); await p.screenshot({ path: `${DOSSIER}/style-5-couleur-gardee.png` });
    const [f] = await q(`select spec->'design'->'couleurs'->>'primary' prim, spec->>'couleur' couleur, version from saas_apps where id = ${lit(a.id)}`);
    console.log("couleur enregistrée :", f.prim, f.couleur, "version", f.version);
    if (a.prim) await q(`update saas_apps set spec = jsonb_set(jsonb_set(jsonb_set(spec, '{design,couleurs,primary}', to_jsonb(${lit(a.prim)}::text)), '{design,couleurs,on_primary}', to_jsonb(${lit(a.onp ?? "#FFFFFF")}::text)), '{couleur}', to_jsonb(${lit(a.couleur ?? a.prim)}::text)) where id = ${lit(a.id)}`);
    console.log("couleur d'origine remise");
    await c.close(); }
}
if (CONSTRUIRE === "visiteur-apercu") {
  // La vidéo aussi, sans compte : le studio s'ouvre et la vidéo se joue
  { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage(); const t0 = Date.now();
    p.on("pageerror", (e) => console.log("   erreur JS :", e.message.slice(0, 160)));
    p.on("response", (r) => { if (r.status() === 403) console.log("   refusé au visiteur :", new URL(r.url()).pathname); });
    await p.goto(`${SITE}/?c=${t0}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await p.locator("#idee").fill("Une pub pour ma boulangerie artisanale à Nantes"); await p.getByRole("button", { name: "Vidéo", exact: true }).first().click().catch(() => null);
    await p.getByRole("button", { name: /Construire mon idée/ }).click().catch(() => null);
    const vu = await p.locator("canvas").first().waitFor({ timeout: 120000 }).then(() => true).catch(() => false);
    await p.waitForTimeout(6000);
    const compte = await p.getByRole("heading", { name: /Crée ton compte/ }).first().isVisible().catch(() => false);
    console.log(vu && !compte ? `✓ vidéo créée sans compte en ${Math.round((Date.now() - t0) / 1000)} s` : `✗ vidéo sans compte (${vu ? "compte demandé" : "pas de vidéo"})`);
    await p.screenshot({ path: `${DOSSIER}/visiteur-video.png` }); await c.close(); }
  // Un visiteur sans compte écrit son idée : il voit l'aperçu tout de suite ; le compte n'est demandé qu'à « Construire »
  for (const [idee, choix] of [["Une app de réservation pour les salons de coiffure à domicile", null], ["Le site de ma boulangerie à Nantes", "Mon site web"]]) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
    p.on("pageerror", (e) => console.log("   erreur JS :", e.message.slice(0, 160)));
    const t0 = Date.now();
    await p.goto(`${SITE}/?c=${t0}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await p.locator("#idee").fill(idee); if (choix) await p.getByRole("button", { name: choix }).first().click().catch(() => null);
    await p.getByRole("button", { name: /Construire mon idée/ }).click().catch(() => null);
    const btn = p.getByRole("button", { name: /^Construire / }).first();
    const vu = await btn.waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
    await p.waitForTimeout(7000);
    const compteDemande = await p.getByRole("heading", { name: /Crée ton compte/ }).first().isVisible().catch(() => false);
    console.log(vu ? `✓ aperçu affiché sans compte en ${Math.round((Date.now() - t0) / 1000)} s (${choix ? "site" : "SaaS"})` : "✗ pas d'aperçu sans compte", compteDemande ? "✗ compte demandé avant l'aperçu" : "");
    await p.screenshot({ path: `${DOSSIER}/visiteur-apercu-${choix ? "site" : "saas"}.png` });
    await btn.click().catch(() => null); await p.waitForTimeout(1500);
    const apres = await p.getByText(/compte/i).first().isVisible().catch(() => false);
    console.log(apres ? "✓ « Construire » demande le compte" : "✗ « Construire » ne demande pas de compte");
    await p.screenshot({ path: `${DOSSIER}/visiteur-construire-${choix ? "site" : "saas"}.png` });
    await c.close();
  }
}
if (CONSTRUIRE === "spec") {
  // Exporte la définition d'un SaaS (DOMAINE = son adresse courte) pour le photographier écran par écran hors ligne
  const [x] = await q(`select spec from saas_apps where slug = ${lit(process.env.DOMAINE ?? "")}`);
  fs.writeFileSync(`${DOSSIER}/spec.json`, JSON.stringify(x?.spec ?? null));
  console.log("spec exportée :", x ? "oui" : "introuvable");
} else if (CONSTRUIRE === "selection") {
  // Outil Sélectionner + file de demandes, dans le vrai atelier du SaaS de démo du robot (la version d'origine est remise à la fin)
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, j, t: t.slice(0, 200) }; };
  const [a] = await q(`select id, slug, version from saas_apps where workspace_id = ${lit(ws)} and statut = 'pret' order by maj desc limit 1`);
  const v0 = a.version; console.log("SaaS de démo :", a.slug, "v" + v0);
  const { page: pm } = await ouvrir(ws, {});
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(9000);
  await pm.getByRole("button", { name: /Sélectionner/ }).click(); await pm.waitForTimeout(800);
  await pm.screenshot({ path: `${DOSSIER}/selection-0.png` });
  // Clic réel de souris sur le grand titre de l'aperçu (comme le membre)
  const bb = await pm.locator('iframe[title^="Aperçu"]').boundingBox();
  await pm.mouse.move(bb.x + bb.width / 2, bb.y + bb.height * 0.3); await pm.waitForTimeout(400);
  await pm.mouse.click(bb.x + bb.width / 2, bb.y + bb.height * 0.3); await pm.waitForTimeout(1500);
  const barre = await pm.getByRole("button", { name: "Demander à Bingoo!" }).isVisible().catch(() => false);
  console.log(barre ? "✓ barre de sélection affichée" : "✗ pas de barre de sélection");
  await pm.screenshot({ path: `${DOSSIER}/selection-1.png` });
  for (let i = 0; i < 3; i++) { await pm.getByRole("button", { name: "A+" }).click(); await pm.waitForTimeout(200); }
  await pm.locator('input[type="color"]').first().fill("#e11d48"); await pm.getByRole("button", { name: "G", exact: true }).click(); await pm.waitForTimeout(2500);
  // L'enregistrement part 0,7 s après le dernier geste (la fonction peut mettre quelques secondes à démarrer)
  for (let i = 0; i < 10; i++) { const [z] = await q(`select jsonb_array_length(coalesce(spec->'retouches','[]')) n from saas_apps where id = ${lit(a.id)}`); if (z.n > 0) break; await pm.waitForTimeout(1500); }
  await pm.screenshot({ path: `${DOSSIER}/selection-2.png` });
  const [x] = await q(`select spec->'retouches' r from saas_apps where id = ${lit(a.id)}`);
  console.log((x.r ?? []).length ? `✓ retouche enregistrée : ${JSON.stringify(x.r.at(-1).css)}` : "✗ retouche non enregistrée");
  // Rechargée : la retouche doit être réappliquée toute seule
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(9000);
  const ch = (x.r ?? []).at(-1)?.chemin ?? "body";
  const fa = pm.frames().find((f) => f !== pm.mainFrame() && f.url().includes(a.slug)) ?? pm.frames()[1];
  const st = await fa.evaluate((c) => { const el = document.querySelector(c); if (!el) return { err: "élément introuvable" }; const s = getComputedStyle(el); return { couleur: s.color, taille: s.fontSize, gras: s.fontWeight }; }, ch).catch((e) => ({ err: e.message.slice(0, 80) }));
  console.log(/225, 29, 72/.test(st.couleur ?? "") ? `✓ retouche réappliquée après rechargement ${JSON.stringify(st)}` : `✗ retouche absente après rechargement ${JSON.stringify(st)}`);
  await pm.screenshot({ path: `${DOSSIER}/selection-3.png` });
  // File de demandes : la 2e est écrite pendant que Bingoo! applique la 1re
  const saisie = pm.locator("textarea").first();
  await saisie.fill("Ajoute sous le titre de cet écran une phrase courte qui souhaite la bienvenue"); await saisie.press("Enter"); await pm.waitForTimeout(2500);
  await saisie.fill("Mets le bouton principal de cet écran en vert"); await saisie.press("Enter"); await pm.waitForTimeout(1500);
  const enFile = await pm.getByText(/En attente · 1/).isVisible().catch(() => false);
  console.log(enFile ? "✓ 2e demande en file pendant la 1re" : "✗ file non affichée");
  await pm.screenshot({ path: `${DOSSIER}/file-1.png` });
  const t0 = Date.now();
  await pm.waitForFunction(() => { const t = document.body.innerText; return !/en attente ·/i.test(t) && !/Bingoo! applique ta demande|Je modifie ton SaaS|Je la teste/.test(t) && /Mets le bouton principal/.test(t); }, null, { timeout: 900000, polling: 3000 }).catch(() => null);
  await pm.waitForTimeout(4000);
  const [y] = await q(`select version from saas_apps where id = ${lit(a.id)}`);
  console.log(`${y.version >= v0 + 3 ? "✓" : "✗"} les deux demandes passées l'une après l'autre : v${v0} → v${y.version} (${Math.round((Date.now() - t0) / 1000)} s)`);
  await pm.screenshot({ path: `${DOSSIER}/file-2.png` });
  // Remise en état du SaaS de démo
  const r = await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "restaurer", version: v0 });
  await q(`update saas_apps set spec = spec - 'retouches' where id = ${lit(a.id)}`);
  console.log(r.ok ? "Démo remise en v" + v0 : "Remise en état : " + r.t);
} else if (CONSTRUIRE === "plan") {
  // Mode plan de l'atelier (le plan seul, rien n'est modifié) + page Mon SaaS (visites, contrôle de sécurité)
  const [a] = await q(`select id, version from saas_apps where workspace_id = ${lit(ws)} and statut = 'pret' order by maj desc limit 1`);
  const { page: pm } = await ouvrir(ws, {});
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(8000);
  await pm.getByRole("button", { name: "Plan d'abord" }).click();
  const saisie = pm.locator("textarea").first();
  await saisie.fill("Ajoute une page où mes patients peuvent laisser un avis après leur séance"); await saisie.press("Enter");
  await pm.waitForFunction(() => /Construire ce plan/.test(document.body.innerText), null, { timeout: 90000 }).catch(() => null); await pm.waitForTimeout(1000);
  const [b] = await q(`select version from saas_apps where id = ${lit(a.id)}`);
  console.log((await pm.getByText("Construire ce plan").count()) ? `✓ plan affiché, SaaS inchangé (v${a.version} → v${b.version})` : "✗ pas de plan");
  await pm.screenshot({ path: `${DOSSIER}/plan-1.png` });
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/mon-saas`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(6000);
  console.log((await pm.getByText("Contrôle de sécurité").count()) ? "✓ contrôle de sécurité affiché" : "✗ pas de contrôle de sécurité");
  await pm.screenshot({ path: `${DOSSIER}/mon-saas-visites.png`, fullPage: true });
} else if (CONSTRUIRE === "quatre" || CONSTRUIRE === "photos") {
  // Points de départ (accueil), remarques épinglées (atelier), logo de l'espace (Mon SaaS), photos réelles dans l'aperçu d'idée
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, j, t: t.slice(0, 200) }; };
  { const c0 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p0 = await c0.newPage();
    await p0.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p0.waitForTimeout(2500);
    const d = p0.getByText("Ou pars d'un point de départ"); console.log((await d.count()) ? "✓ points de départ affichés" : "✗ pas de points de départ");
    await d.scrollIntoViewIfNeeded().catch(() => null); await p0.waitForTimeout(1500); await p0.screenshot({ path: `${DOSSIER}/depart-1.png` });
    await p0.getByText("Site de restaurant").click().catch(() => null); await p0.waitForTimeout(1200);
    const v = await p0.locator("#idee").inputValue().catch(() => ""); console.log(/restaurant japonais/.test(v) ? "✓ un clic remplit l'idée" : "✗ idée non remplie");
    await p0.screenshot({ path: `${DOSSIER}/depart-2.png` }); await c0.close(); }
  if (CONSTRUIRE === "quatre") {
  const [a] = await q(`select id, slug, version from saas_apps where workspace_id = ${lit(ws)} and statut = 'pret' order by maj desc limit 1`);
  const v0 = a.version;
  const { page: pm } = await ouvrir(ws, {});
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(9000);
  await pm.getByRole("button", { name: /Commenter/ }).click(); await pm.waitForTimeout(600);
  const bb = await pm.locator('iframe[title^="Aperçu"]').boundingBox();
  for (const [fx, fy, txt] of [[0.5, 0.3, "Titre trop long, raccourcis-le"], [0.42, 0.58, "Mets ce bouton en vert"]]) {
    await pm.mouse.move(bb.x + bb.width * fx, bb.y + bb.height * fy); await pm.waitForTimeout(300); await pm.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy); await pm.waitForTimeout(900);
    await pm.locator('input[placeholder^="Ta remarque"]').fill(txt); await pm.getByRole("button", { name: "Épingler" }).click(); await pm.waitForTimeout(1800);
  }
  console.log((await pm.getByText(/Remarques épinglées · 2/i).count()) ? "✓ deux remarques épinglées" : "✗ remarques absentes");
  await pm.screenshot({ path: `${DOSSIER}/remarques-1.png` });
  await pm.waitForFunction(() => !document.querySelector("button[disabled]")?.textContent?.includes("Faire traiter"), null, { timeout: 20000 }).catch(() => null);
  await pm.getByRole("button", { name: "Faire traiter par Bingoo!" }).click(); const t0 = Date.now(); await pm.waitForTimeout(3000);
  await pm.waitForFunction(() => { const t = document.body.innerText; return /Traite ces remarques/.test(t) && !/Bingoo! applique ta demande|Je modifie ton SaaS|Je la teste/.test(t); }, null, { timeout: 900000, polling: 3000 }).catch(() => null); await pm.waitForTimeout(4000);
  const [y] = await q(`select version from saas_apps where id = ${lit(a.id)}`);
  console.log(`${y.version > v0 ? "✓" : "✗"} remarques traitées par Bingoo! : v${v0} → v${y.version} (${Math.round((Date.now() - t0) / 1000)} s)`);
  await pm.screenshot({ path: `${DOSSIER}/remarques-2.png` });
  // Logo de l'espace depuis Mon SaaS
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/mon-saas`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(6000);
  await pm.locator('input[type="file"][accept^="image/png"]').first().setInputFiles("public/icon-512.png").catch((e) => console.log("fichier", e.message.slice(0, 80)));
  await pm.waitForFunction(() => /Posé sur ton SaaS/.test(document.body.innerText), null, { timeout: 60000 }).catch(() => null); await pm.waitForTimeout(1500);
  const [z] = await q(`select spec->>'logo' logo from saas_apps where id = ${lit(a.id)}`); const le = await appel("espace-logo", { workspace_id: ws });
  console.log(z.logo && le.j?.logo?.url === z.logo ? "✓ logo de l'espace posé sur le SaaS" : `✗ logo : ${JSON.stringify({ app: z.logo, espace: le.j })}`.slice(0, 200));
  await pm.screenshot({ path: `${DOSSIER}/logo-espace.png` });
  await pm.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(5000); await pm.screenshot({ path: `${DOSSIER}/logo-saas.png` });
  // Remise en état de la démo
  await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "restaurer", version: v0 }); await appel("espace-logo", { workspace_id: ws, logo: null });
  }
  // Photos réelles dans l'aperçu d'une idée (espace neuf : limite du jour)
  const wsI = await creerEspace("Robot photos " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsI)}`);
  for (const [nomF, texteI, attendu] of [["apercu-photos", "Une app où les randonneurs partagent leurs sorties en montagne avec photos", true], ["apercu-recettes", "Un site de recettes végétariennes où chacun publie ses plats", false]]) {
  const { ctx: ci, page: pi } = await ouvrir(wsI, { "bingoo-idee": { texte: texteI, type: "saas", at: Date.now() } });
  await pi.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await pi.waitForFunction(() => /Construire \S+ \S|Le nom affiché|Son nom/.test(document.body.innerText) && !/étudie ton idée|prépare l'aperçu/i.test(document.body.innerText), null, { timeout: 150000 }).catch(() => null); await pi.waitForTimeout(8000);
  console.log("galeries :", JSON.stringify(await pi.evaluate(() => { try { return (JSON.parse(localStorage.getItem("bingoo-idee"))?.apercu?.principal?.blocs ?? []).filter((b) => b.type === "galerie").map((b) => ({ el: b.elements, img: (b.images ?? []).map((x) => x?.url ?? null) })); } catch (e) { return e.message; } })).slice(0, 900));
  const aPhotos = (await pi.getByText("créées par l'IA").count()) > 0;
  console.log(aPhotos === attendu ? `✓ ${nomF} : ${aPhotos ? "photos réelles (crédits affichés)" : "aucune photo inventée"}` : `✗ ${nomF} : photos=${aPhotos}`);
  await pi.screenshot({ path: `${DOSSIER}/${nomF}.png`, fullPage: true }); await ci.close();
  }
} else if (CONSTRUIRE === "videos-varies") {
  // Six vidéos créées par Bingoo! pour six métiers : les scénarios sont écrits dans le journal (aucune donnée privée)
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, j, t: t.slice(0, 200) }; };
  const wsV = await creerEspace("Robot vidéos " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsV)}`);
  for (const idee of ["Une pub pour ma boulangerie artisanale à Rennes", "Présenter mon application de méditation", "Une pub pour ma salle de boxe à Marseille", "Annoncer l'ouverture de mon cabinet d'avocate", "Une pub pour ma boutique de vêtements vintage", "Présenter mon logiciel de facturation pour artisans"]) {
    const r = await appel("video-creer", { workspace_id: wsV, texte: idee, format: "vertical" });
    const sc = r.j?.script ?? null;
    console.log(r.ok && sc ? `✓ ${idee} → allure ${sc.look ?? "?"}, ${sc.scenes?.length} scènes : ${sc.scenes?.map((x) => x.type).join(" › ")}` : `✗ ${idee} : ${r.t}`);
    if (sc) console.log("SCRIPT " + JSON.stringify(sc));
  }
} else if (CONSTRUIRE === "pages") {
  // Vitrine de l'accueil et pages « Bingoo! ou … » (visiteur)
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
  await p.goto(`${SITE}/?c=${Date.now()}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p.waitForTimeout(2000);
  const v = p.getByText("De vrais SaaS, en ligne, pour tous les métiers"); await v.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(2500);
  console.log((await v.count()) ? "✓ vitrine affichée" : "✗ pas de vitrine"); await p.screenshot({ path: `${DOSSIER}/vitrine-accueil.png` });
  await p.locator('button[title="Partir de Tablio"]').first().click({ force: true }).catch(() => null); await p.waitForTimeout(1200);
  const val = await p.locator("#idee").inputValue().catch(() => ""); console.log(/restaurant/.test(val) ? "✓ un clic sur la vitrine remplit l'idée" : `✗ idée non remplie (${val.slice(0, 60)})`);
  await p.screenshot({ path: `${DOSSIER}/vitrine-clic.png` });
  const vv = p.getByText("Des pubs en motion design, faites par Bingoo!"); await vv.scrollIntoViewIfNeeded().catch(() => null); await p.waitForTimeout(3500);
  const lues = await p.evaluate(() => [...document.querySelectorAll("video[poster^='/videos/']")].map((v) => v.currentTime > 0.5 && !v.paused));
  console.log(lues.length === 20 && lues.filter(Boolean).length >= 4 ? `✓ vingt cartes vidéo dans deux bandes, ${lues.filter(Boolean).length} qui tournent à l'écran` : `✗ vidéos : ${JSON.stringify(lues)}`);
  const x0 = await p.evaluate(() => [...document.querySelectorAll(".videos-rang")].map((r) => r.getBoundingClientRect().x));
  await p.waitForTimeout(3000);
  const x1 = await p.evaluate(() => [...document.querySelectorAll(".videos-rang")].map((r) => r.getBoundingClientRect().x));
  console.log(x0.length === 2 && x1[0] < x0[0] && x1[1] > x0[1] ? "✓ les deux bandes défilent, en sens inverse" : `✗ défilement : ${JSON.stringify([x0, x1])}`);
  await p.screenshot({ path: `${DOSSIER}/videos-accueil-2.png` });
  await p.screenshot({ path: `${DOSSIER}/videos-accueil.png` });
  const large = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2); console.log(large ? "✗ débordement horizontal" : "✓ pas de débordement horizontal");
  for (const k of ["codunk", "wix", "webflow"]) {
    const r = await p.goto(`${SITE}/comparer/${k}/`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p.waitForTimeout(1200);
    const t = await p.title(); console.log(r?.status() === 200 && /Bingoo! ou/.test(t) ? `✓ /comparer/${k}/ : ${t}` : `✗ /comparer/${k}/ ${r?.status()} ${t}`);
    await p.screenshot({ path: `${DOSSIER}/comparer-${k}.png`, fullPage: true });
  }
  await c.close();
} else if (CONSTRUIRE === "connecteurs") {
  // Connecteurs : branchés par l'écran Réglages, vus par un visiteur (bandeau cookies, boutons), puis débranchés
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, j, t: t.slice(0, 200) }; };
  const [a] = await q(`select id, slug, version from saas_apps where workspace_id = ${lit(ws)} and statut = 'pret' order by maj desc limit 1`);
  const { page: pm } = await ouvrir(ws, {});
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/reglages-saas?onglet=connecteurs`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(5000);
  const champs = pm.locator("input.w-full"); 
  await pm.locator('input[placeholder="G-ABC123XYZ"]').fill("G-BINGOOTEST1");
  await pm.locator('input[placeholder="https://calendly.com/ton-nom"]').fill("https://calendly.com/bingoo-demo");
  await pm.locator('input[placeholder^="https://xxx.us21"]').fill("https://bingoo.us21.list-manage.com/subscribe/post?u=abc123&id=def456");
  await pm.getByRole("button", { name: "Enregistrer" }).click(); await pm.waitForTimeout(3000);
  await pm.screenshot({ path: `${DOSSIER}/connecteurs-reglages.png`, fullPage: true });
  const [x] = await q(`select spec->'connecteurs' c from saas_apps where id = ${lit(a.id)}`);
  console.log(x.c?.ga ? `✓ connecteurs enregistrés ${JSON.stringify(x.c)}` : "✗ connecteurs non enregistrés");
  const v = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const pv = await v.newPage();
  await pv.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pv.waitForTimeout(5000);
  const avant = await pv.evaluate(() => [...document.scripts].some((s) => /googletagmanager/.test(s.src)));
  await pv.screenshot({ path: `${DOSSIER}/connecteurs-visiteur-1.png` });
  console.log(!avant && (await pv.getByText("Accepter").count()) ? "✓ bandeau cookies, rien chargé avant l'accord" : `✗ bandeau ou chargement (avant=${avant})`);
  await pv.getByRole("button", { name: "Accepter" }).click(); await pv.waitForTimeout(2500);
  const apres = await pv.evaluate(() => [...document.scripts].some((s) => /googletagmanager/.test(s.src)) && typeof window.gtag === "function");
  console.log(apres ? "✓ Google Analytics chargé après l'accord" : "✗ Google Analytics non chargé");
  const fv = pv.frameLocator("iframe").first();
  await fv.getByText("Recevoir nos nouvelles").first().click().catch(() => null); await pv.waitForTimeout(800);
  console.log((await fv.getByText("📅 Prendre rendez-vous").count()) && (await fv.locator('input[name="EMAIL"]').count()) ? "✓ boutons Calendly et Mailchimp" : "✗ boutons absents");
  await pv.screenshot({ path: `${DOSSIER}/connecteurs-visiteur-2.png` }); await v.close();
  await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "connecteurs", connecteurs: {} });
} else if (CONSTRUIRE === "vitrine") {
  // Vitrine de l'accueil : les vrais SaaS et sites construits par Bingoo! (espaces du robot), photographiés tels quels
  const apps = await q(`select a.slug, a.spec->>'nom' nom, coalesce(a.spec->>'type','saas') type from saas_apps a join members m on m.workspace_id = a.workspace_id where m.user_id = ${lit(uid)} and a.statut = 'pret' and jsonb_array_length(coalesce(a.spec->'ecrans','[]')) > 2 order by a.maj desc limit 30`);
  const vus = new Set(); let n = 0;
  for (const x of apps) {
    if (vus.has(x.nom) || n >= 14) continue; vus.add(x.nom);
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p = await c.newPage();
    await p.goto(`${SITE}/?c=${Date.now()}#/app/${x.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p.waitForTimeout(6000);
    await p.screenshot({ path: `${DOSSIER}/vitrine-${String(++n).padStart(2, "0")}-${x.type}-${x.slug}.jpg`, type: "jpeg", quality: 88 }).catch(() => null);
    // Et l'intérieur : la démo (compte d'essai rempli d'exemples), si elle existe
    const demo = p.getByText(/Voir la démo/i).first();
    if (x.type !== "site" && await demo.count()) { await demo.click().catch(() => null); await p.waitForTimeout(7000); await p.screenshot({ path: `${DOSSIER}/vitrine-${String(n).padStart(2, "0")}-${x.type}-${x.slug}-dedans.jpg`, type: "jpeg", quality: 88 }).catch(() => null); }
    console.log("✓", x.nom, x.type); await c.close();
  }
} else if (CONSTRUIRE === "diag-site") {
  // Diagnostic : l'aperçu d'une idée de site, couleurs calculées du haut de page dans chaque style
  const wsI = await creerEspace("Robot diag " + new Date().toISOString().slice(0, 16)); await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(wsI)}`);
  const { page: pi } = await ouvrir(wsI, { "bingoo-idee": { texte: process.env.TEXTE_IDEE || "un site pour mon salon de tatouage", type: "site", at: Date.now() } });
  await pi.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  await pi.waitForFunction(() => /Choisis ton style/.test(document.body.innerText), null, { timeout: 150000 }).catch(() => null); await pi.waitForTimeout(9000);
  console.log("designs :", JSON.stringify(await pi.evaluate(() => { try { const a = JSON.parse(localStorage.getItem("bingoo-idee")).apercu; return { nom: a.nom, metier: a.metier, designs: (a.designs ?? []).map((d) => ({ mode: d.mode, c: d.couleurs, p: d.polices })) }; } catch (e) { return e.message; } })).slice(0, 1500));
  for (const f of pi.frames()) {
    if (f === pi.mainFrame()) continue;
    const r = await f.evaluate(() => { const h = document.querySelector("h1"); if (!h) return null; const ch = []; for (let x = h; x && ch.length < 6; x = x.parentElement) { const s = getComputedStyle(x); ch.push(`${x.tagName}.${String(x.className).slice(0, 50)} c=${s.color} bg=${s.backgroundColor}`); } return { mode: window.__BOOT?.spec?.design?.mode, ch }; }).catch((e) => e.message.slice(0, 80));
    console.log("cadre :", JSON.stringify(r).slice(0, 900));
  }
  await pi.screenshot({ path: `${DOSSIER}/diag-site.png`, fullPage: true });
  // La grande vue (style choisi par défaut), section par section
  const big = pi.locator("iframe").last(); const fb = pi.frameLocator("iframe").last();
  for (const [i, y] of [[1, 0], [2, 700], [3, 1400], [4, 2100], [5, 2800]]) { await fb.locator("body").evaluate((b, y) => window.scrollTo(0, y), y).catch(() => null); await pi.waitForTimeout(900); await big.screenshot({ path: `${DOSSIER}/diag-site-${i}.png` }).catch(() => null); }
} else if (CONSTRUIRE === "atelier-diag") {
  // Diagnostic : la page du membre ouverte sur l'atelier d'un SaaS dont une modification attend son test
  const [a0] = await q(`select a.id, a.slug, a.workspace_id ws, a.version, a.brouillon->'_test' t from saas_apps a where a.slug = ${lit(process.env.DOMAINE || "asso-pilote-6t0r")}`);
  console.log("SaaS", a0.slug, "v" + a0.version, "test", JSON.stringify(a0.t));
  await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(a0.ws)}`);
  await q(`insert into members (workspace_id, user_id, role) values (${lit(a0.ws)}, ${lit(uid)}, 'owner') on conflict do nothing`).catch((e) => console.log("membre", e.message.slice(0, 120)));
  const { page: pm } = await ouvrir(a0.ws, {});
  const logs = []; pm.on("console", (m) => logs.push(m.type() + " " + m.text().slice(0, 200))); pm.on("pageerror", (e) => logs.push("ERREUR " + e.message.slice(0, 200)));
  pm.on("request", (r) => { if (/verif-brouillon|saas-app-verif/.test(r.url())) logs.push("APPEL " + r.url().slice(-40)); });
  await pm.addInitScript(() => { window.__msgs = []; window.addEventListener("message", (e) => { try { window.__msgs.push(String(e.data?.type) + ":" + String(e.data?.slug ?? "")); } catch {} }); });
  await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  for (let i = 0; i < 12; i++) {
    await pm.waitForTimeout(10000);
    const etat = await pm.evaluate(() => ({ url: location.hash, iframes: [...document.querySelectorAll("iframe")].map((f) => ({ gauche: Math.round(f.getBoundingClientRect().left), doc: (f.getAttribute("srcdoc") || "").length, titre: f.title })), msgs: (window.__msgs || []).slice(-6) }));
    const [x] = await q(`select version, brouillon->'_test'->>'phase' ph, brouillon is null sans_brouillon from saas_apps where id = ${lit(a0.id)}`);
    console.log(`t+${(i + 1) * 10}s`, JSON.stringify(etat), JSON.stringify(x));
    if (x.sans_brouillon || x.ph !== "en_cours") break;
  }
  await pm.screenshot({ path: `${DOSSIER}/atelier-diag.png` });
  console.log("JOURNAL\n" + logs.slice(-40).join("\n"));
} else if (CONSTRUIRE === "atelier-vrai") {
  // L'atelier comme un membre, sur le dernier SaaS du robot (DOMAINE = son adresse courte, facultatif) :
  // 1) texte changé au double-clic (gratuit), 2) demande en une phrase sur un écran, 3) demande sur la page de présentation,
  // 4) « Appliquer le nouveau design » puis « Revenir au design précédent ». Chaque geste est vérifié en base.
  const appel = async (route, corps) => { const r = await fetch(`${SB}/functions/v1/r/${route}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify(corps) }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { ok: r.ok, status: r.status, j, t: t.slice(0, 200) }; };
  const lire = async (id) => (await q(`select id, slug, statut, erreur, version, spec, brouillon, verif, workspace_id ws from saas_apps where id = ${lit(id)}`))[0];
  const [a0] = await q(`select a.id from saas_apps a join members m on m.workspace_id = a.workspace_id where m.user_id = ${lit(uid)} and coalesce(a.spec->>'type','saas') <> 'site' and a.statut = 'pret' ${process.env.DOMAINE ? `and a.slug = ${lit(process.env.DOMAINE)}` : ""} order by a.at desc limit 1`);
  if (!a0) throw new Error("Aucun SaaS du robot");
  let a = await lire(a0.id); const ws = a.ws; const bilan = [];
  // La page du membre reste ouverte : c'est son navigateur qui teste une modification avant de la publier
  const { page: pm } = await ouvrir(ws, {});
  const ouvrirAtelier = async () => { await pm.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await pm.waitForTimeout(4000); };
  const note = (ok, t) => { bilan.push(`${ok ? "✓" : "✗"} ${t}`); console.log(`${ok ? "✓" : "✗"} ${t}`); };
  const attendreFin = async (id, max = 300) => { for (let i = 0; i < max / 3; i++) { await new Promise((r) => setTimeout(r, 3000)); const x = await lire(id); if (x.statut !== "en_cours") return x; } return lire(id); };
  const photo = async (nom) => { const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p2 = await c2.newPage(); await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null); await p2.waitForTimeout(6000); await p2.screenshot({ path: `${DOSSIER}/${nom}.png` }).catch(() => null); await c2.close(); };
  console.log("SaaS testé :", a.slug, "v" + a.version);
  await photo("atelier-0-avant");
  // 1) Texte au double-clic : le premier sous-titre d'écran trouvé dans le code
  const e1 = (a.spec.ecrans ?? []).find((e) => !e.public && /sous="(?!Texte du robot)[^"]{8,}"/.test(e.code ?? ""));
  if (e1) {
    const avant = /sous="((?!Texte du robot)[^"]{8,})"/.exec(e1.code)[1], apres = `Texte du robot ${new Date().toISOString().slice(11, 19)}`;
    const t0 = Date.now(); const r = await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "texte", avant, apres, ecran: e1.id });
    a = await lire(a.id); const code = (a.spec.ecrans ?? []).find((e) => e.id === e1.id)?.code ?? "";
    note(r.ok && code.includes(apres) && !code.includes(`sous="${avant}"`), `Texte au double-clic sur « ${e1.titre} » (${Math.round((Date.now() - t0) / 100) / 10} s) ${r.ok ? "" : r.t}`);
  } else note(false, "Aucun sous-titre d'écran à modifier");
  // 2) Demande en une phrase sur un écran
  const e2 = (a.spec.ecrans ?? []).find((e) => !e.public);
  { const v0 = a.version, t0 = Date.now();
    const r = await appel("saas-app-modifier", { workspace_id: ws, app_id: a.id, ecran: e2.id, demande: "Ajoute en haut de cet écran un petit bandeau qui affiche le nombre total d'éléments de la liste principale", images: [], element: null });
    let x = await attendreFin(a.id); console.log(`   modification prête en ${Math.round((Date.now() - t0) / 100) / 10} s`);
    if (x.brouillon?._modif) { await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "brouillon-valider" }); x = await lire(a.id); }
    await ouvrirAtelier();
    // le robot de vérification de l'atelier conclut ensuite (annule si l'écran casse)
    let fin = null; for (let i = 0; i < 100 && !fin; i++) { await new Promise((r) => setTimeout(r, 6000)); const y = await lire(a.id); if (y.verif?.dernier_atelier?.at && new Date(y.verif.dernier_atelier.at).getTime() > t0) fin = y; }
    a = await lire(a.id);
    note(r.ok && x.version > v0 && fin && !fin.verif.dernier_atelier.annule, `Demande sur l'écran « ${e2.titre} » : v${v0} → v${a.version}, testée par le robot ${fin ? (fin.verif.dernier_atelier.annule ? "et ANNULÉE (l'écran cassait)" : "et gardée") : "— pas de conclusion"} (${Math.round((Date.now() - t0) / 1000)} s) ${r.ok ? "" : r.t}`);
  }
  // 3) Demande sur la page de présentation générée
  if ((a.spec.site?.page?.sections ?? []).length) {
    const v0 = a.version, t0 = Date.now(); const h0 = JSON.stringify(a.spec.site.page);
    const r = await appel("saas-app-modifier", { workspace_id: ws, app_id: a.id, ecran: "_site", demande: "Sur la page de présentation, remplace le grand titre du haut par « Vos passages, prouvés en un clic »", images: [], element: null });
    let x = await attendreFin(a.id);
    if (x.brouillon?._modif) { await appel("saas-app-reglages", { workspace_id: ws, app_id: a.id, quoi: "brouillon-valider" }); x = await lire(a.id); }
    await ouvrirAtelier();
    for (let i = 0; i < 60; i++) { a = await lire(a.id); if (!a.brouillon && JSON.stringify(a.spec.site?.page ?? {}) !== h0) break; await new Promise((r) => setTimeout(r, 6000)); }
    a = await lire(a.id); const h1 = JSON.stringify(a.spec.site?.page ?? {});
    note(r.ok && h1 !== h0 && h1.includes("prouvés en un clic"), `Demande sur la page de présentation : ${h1.includes("prouvés en un clic") ? "titre remplacé" : "titre NON remplacé"} (${Math.round((Date.now() - t0) / 1000)} s) ${r.ok ? "" : r.t}`);
    await photo("atelier-1-page-modifiee");
  } else note(false, "Pas de page de présentation générée sur ce SaaS");
  // 4) Nouveau design puis retour, sur le plus ancien SaaS du robot resté à l'ancien gabarit
  const [vieux] = await q(`select a.id from saas_apps a join members m on m.workspace_id = a.workspace_id where m.user_id = ${lit(uid)} and coalesce(a.spec->>'type','saas') <> 'site' and a.statut = 'pret' and a.spec->>'gabarit_app' is null and coalesce((a.spec->>'mobile')::boolean,false) = false order by a.at desc limit 1`);
  if (vieux) {
    let v = await lire(vieux.id); const slugAvant = a.slug; a = v;
    await photo("atelier-2-ancien-design");
    const r = await appel("saas-app-reglages", { workspace_id: v.ws, app_id: v.id, quoi: "design-nouveau" });
    let page = false; for (let i = 0; i < 50 && !page; i++) { await new Promise((r) => setTimeout(r, 5000)); v = await lire(v.id); page = (v.spec.site?.page?.sections ?? []).length > 0; }
    note(r.ok && v.spec.gabarit_app === "taste" && page, `Nouveau design sur ${v.slug} : gabarit ${v.spec.gabarit_app ?? "—"}, police de titre ${v.spec.design?.polices?.titres}, page générée ${page ? "oui" : "non"} ${r.ok ? "" : r.t}`);
    await photo("atelier-3-nouveau-design");
    const r2 = await appel("saas-app-reglages", { workspace_id: v.ws, app_id: v.id, quoi: "design-revenir" });
    v = await lire(v.id);
    note(r2.ok && !v.spec.gabarit_app && !(v.spec.site?.page?.sections ?? []).length, `Retour au design précédent sur ${v.slug} : gabarit ${v.spec.gabarit_app ?? "ancien"}, page générée ${(v.spec.site?.page?.sections ?? []).length ? "encore là" : "retirée"} ${r2.ok ? "" : r2.t}`);
    await photo("atelier-4-retour");
    void slugAvant;
  } else note(false, "Aucun SaaS à l'ancien gabarit pour tester le nouveau design");
  fs.writeFileSync(`${DOSSIER}/atelier-bilan.txt`, bilan.join("\n"));
  console.log("BILAN ATELIER\n" + bilan.join("\n"));
} else if (CONSTRUIRE === "atelier") {
  // Robot de l'atelier, de bout en bout sur le dernier site construit par le robot :
  // DOMAINE=casse : une modification qui casse l'écran « Demandes » est mise en ligne par le vrai bouton (endpoint) ;
  //   le robot doit la tester, voir l'écran cassé, remettre la version d'avant et rendre la modification.
  // DOMAINE=texte : une modification sans danger (un titre d'écran) doit être testée et rester en ligne.
  const CAS = ["texte", "reprendre"].includes(process.env.DOMAINE) ? process.env.DOMAINE : "casse";
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
  // reprendre : un test déjà en attente (membre qui revient dans l'atelier) ; seul le robot de la page doit le conclure
  if (CAS !== "reprendre") await q(`update saas_apps set brouillon = ${lit(JSON.stringify(br))}::jsonb where id = ${lit(a0.id)}`);
  const rep = CAS === "reprendre" ? { status: "—", text: async () => "test en attente repris" } : await fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: a0.ws, app_id: a0.id, quoi: "brouillon-valider" }) });
  console.log(`Cas ${CAS} sur ${a0.slug} (v${a0.version}) : mise en ligne →`, rep.status, (await rep.text()).slice(0, 120));
  const { ctx, page } = await ouvrir(a0.ws);
  await page.goto(`${SITE}/?c=${Date.now()}#/explorer/atelier`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  // Toutes les 3 s : la version EN LIGNE ne doit jamais contenir le code cassé (les clients du membre ne voient rien)
  const t0 = Date.now(), debutIso = new Date(t0 - 2000).toISOString(); let fin = null, n = 0, vuCasse = 0, photo = 0;
  while (Date.now() - t0 < 14 * 60e3) {
    await page.waitForTimeout(3000);
    const [v] = await q(`select version, brouillon->'_test' t, verif->'dernier_atelier' d, position('lignes.map' in spec::text) > 0 casse_en_ligne, (select jsonb_agg(x->>'t') from jsonb_array_elements(verif->'journal') x) j, spec from saas_apps where id = ${lit(a0.id)}`);
    if (v.casse_en_ligne) vuCasse++;
    if (Date.now() - photo > 15000) { photo = Date.now(); await page.screenshot({ path: `${DOSSIER}/atelier-${CAS}-${String(++n).padStart(2, "0")}.png` }).catch(() => null); }
    if (!v.t && v.d && String(v.d.at ?? "") >= debutIso) { fin = v; break; }
  }
  if (!fin) { console.log("✗ Le robot n'a pas conclu en 14 min"); process.exitCode = 1; }
  else {
    const e3 = fin.spec.ecrans.find((e) => e.id === cible.id);
    const s3 = Math.round((Date.now() - t0) / 1000);
    console.log(`Conclusion en ~${s3} s : annulée=${fin.d.annule} · avant publication=${fin.d.avant_publication} · version ${avant.version} → ${fin.version} · code cassé vu en ligne ${vuCasse} fois · titre=${e3.titre}`);
    console.log("Journal :\n" + (fin.j ?? []).slice(-2).join("\n"));
    const attendu = CAS !== "texte" ? fin.d.annule === true && fin.d.avant_publication === true && fin.version === avant.version && vuCasse === 0 && e3.code === avant.code
      : fin.d.annule === false && fin.d.avant_publication === true && fin.version === avant.version + 1 && e3.titre !== avant.titre;
    console.log(attendu ? "✓ ROBOT DE L'ATELIER : comportement attendu" : "✗ ROBOT DE L'ATELIER : comportement inattendu");
    if (!attendu) process.exitCode = 1;
    await page.reload({ waitUntil: "networkidle" }).catch(() => null); await page.waitForTimeout(6000);
    await page.screenshot({ path: `${DOSSIER}/atelier-${CAS}-fin.png`, fullPage: true }).catch(() => null);
  }
  await ctx.close();
} else if (CONSTRUIRE === "gratuit" || CONSTRUIRE === "audit" || CONSTRUIRE === "motion" || CONSTRUIRE === "video-produit" || CONSTRUIRE === "film" || CONSTRUIRE === "selection" || CONSTRUIRE === "plan" || CONSTRUIRE === "quatre" || CONSTRUIRE === "photos" || CONSTRUIRE === "diag-site" || CONSTRUIRE === "vitrine" || CONSTRUIRE === "connecteurs" || CONSTRUIRE === "pages" || CONSTRUIRE === "videos-varies" || CONSTRUIRE === "lien-public" || CONSTRUIRE === "stores" || CONSTRUIRE === "style-outil" || CONSTRUIRE === "brouillon" || CONSTRUIRE === "connexions" || CONSTRUIRE === "rdv-photos" || CONSTRUIRE === "video-images" || CONSTRUIRE === "video-clip" || CONSTRUIRE === "automatisations" || CONSTRUIRE === "gratuit-ia" || CONSTRUIRE === "visiteur-apercu" || CONSTRUIRE === "galerie" || CONSTRUIRE === "vitrine-accueil" || CONSTRUIRE === "edition-directe" || CONSTRUIRE === "modif-rendue" || CONSTRUIRE === "support" || CONSTRUIRE === "support-ecran" || CONSTRUIRE === "blog" || CONSTRUIRE === "pages") {
  console.log("Compte gratuit photographié");
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
    // Briefs de la comparaison avec Lovable (scripts/design/briefs-lovable.md), mot pour mot
    hotel: { texte: "Le site de mon hôtel. Hôtel des Quais, hôtel 4 étoiles de 32 chambres à Bordeaux, 12 quai des Chartrons, 33000 Bordeaux, face à la Garonne. Chambres classiques à partir de 145 € la nuit, chambres avec vue sur le fleuve à partir de 195 €, petit-déjeuner à 18 €. Réception ouverte 24 h sur 24. Réservation par formulaire ou au 05 56 00 00 00.", apercu: { type: "site", nom: "Hôtel des Quais", pitch: "Hôtel 4 étoiles face à la Garonne, aux Chartrons.", cible: "Voyageurs et couples en séjour à Bordeaux", metier: "Hôtel 4 étoiles", cta: "Réserver une chambre", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    coiffure: { texte: "Le site de mon salon de coiffure. Atelier Mèche, salon de coiffure mixte à Nantes, 5 rue Crébillon, 44000 Nantes. Coupe femme 42 €, coupe homme 26 €, couleur à partir de 58 €, balayage à partir de 85 €. Ouvert du mardi au samedi de 9 h 30 à 19 h. Rendez-vous par formulaire ou au 02 40 00 00 00.", apercu: { type: "site", nom: "Atelier Mèche", pitch: "Salon de coiffure mixte au cœur de Nantes.", cible: "Femmes et hommes du centre de Nantes", metier: "Salon de coiffure", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    // Régularité du design : sept autres métiers, briefs courts comme en écrit un membre
    boulangerie: { texte: "Le site de ma boulangerie. Maison Farine, boulangerie artisanale à Lille, 14 rue de Gand, 59000 Lille. Pain au levain, viennoiseries pur beurre, pâtisseries du week-end. Ouvert du mardi au dimanche de 7 h à 19 h 30. Commandes au 03 20 00 00 00.", apercu: { type: "site", nom: "Maison Farine", pitch: "Boulangerie artisanale au levain, dans le Vieux-Lille.", cible: "Habitants du quartier", metier: "Boulangerie artisanale", cta: "Commander", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    plombier: { texte: "Le site de mon entreprise de plomberie. Durand Plomberie, plombier chauffagiste à Toulouse et alentours. Dépannage, salle de bains, chaudière. Devis gratuit sous 48 h. Du lundi au samedi, 8 h à 19 h. 05 61 00 00 00.", apercu: { type: "site", nom: "Durand Plomberie", pitch: "Plombier chauffagiste à Toulouse, devis gratuit sous 48 h.", cible: "Particuliers de Toulouse et alentours", metier: "Plombier chauffagiste", cta: "Demander un devis", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    avocat: { texte: "Le site de mon cabinet d'avocat. Cabinet Morel, avocate en droit du travail à Paris, 22 rue de Châteaudun, 75009 Paris. Licenciement, rupture conventionnelle, prud'hommes, côté salariés. Premier rendez-vous de 45 minutes à 90 €. 01 42 00 00 00.", apercu: { type: "site", nom: "Cabinet Morel", pitch: "Avocate en droit du travail, aux côtés des salariés.", cible: "Salariés en conflit avec leur employeur", metier: "Avocate en droit du travail", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    garage: { texte: "Le site de mon garage. Garage du Port, entretien et réparation toutes marques à Marseille, 8 boulevard de Paris, 13003 Marseille. Révision à partir de 129 €, freins, pneus, climatisation, contrôle technique préparé. Du lundi au vendredi, 8 h à 18 h. 04 91 00 00 00.", apercu: { type: "site", nom: "Garage du Port", pitch: "Entretien et réparation toutes marques à Marseille.", cible: "Automobilistes de Marseille", metier: "Garage automobile", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    fleuriste: { texte: "Le site de ma boutique de fleurs. Pétale, fleuriste à Rennes, 3 rue Saint-Malo, 35000 Rennes. Bouquets de saison à partir de 25 €, mariages, deuil, abonnement fleurs à 35 € par mois. Du mardi au samedi, 9 h 30 à 19 h. 02 99 00 00 00.", apercu: { type: "site", nom: "Pétale", pitch: "Fleuriste de saison à Rennes.", cible: "Habitants de Rennes", metier: "Fleuriste", cta: "Commander un bouquet", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    yoga: { texte: "Le site de mon studio de yoga. Studio Souffle, yoga et pilates à Strasbourg, 11 rue des Juifs, 67000 Strasbourg. Cours à l'unité 18 €, carte de 10 cours 150 €, premier cours offert. Cours du lundi au samedi, matin et soir. 03 88 00 00 00.", apercu: { type: "site", nom: "Studio Souffle", pitch: "Yoga et pilates au centre de Strasbourg.", cible: "Adultes de Strasbourg, débutants compris", metier: "Studio de yoga", cta: "Réserver un cours", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    architecte: { texte: "Le site de mon agence d'architecture d'intérieur. Atelier Nord, architecte d'intérieur à Annecy. Rénovation d'appartements et de chalets, de la conception au suivi de chantier. Première visite offerte. 04 50 00 00 00.", apercu: { type: "site", nom: "Atelier Nord", pitch: "Architecte d'intérieur à Annecy, de la conception au chantier.", cible: "Propriétaires en Haute-Savoie", metier: "Architecte d'intérieur", cta: "Demander une visite", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    "lovable-restaurant": { texte: "Crée le site de mon restaurant. Le Comptoir de Lina, bistrot de quartier à Lyon (Croix-Rousse), 7 rue d'Austerlitz, 69004 Lyon. Cuisine de saison faite maison, carte courte qui change chaque semaine. Formule midi entrée + plat ou plat + dessert à 19 €, menu du soir à 34 €. Ouvert du mardi au samedi, 12 h – 14 h et 19 h 30 – 22 h. Réservation par téléphone au 04 78 00 00 00 ou par formulaire. Le site est en français.", apercu: { type: "site", nom: "Le Comptoir de Lina", pitch: "Bistrot de quartier à la Croix-Rousse, cuisine de saison faite maison.", cible: "Habitants et gourmands de Lyon", metier: "Bistrot de quartier", cta: "Réserver une table", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    "lovable-lancement": { texte: "Crée la page de lancement de mon application mobile. Mealo : on prend en photo le contenu de son frigo et l'appli propose 3 recettes de la semaine avec ce qu'on a déjà, plus la liste de courses du reste. Pour les familles pressées qui veulent moins gaspiller. L'appli sort en février sur iPhone et Android ; en attendant, on veut récolter des inscriptions à la liste d'attente (prénom + e-mail). Gratuite, avec une version Plus à 3,99 €/mois. Le site est en français.", apercu: { type: "site", modele: "lancement", nom: "Mealo", pitch: "Une photo du frigo, trois recettes de la semaine et la liste de courses du reste.", cible: "Familles pressées", metier: "Appli de recettes", cta: "Rejoindre la liste", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    "lovable-saas": { texte: "Crée la page de présentation de mon logiciel. Planilo : logiciel de réservation en ligne pour les salons de coiffure et instituts de beauté indépendants. Les clientes réservent 24 h/24 depuis un lien ou Instagram, reçoivent un rappel par SMS la veille, et le salon voit son agenda, ses prestations et son chiffre du jour au même endroit. Essai gratuit 14 jours sans carte bancaire, puis 29 € par mois et par salon. Le site est en français.", apercu: { type: "site", modele: "lancement", nom: "Planilo", pitch: "La réservation en ligne des salons de coiffure et instituts indépendants.", cible: "Salons de coiffure et instituts de beauté indépendants", metier: "Logiciel de réservation", cta: "Essayer 14 jours", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    portfolio: { texte: "Le portfolio de mon activité de photographe de mariage à Bordeaux", apercu: { type: "site", modele: "portfolio", nom: "Atelier Lumen", pitch: "Photographe de mariage et de famille à Bordeaux.", cible: "Futurs mariés et familles", metier: "Photographe de mariage", accroche: "Vos souvenirs en lumière naturelle", cta: "Parler de mon projet", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Réalisations", role: "Les photos" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Projets et demandes" }], services: [], plus_tard: [], limites: [] } },
    lancement: { texte: "Une page pour annoncer mon appli de repas de la semaine et recueillir les e-mails avant le lancement", apercu: { type: "site", modele: "lancement", nom: "Mealo", pitch: "Une appli qui prépare vos menus et votre liste de courses.", cible: "Familles pressées", metier: "Appli de repas", accroche: "Vos repas de la semaine en 2 minutes", cta: "Être prévenu", ecrans: [{ titre: "Accueil", role: "L'inscription" }, { titre: "Comment ça marche", role: "Les étapes" }, { titre: "Espace gérant", role: "Les inscrits" }], services: [], plus_tard: [], limites: [] } },
  };
  const SITE_IDEE = SITES[process.env.DOMAINE] ?? { texte: "Le site de mon activité de coiffeuse à domicile à Lyon", apercu: { type: "site", nom: "Coupe Chez Vous", pitch: "Coiffeuse à domicile à Lyon : coupes, couleurs et brushings chez vous, sur rendez-vous.", cible: "Familles et particuliers lyonnais", metier: "Coiffeuse à domicile", accroche: "Votre coiffeuse vient chez vous", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche et le bouton de rendez-vous" }, { titre: "Services et tarifs", role: "Les prestations et leurs prix" }, { titre: "Contact", role: "Le formulaire de demande" }, { titre: "Espace gérant", role: "Les demandes reçues" }], services: [], plus_tard: [], limites: [] } };
  // Compte gratuit, premier outil offert : l'aperçu est posé tel quel et la construction démarre dans l'atelier (côté serveur :
  // c'est la route qui décide si le projet est offert, jamais la page)
  const OUTIL_OFFERT = { texte: "Un minuteur pomodoro avec le compte de mes séances du jour", apercu: { type: "outil", genre: "outil", nom: "Tomato", pitch: "Tu lances des séances de travail de 25 minutes, suivies de pauses, et tu vois combien tu en as fait aujourd'hui.", cible: "Étudiants et indépendants qui veulent rester concentrés", famille: "outil", ecrans: [{ titre: "Le minuteur", role: "Un grand compte à rebours de 25 minutes, à lancer, mettre en pause ou remettre à zéro." }, { titre: "Les pauses", role: "Après chaque séance, une pause de 5 minutes ; une longue pause toutes les 4 séances." }, { titre: "Séances du jour", role: "Le nombre de séances terminées aujourd'hui, gardé sur l'appareil." }], ambiance: { esprit: "rouge tomate chaleureux sur fond crème, gros chiffres ronds", fond: "#FFF6EC", accent: "#D8432B" }, principal: { titre: "Le minuteur", blocs: [] }, plus_tard: [], limites: [] } };
  const cible = CONSTRUIRE === "outil-gratuit" ? { idee: true, domaine: "idee.bingoo.fr", nom: OUTIL_OFFERT.apercu.nom, categorie: "", ideeTexte: OUTIL_OFFERT.texte, type: "outil", reponses: [], apercu: OUTIL_OFFERT.apercu } : CONSTRUIRE === "site" ? { idee: true, domaine: "idee.bingoo.fr", nom: SITE_IDEE.apercu.nom, categorie: "", ideeTexte: SITE_IDEE.texte, type: "site", reponses: [], apercu: SITE_IDEE.apercu }
    : CONSTRUIRE === "ia"
    ? { domaine: process.env.DOMAINE || "circle.so", nom: (await q(`select coalesce(nom, split_part(domaine, '.', 1)) nom from saas where domaine = ${lit(process.env.DOMAINE || "circle.so")}`))[0]?.nom ?? "Circle", categorie: (await q(`select coalesce(categorie, '') c from saas where domaine = ${lit(process.env.DOMAINE || "circle.so")}`))[0]?.c || "Communauté" }
    : { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration", modele: "reservation", couleur: "#1F3D33", allure: "nature" };
  const ws2 = await creerEspace(`Robot construction ${new Date().toISOString().slice(0, 16)}`);
  await q(`update workspaces set plan = ${lit(CONSTRUIRE === "outil-gratuit" ? "essai" : CONSTRUIRE === "site" || CONSTRUIRE === "outil" ? "site" : "lancer_pro")}, plan_status = ${lit(CONSTRUIRE === "outil-gratuit" ? "trialing" : "active")}, onboarded = true where id = ${lit(ws2)}`);
  const nomVoulu = CONSTRUIRE === "ia" ? ({ "calendly.com": "Rendezo", "invoiceninja.com": "Facturo", "canny.io": "Avisio" }[process.env.DOMAINE ?? ""] ?? "Cerclo") : CONSTRUIRE === "site" ? SITE_IDEE.apercu.nom : "Sublima";
  const TEXTE_IDEE = process.env.TEXTE_IDEE || (process.env.DOMAINE && !/\.[a-z]{2,}$/.test(process.env.DOMAINE) ? process.env.DOMAINE : "") || "j'ai une conciergerie où je veux gérer l'entretien dans des bureaux avec mes équipes";
  let { ctx, page } = CONSTRUIRE === "idee" || CONSTRUIRE === "outil" ? await ouvrir(ws2, { "bingoo-idee": { texte: TEXTE_IDEE, type: CONSTRUIRE === "outil" ? "outil" : "saas", at: Date.now() } }) : CONSTRUIRE === "copie" ? await ouvrir(ws2, { "bingoo-copie": { url: process.env.DOMAINE || "cal.com", at: Date.now() } }) : await ouvrir(ws2, {
    [`bingoo-reponses-${cible.domaine}`]: { nom: nomVoulu, clients: CONSTRUIRE === "ia" ? (process.env.DOMAINE ? "Indépendants et petites équipes" : "Créateurs de communautés") : "Instituts de beauté", mieux: "", angle: `Nom souhaité, à utiliser tel quel : ${nomVoulu}` },
    "bingoo-chantier": { ...cible, ws: ws2, metier: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Institut de beauté" },
  });
  const t0 = Date.now();
  if (CONSTRUIRE === "idee" || CONSTRUIRE === "outil") {
    // Le vrai parcours d'un membre : il écrit son idée sur l'accueil (SaaS), voit l'aperçu, clique « Construire … »
    await page.goto(`${SITE}/?c=${t0}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    const bouton = page.getByRole("button", { name: /^Construire / });
    await bouton.first().waitFor({ timeout: 120000 }).catch(() => null);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DOSSIER}/idee-apercu.png`, fullPage: true }).catch(() => null);
    console.log("Aperçu de l'idée :", (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 900));
    await bouton.first().click().catch((e) => console.log("✗ bouton Construire introuvable", e.message));
    await page.waitForTimeout(5000);
  } else if (CONSTRUIRE === "copie") {
    // Le membre a collé l'adresse d'un site : Bingoo! le lit point par point, il donne son nom et son logo, puis construit
    await page.goto(`${SITE}/?c=${t0}#/explorer/copie`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(2500); await page.screenshot({ path: `${DOSSIER}/copie-lecture.png`, fullPage: true }).catch(() => null);
    await page.locator("#copie-nom").waitFor({ timeout: 90000 }).catch(() => null);
    await page.waitForTimeout(800);
    console.log("Lecture du site :", (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 1200));
    await page.locator("#copie-nom").fill(process.env.NOM_COPIE || "Agendo").catch(() => null);
    // Un logo (dessiné à la volée) envoyé comme le ferait le membre
    const png = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#0F766E"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("A", 128, 140); return c.toDataURL("image/png").split(",")[1]; });
    await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") }).catch((e) => console.log("✗ logo", e.message));
    await page.getByAltText("Ton logo").waitFor({ timeout: 30000 }).catch(() => console.log("✗ logo non affiché"));
    await page.screenshot({ path: `${DOSSIER}/copie-resultat.png`, fullPage: true }).catch(() => null);
    await page.getByRole("button", { name: /^Construire / }).first().click().catch((e) => console.log("✗ bouton Construire", e.message));
    await page.waitForTimeout(5000);
  } else await page.goto(`${SITE}/?c=${t0}#/explorer/revelation`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
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
    // Les trois questions avant la construction : un membre clique « Construire ma version » (le nom voulu est déjà rempli)
    if (!fin && /Construire ma version/.test(texte)) { const b = page.getByRole("button", { name: /Construire ma version/ }); if (await b.count().catch(() => 0)) { await b.first().click().catch(() => null); console.log("Clic : Construire ma version"); } }
    // Aucune app créée après 5 minutes : le parcours est bloqué avant la construction, on le dit (texte de la page) et on s'arrête
    if (!fin && Date.now() - t0 > 5 * 60e3) { const [x] = await q(`select count(*)::int n from saas_apps where workspace_id = ${lit(ws2)}`); if (!x?.n) { console.log("✗ BLOQUÉ AVANT LA CONSTRUCTION · URL", page.url(), "· page :", texte.replace(/\s+/g, " ").slice(0, 600)); break; } }
    // Ou la base le dit : vérification finie (le texte de la page varie selon le genre d'app)
    if (!fin) { const [v] = await q(`select verif->>'phase' p, statut from saas_apps where workspace_id = ${lit(ws2)}`); fin = v?.p === "fini" || v?.statut === "erreur"; if (fin && !figee) { await page.waitForTimeout(4000); await page.screenshot({ path: `${DOSSIER}/construction-fin.png`, timeout: 15000 }).catch(() => null); } }
  }
  if (figee) { console.log(`⚠ La page de construction s'est figée ${figee} fois : bug à corriger côté Bingoo!`); fs.writeFileSync(`${DOSSIER}/PAGE-FIGEE.txt`, String(figee)); page = await ctx.newPage(); }
  console.log(`Construction ${fin ? "terminée" : "toujours en cours"} après ${Math.round((Date.now() - t0) / 1000)} s`);
  { const [v] = await q(`select verif->'journal' j, verif->>'at' quand from saas_apps where workspace_id = ${lit(ws2)}`); console.log("Vérification :", JSON.stringify(v ?? null)); }
  const [a] = await q(`select slug, statut, version, verif from saas_apps where workspace_id = ${lit(ws2)}`);
  fs.writeFileSync(`${DOSSIER}/resultat.json`, JSON.stringify({ duree_s: Math.round((Date.now() - t0) / 1000), app: a ?? null }, null, 2));
  if (a?.slug) { const [g] = await q(`select spec->'gen' gen, jsonb_array_length(coalesce(spec->'site'->'page'->'sections','[]'::jsonb)) sections from saas_apps where slug = ${lit(a.slug)}`); console.log("Moteur de pages :", JSON.stringify(g)); fs.writeFileSync(`${DOSSIER}/moteur.json`, JSON.stringify(g, null, 2)); }
  console.log(JSON.stringify(a?.verif?.mesure ?? null), (a?.verif?.journal ?? []).map((j) => j.t).join("\n"));
  // Le site en ligne tel que le voit un visiteur, puis le plan « premiers clients » du commerce
  // Un SaaS construit : chaque écran tel que le voit le membre dans « Mon SaaS » (ordinateur, puis téléphone)
  if (a?.slug && CONSTRUIRE === "copie") { const [d] = await q(`select spec->'design'->'couleurs'->>'primary' prim, spec->'design'->'polices' pol, spec->'design'->>'source_style' src, spec->>'logo' logo from saas_apps where slug = ${lit(a.slug)}`); console.log("STYLE APPLIQUÉ :", JSON.stringify(d)); }
  if (["idee", "ia", "copie"].includes(CONSTRUIRE) && a?.slug) {
    const [{ titres }] = await q(`select coalesce(json_agg(e->>'titre'), '[]') titres from saas_apps, jsonb_array_elements(spec->'ecrans') e where slug = ${lit(a.slug)} and coalesce((e->>'public')::boolean, false) = false`);
    for (const [suffixe, vp] of [["", { width: 1440, height: 900 }], ["-mobile", { width: 390, height: 844 }]]) {
      await page.setViewportSize(vp);
      await page.goto(`${SITE}/?c=${Date.now()}#/explorer/mon-saas`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
      await page.waitForTimeout(8000);
      const cadre = page.frameLocator("iframe").first();
      for (const [i, t] of (titres ?? []).entries()) {
        if (suffixe && i > 3) break;
        const b = cadre.getByRole("button", { name: t, exact: true });
        if (await b.count().catch(() => 0)) { await b.first().click({ timeout: 5000 }).catch(() => null); }
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${DOSSIER}/ecran-${String(i + 1).padStart(2, "0")}${suffixe}.png` }).catch(() => null);
      }
    }
    console.log("✓ écrans du SaaS photographiés :", (titres ?? []).join(", "));
    // La page de présentation telle que la voit un visiteur (moteur de pages), ordinateur puis téléphone
    const [gv] = await q(`select spec->'gen' gen, jsonb_array_length(coalesce(spec->'site'->'page'->'sections','[]'::jsonb)) n from saas_apps where slug = ${lit(a.slug)}`);
    console.log("Page de présentation :", JSON.stringify(gv));
    fs.writeFileSync(`${DOSSIER}/vitrine-moteur.json`, JSON.stringify(gv, null, 2));
    for (const [nom, vp] of [["vitrine", { width: 1440, height: 900 }], ["vitrine-mobile", { width: 390, height: 844 }]]) {
      const c2 = await browser.newContext({ viewport: vp, locale: "fr-FR" }); const p2 = await c2.newPage();
      await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
      await p2.waitForTimeout(6000);
      await p2.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }).catch(() => null);
      await c2.close(); console.log("✓", nom);
    }
  }
  if (["outil", "outil-gratuit"].includes(CONSTRUIRE) && a?.slug) {
    // L'outil ou le jeu tel que l'ouvre un visiteur : pas de compte, on arrive dessus. Puis après quelques vrais clics.
    for (const [nom, vp] of [["outil", { width: 1440, height: 900 }], ["outil-mobile", { width: 390, height: 844 }]]) {
      const c2 = await browser.newContext({ viewport: vp, locale: "fr-FR" }); const p2 = await c2.newPage();
      const erreurs = []; p2.on("pageerror", (e) => erreurs.push(String(e.message).slice(0, 200)));
      await p2.goto(`${SITE}/?c=${Date.now()}#/app/${a.slug}`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
      await p2.waitForTimeout(7000);
      await p2.screenshot({ path: `${DOSSIER}/${nom}.png` }).catch(() => null);
      const cadre = p2.frameLocator("iframe").first();
      const texte = await cadre.locator("body").innerText({ timeout: 8000 }).catch(() => "");
      console.log(`${nom} · texte :`, texte.replace(/\s+/g, " ").slice(0, 500));
      console.log(`${nom} · compte ou vente à l'écran :`, /S'inscrire|Créer (un|mon) compte|Essayer gratuitement|par mois|Se connecter/i.test(texte) ? "✗ OUI" : "✓ non");
      // Quelques gestes d'un visiteur : des cases ou des boutons de l'outil (jamais le badge), puis une saisie si un champ existe
      const boutons = cadre.locator("[data-bingoo-outil] button:not([disabled])"); const nb = await boutons.count().catch(() => 0);
      for (const k of [3, 10, 4, 11, 5, 17, 2].filter((x) => x < nb).slice(0, 6)) { await boutons.nth(k).click({ timeout: 3000 }).catch(() => null); await p2.waitForTimeout(700); }
      const champ = cadre.locator("[data-bingoo-outil] input[type=number], [data-bingoo-outil] input[inputmode], [data-bingoo-outil] input[type=text]").first();
      if (await champ.count().catch(() => 0)) { await champ.fill("250", { timeout: 3000 }).catch(() => null); await p2.waitForTimeout(1200); }
      await p2.waitForTimeout(1500);
      await p2.screenshot({ path: `${DOSSIER}/${nom}-apres-clics.png` }).catch(() => null);
      console.log(`${nom} · ${nb} boutons · erreurs de page :`, erreurs.length ? erreurs.join(" | ") : "aucune");
      await c2.close();
    }
    const [o] = await q(`select spec->>'type' type, spec->'outil'->>'genre' genre, length(spec->'ecrans'->0->>'code') taille, jsonb_array_length(spec->'ecrans') ecrans from saas_apps where slug = ${lit(a.slug)}`);
    console.log("Outil construit :", JSON.stringify(o));
  }
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
    // Retour au design précédent (apparence seule) : couleur changée par le gérant, puis retour en un clic, puis annulation
    const [{ id: idSite }] = await q(`select id from saas_apps where slug = ${lit(a.slug)}`);
    const reglage = (corps) => fetch(`${SB}/functions/v1/r/saas-app-reglages`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, "content-type": "application/json" }, body: JSON.stringify({ workspace_id: ws2, app_id: idSite, ...corps }) }).then(async (r) => [r.status, await r.text()]);
    const etat = async () => (await q(`select spec->'design'->'couleurs'->>'primary' p, spec->>'couleur' c, spec->'site'->>'gabarit' g, jsonb_array_length(coalesce(spec->'designs_precedents','[]'::jsonb)) n, spec->'site'->>'cta' cta from saas_apps where slug = ${lit(a.slug)}`))[0];
    const e0 = await etat(); console.log("Design 0 :", JSON.stringify(e0));
    console.log("Couleur changée :", (await reglage({ quoi: "identite", couleur: "#0F766E" })).join(" ").slice(0, 80));
    const e1 = await etat(); console.log("Design 1 :", JSON.stringify(e1));
    console.log("Retour :", (await reglage({ quoi: "design-revenir" })).join(" ").slice(0, 120));
    const e2 = await etat(); console.log("Design 2 :", JSON.stringify(e2));
    console.log("Annulation du retour :", (await reglage({ quoi: "design-revenir" })).join(" ").slice(0, 60));
    const e3 = await etat(); console.log("Design 3 :", JSON.stringify(e3));
    const okDesign = e1.p === "#0F766E" && e1.n === 1 && e2.p === e0.p && e2.g === e0.g && e2.cta === e0.cta && e3.p === "#0F766E";
    console.log(okDesign ? "✓ retour au design précédent" : "✗ retour au design précédent");
    fs.writeFileSync(`${DOSSIER}/design-retour.json`, JSON.stringify({ ok: okDesign, e0, e1, e2, e3 }, null, 2));
    await reglage({ quoi: "design-revenir" });
    // « Appliquer le nouveau design » sur un site existant : l'ancien est gardé et le retour le rend
    const n0 = await etat();
    console.log("Nouveau design :", (await reglage({ quoi: "design-nouveau" })).join(" ").slice(0, 120));
    const n1 = await etat();
    console.log("Retour après nouveau design :", (await reglage({ quoi: "design-revenir" })).join(" ").slice(0, 60));
    const n2 = await etat();
    const okNouveau = n1.n === n0.n + 1 && n2.p === n0.p && n2.g === n0.g;
    console.log(okNouveau ? "✓ nouveau design puis retour" : "✗ nouveau design puis retour", JSON.stringify({ n0, n1, n2 }));
  }
  await ctx.close();
}
await browser.close();
