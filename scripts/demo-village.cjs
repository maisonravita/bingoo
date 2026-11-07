// Enregistre la vidéo « Ton village » (capture image par image) : la vraie page Village dans demo.html?v=village,
// avec des compteurs et une nuit d'activité d'exemple servis par interception réseau.
// Usage : npx vite --port 5199 --mode production   puis   node scripts/demo-village.cjs <dossier polices> <sortie>
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const FONTS = process.argv[2]; const OUT = process.argv[3] || "/tmp/claude-0/preuves2";
const CURSOR = `(() => { const c = document.createElement("div"); c.id = "fc"; c.style.cssText = "position:fixed;left:980px;top:620px;width:22px;height:22px;border-radius:50%;background:rgba(21,23,42,.85);border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999;pointer-events:none;transition:left .6s cubic-bezier(.3,.7,.3,1),top .6s cubic-bezier(.3,.7,.3,1),transform .15s"; document.body.appendChild(c); })()`;
async function vers(p, loc) {
  const b = await loc.boundingBox(); if (!b) return;
  await p.evaluate(([x, y]) => { const c = document.getElementById("fc"); c.style.left = x - 11 + "px"; c.style.top = y - 11 + "px"; }, [b.x + b.width / 2, b.y + b.height / 2]);
  await p.waitForTimeout(700);
}
async function clic(p, loc) { await vers(p, loc); await p.evaluate(() => { const c = document.getElementById("fc"); c.style.transform = "scale(.72)"; setTimeout(() => (c.style.transform = ""), 170); }); await loc.click(); }
async function defile(p, y, ms = 1400) { await p.evaluate(([y, ms]) => { const s = window.scrollY, t0 = performance.now(); const f = (t) => { const k = Math.min(1, (t - t0) / ms); window.scrollTo(0, s + (y - s) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }, [y, ms]); await p.waitForTimeout(ms + 300); }

const CPT = { rep: 2, drafts: 5, rdv: 1, dec: 139, mails: 42, opps: 58, chaudes: 6, rivals: 3, li: 4, sentAll: 14, repTotal: 3, hot: 1, sent7: 14 };
const h = (m) => new Date(Date.now() - m * 60000).toISOString();
const NUIT = [
  ["radar_scan", "Passage du Radar : 169 entreprises relues", 400], ["radar", "Nova Conseil ajoutée : recrute 2 commerciaux", 390], ["radar", "Atelier Verne ajoutée : levée de 1,2 M€", 385],
  ["contacts_auto", "Studio Kelio : Anna Sèze, Directrice générale", 360], ["credit_email", "Atelier Verne : e-mail de Paul Riva trouvé et vérifié", 350], ["credit_email", "Nova Conseil : e-mail vérifié", 345],
  ["redaction", "Message écrit pour Nova Conseil", 300], ["redaction", "Message écrit pour Atelier Verne", 295], ["redaction", "Message écrit pour Studio Kelio", 290],
  ["veille", "Prospecto : nouveau module d'IA repéré", 240], ["espion_alerte", "LeadFlow augmente ses prix de 20 %", 230],
  ["reponse", "Réponse de Lumen Studio classée : intéressé", 120], ["rdv", "Rendez-vous confirmé jeudi 10 h", 110],
].map(([kind, summary, m]) => ({ kind, summary, created_at: h(m) }));

(async () => {
  const b = await chromium.launch();
  const dir = path.join(OUT, "village"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
  if (FONTS) {
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8") }));
    await ctx.route(/fonts\.local/, (r) => r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, "node_modules/@fontsource", new URL(r.request().url()).pathname)) }));
  }
  // Playwright essaie les interceptions de la dernière déclarée à la première : le cas général d'abord
  await ctx.route(/\/rest\/v1\//, (r) => r.fulfill({ contentType: "application/json", body: "[]" }));
  await ctx.route(/\/rest\/v1\/rpc\/compteurs/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(CPT) }));
  await ctx.route(/\/rest\/v1\/activity/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(NUIT) }));
  await ctx.route(/\/functions\/v1\//, (r) => r.fulfill({ contentType: "application/json", body: "{}" }));
  await ctx.route(/clearbit|google\.com\/s2|favicon/, (r) => r.abort());
  const p = await ctx.newPage();
  // Enregistrement image par image (JPEG qualité 95, horodaté) : bien plus net que l'encodeur vidéo intégré
  const cdp = await ctx.newCDPSession(p); const frames = []; let n = 0;
  cdp.on("Page.screencastFrame", async (f) => { const file = path.join(dir, `${String(n++).padStart(5, "0")}.jpg`); fs.writeFileSync(file, Buffer.from(f.data, "base64")); frames.push([file, f.metadata.timestamp]); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: 1440, maxHeight: 810, everyNthFrame: 1 });
  // Une image toutes les 1/30 s même quand rien ne bouge (le screencast n'en envoie qu'au changement)
  await p.addInitScript(() => { try { sessionStorage.setItem("bingoo-intro", "1"); } catch {} });
  await p.goto("http://localhost:5199/demo.html?v=village"); await p.waitForTimeout(2500); await p.evaluate(CURSOR); await p.waitForTimeout(600);
  const plusTard = p.locator("button", { hasText: "Plus tard" }).first();
  if (await plusTard.count()) { await clic(p, plusTard); await p.waitForTimeout(900); }
  // Un tour du village : le panneau « Prochaine étape », puis quelques bâtiments
  for (const t of ["Prochaine étape", "Réponses", "Concurrents", "Entreprises"]) { const l = p.getByText(t, { exact: false }).first(); if (await l.count()) { await vers(p, l); await p.waitForTimeout(900); } }
  // La nuit de ton équipe : le journal rejoué, bâtiment par bâtiment
  await clic(p, p.locator("button", { hasText: "La nuit de ton équipe" }).first()); await p.waitForTimeout(18500);
  await p.waitForTimeout(300); await cdp.send("Page.stopScreencast"); const fin = Date.now() / 1000;
  await ctx.close(); await b.close();
  // Liste ffmpeg : chaque image dure jusqu'à la suivante
  const lines = frames.map(([f, t], i) => `file '${f}'\nduration ${Math.max(0.001, ((frames[i + 1]?.[1] ?? fin) - t)).toFixed(4)}`);
  fs.writeFileSync(path.join(dir, "liste.txt"), lines.join("\n") + `\nfile '${frames[frames.length - 1][0]}'\n`);
  console.log(path.join(dir, "liste.txt"));
})();
