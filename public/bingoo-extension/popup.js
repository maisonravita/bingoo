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
  app.innerHTML = `<h1>Relie l'extension à Bingoo!</h1>
    <p class="muted">Un clic : Bingoo! s'ouvre et s'occupe de tout.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
    <button class="btn" id="link">Relier à mon espace Bingoo!</button>
    <details class="manual"><summary>J'ai une clé d'accès</summary>
      <input id="k" placeholder="bgo_…" autocomplete="off">
      <button class="btn ghost" id="save">Enregistrer la clé</button>
    </details>`;
  document.getElementById("link").onclick = () => { chrome.runtime.sendMessage("li-link"); window.close(); };
  document.getElementById("save").onclick = async () => {
    const k = document.getElementById("k").value.trim();
    if (!/^bgo_[a-f0-9]{40}$/.test(k)) return setup("Cette clé n'a pas le bon format (elle commence par bgo_).");
    await setKey(k);
    try { await call("whoami", {}); load(); pilot(); } catch (e) { await setKey(""); setup(e.message); }
  };
}

function render(d, url) {
  if (d.unsupported) { app.innerHTML = `<p>${esc(d.message)}</p>`; return; }
  if (d.competitor) { app.innerHTML = `<h1>${esc(d.competitor.name)}</h1><p class="chip rival">Ton concurrent</p><p>${esc(d.message)}</p><a class="btn" href="${APP}/#/espion" target="_blank">Voir dans Concurrents</a>`; return; }
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
  if (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i.test(url)) return liProfile(tab, url);
  if (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/company\//i.test(url)) return liCompany(tab);
  if (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(search\/results\/people|sales\/search\/people)/i.test(url)) return liSearch(tab);
  if (/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/sales\/lead\//i.test(url)) return liProfile(tab, url, true);
  app.innerHTML = `<p class="muted">Bingoo! analyse ${esc(new URL(url).hostname)}…</p>`;
  try { render(await call("lookup", { url }), url); }
  catch (e) { if (/clé/i.test(e.message)) { await setKey(""); setup(e.message); } else app.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

// Pilote LinkedIn : état, dernières actions, pause locale
async function pilot() {
  const box = document.getElementById("li");
  if (!(await getKey())) { box.hidden = true; return; }
  const v = await new Promise((r) => chrome.storage.local.get(["liPause", "liState", "liNextAt", "liLog", "liReplies", "badgeOn", "gmailOn"], r));
  let st = null;
  try { st = await call("li-status", {}); } catch { /* hors ligne : on affiche l'état local */ }
  const on = st?.enabled && !st?.paused_reason && !v.liPause;
  const next = v.liNextAt ? Math.max(0, Math.round((v.liNextAt - Date.now()) / 60000)) : null;
  const perDay = st?.max_par_jour ?? 20;
  box.hidden = false;
  box.innerHTML = `<div class="li-head"><b>Pilote LinkedIn</b><span class="chip ${on ? "ok" : ""}">${on ? "Actif" : "Arrêté"}</span></div>
    ${st?.paused_reason ? `<p class="err">${esc(st.paused_reason)}</p>` : ""}
    ${st ? `<p class="muted">Aujourd'hui : ${st.invitesDay}/${st.limite_jour} invitations · ${st.messagesDay} message${st.messagesDay > 1 ? "s" : ""} · ${st.en_file} en file</p>` : ""}
    <p class="muted">${esc(v.liState || "En attente")}${next !== null && on ? ` · prochaine vérification dans ${next} min` : ""}</p>
    ${(v.liLog ?? []).slice(0, 3).map((l) => `<p class="log">${esc(l.line)}</p>`).join("")}
    ${st ? `<div class="ctl"><button class="btn ${st.enabled && !st.paused_reason ? "ghost" : ""}" id="lion">${st.enabled && !st.paused_reason ? "Arrêter le pilote" : st.paused_reason ? "Relancer le pilote" : "Activer le pilote"}</button>
      <label class="per">Invitations par jour, au plus <select id="lipd">${[5, 10, 15, 20].map((n) => `<option ${n === perDay ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>` : ""}
    <button class="btn ghost" id="lip">${v.liPause ? "Reprendre sur cet ordinateur" : "Mettre en pause sur cet ordinateur"}</button>
    <details class="opts"><summary>Réglages de l'extension</summary>
      <label><input type="checkbox" id="o-rep" ${v.liReplies !== false ? "checked" : ""}> Repérer les réponses LinkedIn de mes prospects</label>
      <label><input type="checkbox" id="o-badge" ${v.badgeOn ? "checked" : ""}> Badge sur les sites qui ont des signaux <span class="muted">(l'adresse du site visité est envoyée à Bingoo!)</span></label>
      <label><input type="checkbox" id="o-gmail" ${v.gmailOn ? "checked" : ""}> Bingoo! dans Gmail <span class="muted">(fiche du prospect à côté de ses e-mails)</span></label>
    </details>`;
  document.getElementById("lip").onclick = async () => {
    await new Promise((r) => chrome.storage.local.set({ liPause: !v.liPause }, r));
    if (v.liPause) chrome.runtime.sendMessage("li-now");
    pilot();
  };
  const ctl = async (body) => { try { await call("li-control", body); chrome.runtime.sendMessage("li-now"); } catch (e) { box.insertAdjacentHTML("beforeend", `<p class="err">${esc(e.message)}</p>`); return; } pilot(); };
  document.getElementById("lion")?.addEventListener("click", () => ctl({ enabled: !(st.enabled && !st.paused_reason) }));
  document.getElementById("lipd")?.addEventListener("change", (e) => ctl({ par_jour: Number(e.target.value) }));
  const opt = (id, k) => document.getElementById(id).addEventListener("change", (e) => { chrome.storage.local.set({ [k]: e.target.checked }); if (k === "liReplies" && e.target.checked) chrome.runtime.sendMessage("li-inbox-now"); });
  opt("o-rep", "liReplies"); opt("o-badge", "badgeOn"); opt("o-gmail", "gmailOn");
}

// ---------------------------------------------------------------- LinkedIn
const LI_PAGE = (fn, tab) => chrome.scripting.executeScript({ target: { tabId: tab.id }, func: fn }).then(([r]) => r?.result).catch(() => null);

/** Note et message modifiables, puis « Valider » : rien n'entre dans la file du pilote sans l'accord du client. */
function editor(items, box) {
  const many = items.length > 1;
  box.innerHTML = items.map((it, i) => `<div class="draft" data-i="${i}">
      ${many ? `<p class="who">${esc(it.personne ?? "")}</p>` : ""}
      <label>Note d'invitation <span class="cnt" id="c${i}"></span></label>
      <textarea id="n${i}" rows="${many ? 3 : 4}" maxlength="200">${esc(it.note)}</textarea>
      <details ${many ? "" : "open"}><summary>Premier message, après acceptation</summary><textarea id="m${i}" rows="5">${esc(it.message)}</textarea></details>
    </div>`).join("") + `<button class="btn" id="val">${many ? `Valider les ${items.length} invitations` : "Valider l'invitation"}</button>
    <p class="muted">Tu pourras aussi les modifier plus tard dans Bingoo!, page LinkedIn.</p>`;
  items.forEach((_, i) => { const t = document.getElementById(`n${i}`), c = document.getElementById(`c${i}`); const u = () => { c.textContent = `${t.value.length}/200`; }; t.oninput = u; u(); });
  document.getElementById("val").onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = "Validation…";
    try {
      const r = await call("li-validate", { items: items.map((it, i) => ({ prospect_id: it.prospect_id, note: document.getElementById(`n${i}`).value, message: document.getElementById(`m${i}`).value })) });
      box.innerHTML = `<p class="chip ok">${r.valides > 1 ? `${r.valides} invitations validées` : "Invitation validée"}</p><p class="muted">Le pilote l'enverra aux heures de bureau, avec des pauses. Sans pilote, retrouve-la dans Bingoo!, page LinkedIn.</p><a class="btn ghost" href="${APP}/#/linkedin" target="_blank">Ouvrir dans Bingoo!</a>`;
    } catch (x) { b.disabled = false; b.textContent = "Réessayer"; box.insertAdjacentHTML("beforeend", `<p class="err">${esc(x.message)}</p>`); }
  };
}

// Profil d'une personne : son statut s'il est déjà prospect, sinon l'ajout avec la note et le message à relire
async function liProfile(tab, url, sales = false) {
  const who = await LI_PAGE(() => {
    const t = (sel) => (document.querySelector(sel)?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (/\/sales\//.test(location.pathname) || document.querySelector("[data-anonymize='person-name']")) return { personne: t("[data-anonymize='person-name']") || t("h1"), titre: [t("[data-anonymize='headline']") || t("[data-anonymize='job-title']"), t("[data-anonymize='company-name']")].filter(Boolean).join(" chez ") };
    const h1 = [...document.querySelectorAll("main h1")].find((e) => e.getClientRects().length);
    const box = h1?.closest("section") ?? document;
    return { personne: (h1?.textContent ?? "").trim(), titre: (box.querySelector(".text-body-medium")?.textContent ?? "").trim() };
  }, tab) ?? { personne: "", titre: "" };
  if (!who.personne) { app.innerHTML = `<p>Laisse le profil LinkedIn se charger, puis rouvre Bingoo!.</p>`; return; }
  app.innerHTML = `<h1>${esc(who.personne)}</h1><p class="muted">${esc(who.titre)}</p><div id="lib"><p class="muted">Vérification…</p></div>`;
  const box = document.getElementById("lib");
  const st = await call("li-profile", { url }).catch(() => ({ prospect: null }));
  if (st.prospect) {
    const p = st.prospect;
    if (p.brouillon) { box.innerHTML = `<p class="chip">Ajouté le ${esc(p.depuis)} : invitation à valider</p><div id="ed"></div>`; return editor([{ prospect_id: p.id, note: p.note, message: p.message }], document.getElementById("ed")); }
    box.innerHTML = `<p class="chip ok">${esc(p.statut)}</p><p class="muted">Déjà dans tes prospects depuis le ${esc(p.depuis)}${p.name && p.name !== who.personne ? ` (${esc(p.name)})` : ""}. Inutile de le contacter à nouveau.</p><a class="btn ghost" href="${APP}/#/prospects" target="_blank">Voir sa fiche dans Bingoo!</a>`;
    return;
  }
  box.innerHTML = `<p>Bingoo! l'ajoute à tes prospects et prépare la note d'invitation et le premier message. Tu les relis avant tout envoi.</p><button class="btn" id="addli">Ajouter et préparer l'invitation</button>`;
  const b = document.getElementById("addli");
  b.onclick = async () => {
    b.disabled = true; b.textContent = "Bingoo! écrit la note…";
    try {
      const r = await call("add-li", { url, personne: who.personne, titre: who.titre });
      if (r.existing) return liProfile(tab, url, sales);
      if (!r.pret) { box.innerHTML = `<p class="chip ok">Ajouté à tes prospects</p><p class="muted">La note n'a pas pu être écrite : prépare-la depuis Bingoo!, page LinkedIn.</p>`; return; }
      editor([{ prospect_id: r.prospect_id, note: r.note, message: r.message }], box);
    } catch (e) { b.disabled = false; b.textContent = "Ajouter et préparer l'invitation"; box.insertAdjacentHTML("beforeend", `<p class="err">${esc(e.message)}</p>`); }
  };
}

// Page entreprise : on lit son site web sur la page (bouton « Site web » ou onglet « À propos ») et on montre la même fiche qu'un site
async function liCompany(tab) {
  const c = await LI_PAGE(() => {
    const h1 = [...document.querySelectorAll("main h1")].find((e) => e.getClientRects().length);
    const ext = [...document.querySelectorAll("main a[href^='http']")].map((a) => a.href).find((h) => !/linkedin\.com|lnkd\.in|google\.|facebook\.|twitter\.|x\.com|instagram\.|youtube\./i.test(h));
    return { nom: (h1?.textContent ?? "").trim(), site: ext ?? "" };
  }, tab) ?? { nom: "", site: "" };
  if (!c.site) { app.innerHTML = `<h1>${esc(c.nom || "Page entreprise")}</h1><p>Ouvre l'onglet « À propos » de cette page : Bingoo! y lira le site de l'entreprise pour te montrer sa fiche.</p>`; return; }
  app.innerHTML = `<p class="muted">Bingoo! analyse ${esc(new URL(c.site).hostname)}…</p>`;
  try { render(await call("lookup", { url: c.site }), c.site); app.insertAdjacentHTML("afterbegin", `<p class="muted">Page LinkedIn de ${esc(c.nom)} · site ${esc(new URL(c.site).hostname)}</p>`); }
  catch (e) { app.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

// Résultats de recherche (LinkedIn ou Sales Navigator) : cases à cocher, pages suivantes jusqu'à 30 personnes, chacune avec sa note à relire
const readResults = () => {
  const seen = new Set(), out = [];
  const sales = /\/sales\//.test(location.pathname) || !!document.querySelector("[data-anonymize='person-name']");
  const links = sales ? document.querySelectorAll("a[href*='/sales/lead/']") : document.querySelectorAll("main a[href*='/in/']");
  for (const a of links) {
    const m = sales ? a.href.match(/\/sales\/lead\/([^/?#,]+)/) : a.href.match(/linkedin\.com\/in\/([^/?#]+)/); if (!m || seen.has(m[1])) continue;
    const li = a.closest("li"); if (!li) continue;
    const name = ((sales ? li.querySelector("[data-anonymize='person-name']") : a.querySelector("span[aria-hidden='true']"))?.textContent ?? a.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!name || name.length > 60 || /^(voir|view)\b/i.test(name)) continue;
    let titre = "";
    if (sales) titre = [li.querySelector("[data-anonymize='title']")?.textContent, li.querySelector("[data-anonymize='company-name']")?.textContent].filter(Boolean).map((x) => x.trim()).join(" chez ");
    else titre = li.innerText.split("\n").map((x) => x.trim()).filter((x) => x && x !== name && !/^[•·]|^\d(er|e|st|nd|rd|th)\b|relation|connexion|degree|se connecter|connect|message|suivre|follow|enregistrer|save/i.test(x))[0] ?? "";
    seen.add(m[1]); out.push({ url: sales ? `https://www.linkedin.com/sales/lead/${m[1]}` : `https://www.linkedin.com/in/${m[1]}`, personne: name, titre });
    if (out.length >= 25) break;
  }
  return out;
};
const nextPage = () => {
  const b = [...document.querySelectorAll("button")].find((x) => /^(suivant|next)$/i.test((x.getAttribute("aria-label") ?? x.textContent ?? "").trim()) && !x.disabled);
  if (!b) return false; b.click(); return true;
};
async function liSearch(tab) {
  const MAX = 30;
  const picked = new Map();
  const draw = (rows, page) => {
    rows.forEach((r) => { if (!picked.has(r.url) && picked.size < MAX) picked.set(r.url, { ...r, on: true }); });
    const all = [...picked.values()];
    app.innerHTML = `<h1>${all.length} personne${all.length > 1 ? "s" : ""} trouvée${all.length > 1 ? "s" : ""}</h1><p class="muted">Page ${page}. Coche celles à ajouter (${MAX} au plus). Bingoo! écrit une note et un message pour chacune, tu les relis avant tout envoi.</p>
      <div class="pick">${all.map((r, i) => `<label><input type="checkbox" data-u="${esc(r.url)}" ${r.on ? "checked" : ""}><span><b>${esc(r.personne)}</b><br><span class="muted">${esc(r.titre)}</span></span></label>`).join("")}</div>
      ${all.length < MAX ? `<button class="btn ghost" id="more">Ajouter aussi la page suivante</button>` : ""}
      <button class="btn" id="addmany">Ajouter la sélection</button>`;
    app.querySelectorAll(".pick input").forEach((c) => { c.onchange = () => { picked.get(c.dataset.u).on = c.checked; }; });
    document.getElementById("more")?.addEventListener("click", async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = "Page suivante…";
      const ok = await LI_PAGE(nextPage, tab);
      if (!ok) { e.currentTarget.textContent = "Pas d'autre page"; return; }
      await new Promise((r) => setTimeout(r, 3500 + Math.random() * 2000)); // le temps que LinkedIn charge, comme une personne
      draw(await LI_PAGE(readResults, tab) ?? [], page + 1);
    });
    document.getElementById("addmany").onclick = add;
  };
  const add = async (e) => {
    const pick = [...picked.values()].filter((r) => r.on).map(({ on, ...r }) => r);
    if (!pick.length) return;
    const b = e.currentTarget; b.disabled = true;
    const ready = []; let skipped = 0;
    try {
      for (let i = 0; i < pick.length; i += 10) {
        b.textContent = `Bingoo! écrit les notes… ${Math.min(i + 10, pick.length)}/${pick.length}`;
        const r = await call("add-li-many", { items: pick.slice(i, i + 10) });
        r.resultats.forEach((x) => (x.pret && !x.existing ? ready.push(x) : skipped++));
      }
      app.innerHTML = `<h1>${ready.length} invitation${ready.length > 1 ? "s" : ""} à relire</h1>${skipped ? `<p class="muted">${skipped} déjà dans tes prospects ou sans note.</p>` : ""}<div id="ed"></div>`;
      if (ready.length) editor(ready, document.getElementById("ed"));
    } catch (x) { b.disabled = false; b.textContent = "Ajouter la sélection"; app.insertAdjacentHTML("beforeend", `<p class="err">${esc(x.message)}</p>`); }
  };
  const rows = await LI_PAGE(readResults, tab) ?? [];
  if (!rows.length) { app.innerHTML = `<p>Laisse les résultats se charger, puis rouvre Bingoo!.</p>`; return; }
  draw(rows, 1);
}

document.getElementById("settings").onclick = () => setup();
load();
pilot();
