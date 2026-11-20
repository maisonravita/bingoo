const RES = { instagram: ["Instagram", "#E1306C", 2200], linkedin: ["LinkedIn", "#0A66C2", 3000], facebook: ["Facebook", "#1877F2", 5000], tiktok: ["TikTok", "#111827", 2200] };
const ST_P = { brouillon: ["Brouillon", "gris"], programme: ["Programmée", "bleu"], publie: ["Publiée", "vert"] };
const resDe = (p) => { let r = p?.reseaux; if (typeof r === "string") { try { r = JSON.parse(r); } catch (_) { r = [r]; } } return (Array.isArray(r) ? r : []).filter((x) => RES[x]); };
const Puce = ({ r }) => html`<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style=${"background:" + (RES[r]?.[1] ?? "#64748b")}>${RES[r]?.[0] ?? r}</span>`;
const engag = (p) => (Number(p.jaime) || 0) + (Number(p.commentaires) || 0) * 3 + (Number(p.partages) || 0) * 5;
// Rappel le jour J : un e-mail à soi-même avec le texte prêt à copier (la publication n'est pas automatique)
async function programmerRappel(p) {
  if (!user?.email || !p.date) return null;
  const quand = new Date(p.date + "T" + (p.heure || "09:00") + ":00").toISOString();
  if (new Date(quand) <= new Date()) return null;
  const r = await email({ a: user.email, quand, sujet: "À publier maintenant sur " + resDe(p).map((x) => RES[x][0]).join(" et "), texte: "C'est l'heure de publier !\n\nTexte prêt à copier :\n\n" + p.texte + "\n\nUne fois publié, marquez-la comme publiée dans l'outil pour suivre ses résultats." });
  return r?.id ?? null;
}
