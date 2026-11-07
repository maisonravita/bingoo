// Enregistre la vidéo du Radar (vraie vidéo Playwright, pas un diaporama) à partir de demo.html?v=radar.
// Usage : npx vite --port 5199 --mode production   puis   node scripts/demo-radar.cjs <dossier polices> <sortie>
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const FONTS = process.argv[2]; const OUT = process.argv[3] || "/tmp/claude-0/preuves2";
const CURSOR = `(() => { const c = document.createElement("div"); c.id = "fc"; c.style.cssText = "position:fixed;left:980px;top:620px;width:22px;height:22px;border-radius:50%;background:rgba(21,23,42,.85);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999;pointer-events:none;transition:left .6s cubic-bezier(.3,.7,.3,1),top .6s cubic-bezier(.3,.7,.3,1),transform .15s"; document.body.appendChild(c); })()`;
async function vers(p, loc) {
  const b = await loc.boundingBox(); if (!b) return;
  await p.evaluate(([x, y]) => { const c = document.getElementById("fc"); c.style.left = x - 11 + "px"; c.style.top = y - 11 + "px"; }, [b.x + b.width / 2, b.y + b.height / 2]);
  await p.waitForTimeout(700);
}
async function clic(p, loc) { await vers(p, loc); await p.evaluate(() => { const c = document.getElementById("fc"); c.style.transform = "scale(.72)"; setTimeout(() => (c.style.transform = ""), 170); }); await loc.click(); }

(async () => {
  const b = await chromium.launch();
  const dir = path.join(OUT, "radar"); fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, recordVideo: { dir, size: { width: 1440, height: 810 } } });
  if (FONTS) {
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8") }));
    await ctx.route(/fonts\.local/, (r) => r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, "node_modules/@fontsource", new URL(r.request().url()).pathname)) }));
  }
  const p = await ctx.newPage();
  await p.goto("http://localhost:5199/demo.html?v=radar"); await p.waitForTimeout(1600); await p.evaluate(CURSOR); await p.waitForTimeout(900);
  await clic(p, p.locator('[data-opp="o1"]')); await p.waitForTimeout(2600);
  await clic(p, p.locator("[data-prep]")); await p.waitForTimeout(3400);
  await clic(p, p.locator('[data-opp="o2"]')); await p.waitForTimeout(3200);
  await ctx.close(); await b.close();
  const f = fs.readdirSync(dir).find((x) => x.endsWith(".webm"));
  console.log(path.join(dir, f));
})();
