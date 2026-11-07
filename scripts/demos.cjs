// Enregistre les vidéos de la page d'accueil à partir des VRAIS composants (demo.html, données d'exemple).
// Usage : npx vite --port 5199 --mode production   puis   node scripts/demos.cjs <dossier des polices fontsource>
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const FONTS = process.argv[2]; const OUT = process.argv[3] || "/tmp/demos";
const CURSOR = `(() => { const c = document.createElement("div"); c.id = "fc"; c.style.cssText = "position:fixed;left:640px;top:600px;width:22px;height:22px;border-radius:50%;background:rgba(21,23,42,.85);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999;pointer-events:none;transition:left .55s cubic-bezier(.3,.7,.3,1),top .55s cubic-bezier(.3,.7,.3,1),transform .15s"; document.body.appendChild(c); })()`;
async function vers(p, loc) {
  const b = await loc.boundingBox(); if (!b) return;
  await p.evaluate(([x, y]) => { const c = document.getElementById("fc"); c.style.left = x - 11 + "px"; c.style.top = y - 11 + "px"; }, [b.x + b.width / 2, b.y + b.height / 2]);
  await p.waitForTimeout(650);
}
async function clic(p, loc) { await vers(p, loc); await p.evaluate(() => { const c = document.getElementById("fc"); c.style.transform = "scale(.75)"; setTimeout(() => (c.style.transform = ""), 160); }); await loc.click(); }
const bouton = (p, t) => p.locator("button", { hasText: t }).first();
async function defile(p, y, ms = 1600) { await p.evaluate(([y, ms]) => { const s = window.scrollY, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / ms); window.scrollTo(0, s + (y - s) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }, [y, ms]); await p.waitForTimeout(ms + 300); }

(async () => {
  const b = await chromium.launch();
  for (const v of ["inscription", "journee"]) {
    const dir = path.join(OUT, v); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
    if (FONTS) {
      await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8") }));
      await ctx.route(/fonts\.local/, (r) => r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, "node_modules/@fontsource", new URL(r.request().url()).pathname)) }));
    }
    const p = await ctx.newPage();
    await p.goto(`http://localhost:5199/demo.html?v=${v}`); await p.waitForTimeout(1500); await p.evaluate(CURSOR); await p.waitForTimeout(600);
    if (v === "inscription") {
      await clic(p, bouton(p, "peu de clients")); await p.waitForTimeout(900);
      await clic(p, bouton(p, "Un SaaS")); await p.waitForTimeout(1800);
      await clic(p, bouton(p, "Continuer")); await p.waitForTimeout(900);
      await clic(p, bouton(p, "50 à 200")); await p.waitForTimeout(900);
      await clic(p, bouton(p, "LinkedIn")); await p.waitForTimeout(400);
      await clic(p, bouton(p, "Bouche-à-oreille")); await p.waitForTimeout(500);
      await clic(p, bouton(p, "Continuer")); await p.waitForTimeout(2000);
      await clic(p, bouton(p, "Continuer")); await p.waitForTimeout(800);
      const r = p.locator("input[type=range]"); await vers(p, r);
      for (const x of [4, 3]) { await p.evaluate((x) => { const i = document.querySelector("input[type=range]"); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(i, x); i.dispatchEvent(new Event("input", { bubbles: true })); }, x); await p.waitForTimeout(250); }
      await p.waitForTimeout(500);
      await clic(p, bouton(p, "Continuer")); await p.waitForTimeout(800);
      await clic(p, bouton(p, "D'ici 3 mois")); await p.waitForTimeout(2500);
      await defile(p, 230, 1600); await p.waitForTimeout(2200);
      await defile(p, 760, 2000); await p.waitForTimeout(1500);
      await clic(p, p.locator("summary", { hasText: "Comment on calcule" })); await p.waitForTimeout(600);
      await defile(p, 1400, 1500); await p.waitForTimeout(2500);
    } else {
      await p.waitForTimeout(1200);
      await defile(p, 260, 1400); await p.waitForTimeout(1200);
      await clic(p, bouton(p, "Modifier")); await p.waitForTimeout(900);
      const t = p.locator("textarea").first(); await t.click(); await p.keyboard.press("End"); await p.keyboard.type(" Bon courage pour la suite !", { delay: 45 }); await p.waitForTimeout(500);
      await clic(p, bouton(p, "Terminé")); await p.waitForTimeout(1200);
      await vers(p, bouton(p, "Copier et ouvrir")); await p.waitForTimeout(1200);
      await defile(p, 980, 1800); await p.waitForTimeout(800);
      await clic(p, p.locator("button", { hasText: "Lire tout le message" }).first()); await p.waitForTimeout(800);
      await defile(p, 1300, 1500); await p.waitForTimeout(1400);
      await vers(p, p.locator("button", { hasText: /^Envoyer$/ }).first()); await p.waitForTimeout(2200);
    }
    await ctx.close();
  }
  await b.close();
})();
