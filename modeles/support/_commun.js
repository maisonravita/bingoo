const STATUTS_T = { ouvert: ["Ouvert", "bleu"], attente: ["En attente", "orange"], resolu: ["Résolu", "vert"] };
const PRIO = { haute: ["Haute", "rouge"], normale: ["Normale", "gris"], basse: ["Basse", "gris"] };
const echangesDe = (t) => { let e = t?.echanges; if (typeof e === "string") { try { e = JSON.parse(e); } catch (_) { e = null; } } return Array.isArray(e) && e.length ? e : [{ de: "client", nom: t?.nom, texte: t?.message ?? "", at: t?.created_at }]; };
// Délai de première réponse, en heures (null si pas encore répondu)
const delaiReponse = (t) => { const e = echangesDe(t), a = e.find((x) => x.de === "client"), b = e.find((x) => x.de === "equipe"); if (!a || !b) return null; const h = (new Date(b.at) - new Date(a.at)) / 3600000; return isFinite(h) && h >= 0 ? h : null; };
const duree = (h) => h == null ? "—" : h < 1 ? Math.max(1, Math.round(h * 60)) + " min" : h < 48 ? (Math.round(h * 10) / 10).toString().replace(".", ",") + " h" : Math.round(h / 24) + " j";
