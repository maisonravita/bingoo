// Extension Bingoo! : fiche de l'entreprise du site ouvert (signaux, outils, contacts) et ajout aux prospects.
const API = "https://fbsjbnnmzazylmquzryo.supabase.co/functions/v1/x";
const APP = "https://kairo.maisonravita.fr";
const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Clé d'accès : celle enregistrée, sinon celle livrée dans le zip personnel (config.json), lue une seule fois
async function bootKey() {
  const v = await chrome.storage.local.get(["key", "cfgTried"]);
  if (v.key || v.cfgTried) return v.key || "";
  let key = "";
  try { const c = await (await fetch(chrome.runtime.getURL("config.json"))).json(); if (/^bgo_[a-f0-9]{40}$/.test(c.key)) key = c.key; } catch { /* zip générique : pas de config */ }
  await chrome.storage.local.set({ key, cfgTried: true });
  return key;
}
const getKey = bootKey;
const setKey = (key) => new Promise((r) => chrome.storage.local.set({ key }, r));
async function call(path, body) {
  const key = await getKey();
  const res = await fetch(`${API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-bingoo-key": key }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Bingoo! ne répond pas, réessaie");
  return data;
}

function setup(msg) {
  app.innerHTML = `<h1>Connecte l'extension</h1>
    <p class="muted">Le plus simple : dans Bingoo!, Réglages → Extension Chrome, télécharge ton extension (elle est déjà reliée à ton espace) et installe-la à la place de celle-ci. Sinon, colle ici une clé d'accès.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
    <input id="k" placeholder="bgo_…" autocomplete="off">
    <button class="btn" id="save">Enregistrer</button>
    <a class="btn ghost" href="${APP}/#/reglages" target="_blank">Ouvrir les réglages Bingoo!</a>`;
  document.getElementById("save").onclick = async () => {
    const k = document.getElementById("k").value.trim();
    if (!/^bgo_[a-f0-9]{40}$/.test(k)) return setup("Cette clé n'a pas le bon format (elle commence par bgo_).");
    await setKey(k);
    try { await call("whoami", {}); load(); } catch (e) { await setKey(""); setup(e.message); }
  };
}

function render(d, url) {
  if (d.unsupported) { app.innerHTML = `<p>${esc(d.message)}</p>`; return; }
  if (d.competitor) { app.innerHTML = `<h1>${esc(d.competitor.name)}</h1><p class="chip rival">Ton concurrent</p><p>${esc(d.message)}</p><a class="btn" href="${APP}/#/espion" target="_blank">Ouvrir Espion</a>`; return; }
  const c = d.company;
  app.innerHTML = `
    <h1>${esc(c.name)}</h1>
    <p class="muted">${[c.city, c.siren ? `SIREN ${c.siren}` : "", c.site].filter(Boolean).map(esc).join(" · ")}</p>
    ${d.prospect ? `<span class="chip ok">Dans tes prospects</span>` : ""}
    <h2>Signaux Bingoo!</h2>
    ${d.signals.length ? d.signals.map((s) => `<div class="sig"><span class="score">${s.score ?? ""}</span><b>${esc(s.label)}</b><p>${esc(s.why || s.title)}</p></div>`).join("") : `<p class="muted">Aucun signal pour l'instant sur cette entreprise.</p>`}
    ${d.hiring ? `<p class="muted">${d.hiring} offres d'emploi ouvertes</p>` : ""}
    <h2>Outils sur son site</h2>
    ${d.tools.length ? d.tools.map((t) => `<span class="chip ${d.rival_tools.includes(t) ? "rival" : ""}">${esc(t)}${d.rival_tools.includes(t) ? " · concurrent" : ""}</span>`).join("") : `<p class="muted">Aucun outil repéré.</p>`}
    <h2>Qui contacter</h2>
    ${d.contacts.length ? d.contacts.map((p) => `<div class="person"><b>${esc(p.name)}</b>${p.role ? ` · ${esc(p.role)}` : ""}${p.email ? `<br><a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ""}${`<br><a target="_blank" href="${esc(p.linkedin_url || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${p.name} ${c.name}`)}`)}">${p.linkedin_url ? "Profil LinkedIn" : "Chercher sur LinkedIn"} ↗</a>`}</div>`).join("") : `<p class="muted">Pas encore de contact : ajoute-la, Bingoo! cherchera le bon interlocuteur.</p>`}
    ${d.prospect ? `<a class="btn" href="${APP}/#/prospects" target="_blank">Ouvrir dans Bingoo!</a>` : `<button class="btn" id="add">Ajouter à mes prospects</button>`}`;
  const add = document.getElementById("add");
  if (add) add.onclick = async () => {
    add.disabled = true; add.textContent = "Ajout…";
    try { await call("add", { url }); add.outerHTML = `<p class="chip ok">Ajoutée à tes prospects</p><a class="btn" href="${APP}/#/prospects" target="_blank">Ouvrir dans Bingoo!</a>`; }
    catch (e) { add.disabled = false; add.textContent = "Ajouter à mes prospects"; app.insertAdjacentHTML("beforeend", `<p class="err">${esc(e.message)}</p>`); }
  };
}

async function load() {
  if (!(await getKey())) return setup();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (!/^https?:\/\//.test(url)) { app.innerHTML = `<p>Ouvre le site d'une entreprise, puis clique sur Bingoo!.</p>`; return; }
  app.innerHTML = `<p class="muted">Bingoo! analyse ${esc(new URL(url).hostname)}…</p>`;
  try { render(await call("lookup", { url }), url); }
  catch (e) { if (/clé/i.test(e.message)) { await setKey(""); setup(e.message); } else app.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

// Pilote LinkedIn : état, dernières actions, pause locale
async function pilot() {
  const box = document.getElementById("li");
  if (!(await getKey())) { box.hidden = true; return; }
  const v = await new Promise((r) => chrome.storage.local.get(["liPause", "liState", "liNextAt", "liLog"], r));
  let st = null;
  try { st = await call("li-status", {}); } catch { /* hors ligne : on affiche l'état local */ }
  const on = st?.enabled && !st?.paused_reason && !v.liPause;
  const next = v.liNextAt ? Math.max(0, Math.round((v.liNextAt - Date.now()) / 60000)) : null;
  box.hidden = false;
  box.innerHTML = `<div class="li-head"><b>Pilote LinkedIn</b><span class="chip ${on ? "ok" : ""}">${on ? "Actif" : "Arrêté"}</span></div>
    ${st && !st.enabled ? `<p class="muted">Active-le dans Bingoo!, page LinkedIn.</p>` : ""}
    ${st?.paused_reason ? `<p class="err">${esc(st.paused_reason)}</p>` : ""}
    ${st ? `<p class="muted">Aujourd'hui : ${st.invitesDay}/${st.limite_jour} invitations · ${st.messagesDay} messages · ${st.en_file} en file</p>` : ""}
    <p class="muted">${esc(v.liState || "En attente")}${next !== null && on ? ` · prochaine vérification dans ${next} min` : ""}</p>
    ${(v.liLog ?? []).slice(0, 3).map((l) => `<p class="log">${esc(l.line)}</p>`).join("")}
    <button class="btn ghost" id="lip">${v.liPause ? "Reprendre sur cet ordinateur" : "Mettre en pause sur cet ordinateur"}</button>`;
  document.getElementById("lip").onclick = async () => {
    await new Promise((r) => chrome.storage.local.set({ liPause: !v.liPause }, r));
    if (v.liPause) chrome.runtime.sendMessage("li-now");
    pilot();
  };
}

document.getElementById("settings").onclick = () => setup();
load();
pilot();
