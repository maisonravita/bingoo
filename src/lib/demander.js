// Fenêtre de confirmation intégrée au site (remplace confirm/alert du navigateur, qui bloquent la page et font « amateur »).
// demander("Retirer X ?", { ok: "Retirer", danger: true }) → Promise<boolean> ; avertir("Message") → Promise<void>
const CSS = `.bq-fond{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:bq-in .12s ease-out}
.bq-boite{background:#fff;color:#0f172a;border-radius:18px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.25);font:15px/1.5 Inter,ui-sans-serif,system-ui,sans-serif}
.bq-boite p{margin:0 0 18px;white-space:pre-line}.bq-btns{display:flex;justify-content:flex-end;gap:8px}
.bq-btns button{border:0;border-radius:11px;padding:9px 16px;font:600 14px Inter,ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.bq-non{background:#f1f5f9;color:#334155}.bq-oui{background:#0f172a;color:#fff}.bq-oui.bq-danger{background:#dc2626}
@keyframes bq-in{from{opacity:0}to{opacity:1}}`;
// Source en texte (et non fn.toString()) : la minification renommerait les variables et casserait le code injecté dans les SaaS livrés
const SRC = `(function () { const CSS = ${JSON.stringify(CSS)}; return function (message, { ok = "Confirmer", non = "Annuler", danger = false, seul = false } = {}) {
  return new Promise((resolve) => {
    if (!document.getElementById("bq-css")) { const s = document.createElement("style"); s.id = "bq-css"; s.textContent = CSS; document.head.appendChild(s); }
    const fond = document.createElement("div"); fond.className = "bq-fond"; fond.setAttribute("role", "dialog"); fond.setAttribute("aria-modal", "true");
    const boite = document.createElement("div"); boite.className = "bq-boite";
    const p = document.createElement("p"); p.textContent = String(message ?? "");
    const btns = document.createElement("div"); btns.className = "bq-btns";
    const fin = (v) => { document.removeEventListener("keydown", touche, true); fond.remove(); resolve(v); };
    const touche = (e) => { if (e.key === "Escape") { e.preventDefault(); fin(false); } if (e.key === "Enter") { e.preventDefault(); fin(true); } };
    if (!seul) { const b = document.createElement("button"); b.className = "bq-non"; b.textContent = non; b.onclick = () => fin(false); btns.appendChild(b); }
    const o = document.createElement("button"); o.className = "bq-oui" + (danger ? " bq-danger" : ""); o.textContent = seul ? "OK" : ok; o.onclick = () => fin(true); btns.appendChild(o);
    fond.onclick = (e) => { if (e.target === fond) fin(false); };
    boite.append(p, btns); fond.appendChild(boite); document.body.appendChild(fond);
    document.addEventListener("keydown", touche, true); o.focus();
  });
}; })()`;
// eslint-disable-next-line no-new-func
const ouvrir = new Function(`return ${SRC}`)();

export const demander = (message, opts) => ouvrir(message, opts);
export const avertir = (message) => ouvrir(message, { seul: true }).then(() => {});
export const CODE_DEMANDER = `const demander=${SRC};const avertir=(m)=>demander(m,{seul:true});`;
