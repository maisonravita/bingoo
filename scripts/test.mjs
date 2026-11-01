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
export { FOLLOW } from "./${S}/agents.ts";
export { warmup, RAMP } from "./${S}/growth.ts";
export { parisToUtc, parisParts, pickThree } from "./${S}/time.ts";
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
await test("deux relances seulement, à J+5 puis J+12", () => {
  assert.deepEqual(T.FOLLOW.map((f) => f.after), [5, 12]);
});
await test("l'objet de relance ne cumule pas les « Re : »", () => {
  assert.equal(T.FOLLOW[0].subject("Re : propreté des bureaux"), "Re : propreté des bureaux");
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

console.log(`\n${ok} réussi${ok > 1 ? "s" : ""}, ${ko} échec${ko > 1 ? "s" : ""}`);
writeFileSync(join(dir, "done"), "");
process.exit(ko ? 1 : 0);
