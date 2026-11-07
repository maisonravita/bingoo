// Enregistre la vidéo « Tes concurrents, surveillés » (vraie vidéo Playwright) : la vraie page Concurrents (EspionHub)
// dans demo.html?v=espion, avec des concurrents d'exemple servis par interception réseau.
// Usage : npx vite --port 5199 --mode production   puis   node scripts/demo-espion.cjs <dossier polices> <sortie>
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

const now = new Date().toISOString();
const S = (o) => ({ id: o.id, workspace_id: "demo", name: o.name, url: o.url, status: "suivi", checked_at: now, watched_at: now, history: [], summary: o.summary });
const ROWS = [
  S({ id: "c1", name: "Prospecto", url: "https://prospecto.example", summary: {
    resume: "Base de contacts B2B et séquences e-mail, pensée pour les équipes commerciales de 5 à 50 personnes.", menace: { niveau: 4 },
    position: { verdict: "devant", pourquoi: ["Base de contacts plus large", "Présent depuis 6 ans, notoriété forte"] },
    prix: { affiches: "à partir de 89 € par mois et par utilisateur" }, acquisition: { methode: "Publicités LinkedIn et webinaires" }, clients: { types: "Équipes commerciales de PME" },
    fiche: { effectif: "40 salariés", chiffre_affaires: "4,2 M€ (2025)" }, avis: { clients: "4,1/5 · 230 avis" },
    faiblesses: [{ texte: "Aucun signal d'achat : la liste est la même pour tout le monde" }, { texte: "Prix par utilisateur, cher pour un fondateur seul" }],
    actualites: [{ date: "2026-11-04", titre: "Lance un module d'IA de rédaction", impact: "Ils vont parler de messages écrits par l'IA : insiste sur la validation humaine et le fait daté." }],
    comparatif: [{ critere: "Signaux d'achat", nous: "Chaque matin, sourcés", eux: "Aucun", avantage: "nous" }, { critere: "Taille de la base", nous: "Registre français", eux: "200 M de contacts", avantage: "eux" }, { critere: "Prix pour un solo", nous: "49 €", eux: "89 €", avantage: "nous" }],
    battlecard: { pitch: "Prospecto te donne une liste ; Bingoo! te dit qui contacter aujourd'hui, et pourquoi.", objections: [{ objection: "On a déjà une base de contacts", reponse: "Une base dit qui existe, pas qui a besoin de vous cette semaine. Gardez-la, Bingoo! choisit dedans." }, { objection: "C'est plus cher qu'un fichier", reponse: "49 € pour le décideur vérifié, le message prêt et les relances : moins qu'une journée de commercial." }], quand_on_gagne: ["Fondateur seul, peu de temps", "Marché français, PME"], quand_on_perd: ["Grande équipe qui veut un volume massif"] },
  } }),
  S({ id: "c2", name: "LeadFlow", url: "https://leadflow.example", summary: {
    resume: "Automatisation LinkedIn et e-mail, sans recherche de signaux d'achat.", menace: { niveau: 3 }, position: { verdict: "egal", pourquoi: ["Même cible", "Plus fort sur LinkedIn seul"] },
    prix: { affiches: "59 € par utilisateur" }, acquisition: { methode: "Contenu et partenariats d'agences" }, clients: { types: "Agences et freelances" }, fiche: { effectif: "15 salariés" }, avis: { clients: "4,4/5 · 90 avis" },
    faiblesses: [{ texte: "Envois en masse : risque pour les comptes LinkedIn" }],
    actualites: [{ date: "2026-10-28", titre: "Hausse de prix de 20 %", impact: "Leurs clients solo cherchent une alternative : cible-les cette semaine." }],
    comparatif: [{ critere: "Signaux d'achat", nous: "Oui", eux: "Non", avantage: "nous" }, { critere: "LinkedIn", nous: "Validé, rythme humain", eux: "Automatisation poussée", avantage: "eux" }],
    battlecard: { pitch: "LeadFlow envoie plus ; Bingoo! envoie mieux, au bon moment, sans risquer ton compte.", objections: [{ objection: "LeadFlow fait déjà LinkedIn", reponse: "Oui, en masse. Bingoo! choisit qui inviter et pourquoi, et ne fait que ce que tu as validé." }] },
  } }),
  S({ id: "c3", name: "Signalist", url: "https://signalist.example", summary: {
    resume: "Alertes de signaux d'entreprise, sans rédaction ni envoi des messages.", menace: { niveau: 2 }, position: { verdict: "derriere", pourquoi: ["Pas d'exécution", "Prix sur devis"] },
    prix: { affiches: "Sur devis" }, acquisition: { methode: "Vente directe aux grands comptes" }, clients: { types: "ETI et grands comptes" }, fiche: { effectif: "25 salariés" },
    faiblesses: [{ texte: "S'arrête à l'alerte : tout le reste est à faire à la main" }],
    actualites: [{ date: "2026-11-02", titre: "Recrute 3 commerciaux grands comptes", impact: "Ils montent en gamme : le marché PME et solo leur échappe." }],
    comparatif: [{ critere: "Signaux d'achat", nous: "Oui", eux: "Oui", avantage: "egal" }, { critere: "Message et relances", nous: "Écrits pour toi", eux: "Aucun", avantage: "nous" }],
    battlecard: { pitch: "Signalist te prévient ; Bingoo! te prévient, trouve le décideur et écrit le message." },
  } }),
];
const FN = { "rival-emails": { address: "veille-demo@bingoo.fr", emails: [] } };

(async () => {
  const b = await chromium.launch();
  const dir = path.join(OUT, "espion"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
  if (FONTS) {
    await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: "text/css", body: fs.readFileSync(path.join(FONTS, "fonts.css"), "utf8") }));
    await ctx.route(/fonts\.local/, (r) => r.fulfill({ contentType: "font/woff2", body: fs.readFileSync(path.join(FONTS, "node_modules/@fontsource", new URL(r.request().url()).pathname)) }));
  }
  await ctx.route(/\/rest\/v1\/competitors/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(ROWS) }));
  await ctx.route(/\/rest\/v1\/(activity|prospects|replies|meetings|radar_opps)/, (r) => r.fulfill({ contentType: "application/json", body: "[]" }));
  await ctx.route(/\/functions\/v1\//, (r) => { const k = Object.keys(FN).find((x) => r.request().url().includes(x)); r.fulfill({ contentType: "application/json", body: JSON.stringify(k ? FN[k] : {}) }); });
  await ctx.route(/clearbit|google\.com\/s2|favicon/, (r) => r.abort());
  const p = await ctx.newPage();
  // Enregistrement image par image (JPEG qualité 95, horodaté) : bien plus net que l'encodeur vidéo intégré
  const cdp = await ctx.newCDPSession(p); const frames = []; let n = 0;
  cdp.on("Page.screencastFrame", async (f) => { const file = path.join(dir, `${String(n++).padStart(5, "0")}.jpg`); fs.writeFileSync(file, Buffer.from(f.data, "base64")); frames.push([file, f.metadata.timestamp]); await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: 1440, maxHeight: 810, everyNthFrame: 1 });
  // Une image toutes les 1/30 s même quand rien ne bouge (le screencast n'en envoie qu'au changement)
  await p.goto("http://localhost:5199/demo.html?v=espion"); await p.waitForTimeout(2000); await p.evaluate(CURSOR); await p.waitForTimeout(800);
  const onglet = (t) => p.locator("nav button", { hasText: t }).first();
  // L'en-tête : les chiffres, la mission de la nuit
  await vers(p, p.getByText("faiblesses à exploiter")); await p.waitForTimeout(900);
  await vers(p, p.getByText("Sa mission de cette nuit")); await p.waitForTimeout(1200);
  // Les fiches
  await defile(p, 420); await vers(p, p.getByText("Prospecto", { exact: true }).first()); await p.waitForTimeout(1600);
  // Veille : chaque mouvement daté, et ce qu'il change
  await clic(p, onglet("Veille concurrentielle")); await p.waitForTimeout(800); await defile(p, 700, 1200); await p.waitForTimeout(1800);
  // Stratégie : toi contre tous
  await defile(p, 420, 900); await clic(p, onglet("Intelligence stratégique")); await p.waitForTimeout(2600);
  // Dossiers commerciaux : l'angle et les objections
  await clic(p, onglet("Dossiers commerciaux")); await p.waitForTimeout(1400);
  await clic(p, p.locator("details summary").first()); await p.waitForTimeout(2600);
  await p.waitForTimeout(300); await cdp.send("Page.stopScreencast"); const fin = Date.now() / 1000;
  await ctx.close(); await b.close();
  // Liste ffmpeg : chaque image dure jusqu'à la suivante
  const lines = frames.map(([f, t], i) => `file '${f}'\nduration ${Math.max(0.001, ((frames[i + 1]?.[1] ?? fin) - t)).toFixed(4)}`);
  fs.writeFileSync(path.join(dir, "liste.txt"), lines.join("\n") + `\nfile '${frames[frames.length - 1][0]}'\n`);
  console.log(path.join(dir, "liste.txt"));
})();
