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
      return { hauteur: document.body.scrollHeight, largeurPage: document.documentElement.scrollWidth, deborde, imgsCassees: imgs, petitsBoutons: petits, compteur: document.body.innerText.match(/Découvre les ([^S]+) SaaS/)?.[1], video: v ? { pret: v.readyState, duree: Math.round(v.duration), src: v.currentSrc.slice(-28) } : null, h2: [...document.querySelectorAll("h2")].map((h) => h.innerText.replace(/\s+/g, " ").slice(0, 60)) };
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
  { const c0 = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" }); const p0 = await c0.newPage();
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
if (["1", "site", "app"].includes(process.env.IDEE)) {
  const IDEES_SAAS = [["idee-claire", "Une app de réservation pour les coiffeurs à domicile, avec rappel la veille"], ["idee-floue", "Une appli comme Uber"], ["idee-refusee", "Un faux site de connexion de ma banque pour récupérer les identifiants"]].map(([n, t]) => [n, t, "saas"]);
  // Sites web (étape 2) : une idée claire et une floue
  const IDEES_SITE = [["site-barber", "site pour les barber"], ["site-claire", "Le site de mon salon de coiffure à domicile à Lyon"], ["site-floue", "Un beau site pour mon entreprise"]].map(([n, t]) => [n, t, "site"]);
  // Apps mobiles (étape 3)
  const IDEES_APP = [["app-claire", "Une app pour suivre mes séances de sport et mes progrès"]].map(([n, t]) => [n, t, "app"]);
  const LISTE = process.env.IDEE === "site" ? IDEES_SITE : process.env.IDEE === "app" ? IDEES_APP : [...IDEES_SAAS, ...IDEES_SITE, ...IDEES_APP];
  for (const [nom, texte, type] of LISTE) {
    const { ctx, page } = await ouvrir(ws, { "bingoo-idee": { texte, type, at: Date.now() } });
    await page.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    const pret = () => page.waitForFunction(() => !/étudie ton idée|prépare l'aperçu/i.test(document.body.innerText) && /Construire \S+ \S|Le nom affiché|précisions|ne peut pas construire|réessaie|Réessayer/i.test(document.querySelector("main")?.innerText ?? document.body.innerText), null, { timeout: 120000 }).catch(() => null);
    await pret(); await page.waitForTimeout(type === "site" ? 7000 : 1500);
    await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom);
    // Site : le vrai gabarit tourne dans un cadre ; on le fait défiler pour photographier la suite de la page
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
if (CONSTRUIRE === "spec") {
  // Exporte la définition d'un SaaS (DOMAINE = son adresse courte) pour le photographier écran par écran hors ligne
  const [x] = await q(`select spec from saas_apps where slug = ${lit(process.env.DOMAINE ?? "")}`);
  fs.writeFileSync(`${DOSSIER}/spec.json`, JSON.stringify(x?.spec ?? null));
  console.log("spec exportée :", x ? "oui" : "introuvable");
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
    let x = await attendreFin(a.id);
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
} else if (CONSTRUIRE === "gratuit" || CONSTRUIRE === "audit") {
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
    "lovable-restaurant": { texte: "Crée le site de mon restaurant. Le Comptoir de Lina, bistrot de quartier à Lyon (Croix-Rousse), 7 rue d'Austerlitz, 69004 Lyon. Cuisine de saison faite maison, carte courte qui change chaque semaine. Formule midi entrée + plat ou plat + dessert à 19 €, menu du soir à 34 €. Ouvert du mardi au samedi, 12 h – 14 h et 19 h 30 – 22 h. Réservation par téléphone au 04 78 00 00 00 ou par formulaire. Le site est en français.", apercu: { type: "site", nom: "Le Comptoir de Lina", pitch: "Bistrot de quartier à la Croix-Rousse, cuisine de saison faite maison.", cible: "Habitants et gourmands de Lyon", metier: "Bistrot de quartier", cta: "Réserver une table", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    "lovable-lancement": { texte: "Crée la page de lancement de mon application mobile. Mealo : on prend en photo le contenu de son frigo et l'appli propose 3 recettes de la semaine avec ce qu'on a déjà, plus la liste de courses du reste. Pour les familles pressées qui veulent moins gaspiller. L'appli sort en février sur iPhone et Android ; en attendant, on veut récolter des inscriptions à la liste d'attente (prénom + e-mail). Gratuite, avec une version Plus à 3,99 €/mois. Le site est en français.", apercu: { type: "site", modele: "lancement", nom: "Mealo", pitch: "Une photo du frigo, trois recettes de la semaine et la liste de courses du reste.", cible: "Familles pressées", metier: "Appli de recettes", cta: "Rejoindre la liste", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    "lovable-saas": { texte: "Crée la page de présentation de mon logiciel. Planilo : logiciel de réservation en ligne pour les salons de coiffure et instituts de beauté indépendants. Les clientes réservent 24 h/24 depuis un lien ou Instagram, reçoivent un rappel par SMS la veille, et le salon voit son agenda, ses prestations et son chiffre du jour au même endroit. Essai gratuit 14 jours sans carte bancaire, puis 29 € par mois et par salon. Le site est en français.", apercu: { type: "site", modele: "lancement", nom: "Planilo", pitch: "La réservation en ligne des salons de coiffure et instituts indépendants.", cible: "Salons de coiffure et instituts de beauté indépendants", metier: "Logiciel de réservation", cta: "Essayer 14 jours", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Demandes" }] } },
    portfolio: { texte: "Le portfolio de mon activité de photographe de mariage à Bordeaux", apercu: { type: "site", modele: "portfolio", nom: "Atelier Lumen", pitch: "Photographe de mariage et de famille à Bordeaux.", cible: "Futurs mariés et familles", metier: "Photographe de mariage", accroche: "Vos souvenirs en lumière naturelle", cta: "Parler de mon projet", ecrans: [{ titre: "Accueil", role: "L'accroche" }, { titre: "Réalisations", role: "Les photos" }, { titre: "Contact", role: "Le formulaire" }, { titre: "Espace gérant", role: "Projets et demandes" }], services: [], plus_tard: [], limites: [] } },
    lancement: { texte: "Une page pour annoncer mon appli de repas de la semaine et recueillir les e-mails avant le lancement", apercu: { type: "site", modele: "lancement", nom: "Mealo", pitch: "Une appli qui prépare vos menus et votre liste de courses.", cible: "Familles pressées", metier: "Appli de repas", accroche: "Vos repas de la semaine en 2 minutes", cta: "Être prévenu", ecrans: [{ titre: "Accueil", role: "L'inscription" }, { titre: "Comment ça marche", role: "Les étapes" }, { titre: "Espace gérant", role: "Les inscrits" }], services: [], plus_tard: [], limites: [] } },
  };
  const SITE_IDEE = SITES[process.env.DOMAINE] ?? { texte: "Le site de mon activité de coiffeuse à domicile à Lyon", apercu: { type: "site", nom: "Coupe Chez Vous", pitch: "Coiffeuse à domicile à Lyon : coupes, couleurs et brushings chez vous, sur rendez-vous.", cible: "Familles et particuliers lyonnais", metier: "Coiffeuse à domicile", accroche: "Votre coiffeuse vient chez vous", cta: "Prendre rendez-vous", ecrans: [{ titre: "Accueil", role: "L'accroche et le bouton de rendez-vous" }, { titre: "Services et tarifs", role: "Les prestations et leurs prix" }, { titre: "Contact", role: "Le formulaire de demande" }, { titre: "Espace gérant", role: "Les demandes reçues" }], services: [], plus_tard: [], limites: [] } };
  const cible = CONSTRUIRE === "site" ? { idee: true, domaine: "idee.bingoo.fr", nom: SITE_IDEE.apercu.nom, categorie: "", ideeTexte: SITE_IDEE.texte, type: "site", reponses: [], apercu: SITE_IDEE.apercu }
    : CONSTRUIRE === "ia"
    ? { domaine: process.env.DOMAINE || "circle.so", nom: (await q(`select coalesce(nom, split_part(domaine, '.', 1)) nom from saas where domaine = ${lit(process.env.DOMAINE || "circle.so")}`))[0]?.nom ?? "Circle", categorie: (await q(`select coalesce(categorie, '') c from saas where domaine = ${lit(process.env.DOMAINE || "circle.so")}`))[0]?.c || "Communauté" }
    : { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration", modele: "reservation", couleur: "#1F3D33", allure: "nature" };
  const ws2 = await creerEspace(`Robot construction ${new Date().toISOString().slice(0, 16)}`);
  await q(`update workspaces set plan = ${lit(CONSTRUIRE === "site" ? "site" : "lancer_pro")}, plan_status = 'active', onboarded = true where id = ${lit(ws2)}`);
  const nomVoulu = CONSTRUIRE === "ia" ? ({ "calendly.com": "Rendezo", "invoiceninja.com": "Facturo", "canny.io": "Avisio" }[process.env.DOMAINE ?? ""] ?? "Cerclo") : CONSTRUIRE === "site" ? SITE_IDEE.apercu.nom : "Sublima";
  const TEXTE_IDEE = process.env.TEXTE_IDEE || (process.env.DOMAINE && !/\.[a-z]{2,}$/.test(process.env.DOMAINE) ? process.env.DOMAINE : "") || "j'ai une conciergerie où je veux gérer l'entretien dans des bureaux avec mes équipes";
  let { ctx, page } = CONSTRUIRE === "idee" ? await ouvrir(ws2, { "bingoo-idee": { texte: TEXTE_IDEE, type: "saas", at: Date.now() } }) : CONSTRUIRE === "copie" ? await ouvrir(ws2, { "bingoo-copie": { url: process.env.DOMAINE || "cal.com", at: Date.now() } }) : await ouvrir(ws2, {
    [`bingoo-reponses-${cible.domaine}`]: { nom: nomVoulu, clients: CONSTRUIRE === "ia" ? (process.env.DOMAINE ? "Indépendants et petites équipes" : "Créateurs de communautés") : "Instituts de beauté", mieux: "", angle: `Nom souhaité, à utiliser tel quel : ${nomVoulu}` },
    "bingoo-chantier": { ...cible, ws: ws2, metier: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Institut de beauté" },
  });
  const t0 = Date.now();
  if (CONSTRUIRE === "idee") {
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
