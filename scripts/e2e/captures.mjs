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
const TOK = process.env.SUPABASE_ACCESS_TOKEN, EMAIL = "robot-captures@bingoo.fr";
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
if (process.env.IDEE === "1") {
  for (const [nom, texte] of [["idee-claire", "Une app de réservation pour les coiffeurs à domicile, avec rappel la veille"], ["idee-floue", "Une appli comme Uber"], ["idee-refusee", "Un faux site de connexion de ma banque pour récupérer les identifiants"]]) {
    const { ctx, page } = await ouvrir(ws, { "bingoo-idee": { texte, type: "saas", at: Date.now() } });
    await page.goto(`${SITE}/?c=${Date.now()}#/explorer/idee`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    await page.waitForFunction(() => /Construire |précisions|ne peut pas construire|réessaie|Réessayer/i.test(document.body.innerText), null, { timeout: 90000 }).catch(() => null);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DOSSIER}/${nom}.png`, fullPage: true }); console.log("✓", nom);
    await ctx.close();
  }
}
if (!CONSTRUIRE) {
  const { ctx, page } = await ouvrir(ws);
  for (const [nom, chemin] of [["mon-saas", "#/explorer/mon-saas"], ["atelier", "#/explorer/atelier"], ["modeles", "#/explorer/modeles"], ["connecteur", "#/explorer/connecteur"], ["abonnement", "#/abonnement"]]) await photo(page, nom, chemin);
  // L'admin : droits donnés le temps de la photo, puis retirés
  await q(`insert into admins (user_id) values (${lit(uid)}) on conflict do nothing`);
  try { await photo(page, "admin", "#/admin", 8000); } finally { await q(`delete from admins where user_id = ${lit(uid)}`); }
  await ctx.close();
} else {
  // 4) Une vraie construction, dans un espace neuf (un SaaS par abonnement), photographiée jusqu'à la fin de la vérification
  const cible = CONSTRUIRE === "ia"
    ? { domaine: process.env.DOMAINE || "circle.so", nom: "Circle", categorie: "Communauté" }
    : { domaine: "planity.com", nom: "Planity", categorie: "Commerce et restauration", modele: "reservation", couleur: "#1F3D33", allure: "nature" };
  const ws2 = await creerEspace(`Robot construction ${new Date().toISOString().slice(0, 16)}`);
  await q(`update workspaces set plan = 'lancer_pro', plan_status = 'active', onboarded = true where id = ${lit(ws2)}`);
  const nomVoulu = CONSTRUIRE === "ia" ? "Cerclo" : "Sublima";
  const { ctx, page } = await ouvrir(ws2, {
    [`bingoo-reponses-${cible.domaine}`]: { nom: nomVoulu, clients: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Instituts de beauté", mieux: "", angle: `Nom souhaité, à utiliser tel quel : ${nomVoulu}` },
    "bingoo-chantier": { ...cible, ws: ws2, metier: CONSTRUIRE === "ia" ? "Créateurs de communautés" : "Institut de beauté" },
  });
  const t0 = Date.now();
  await page.goto(`${SITE}/?c=${t0}#/explorer/revelation`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
  let n = 0, fin = false;
  while (Date.now() - t0 < 25 * 60e3 && !fin) {
    await page.waitForTimeout(20000);
    await page.screenshot({ path: `${DOSSIER}/construction-${String(++n).padStart(2, "0")}.png` });
    const texte = await page.evaluate(() => document.body.innerText);
    fin = /Tout est propre|Je livre ton SaaS|tests continuent en arrière-plan|La construction a échoué/.test(texte);
  }
  console.log(`Construction ${fin ? "terminée" : "toujours en cours"} après ${Math.round((Date.now() - t0) / 1000)} s`);
  const [a] = await q(`select slug, statut, version, verif from saas_apps where workspace_id = ${lit(ws2)}`);
  fs.writeFileSync(`${DOSSIER}/resultat.json`, JSON.stringify({ duree_s: Math.round((Date.now() - t0) / 1000), app: a ?? null }, null, 2));
  console.log(JSON.stringify(a?.verif?.mesure ?? null), (a?.verif?.journal ?? []).map((j) => j.t).join("\n"));
  await ctx.close();
}
await browser.close();
