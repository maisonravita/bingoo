// Bingoo! — pilote LinkedIn. Demande à Bingoo! la prochaine action, l'exécute dans un onglet LinkedIn en arrière-plan,
// renvoie le résultat, puis attend le délai indiqué (1 à 4 minutes entre deux actions, plus longtemps hors des heures de bureau).
const API = "https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/x";
const ALARM = "bingoo-li";

const store = (o) => chrome.storage.local.set(o);
const read = (k) => new Promise((r) => chrome.storage.local.get(k, r));

async function call(path, body) {
  const key = await bootKey();
  if (!key) throw new Error("Extension non connectée à Bingoo!");
  const res = await fetch(`${API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-bingoo-key": key }, body: JSON.stringify(body ?? {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Bingoo! ne répond pas (${res.status})`);
  return data;
}

function plan(seconds) {
  const s = Math.max(60, Math.min(3600, Number(seconds) || 900));
  chrome.alarms.create(ALARM, { delayInMinutes: s / 60 });
  store({ liNextAt: Date.now() + s * 1000 });
}

// Clé d'accès : celle enregistrée, sinon celle livrée dans le zip personnel (config.json), lue une seule fois
async function bootKey() {
  const v = await chrome.storage.local.get(["key", "cfgTried"]);
  if (v.key || v.cfgTried) return v.key || "";
  let key = "";
  try { const c = await (await fetch(chrome.runtime.getURL("config.json"))).json(); if (/^bgo_[a-f0-9]{40}$/.test(c.key)) key = c.key; } catch { /* zip générique : pas de config */ }
  await chrome.storage.local.set({ key, cfgTried: true });
  return key;
}

const LABELS = { invitation: "Invitation", verifier: "Vérification", message: "Message", relance: "Relance", visite: "Visite du profil", retirer: "Retrait d'invitation", trouver: "Recherche du profil" };

const loaded = (tabId) => new Promise((resolve) => {
  const t = setTimeout(resolve, 30000);
  chrome.tabs.onUpdated.addListener(function on(id, info) {
    if (id === tabId && info.status === "complete") { clearTimeout(t); chrome.tabs.onUpdated.removeListener(on); resolve(); }
  });
});
async function runAction(a) {
  const tab = await chrome.tabs.create({ url: a.profil, active: false });
  try {
    await loaded(tab.id);
    let profil = "";
    for (let hop = 0; hop < 2; hop++) {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["li.js"] });
      const [out] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (x) => window.__bingooLi(x), args: [a] });
      const r = out?.result ?? { resultat: "erreur", detail: "Pas de réponse de la page" };
      // Fiche Sales Navigator : on passe sur le profil LinkedIn classique, puis on refait l'action
      if (r.redirect && hop === 0) { profil = r.redirect; await chrome.tabs.update(tab.id, { url: r.redirect }); await loaded(tab.id); continue; }
      return { ...r, profil: r.profil || profil };
    }
    return { resultat: "erreur", detail: "Profil introuvable" };
  } catch (e) {
    return { resultat: "erreur", detail: String(e?.message ?? e).slice(0, 200) };
  } finally {
    setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 1500 + Math.random() * 3000);
  }
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    const { liPause } = await read("liPause");
    if (liPause) { store({ liState: "En pause depuis l'extension" }); return plan(1800); }
    const next = await call("li-next");
    if (!next.action) { store({ liState: next.raison || "Rien à faire" }); return plan(next.attendre); }
    const a = next.action;
    store({ liState: `${LABELS[a.type] ?? a.type} en cours : ${a.personne || a.entreprise || "profil"}` });
    const r = await runAction(a);
    const rep = await call("li-report", { id: a.id, resultat: r.resultat, detail: r.detail, profil: r.profil });
    const line = `${LABELS[a.type] ?? a.type} · ${a.personne || a.entreprise || ""} · ${r.resultat}${r.detail ? ` (${r.detail})` : ""}`;
    const { liLog = [] } = await read("liLog");
    store({ liLog: [{ at: Date.now(), line }, ...liLog].slice(0, 20), liState: rep.pause ? "Pause : LinkedIn a envoyé un signal, Bingoo! s'arrête" : "Action terminée" });
    plan(rep.pause ? 3600 : next.attendre);
  } catch (e) {
    store({ liState: `Erreur : ${e.message}` });
    plan(1800);
  } finally {
    busy = false;
  }
}

// ---------------------------------------------------------------- Réponses LinkedIn
// Toutes les 2 heures en semaine (9 h – 19 h) : on lit la liste des conversations, seules celles avec tes prospects sont gardées par Bingoo!
const INBOX = "bingoo-inbox";
const officeNow = () => { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return d.getDay() >= 1 && d.getDay() <= 5 && h >= 9 && h <= 19; };
async function inbox() {
  const { liReplies = true, liPause, key } = await read(["liReplies", "liPause", "key"]);
  if (!key || !liReplies || liPause || !officeNow()) return;
  const tab = await chrome.tabs.create({ url: "https://www.linkedin.com/messaging/", active: false });
  try {
    await loaded(tab.id);
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["li.js"] });
    const [out] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => window.__bingooInbox() });
    const threads = out?.result ?? [];
    if (threads.length) {
      const r = await call("li-inbox", { threads });
      if (r.nouvelles) { const { liLog = [] } = await read("liLog"); store({ liLog: [{ at: Date.now(), line: `${r.nouvelles} réponse${r.nouvelles > 1 ? "s" : ""} LinkedIn repérée${r.nouvelles > 1 ? "s" : ""}` }, ...liLog].slice(0, 20) }); }
    }
  } catch { /* LinkedIn indisponible : on réessaiera */ } finally { setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 2000); }
}
chrome.alarms.create(INBOX, { periodInMinutes: 120, delayInMinutes: 15 });

// ---------------------------------------------------------------- Badge (si le client l'a activé)
async function badge(tabId, url) {
  const { badgeOn, key } = await read(["badgeOn", "key"]);
  if (!badgeOn || !key || !/^https?:\/\//.test(url ?? "") || /linkedin\.com|google\.|mail\.google/.test(url)) { chrome.action.setBadgeText({ tabId, text: "" }); return; }
  try {
    const r = await call("signal-count", { url });
    chrome.action.setBadgeBackgroundColor({ tabId, color: r.concurrent ? "#9f1239" : "#E0531F" });
    chrome.action.setBadgeText({ tabId, text: r.concurrent ? "!" : r.n > 0 ? String(Math.min(r.n, 99)) : "" });
  } catch { chrome.action.setBadgeText({ tabId, text: "" }); }
}
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.status === "complete") badge(tabId, tab.url); });

chrome.alarms.onAlarm.addListener((al) => { if (al.name === ALARM) tick(); if (al.name === INBOX) inbox(); });
const APP = "https://kairo.maisonravita.fr";
const linkPage = () => chrome.tabs.create({ url: `${APP}/#/extension?ext=${chrome.runtime.id}` });

// Juste après l'installation : Bingoo! s'ouvre et relie l'extension à l'espace du client, sans clé à copier
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  plan(60);
  if (reason === "install" && !(await bootKey())) linkPage();
});
// Seul le site Bingoo! peut parler à l'extension (externally_connectable), et on revérifie l'origine
chrome.runtime.onMessageExternal.addListener((m, sender, reply) => {
  if (sender.origin !== APP) return;
  (async () => {
    if (m?.type === "bingoo-ping") return reply({ linked: !!(await bootKey()), version: chrome.runtime.getManifest().version });
    if (m?.type === "bingoo-key" && /^bgo_[a-f0-9]{40}$/.test(m.key ?? "")) {
      await chrome.storage.local.set({ key: m.key, cfgTried: true, liPause: false });
      plan(60);
      return reply({ ok: true });
    }
    reply({ ok: false });
  })();
  return true;
});
chrome.runtime.onMessage.addListener((m) => { if (m === "li-link") linkPage(); });
chrome.runtime.onStartup.addListener(() => plan(120));
chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m === "li-now") plan(60);
  if (m === "li-inbox-now") inbox();
  // Gmail : la fiche du prospect est demandée par le script de la page, la clé ne quitte jamais l'extension
  if (m?.type === "lookup-email") { call("lookup-email", { email: m.email }).then(reply).catch(() => reply({ prospect: null })); return true; }
});
