/* L'opportunité : l'objet central de Bingoo!. Une entreprise, le fait récent qui fait que c'est le bon moment,
   le décideur, et le message prêt. Mêmes règles que le moteur (supabase/functions/_shared/agents.ts : declencheur). */
const MOMENTS = new Set(["ouverture", "dirigeant", "croissance", "recrutement", "creation", "renouvellement", "demenagement", "levee", "accelerateur", "sans_reservation", "sans_schema", "techno", "marche", "radar"]);
const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function dateDe(s) {
  if (s.date) { const d = new Date(s.date); if (!isNaN(+d)) return d; }
  const l = sansAccent(s.label);
  const m = l.match(new RegExp(`(${MOIS.join("|")})\\s+(20\\d\\d)`));
  if (m) return new Date(Number(m[2]), MOIS.indexOf(m[1]), 15);
  const y = l.match(/\b(20\d\d)\b/);
  return y ? new Date(Number(y[1]), 6, 1) : null;
}

/** Le fait récent sur lequel s'ouvre le message (ou null). */
export function declencheur(p) {
  const sg = (p?.signals ?? []).filter((x) => x?.label && MOMENTS.has(String(x.type))
    && (x.type !== "dirigeant" || /changement|nouveau|nouvelle|nomm|reprise|rachat|partant|arriv|succ[eè]d|cession/i.test(String(x.label))));
  const frais = sg.map((x) => ({ x, d: dateDe(x) })).filter(({ d }) => !d || (Date.now() - d) / (30.4 * 864e5) <= 18);
  frais.sort((u, v) => (v.d ? +v.d : 0) - (u.d ? +u.d : 0));
  return frais[0] ? { ...frais[0].x, quand: frais[0].d } : null;
}

const GENERIQUE = /^(contact|info|infos|sales|vente|ventes|hello|bonjour|accueil|commercial|marketing|support|admin|office|secretariat|direction|reclamation[a-z.-]*|service[a-z.-]*|rh|recrutement|jobs|team|equipe|agence|cabinet|mail|courrier)@/i;
export const emailGenerique = (e) => GENERIQUE.test(String(e ?? "").trim());

const TYPE = { recrutement: "Recrute", ouverture: "Nouvel établissement", creation: "Entreprise récente", dirigeant: "Nouveau dirigeant", demenagement: "Déménage", croissance: "Se développe", levee: "Levée de fonds", renouvellement: "Contrat à renouveler", sans_reservation: "Constat sur son site", sans_schema: "Constat sur son site", techno: "Constat sur son site", marche: "Marché public", accelerateur: "Accélérateur", radar: "Repérée par le Radar" };
export const typeDe = (t) => TYPE[t] ?? "Fait récent";

/** « il y a 3 jours », « en août 2025 »… */
export function quandTexte(d) {
  if (!d) return "";
  const j = Math.round((Date.now() - d) / 864e5);
  if (j < 0) return `le ${d.toLocaleDateString("fr-FR")}`;
  if (j <= 1) return "aujourd'hui";
  if (j < 45) return `il y a ${j} jours`;
  return `en ${d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
}
