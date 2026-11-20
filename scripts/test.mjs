// Tests automatiques des règles qui protègent les envois et la qualité des messages.
// Sans base ni réseau : les dépendances serveur sont remplacées par des modules vides.
// Usage : node scripts/test.mjs   (lancé aussi par la CI avant tout déploiement)
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const S = "supabase/functions/_shared";
const entry = `
export { humanize } from "./${S}/playbooks.ts";
export { siteSignals } from "./${S}/sitesignals.ts";
export { stripQuoted, OPT_OUT } from "./${S}/pro.ts";
export { FOLLOW, followupDays, sequence } from "./${S}/agents.ts";
export { warmup, RAMP } from "./${S}/growth.ts";
export { parisToUtc, parisParts, pickThree } from "./${S}/time.ts";
export { bingooIds, isBounce, failedRecipients, replyTo, plainText } from "./${S}/inbox.ts";
export { messageIdFor } from "./${S}/mail.ts";
export { stateOf, errorState } from "./${S}/mission.ts";
export { toolsIn, toolsNamed, atsIn, careersLink, roleMatch } from "./${S}/tech-fp.ts";
export { orgOf } from "./${S}/iporg.ts";
export { slugs } from "./${S}/deep.ts";
export { invitesToday, officeHours } from "./${S}/linkedin-auto.ts";
export { masquer, MASQUE, PAYANT_SEUL, QUOTA_GRATUIT } from "./${S}/mcp-bingoo.ts";
export { alignerCode, couvrirDemo } from "./${S}/contrat-donnees.ts";
export { specReservation, specDevis, specEcriture } from "./${S}/modeles.ts";
`;
const stubs = {
  name: "stubs",
  setup(b) {
    b.onResolve({ filter: /^npm:/ }, (a) => ({ path: a.path, namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({
      loader: "js",
      contents: a.path.includes("supabase")
        ? "export function createClient(){const p=new Proxy(function(){},{get:()=>p,apply:()=>p});return p}"
        : "export default { createTransport(){ return {} } }",
    }));
  },
};
const dir = mkdtempSync(join(tmpdir(), "bingoo-test-"));
const out = join(dir, "t.mjs");
await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" }, bundle: true, format: "esm", platform: "node", outfile: out, plugins: [stubs], logLevel: "error",
  banner: { js: "globalThis.Deno={env:{get:()=>undefined}};" } });
const T = await import(pathToFileURL(out).href);

let ok = 0, ko = 0;
async function test(name, fn) {
  try { await fn(); ok++; console.log("  ✓", name); } catch (e) { ko++; console.log("  ✗", name, "\n     ", e.message); }
}

console.log("Écriture des e-mails");
await test("humanize retire tiret long, emoji, formule creuse et points d'exclamation multiples", () => {
  const r = T.humanize("J'espère que vous allez bien.\nVotre équipe grandit — bravo ! 🚀 Super !");
  assert.ok(!/[—🚀]/u.test(r), r);
  assert.ok(!/espère que vous allez bien/i.test(r), r);
  assert.equal((r.match(/!/g) ?? []).length, 1, r);
});

console.log("Réponses et opposition");
await test("« STOP », « désinscrire », « ne plus me contacter » déclenchent l'opposition", () => {
  for (const t of ["STOP", "stop merci", "Désinscrivez-moi", "ne plus me contacter svp", "Retirez-moi de votre liste", "unsubscribe"]) assert.ok(T.OPT_OUT.test(t), t);
});
await test("une réponse normale n'est pas prise pour une opposition", () => {
  for (const t of ["Bonjour, oui ça m'intéresse", "Pouvez-vous me rappeler ?", "Stopper le gaspillage nous intéresse"]) assert.ok(!T.OPT_OUT.test(t), t);
});
await test("l'historique cité est retiré de la réponse", () => {
  const r = T.stripQuoted("Oui, appelez-moi demain.\n\nLe lun. 3 nov. 2026 à 10:00, Jean <j@x.fr> a écrit :\n> Bonjour\n> offre");
  assert.equal(r, "Oui, appelez-moi demain.");
});

console.log("Relances");
await test("deux relances seulement, à J+3 puis J+7 (42 % des réponses viennent des relances, 93 % avant le 10e jour)", () => {
  assert.deepEqual(T.FOLLOW.map((f) => f.after), [3, 7]);
});
await test("séquence par défaut : relance, relance, appel à J+10, e-mail de clôture à J+14", () => {
  assert.deepEqual(T.sequence({}).map((e) => [e.apres, e.canal]), [[3, "email"], [7, "email"], [10, "appel"], [14, "email"]]);
});
await test("l'objet de relance ne cumule pas les « Re : »", () => {
  assert.equal(T.FOLLOW[0].subject("Re : propreté des bureaux"), "Re : propreté des bureaux");
});

await test("délais de relance réglables, valeurs absurdes refusées (retour à 3 et 7)", () => {
  assert.deepEqual(T.followupDays({ followup_days: [3, 10] }), [3, 10]);
  for (const bad of [null, [], [12, 5], [1, 10], [5, 90], [5.5, 12], [5, 5]]) assert.deepEqual(T.followupDays({ followup_days: bad }), [3, 7], JSON.stringify(bad));
});

console.log("Préchauffage des envois");
const day = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
await test("semaine 1 : 10 envois max ; semaine 2 : 20 ; ensuite la limite du client", () => {
  assert.equal(T.warmup({ daily_limit: 40, warmup_started: null }).cap, 10);
  assert.equal(T.warmup({ daily_limit: 40, warmup_started: day(8) }).cap, 20);
  assert.equal(T.warmup({ daily_limit: 40, warmup_started: day(60) }).cap, 40);
  assert.equal(T.warmup({ daily_limit: 5, warmup_started: day(8) }).cap, 5);
});

console.log("Agenda");
await test("heure de Paris correcte en hiver et en été", () => {
  assert.equal(T.parisToUtc(2026, 1, 15, 10, 0).toISOString(), "2026-01-15T09:00:00.000Z");
  assert.equal(T.parisToUtc(2026, 7, 15, 10, 0).toISOString(), "2026-07-15T08:00:00.000Z");
});
await test("3 créneaux proposés au maximum, dans l'ordre", () => {
  const s = [3, 1, 2, 5, 4].map((d) => T.parisToUtc(2026, 12, d, 10, 0));
  const r = T.pickThree(s);
  assert.ok(r.length <= 3);
  assert.deepEqual([...r].sort((a, b) => a - b), r);
});

console.log("Signaux lus sur un site");
await test("publicité Google, concurrent utilisé et agence repérés ; pas de faux signal", async () => {
  const html = `<html><head><script async src="https://www.googletagmanager.com/gtag/js?id=AW-123456789"></script>
    <script src="https://cdn.samsic.fr/widget.js"></script></head><body><a href="/recrutement/">Nous rejoindre</a>
    <footer>Site réalisé par Armadiyo</footer></body></html>`;
  const s = await T.siteSignals("http://127.0.0.1:1", html, [{ name: "Samsic", host: "samsic.fr" }]);
  const types = s.map((x) => x.type);
  for (const t of ["pub_google", "concurrent", "agence", "recrutement"]) assert.ok(types.includes(t), `${t} manquant : ${types}`);
  assert.ok(!types.includes("pub_meta") && !types.includes("levee"), `faux signal : ${types}`);
});

console.log("Anti-double envoi");
await test("le même e-mail porte toujours le même identifiant (doublon reconnaissable)", () => {
  const id = "0b6a2c1e-1234-4abc-9def-0123456789ab";
  assert.equal(T.messageIdFor(id, "jean@maisonravita.fr"), T.messageIdFor(id, "jean@maisonravita.fr"));
  assert.equal(T.messageIdFor(id, "jean@maisonravita.fr"), `<bingoo-${id}@maisonravita.fr>`);
});

console.log("Boîte du client : rebonds et réponses");
const ID = "0b6a2c1e-1234-4abc-9def-0123456789ab";
const gmailBounce = `From: Mail Delivery Subsystem <mailer-daemon@googlemail.com>\r\nTo: jean@gmail.com\r\nSubject: Delivery Status Notification (Failure)\r\nContent-Type: multipart/report; report-type=delivery-status; boundary="x"\r\nX-Failed-Recipients: inconnu@exemple.fr\r\n\r\n--x\r\nContent-Type: text/plain\r\n\r\nAddress not found\r\n--x\r\nContent-Type: message/delivery-status\r\n\r\nFinal-Recipient: rfc822; inconnu@exemple.fr\r\nAction: failed\r\n--x\r\nContent-Type: text/rfc822-headers\r\n\r\nMessage-ID: <bingoo-${ID}@gmail.com>\r\nSubject: propreté des bureaux\r\n--x--`;
await test("un avis de non-remise Gmail est reconnu et rattaché au bon e-mail", () => {
  assert.ok(T.isBounce(gmailBounce));
  assert.deepEqual(T.bingooIds(gmailBounce), [ID]);
  assert.deepEqual(T.failedRecipients(gmailBounce), ["inconnu@exemple.fr"]);
});
const reply = `From: "Marie Durand" <marie@client.fr>\r\nTo: jean@gmail.com\r\nSubject: Re: propreté des bureaux\r\nIn-Reply-To: <bingoo-${ID}@gmail.com>\r\nReferences: <bingoo-${ID}@gmail.com>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nOui, appelez-moi jeudi.\r\n`;
await test("une réponse écrite à l'adresse d'envoi est rattachée au bon e-mail, sans être prise pour un rebond", () => {
  assert.ok(!T.isBounce(reply));
  assert.equal(T.replyTo(reply), ID);
  assert.match(T.plainText(reply), /appelez-moi jeudi/);
});
await test("un e-mail sans lien avec Bingoo est ignoré", () => {
  const other = "From: newsletter@site.fr\r\nSubject: Promo\r\n\r\nBonjour";
  assert.ok(!T.isBounce(other));
  assert.equal(T.replyTo(other), null);
});

console.log("Mission : états et erreurs");
await test("chaque étape donne un état lisible ; une étape inconnue reste « en cours »", () => {
  assert.equal(T.stateOf("recherche"), "en_recherche");
  assert.equal(T.stateOf("attente"), "attente_validation");
  assert.equal(T.stateOf("limite"), "bloquee_limite");
  assert.equal(T.stateOf("arret"), "arretee");
  assert.equal(T.stateOf("???"), "en_cours");
});
await test("une erreur est réessayée ; 3 erreurs d'affilée mettent la mission en erreur", () => {
  assert.equal(T.errorState(1), "reessai");
  assert.equal(T.errorState(2), "reessai");
  assert.equal(T.errorState(3), "erreur");
});

console.log("Radar : outils et pages carrières");
await test("les outils installés sont reconnus dans le code de la page", () => {
  const h = '<script src="//js.hs-scripts.com/123.js"></script><script src="https://js.stripe.com/v3"></script><link href="/wp-content/themes/x.css">';
  assert.deepEqual(T.toolsIn(h).sort(), ["HubSpot", "Stripe", "WordPress"]);
  assert.deepEqual(T.toolsIn("<p>Bonjour</p>"), []);
});
await test("les outils cités dans une offre d'emploi sont reconnus (sans faux positif)", () => {
  assert.deepEqual(T.toolsNamed("Maîtrise de Salesforce et HubSpot exigée").sort(), ["HubSpot", "Salesforce"]);
  assert.deepEqual(T.toolsNamed("Vous serez au contact de la clientèle"), []);
});
await test("la page carrières et son logiciel de recrutement sont trouvés", () => {
  assert.deepEqual(T.atsIn('<a href="https://jobs.lever.co/acme">Jobs</a>'), { ats: "lever", slug: "acme" });
  assert.deepEqual(T.atsIn('<iframe src="https://boards.greenhouse.io/embed/job_board?for=acmeco"></iframe>'), { ats: "greenhouse", slug: "acmeco" });
  assert.deepEqual(T.atsIn('<a href="https://www.welcometothejungle.com/fr/companies/acme/jobs">'), { ats: "wttj", slug: "acme" });
  assert.equal(T.atsIn("<p>rien</p>"), null);
  assert.equal(T.careersLink('<a href="/fr/carrieres">Nous rejoindre</a>', "https://acme.fr/"), "https://acme.fr/fr/carrieres");
});
await test("un intitulé de poste correspond au poste « signal » attendu", () => {
  assert.equal(T.roleMatch("Business Developer H/F - Paris", ["Business developer", "Directeur commercial"]), "Business developer");
  assert.equal(T.roleMatch("Responsable commercial grands comptes", ["Responsable commercial"]), "Responsable commercial");
  assert.equal(T.roleMatch("Développeur backend", ["Business developer", "Commercial"]), null);
  assert.equal(T.roleMatch("Account Executive, Small Business", ["Commercial B2B"]), "Commercial B2B");
  assert.equal(T.roleMatch("Talent Acquisition Partner", ["Responsable RH"]), "Responsable RH");
});

console.log("Radar : entreprise d'une adresse IP");
const rdap = (fn, name, start, end, remarks = "") => ({ name, startAddress: start, endAddress: end, remarks: remarks ? [{ description: [remarks] }] : [], entities: [{ roles: ["registrant"], vcardArray: ["vcard", [["fn", {}, "text", fn]]] }] });
await test("une plage d'adresses d'entreprise donne le nom de l'entreprise", () => {
  assert.equal(T.orgOf(rdap("Onet Services SAS", "FR-ONET", "194.5.10.0", "194.5.10.255")).org, "Onet Services SAS");
});
await test("sans titulaire, on prend la description du réseau, jamais un identifiant technique ni un contact", () => {
  const d = { name: "FR-SAFRAN-NET", startAddress: "217.108.170.0", endAddress: "217.108.170.255", remarks: [{ title: "description", description: ["SAFRAN SA"] }],
    entities: [{ roles: ["administrative"], handle: "JD123-RIPE", vcardArray: ["vcard", [["fn", {}, "text", "Jean Dupont"]]] }, { roles: ["registrant"], handle: "PC80199-MNT", vcardArray: ["vcard", [["fn", {}, "text", "PC80199-MNT"]]] }] };
  assert.equal(T.orgOf(d).org, "SAFRAN SA");
  assert.equal(T.orgOf({ ...d, remarks: [] }).org, "SAFRAN");
});
await test("un opérateur, un hébergeur ou une très grande plage sont ignorés", () => {
  assert.equal(T.orgOf(rdap("Orange S.A.", "FR-ORANGE-ADSL", "90.0.0.0", "90.127.255.255")).org, "");
  assert.equal(T.orgOf(rdap("OVH SAS", "OVH", "51.0.0.0", "51.0.0.255")).org, "");
  assert.equal(T.orgOf(rdap("Grande Entreprise", "BIG", "80.0.0.0", "80.3.255.255")).org, "");
});

await test("les adresses de site essayées viennent du nom, sans forme juridique ni accents", () => {
  const s = T.slugs("SARL Propreté Lyonnaise", "Lyon");
  assert.ok(s.includes("propretelyonnaise") && s.includes("proprete-lyonnaise") && s.includes("proprete-lyonnaise-lyon"));
  assert.deepEqual(T.slugs("SA", "Paris"), []);
});

await test("Messages : élision devant un nom propre, source jamais citée", () => {
  assert.equal(T.humanize("Vous êtes président de Inside Banking, selon le BODACC, depuis peu."), "Vous êtes président d'Inside Banking depuis peu.");
  assert.equal(T.humanize("Le site de Hugo Boss et le prix de Orange."), "Le site de Hugo Boss et le prix d'Orange.");
});
await test("Messages : caractères invisibles retirés", () => {
  assert.equal(T.humanize("Bon\u200Bjour\u00A0Marie\uFEFF"), "Bonjour Marie");
});
await test("LinkedIn : 5 invitations le premier jour, +3 par jour, jamais plus de 20", () => {
  const now = new Date("2026-11-10T10:00:00Z");
  assert.equal(T.invitesToday(undefined, now), 5);
  assert.equal(T.invitesToday("2026-11-08T10:00:00Z", now), 11);
  assert.equal(T.invitesToday("2026-10-01T10:00:00Z", now), 20);
});
await test("LinkedIn : le plafond choisi par le client est respecté (5 à 20)", () => {
  const now = new Date("2026-11-10T10:00:00Z");
  assert.equal(T.invitesToday("2026-10-01T10:00:00Z", now, 10), 10);
  assert.equal(T.invitesToday(undefined, now, 10), 5);
});
await test("LinkedIn : seulement en semaine, de 9 h à 18 h 30 heure de Paris", () => {
  assert.equal(T.officeHours(new Date("2026-11-10T09:00:00Z")), true);   // mardi 10 h à Paris
  assert.equal(T.officeHours(new Date("2026-11-10T07:30:00Z")), false);  // mardi 8 h 30
  assert.equal(T.officeHours(new Date("2026-11-10T17:45:00Z")), false);  // mardi 18 h 45
  assert.equal(T.officeHours(new Date("2026-11-14T10:00:00Z")), false);  // samedi
});

await test("Connecteur gratuit : les revenus sont masqués partout, le reste reste lisible", () => {
  const r = T.masquer({ total: 3, saas: [{ domaine: "a.com", nom: "A", mrr: 582, croissance_30j: 13.9, encaisse_30j: 1200, canaux: ["seo"], trustmrr: { mrr: 1 } }], niches: [{ nom: "Facturation", saas: 12, revenu_median_mois: 500, croissance_mediane_30j: null }] });
  assert.equal(r.saas[0].mrr, T.MASQUE);
  assert.equal(r.saas[0].croissance_30j, T.MASQUE);
  assert.equal(r.saas[0].trustmrr, T.MASQUE);
  assert.equal(r.saas[0].nom, "A");
  assert.deepEqual(r.saas[0].canaux, ["seo"]);
  assert.equal(r.total, 3);
  assert.equal(r.niches[0].saas, 12);
  assert.equal(r.niches[0].revenu_median_mois, T.MASQUE);
  assert.equal(r.niches[0].croissance_mediane_30j, null);
  assert.ok(T.PAYANT_SEUL.has("classement") && T.PAYANT_SEUL.has("saas_a_vendre"));
  assert.equal(T.QUOTA_GRATUIT, 20);
});

// La coque des SaaS livrés (avec toutes les briques du kit) doit se lire sans erreur : une parenthèse en trop casserait tous les SaaS en ligne
await test("la coque générée des SaaS livrés est du JavaScript valide", async () => {
  const { spawnSync } = await import("node:child_process");
  const out = join(dir, "shell.mjs");
  await build({ entryPoints: ["src/lib/appShell.js"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
  const { appHtml } = await import(pathToFileURL(out).href);
  const html = appHtml({ spec: { nom: "Test", couleur: "#334155", ecrans: [{ id: "a", titre: "A", code: "function Ecran(){return html`<div/>`}" }], collections: [], demo: {} }, slug: "test", api: "https://exemple.invalid" });
  const i = html.indexOf('<script type="module">') + 22, mod = join(dir, "module.mjs");
  writeFileSync(mod, html.slice(i, html.indexOf("</script>", i)));
  const r = spawnSync(process.execPath, ["--check", mod], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr.split("\n").slice(0, 6).join("\n"));
});


await test("contrat de données : champ et valeur mal nommés corrigés sans IA", () => {
  const spec = { collections: [{ nom: "loyers", champs: [{ nom: "montant_ttc", type: "nombre" }, { nom: "statut", type: "choix", options: ["payé", "en retard"] }] }],
    demo: { loyers: [{ montant_ttc: 800, statut: "payé" }, { montant_ttc: 750, statut: "en retard" }] } };
  const code = `function Ecran(){ const L = useCollection("loyers"); const recus = L.rows.filter((r) => r.statut === "paye"); const total = recus.reduce((a, r) => a + r.montantTTC, 0); return html\`<p>\${total}</p>\`; }`;
  const r = T.alignerCode(code, spec);
  if (!r.code.includes('r.statut === "payé"')) throw new Error("valeur non corrigée : " + r.code);
  if (!r.code.includes("r.montant_ttc")) throw new Error("champ non corrigé : " + r.code);
  if (r.code.includes(".reduce((a, r) => a + r.montant_ttc") === false) throw new Error("reduce cassé");
});
await test("contrat de données : ne touche ni au JavaScript, ni aux variables, ni aux champs justes", () => {
  const spec = { collections: [{ nom: "taches", champs: [{ nom: "titre" }, { nom: "fait" }] }], demo: { taches: [{ titre: "A", fait: false }] } };
  const code = `function Ecran(){ const T = useCollection("taches"); const faites = T.rows.filter((t) => t.fait).length; const total = T.rows.length; const titres = T.rows.map((t) => t.titre.toUpperCase()); return html\`<p>\${faites}/\${total}</p>\`; }`;
  const r = T.alignerCode(code, spec);
  if (r.code !== code) throw new Error("code modifié à tort : " + r.corrections.join(", "));
});
await test("contrat de données : valeur ambiguë signalée, jamais devinée", () => {
  const spec = { collections: [{ nom: "devis", champs: [{ nom: "etat", options: ["brouillon", "envoyé", "signé"] }] }], demo: { devis: [{ etat: "envoyé" }] } };
  const r = T.alignerCode(`const n = D.rows.filter((d) => d.etat === "accepte").length;`, spec);
  if (!r.alertes.length || r.code.includes("signé")) throw new Error("devait signaler sans corriger");
});
await test("contrat de données : le vocabulaire (V.tons) n'est jamais pris pour un champ", () => {
  const spec = { collections: [{ nom: "textes", champs: [{ nom: "ton" }] }], demo: { textes: [{ ton: "pro" }] } };
  const code = `const V = { tons: ["pro"] }; function Ecran(){ return V.tons.map((t) => t); }`;
  if (T.alignerCode(code, spec).code !== code) throw new Error("V.tons réécrit");
});
await test("couverture des exemples : un statut filtré par l'écran existe dans les données d'exemple", () => {
  const spec = { demo: { affaires: [{ etape: "Gagnée" }, { etape: "Proposition" }, { etape: "Proposition" }, { etape: "Qualification" }] }, ecrans: [{ code: `const perdues = A.rows.filter((a) => a.etape === "Perdue");` }] };
  const r = T.couvrirDemo(spec);
  if (!r.demo.affaires.some((a) => a.etape === "Perdue")) throw new Error("pas ajouté");
  if (!r.demo.affaires.some((a) => a.etape === "Proposition")) throw new Error("valeur disparue");
  const r2 = T.couvrirDemo({ demo: { champs: [{ type: "texte" }, { type: "texte" }] }, ecrans: [{ code: `if (c.type === "choix")` }] });
  if (r2.ajouts.length) throw new Error("valeur technique ajoutée");
});
await test("modèles faits main : chaque écran a son code (jamais d'écran livré vide)", () => {
  for (const [n, f] of [["reservation", T.specReservation], ["devis", T.specDevis], ["ecriture", T.specEcriture]]) {
    const sp = f({ vocab: {} });
    for (const e of sp.ecrans) if (e.modele && (!e.code || /\nundefined\s*$/.test(e.code) || !/function\s+Ecran/.test(e.code))) throw new Error(n + " : écran " + e.id + " sans code");
  }
});
console.log(`\n${ok} réussi${ok > 1 ? "s" : ""}, ${ko} échec${ko > 1 ? "s" : ""}`);
writeFileSync(join(dir, "done"), "");
process.exit(ko ? 1 : 0);
