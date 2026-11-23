// Contrat de données d'un écran, vérifié et corrigé SANS IA au moment où l'écran est écrit (Bingoo! qui construit, ou l'IA du membre
// par le connecteur). Première cause de ratés relevée par le robot (blocs vides, chiffres à 0) : l'écran lit un champ ou une valeur
// qui n'existe pas dans les données (« montantTTC » au lieu de « montant_ttc », « paye » au lieu de « payé »).
// - un champ inconnu qui ressemble sans ambiguïté à un champ existant est réécrit avec le bon nom ;
// - une valeur comparée (statut === "…") absente des valeurs possibles, mais qui ressemble sans ambiguïté à l'une d'elles, est réécrite ;
// - ce qui reste douteux est rendu comme alerte (jamais de correction hasardeuse).

type Spec = { collections?: { nom: string; champs?: { nom: string; options?: unknown[] }[] }[]; demo?: Record<string, unknown[]> };

// Normalisation : casse, accents, séparateurs, pluriel simple (« montantTTC » ≈ « montant_ttc », « payées » ≈ « payee »)
export function norme(s: string) {
  return String(s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[\s_\-]+/g, "")
    .replace(/(es|s|x)$/, "");
}

// Noms qui ne sont jamais des champs de données (JavaScript, kit Bingoo!, propriétés techniques)
const NON_CHAMPS = new Set(`length map filter reduce find findIndex some every includes indexOf slice sort push concat join split trim toLowerCase toUpperCase
replace startsWith endsWith keys values entries toFixed toISOString toLocaleDateString toLocaleString getTime getDate getMonth getFullYear getDay
setDate then catch finally rows loading error reload add update remove current target value checked files preventDefault stopPropagation
id created_at updated_at cree_le key type label nom titre style class children props params user etat acces email role
eur date heure pct nombre court long json`.split(/\s+/).filter(Boolean));

function champsConnus(spec: Spec) {
  const champs = new Map<string, Set<string>>(); // nom exact → collections
  const valeurs = new Map<string, Set<string>>(); // champ → valeurs possibles (options + données d'exemple)
  const ajouteVal = (c: string, v: unknown) => { if (typeof v !== "string" || !v || v.length > 40) return; (valeurs.get(c) ?? valeurs.set(c, new Set()).get(c)!).add(v); };
  for (const col of spec.collections ?? []) for (const ch of col.champs ?? []) {
    (champs.get(ch.nom) ?? champs.set(ch.nom, new Set()).get(ch.nom)!).add(col.nom);
    for (const o of Array.isArray(ch.options) ? ch.options : []) ajouteVal(ch.nom, typeof o === "object" && o ? (o as any).valeur ?? (o as any).value : o);
  }
  for (const [col, rows] of Object.entries(spec.demo ?? {})) for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r !== "object") continue;
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) { if (k === "ref") continue; (champs.get(k) ?? champs.set(k, new Set()).get(k)!).add(col); ajouteVal(k, v); }
  }
  return { champs, valeurs };
}

export type Contrat = { code: string; corrections: string[]; alertes: string[] };

export function alignerCode(code: string, spec: Spec): Contrat {
  const { champs, valeurs } = champsConnus(spec);
  const corrections: string[] = [], alertes: string[] = [];
  if (!champs.size) return { code, corrections, alertes };
  const parNorme = new Map<string, string[]>();
  for (const c of champs.keys()) { const n = norme(c); parNorme.set(n, [...(parNorme.get(n) ?? []), c]); }
  // Identifiants déclarés par l'écran lui-même (variables, fonctions, clés d'objets créés) : jamais réécrits
  const locaux = new Set<string>();
  for (const m of code.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) locaux.add(m[1]);
  for (const m of code.matchAll(/[{,]\s*([A-Za-z_$][\w$]*)\s*:/g)) locaux.add(m[1]);
  for (const m of code.matchAll(/\(\s*\{([^}]*)\}\s*\)/g)) for (const p of m[1].split(",")) { const n = p.trim().split(/[\s:=]/)[0]; if (n) locaux.add(n); }

  // 1. Champs lus (x.champ, x?.champ) inconnus des données mais proches d'un champ existant
  // Seulement sur une ligne de données (r.champ, ligne?.champ) : jamais sur V., S., ui., props., e.target… (un « V.tons » de vocabulaire n'est pas un champ)
  const RECEPTEURS_EXCLUS = new Set(["props", "params", "user", "e", "ev", "event", "evt", "window", "document", "math", "json", "object", "fmt", "ui", "console", "location", "navigator", "etat", "this", "res", "reponse", "resultat", "config", "options", "o", "opts"]);
  const lus = new Set<string>();
  const RE_LU = /\b([a-z][A-Za-z0-9_]*)\s*(?:\?\.|\.)\s*([a-z_][A-Za-z0-9_]*)\b(?!\s*\()/g;
  for (const m of code.matchAll(RE_LU)) if (!RECEPTEURS_EXCLUS.has(m[1].toLowerCase())) lus.add(m[2]);
  let out = code;
  for (const nom of lus) {
    if (champs.has(nom) || NON_CHAMPS.has(nom) || locaux.has(nom) || nom.length < 3) continue;
    const cands = parNorme.get(norme(nom)) ?? [];
    if (cands.length === 1 && cands[0] !== nom) {
      out = out.replace(new RegExp(`\\b([a-z][A-Za-z0-9_]*)(\\s*(?:\\?\\.|\\.)\\s*)${nom}\\b(?!\\s*\\()`, "g"), (t, rec, sep) => RECEPTEURS_EXCLUS.has(rec.toLowerCase()) ? t : `${rec}${sep}${cands[0]}`);
      corrections.push(`champ « ${nom} » → « ${cands[0]} »`);
    }
  }
  // 2. Valeurs comparées à un champ connu (r.statut === "paye") absentes des valeurs possibles
  for (const m of out.matchAll(/\.\s*([a-z_][A-Za-z0-9_]*)\s*[!=]==?\s*(["'])([^"'\n]{1,40})\2/g)) {
    const [, champ, , val] = m;
    const possibles = valeurs.get(champ);
    if (!possibles || possibles.size === 0 || possibles.size > 12 || possibles.has(val)) continue;
    const proches = [...possibles].filter((p) => norme(p) === norme(val));
    if (proches.length === 1) {
      out = out.replace(new RegExp(`(\\.\\s*${champ}\\s*[!=]==?\\s*)(["'])${val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\2`, "g"), `$1$2${proches[0]}$2`);
      corrections.push(`valeur « ${val} » → « ${proches[0]} » (${champ})`);
    } else alertes.push(`l'écran compare « ${champ} » à « ${val} », qui n'existe pas dans les données (valeurs : ${[...possibles].slice(0, 6).join(", ")})`);
  }
  return { code: out, corrections: [...new Set(corrections)], alertes: [...new Set(alertes)] };
}

// Couverture des données d'exemple : un bloc « Perdues », « Reportés »… reste vide si aucune donnée d'exemple n'a ce statut.
// Après l'écriture des écrans, chaque valeur de statut que le code filtre (r.etape === "Perdue") et qu'aucune donnée d'exemple ne porte
// est donnée à une ligne d'exemple (prise parmi la valeur la plus fréquente du même champ). Données d'exemple seulement.
const TECHNIQUES = /^(choix|long|court|texte|select|textarea|check|checkbox|radio|nombre|date|heure|email|tel|url|fichier|image|p|h1|h2|h3|ul|ol|todo|quote|code|hr|change|input|click|submit|true|false|null|undefined|asc|desc|liste|grille|carte|cartes|tableau|semaine|mois|jour|tous|toutes|all)$/i;
export function couvrirDemo(spec: Spec & { ecrans?: { code?: string }[] }) {
  const demo: Record<string, any[]> = JSON.parse(JSON.stringify(spec.demo ?? {}));
  const ajouts: string[] = [];
  const codes = (spec.ecrans ?? []).map((e) => String(e.code ?? "")).join("\n");
  const vus = new Set<string>();
  for (const m of codes.matchAll(/\.\s*([a-z_][A-Za-z0-9_]*)\s*===?\s*(["'])([^"'\n]{3,30})\2/g)) {
    const [, champ, , val] = m;
    if (TECHNIQUES.test(val) || !/^[\p{L}][\p{L} '’\-_]*$/u.test(val) || vus.has(champ + "=" + val)) continue;
    vus.add(champ + "=" + val);
    // la collection dont les lignes portent ce champ (une seule, sinon on s'abstient)
    const cols = Object.entries(demo).filter(([, rows]) => Array.isArray(rows) && rows.some((r) => r && typeof r === "object" && champ in r));
    if (cols.length !== 1) continue;
    const rows = cols[0][1];
    const valeurs = rows.map((r) => r?.[champ]).filter((v) => typeof v === "string");
    const distinctes = new Set(valeurs);
    if (!valeurs.length || distinctes.has(val) || distinctes.size > 10) continue;
    if ([...distinctes].some((v) => norme(v) === norme(val))) continue; // écart d'écriture : affaire d'alignerCode
    // style des valeurs existantes (« en_retard » / « En retard ») : on n'ajoute qu'une valeur du même style
    const snake = [...distinctes].every((v) => /^[a-z0-9_]+$/.test(v)), styleOk = snake ? /^[a-z0-9_]+$/.test(val) : true;
    if (!styleOk) continue;
    const freq = new Map<string, number>(); for (const v of valeurs) freq.set(v, (freq.get(v) ?? 0) + 1);
    const [plus, n] = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n < 2) continue; // ne jamais faire disparaître une valeur des exemples
    const cible = [...rows].reverse().find((r) => r?.[champ] === plus);
    cible[champ] = val;
    ajouts.push(`${cols[0][0]}.${champ} : un exemple « ${val} » (au lieu de « ${plus} »)`);
  }
  return { demo, ajouts };
}

// Noms de collections : l'écran lit useCollection("rendez_vous") alors que les exemples sont rangés sous « rendezvous » ou « rdv »
// → le bloc restait vide. Les exemples sont renommés vers le nom que le code utilise (seulement s'il n'y a aucune ambiguïté).
export function alignerCollectionsDemo(spec: Spec & { ecrans?: { code?: string }[] }) {
  const demo: Record<string, any[]> = { ...(spec.demo ?? {}) };
  const codes = (spec.ecrans ?? []).map((e) => String(e.code ?? "")).join("\n");
  const lus = new Set<string>();
  for (const m of codes.matchAll(/(?:useCollection|db\.(?:list|add|get|update|remove))\(\s*(["'])([a-z_][A-Za-z0-9_]{1,40})\1/g)) lus.add(m[2]);
  const renommes: string[] = [];
  for (const nom of lus) {
    if (Array.isArray(demo[nom]) && demo[nom].length) continue;
    const proches = Object.keys(demo).filter((k) => k !== nom && !lus.has(k) && Array.isArray(demo[k]) && demo[k].length && norme(k) === norme(nom));
    if (proches.length !== 1) continue;
    demo[nom] = demo[proches[0]]; delete demo[proches[0]];
    renommes.push(`${proches[0]} → ${nom}`);
  }
  return { demo, renommes };
}
