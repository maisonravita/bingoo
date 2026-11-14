const CLE_CHOIX = "bingoo-choix";
// Le SaaS choisi avant paiement : retrouvé par sa référence (stable), sinon par son rang dans la liste
export function indexChoisi(liste) {
  let c = null; try { c = JSON.parse(localStorage.getItem(CLE_CHOIX) ?? "null"); } catch { c = null; }
  if (c == null) return -1;
  const ref = typeof c === "object" ? c.ref : null, rang = typeof c === "object" ? Number(c.rang) : Number(c);
  if (ref) { const i = liste.findIndex((x) => x.id === ref); if (i >= 0) return i; }
  return Number.isInteger(rang) && rang >= 0 && rang < liste.length ? rang : -1;
}
