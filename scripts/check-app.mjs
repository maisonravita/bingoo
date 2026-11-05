// Contrôle des parcours connectés (avec Supabase simulé) : chaque page clé s'affiche sans erreur JavaScript et sans
// débordement, sur téléphone et sur ordinateur. Lancé par `npm run check` après la construction du site.
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
const ws = { id: "w1", name: "Essai", plan: "solo", onboarded: true, targets: [{ id: "t1", label: "Agences", actif: true }], domain_status: "", integrations: {}, sender_name: "Jean Test", autonomy: "manuel", created_at: ago(9000), zone: ["75"], profile: { nom: "Essai" } };
const P = { id: "p1", name: "Snapdesk", city: "Paris", contact_name: "Marc Dupont", contact_role: "Directeur", email: "marc@snapdesk.co", signals: [{ label: "Levée de fonds", type: "levee" }], status: "pret", created_at: ago(500) };
const msgs = [{ id: "m1", step: 0, subject: "Votre levée", body: "Bonjour Marc,\n\nTexte.", prospect_id: "p1", prospects: P, status: "brouillon", created_at: ago(100) }];
const replies = [{ id: "r1", prospect_id: "p1", from_email: "marc@snapdesk.co", from_name: "Marc", subject: "Re", body: "Oui", class: "interesse", summary: "Intéressé", reply_body: "Bonjour", handled: false, created_at: ago(200), prospects: P }];
// Une salle de pilotage réaliste (sans carte : la carte se charge depuis Internet)
const PILOTE = { semaine: { lundi: "2026-11-02T00:00:00Z", jour: 4, ouvres: 4 }, objectif: 8, rdv: 3, prevision: 4, manque: 4,
  anneaux: { reactivite: { fait: 3, total: 4 }, regularite: { fait: 3, total: 4 }, resultats: { fait: 3, total: 8 } },
  pipeline: { montant: 3000, semaine: 3000, gagne: 3000, rdv_ouverts: 3, clients: 1, valeur: 3000, taux: 33 }, par_reponse: 990, record: 5,
  reglages: { objectif_rdv: 8, valeur_client: 3000, taux_signature: 33 },
  zones: [{ cle: "75009", nom: "Paris 9e", lat: 48.87, lon: 2.33, cibles: 42, contactees: 10, discussion: 2, gagnees: 1, semaine: 3, pct: 24 }],
  points: [], comptes: [{ id: "p1", nom: "Hays Services", taille: 250, choisi: false, etapes: [1, 1, 1, 0, 0, 0].map((f, i) => ({ label: `Étape ${i + 1}`, fait: !!f })), faites: 3, prochaine: { texte: "Attendre sa réponse", lien: "/prospects" } }],
  priorites: [{ type: "reponse", titre: "Serensia a répondu", detail: "Intéressée, demande une démo", valeur: 990, lien: "/reponses" }], places: 120, total: 140 };
const ROUTES = ["/", "/connexions", "/resultats", "/valider", "/reponses", "/prospects", "/radar", "/espion", "/reglages"];

let failed = 0;
const browser = await chromium.launch();
for (const [label, opt] of [["téléphone", devices["iPhone 13"]], ["ordinateur", { viewport: { width: 1280, height: 900 } }]]) {
  const ctx = await browser.newContext(opt);
  await ctx.addInitScript(() => { localStorage.setItem("sb-fbsjbnnmzazylmquzryo-auth-token", JSON.stringify({ access_token: "x", refresh_token: "y", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: { id: "u1", aud: "authenticated", role: "authenticated", email: "t@t.fr", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" } })); localStorage.setItem("kairo-ws", "w1"); });
  await ctx.route("**/*", async (route) => {
    const u = route.request().url(), m = route.request().method();
    if (u.startsWith("file://")) return route.continue();
    const H = { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range" };
    const J = (o) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(o), headers: { ...H, "content-range": `0-0/${Array.isArray(o) ? o.length : 1}` } });
    if (m === "HEAD") return route.fulfill({ status: 200, body: "", headers: { ...H, "content-range": "*/1" } });
    if (u.includes("/rest/v1/workspaces")) return J([ws]);
    if (u.includes("/rest/v1/messages")) return J(msgs);
    if (u.includes("/rest/v1/replies")) return J(replies);
    if (u.includes("/rest/v1/prospects")) return J([P]);
    if (u.includes("/rest/v1/members")) return J([{ user_id: "u1", email: "t@t.fr", role: "owner", workspace_id: "w1" }]);
    if (u.includes("/rest/v1/rpc/")) return J(false);
    if (u.includes("/rest/v1/")) return J([]);
    if (u.includes("/functions/v1/m/pilotage")) return J(PILOTE);
    if (u.includes("/functions/v1/")) return J({});
    return route.fulfill({ status: 404, body: "" });
  });
  for (const path of ROUTES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`file://${process.cwd()}/dist-single/index.html#${path}`);
    await page.waitForTimeout(6500); // l'écran d'accueil reste 5 s pour un utilisateur connecté
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const blank = (await page.textContent("body")).trim().length < 40;
    if (errors.length) { failed++; console.log(`  ✗ ${path} (${label}) : ${errors[0]}`); }
    else if (overflow) { failed++; console.log(`  ✗ ${path} (${label}) : déborde en largeur`); }
    else if (blank) { failed++; console.log(`  ✗ ${path} (${label}) : page vide`); }
    else console.log(`  ✓ ${path} (${label})`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
if (failed) { console.log(`\n${failed} problème(s) dans les parcours connectés.`); process.exit(1); }
