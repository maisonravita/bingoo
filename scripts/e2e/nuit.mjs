// Test de bout en bout lancé chaque nuit contre le site en ligne (aucun compte, aucun paiement, aucun appel IA).
// Échoue (et GitHub prévient par e-mail) si un parcours clé casse.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const SITE = process.env.SITE || "https://bingoo.fr";
const SB = "https://fbsjbnnmzazylmquzryo.supabase.co";
const ANON = process.env.ANON || (await import("node:fs")).readFileSync(".env.production", "utf8").match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1];
// Le SaaS livré le plus récent (lu dans le plan du site) : le test suit les SaaS réellement en ligne
const APP = process.env.APP || ((await (await fetch(`${SITE}/sitemap-apps.xml`)).text()).match(/\/p\/([a-z0-9-]+)</) || [])[1] || "kineflux-5o1k";
const ko = [], avert = [];
const etape = async (nom, f) => { const t = Date.now(); try { await f(); console.log(`✓ ${nom} (${Date.now() - t} ms)`); } catch (e) { ko.push(nom); console.log(`✗ ${nom} : ${e.message.split("\n")[0]}`); } };
const verif = (c, m) => { if (!c) throw new Error(m); };

// 1) Bilan de santé côté base
await etape("Bilan de santé de la base", async () => {
  // Un second essai 30 s plus tard : une requête peut dépasser son temps limite quand les tâches de fond chargent la base
  const appel = () => fetch(`${SB}/rest/v1/rpc/bingoo_sante`, { method: "POST", headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json" }, body: "{}" });
  let r = await appel();
  if (!r.ok) { console.log(`   · HTTP ${r.status}, nouvel essai dans 30 s`); await new Promise((ok) => setTimeout(ok, 30000)); r = await appel(); }
  verif(r.ok, `HTTP ${r.status}`);
  const { checks } = await r.json();
  for (const c of checks) {
    const l = `${c.nom}${c.valeur != null ? ` (${c.valeur})` : ""}`;
    if (c.ok) console.log(`   · ok  ${l}`); else if (c.grave) throw new Error(`KO ${l}`); else { avert.push(l); console.log(`   · ⚠   ${l}`); }
  }
});

// 2) Pages lisibles par Google des SaaS livrés
await etape("Page Google d'un SaaS livré + plan du site", async () => {
  const h = await (await fetch(`${SITE}/p/${APP}`)).text();
  verif(/application\/ld\+json/.test(h) && /<h1>/.test(h), "page de présentation incomplète");
  verif(!/succès de|revendique|\$/.test(h.replace(/<script[\s\S]*?<\/script>/g, "")), "la page reprend des chiffres du SaaS d'origine");
  const x = await (await fetch(`${SITE}/sitemap-apps.xml`)).text();
  verif(x.includes(`/p/${APP}`), "plan du site sans la page");
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
// 3) Chaque SaaS livré : sa démo s'ouvre et chacun de ses écrans s'affiche sans erreur
const TOUTES = [...(await (await fetch(`${SITE}/sitemap-apps.xml`)).text()).matchAll(/\/p\/([a-z0-9-]+)</g)].map((m) => m[1]);
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  for (const slug of TOUTES) {
    await etape(`[SaaS ${slug}] tous les écrans de la démo`, async () => {
      const page = await ctx.newPage(); const erreurs = [];
      page.on("pageerror", (e) => erreurs.push(e.message));
      await page.goto(`${SITE}/?e2e=${Date.now()}#/app/${slug}`, { waitUntil: "networkidle", timeout: 45000 });
      const cadre = page.frameLocator("iframe").first();
      await cadre.getByText("Voir la démo en 30 s").first().click({ timeout: 20000 });
      await page.waitForTimeout(2500);
      await page.mouse.click(5, 300); // arrête la visite guidée
      const liens = cadre.locator("aside button, aside a, nav button");
      const n = Math.min(await liens.count(), 12);
      const vides = [];
      for (let i = 0; i < n; i++) {
        const l = liens.nth(i); const nom = (await l.innerText().catch(() => "")).trim();
        if (!nom || /équipe|mes données|installer|déconnexion|se déconnecter/i.test(nom)) continue;
        await l.click({ timeout: 5000 }).catch(() => null);
        // L'écran charge ses données de démo : on lui laisse jusqu'à 8 s avant de le déclarer vide
        let txt = "";
        for (let essai = 0; essai < 16; essai++) {
          await page.waitForTimeout(500);
          txt = await cadre.locator("main").innerText().catch(() => "");
          if (txt.trim().length >= 40 && !/Chargement…?\s*$/.test(txt.trim())) break;
        }
        if (/Cet écran n'a pas pu|a rencontré un problème|Erreur dans l'écran/i.test(txt) || txt.trim().length < 40) vides.push(nom);
      }
      await page.close();
      verif(!erreurs.length, `erreur JavaScript : ${erreurs[0]}`);
      verif(!vides.length, `écran(s) en erreur ou vide(s) : ${vides.join(", ")}`);
    });
  }
  await ctx.close();
}
await browser.close();

if (avert.length) console.log(`\nÀ surveiller : ${avert.join(" · ")}`);
if (ko.length) { console.log(`\n${ko.length} étape(s) en échec : ${ko.join(" · ")}`); process.exit(1); }
console.log("\nTout est bon.");
