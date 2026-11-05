// Bingoo! dans Gmail et Outlook (web) : quand tu ouvres un e-mail d'un de tes prospects, sa fiche s'affiche dans un petit encart.
// Activé seulement si tu l'as choisi dans l'extension. Seule l'adresse de l'expéditeur est vérifiée, jamais le contenu de l'e-mail.
(() => {
  let last = "", host = null;
  const APP = "https://kairo.maisonravita.fr";
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const day = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

  function panel() {
    if (host) return host.shadowRoot;
    host = document.createElement("div");
    host.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:2147483000";
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      .c{width:300px;font:13px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1c1917;background:#fff;border:1px solid #e7e5e4;border-radius:14px;box-shadow:0 20px 40px -18px rgba(28,25,23,.45);overflow:hidden}
      .h{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid #e7e5e4;font-weight:900}.h b{color:#E0531F}
      .x{border:0;background:none;cursor:pointer;color:#57534e;font-size:16px}.b{padding:10px 12px}
      .n{font-size:15px;font-weight:700}.m{color:#78716c;font-size:12px}.s{color:#C2410C;margin-top:6px}
      .chip{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11.5px;font-weight:700;background:#dcfce7;color:#15803d;margin-top:6px}
      .r{margin-top:6px;font-size:12.5px;color:#44403c}a{display:block;margin-top:10px;text-align:center;border-radius:999px;padding:7px;background:#E0531F;color:#fff;text-decoration:none;font-weight:700}
    </style><div class="c"><div class="h"><span>Bingoo<b>!</b></span><button class="x" title="Fermer">×</button></div><div class="b"></div></div>`;
    root.querySelector(".x").onclick = () => { host.style.display = "none"; };
    document.body.appendChild(host);
    return root;
  }

  function show(p) {
    const root = panel();
    host.style.display = "block";
    root.querySelector(".b").innerHTML = `<div class="n">${esc(p.name)}</div><div class="m">${esc([p.contact, p.city].filter(Boolean).join(" · "))}</div>
      <span class="chip">${esc(p.statut)}</span>
      ${p.signal ? `<div class="s">${esc(p.signal)}</div>` : ""}
      ${p.dernier_envoi ? `<div class="r">Dernier envoi le ${day(p.dernier_envoi.le)} : « ${esc(p.dernier_envoi.objet)} »</div>` : ""}
      ${p.derniere_reponse ? `<div class="r">Dernière réponse le ${day(p.derniere_reponse.le)} : ${esc(p.derniere_reponse.resume)}</div>` : ""}
      ${p.prochaine ? `<div class="r">Prochaine étape : ${esc(p.prochaine.quoi)}${p.prochaine.le ? ` (${day(p.prochaine.le)})` : ""}</div>` : ""}
      <a href="${APP}/#/prospects" target="_blank" rel="noopener">Ouvrir la fiche dans Bingoo!</a>`;
  }

  const OUTLOOK = /(^|\.)outlook\.(live|office|office365)\.com$/.test(location.hostname);
  const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  /** Expéditeur de l'e-mail ouvert dans Outlook : lu dans l'en-tête du volet de lecture, jamais dans le corps du message. */
  function outlookSender() {
    const pane = document.querySelector("#ReadingPaneContainerId, [aria-label='Volet de lecture'], [aria-label='Reading Pane'], [data-app-section='ConversationContainer']");
    if (!pane) return "";
    const body = "[aria-label='Corps du message'], [aria-label='Message body'], [role='document']";
    for (const el of pane.querySelectorAll("[title*='@'], [aria-label*='@'], span")) {
      if (el.closest(body)) continue;
      const t = el.getAttribute("title") || el.getAttribute("aria-label") || (el.children.length === 0 ? el.textContent : "");
      const m = t && t.length < 200 ? t.match(EMAIL) : null;
      if (m) return m[0].toLowerCase();
    }
    return "";
  }

  async function check() {
    const { gmailOn } = await chrome.storage.local.get("gmailOn");
    if (!gmailOn) { if (host) host.style.display = "none"; return; }
    // Expéditeur de l'e-mail ouvert (Gmail l'indique dans l'attribut « email »)
    const el = OUTLOOK ? null : [...document.querySelectorAll("h3 span[email], span.gD[email]")].pop();
    const email = OUTLOOK ? outlookSender() : el?.getAttribute("email")?.toLowerCase() ?? "";
    if (!email) { if (host) host.style.display = "none"; last = ""; return; }
    if (email === last) return;
    last = email;
    const r = await chrome.runtime.sendMessage({ type: "lookup-email", email }).catch(() => null);
    if (r?.prospect) show(r.prospect); else if (host) host.style.display = "none";
  }

  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(check, 700); }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => { last = ""; setTimeout(check, 900); });
})();
