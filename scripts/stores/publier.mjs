// Robot de publication sur l'App Store et Google Play.
// Prend la plus ancienne demande en attente (table app_publications), compile la coque Expo de l'app avec EAS
// (comptes Expo de Bingoo! : EXPO_TOKEN), puis l'envoie sur le compte du membre avec SA clé API App Store Connect
// ou SON compte de service Google Play, lues dans le coffre chiffré. Jamais de mot de passe.
// Journal : seulement des compteurs. Aucune clé, aucune donnée de la base n'est affichée.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const REF = "fbsjbnnmzazylmquzryo", TOK = process.env.SUPABASE_ACCESS_TOKEN, EXPO = process.env.EXPO_TOKEN;
const lit = (v) => "'" + String(v).replace(/'/g, "''") + "'";
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  if (!r.ok) throw new Error(`base ${r.status}`);
  return r.json();
}
const maj = (id, statut, message, lien = null) => q(`update app_publications set statut = ${lit(statut)}, message = ${lit(message.slice(0, 400))}${lien ? `, lien = ${lit(lien)}` : ""}, maj = now() where id = ${lit(id)}`);

const attente = await q(`select id from app_publications where statut = 'attente' order by at limit 20`);
if (!EXPO) {
  // Le jeton Expo de Bingoo! n'est pas encore dans les secrets GitHub : les demandes restent en file, le membre est prévenu
  if (attente.length) await q(`update app_publications set message = 'Ta demande est enregistrée. La compilation pour les stores s''ouvre très bientôt sur Bingoo! : elle partira automatiquement, sans rien refaire.', maj = now() where statut = 'attente'`);
  console.log(`demandes en attente : ${attente.length} · compilation pas encore activée`);
  process.exit(0);
}
// Une compilation restée bloquée plus de 2 heures repasse en erreur
await q(`update app_publications set statut = 'erreur', message = 'La compilation a pris trop de temps. Relance la publication.', maj = now() where statut = 'construction' and maj < now() - interval '2 hours'`);
if (!attente.length) { console.log("demandes en attente : 0"); process.exit(0); }

const [p] = await q(`select p.id, p.plateforme, p.identifiant, p.numero, p.fichiers, a.slug from app_publications p join saas_apps a on a.id = p.app_id where p.id = ${lit(attente[0].id)}`);
const [s] = await q(`select d.decrypted_secret v from app_stores_cles c join vault.decrypted_secrets d on d.id = c.secret_id where c.app_id = (select app_id from app_publications where id = ${lit(p.id)}) and c.plateforme = ${lit(p.plateforme)}`);
if (!s?.v) { await maj(p.id, "erreur", "La clé de publication a été retirée : ajoute-la de nouveau puis relance."); console.log("traitées : 1 · erreurs : 1"); process.exit(0); }
await maj(p.id, "construction", p.plateforme === "ios" ? "Compilation pour l'iPhone en cours (15 à 40 minutes)…" : "Compilation pour Android en cours (10 à 30 minutes)…");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coque-")), cle = JSON.parse(s.v), f = p.fichiers;
const ecrire = (n, c) => fs.writeFileSync(path.join(dir, n), typeof c === "string" ? c : JSON.stringify(c, null, 2));
const majeur = String(f.sdk).split(".")[0];
try {
  ecrire("App.js", f.app_js);
  ecrire("package.json", { name: p.identifiant.split(".").pop(), version: "1.0.0", main: "node_modules/expo/AppEntry.js", private: true, dependencies: { expo: `~${majeur}.0.0`, ...f.deps } });
  // Icône : celle de l'app (SVG) en PNG 1024 × 1024, comme l'exigent les stores
  const svg = await (await fetch(f.icone)).text();
  ecrire("icone.svg", svg);
  execFileSync("npx", ["--yes", "sharp-cli@4", "-i", "icone.svg", "-o", "icone.png", "resize", "1024", "1024"], { cwd: dir, stdio: "ignore" });
  ecrire("app.json", { expo: {
    name: f.nom, slug: p.identifiant.split(".").pop(), version: "1.0.0", orientation: "portrait", icon: "./icone.png",
    splash: { backgroundColor: f.couleur, image: "./icone.png", resizeMode: "contain" },
    ios: { bundleIdentifier: p.identifiant, buildNumber: String(p.numero), supportsTablet: true, infoPlist: { ITSAppUsesNonExemptEncryption: false } },
    android: { package: p.identifiant, versionCode: p.numero, adaptiveIcon: { foregroundImage: "./icone.png", backgroundColor: f.couleur } },
  } });
  ecrire("eas.json", { cli: { appVersionSource: "local" }, build: { production: { android: { buildType: "app-bundle" } } },
    submit: { production: { android: { serviceAccountKeyPath: "./play.json", track: "internal", releaseStatus: "draft" }, ios: {} } } });
  const env = { ...process.env, EXPO_TOKEN: EXPO, CI: "1", EAS_NO_VCS: "1" };
  if (p.plateforme === "ios") { ecrire("asc.p8", cle.p8); Object.assign(env, { EXPO_ASC_API_KEY_PATH: path.join(dir, "asc.p8"), EXPO_ASC_KEY_ID: cle.key_id, EXPO_ASC_ISSUER_ID: cle.issuer_id, EXPO_APPLE_TEAM_ID: cle.team_id }); }
  else ecrire("play.json", cle);
  const lancer = (args) => spawnSync("npx", ["--yes", ...args], { cwd: dir, env, encoding: "utf8", maxBuffer: 64 << 20, timeout: 100 * 60e3 });
  // Les sorties des outils ne sont jamais affichées (elles peuvent citer des identifiants) : seulement analysées
  if (lancer(["expo", "install", "--fix"]).status !== 0) throw new Error("dependances");
  if (lancer(["eas-cli@latest", "init", "--non-interactive", "--force"]).status !== 0) throw new Error("init");
  const b = lancer(["eas-cli@latest", "build", "-p", p.plateforme, "--profile", "production", "--non-interactive", "--wait", "--json", "--auto-submit"]);
  const sortie = (b.stdout ?? "") + "\n" + (b.stderr ?? "");
  const lien = (sortie.match(/https:\/\/expo\.dev\/artifacts\/eas\/[^\s"]+/) ?? [])[0] ?? null;
  if (b.status !== 0) {
    let m = "La compilation n'a pas abouti. Relance la publication ; si ça recommence, écris-nous.";
    if (p.plateforme === "ios" && /app.*not.*found|no app|create.*app.*App Store Connect|ascAppId/i.test(sortie)) m = `Crée d'abord l'app dans App Store Connect (Apps › + › Nouvelle app) avec l'identifiant de bundle ${p.identifiant}, puis relance.`;
    else if (p.plateforme === "ios" && /forbidden|not authorized|401|403|role/i.test(sortie)) m = "Ta clé App Store Connect n'a pas les droits suffisants : crée-la avec le rôle « Admin » (ou « App Manager »), puis remplace-la.";
    else if (p.plateforme === "android" && /package not found|applicationNotFound|first.*upload|manually/i.test(sortie)) m = `Google Play demande que le tout premier envoi soit fait à la main : télécharge le fichier .aab ci-dessous et dépose-le dans la Play Console (Tests › Test interne), dans l'app ${p.identifiant}. Les envois suivants partiront tout seuls.`;
    else if (p.plateforme === "android" && /permission|forbidden|403/i.test(sortie)) m = "Le compte de service n'a pas accès à cette app dans la Play Console (Utilisateurs et autorisations › Inviter l'adresse du compte de service).";
    await maj(p.id, "erreur", m, lien);
    console.log("traitées : 1 · erreurs : 1");
  } else {
    await maj(p.id, "envoyee", p.plateforme === "ios" ? "Envoyée sur App Store Connect : elle apparaît dans TestFlight d'ici quelques minutes, puis tu la soumets à la validation d'Apple." : "Envoyée sur Google Play en test interne (brouillon) : tu la passes en production depuis la Play Console.", lien);
    console.log("traitées : 1 · envoyées : 1");
  }
} catch {
  await maj(p.id, "erreur", "La préparation de l'app a échoué. Relance la publication ; si ça recommence, écris-nous.");
  console.log("traitées : 1 · erreurs : 1");
} finally {
  fs.rmSync(dir, { recursive: true, force: true }); // les clés ne restent jamais sur la machine
}
