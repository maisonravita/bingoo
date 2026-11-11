// Garde-fou : une copie Bingoo! reprend l'idée et le modèle d'un SaaS, jamais son identité.
// Le nom et le domaine du SaaS d'origine ne doivent apparaître nulle part dans ce que voient les clients de la copie
// (site, slogan, écrans, données d'exemple), et le nom de la copie ne doit pas lui ressembler.
// deno-lint-ignore-file no-explicit-any

const norm = (s: string) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.(com|io|ai|fr|app|co|so|to|me|net|dev)$/, "").replace(/[^a-z0-9]/g, "");

function distance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Le nom proposé ressemble-t-il trop à celui d'un SaaS existant ? */
export function ressemble(nom: string, autre: string) {
  const a = norm(nom), b = norm(autre);
  if (!a || !b || b.length < 3) return false;
  if (a === b || a.includes(b) || (a.length >= 4 && b.includes(a))) return true;
  return distance(a, b) <= (Math.min(a.length, b.length) <= 5 ? 1 : 2);
}

const echap = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Remplace le nom et le domaine du SaaS d'origine par le nom de la copie, partout dans un objet (textes et code). */
export function sansIdentite<T>(obj: T, origine: { nom?: string | null; domaine?: string | null }, nouveau: string): { valeur: T; remplacements: number } {
  const motifs = [origine.domaine, origine.domaine?.replace(/^www\./, ""), origine.nom].filter((x): x is string => !!x && x.trim().length >= 3);
  if (!motifs.length) return { valeur: obj, remplacements: 0 };
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${[...new Set(motifs)].sort((a, b) => b.length - a.length).map(echap).join("|")})(?![\\p{L}\\p{N}_])`, "giu");
  let n = 0;
  const marche = (v: any): any => {
    if (typeof v === "string") return v.replace(re, () => { n++; return nouveau; });
    if (Array.isArray(v)) return v.map(marche);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marche(x)]));
    return v;
  };
  return { valeur: marche(obj), remplacements: n };
}
