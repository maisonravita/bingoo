const ST_I = { a_valider: ["À valider", "orange"], actif: ["En cours", "bleu"], termine: ["Terminé", "vert"] };
const progDe = (c) => { let p = c?.programme; if (typeof p === "string") { try { p = JSON.parse(p); } catch (_) { p = null; } } return Array.isArray(p) ? p : []; };
const dureeTxt = (min) => { const m = Math.round(Number(min) || 0); return m >= 60 ? Math.floor(m / 60) + " h " + String(m % 60).padStart(2, "0") : m + " min"; };
function Barre({ v, max }) { const p = max ? Math.min(100, Math.round((v / max) * 100)) : 0; return html`<div class="flex items-center gap-2"><div class="h-1.5 w-24 rounded-full bg-slate-100"><div class="h-1.5 rounded-full bg-[var(--c)]" style=${"width:" + p + "%"}></div></div><span class="text-xs tabular-nums text-slate-500">${p} %</span></div>`; }
