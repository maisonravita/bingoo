// Test de bout en bout lancé chaque nuit contre le site en ligne (aucun compte, aucun paiement, aucun appel IA).
// Échoue (et GitHub prévient par e-mail) si un parcours clé casse.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const SITE = process.env.SITE || "https://kairo.maisonravita.fr";
const SB = "https://fbsjbnnmzazylmquzryo.supabase.co";
const ANON = process.env.ANON || (await import("node:fs")).readFileSync(".env.production", "utf8").match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
const APP = process.env.APP || "kineflux-5o1k";
const ko = [], avert = [];
const etape = async (nom, f) => { const t = Date.now(); try { await f(); console.log(`✓ ${nom} (${Date.now() - t} ms)`); } catch (e) { ko.push(nom); console.log(`✗ ${nom} : ${e.message.split("\n")[0]}`); } };
const verif = (c, m) => { if (!c) throw new Error(m); };

// 1) Bilan de santé côté base
await etape("Bilan de santé de la base", async () => {
  const r = await fetch(`${SB}/rest/v1/rpc/bingoo_sante`, { method: "POST", headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json" }, body: "{}" });
  verif(r.ok, `HTTP ${r.status}`);
  const { checks } = await r.json();
  for (const c of checks) {
    const l = `${c.nom}${c.valeur != null ? ` (${c.valeur})` : ""}`;
    if (c.ok) console.log(`   · ok  ${l}`); else if (c.grave) throw new Error(`KO ${l}`); else { avert.push(l); console.log(`   · ⚠   ${l}`); }
  }
});

const browser = await chromium.launch();
for (const [label, opt] of [["téléphone", devices["iPhone 13"]], ["ordinateur", { viewport: { width: 1280, height: 860 } }]]) {
  const ctx = await browser.newContext(opt);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  const sansErreur = () => { const e = erreurs.splice(0); verif(!e.length, `erreur JavaScript : ${e[0]}`); };
  const debordement = async () => verif(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)), "la page déborde en largeur");

  await etape(`[${label}] Accueil`, async () => {
    await page.goto(`${SITE}/?e2e=${Date.now()}`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForFunction(() => /SaaS/.test(document.body.innerText), null, { timeout: 20000 });
    await debordement(); sansErreur();
  });
  await etape(`[${label}] Questions du parcours`, async () => {
    await page.goto(`${SITE}/?e2e=${Date.now()}#/explorer/trouver`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 15000 });
    await debordement(); sansErreur();
  });
  await etape(`[${label}] Démo d'un SaaS livré`, async () => {
    await page.goto(`${SITE}/?e2e=${Date.now()}#/app/${APP}`, { waitUntil: "networkidle", timeout: 45000 });
    const cadre = page.frameLocator("iframe").first();
    await cadre.getByText("Voir la démo en 30 s").first().click({ timeout: 20000 });
    await cadre.getByText(/1\/\d · /).first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(2500);
    const txt = await cadre.locator("body").innerText();
    verif(txt.length > 150 && !/Chargement…?\s*$/.test(txt.trim()), "l'écran de démo reste vide");
    sansErreur();
  });
  await ctx.close();
}
await browser.close();

if (avert.length) console.log(`\nÀ surveiller : ${avert.join(" · ")}`);
if (ko.length) { console.log(`\n${ko.length} étape(s) en échec : ${ko.join(" · ")}`); process.exit(1); }
console.log("\nTout est bon.");
