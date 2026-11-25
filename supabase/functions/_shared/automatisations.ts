// Automatisations d'un logiciel : « quand une fiche est créée ou modifiée dans telle liste (et que telle condition est vraie),
// alors… ». Tout est déclaratif (aucun code du membre n'est exécuté) et tourne côté serveur, dans l'espace de l'utilisateur.
// Garde-fous : 12 automatisations par projet, 3 actions chacune, une action d'automatisation n'en déclenche jamais une autre.
export type Condition = { champ: string; op: "=" | "!=" | "contient" | ">" | "<" | "rempli"; valeur?: string };
export type Action =
  | { type: "modifier"; champ: string; valeur: string }
  | { type: "creer"; collection: string; data: Record<string, string> }
  | { type: "email"; sujet: string; texte: string };
export type Auto = { id: string; nom: string; actif: boolean; evenement: "fiche_creee" | "fiche_modifiee"; collection: string; si?: Condition; alors: Action[] };

const t = (x: unknown, n: number) => String(x ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const OPS = ["=", "!=", "contient", ">", "<", "rempli"];

/** Ne garde que des automatisations valides pour les listes et les champs réels du projet. */
export function nettoyerAutos(liste: unknown, spec: any): Auto[] {
  const cols = new Map<string, Set<string>>(((spec?.collections ?? []) as any[]).filter((c) => c?.nom).map((c) => [String(c.nom), new Set<string>(((c.champs ?? []) as any[]).map((f) => String(f.nom)))]));
  const out: Auto[] = [];
  for (const a of (Array.isArray(liste) ? liste : []).slice(0, 12) as any[]) {
    const champs = cols.get(String(a?.collection ?? ""));
    if (!champs || !["fiche_creee", "fiche_modifiee"].includes(a?.evenement)) continue;
    const si = a.si && champs.has(String(a.si.champ)) && OPS.includes(a.si.op) ? { champ: String(a.si.champ), op: a.si.op, valeur: t(a.si.valeur, 120) } as Condition : undefined;
    const alors: Action[] = [];
    for (const x of (Array.isArray(a.alors) ? a.alors : []).slice(0, 3) as any[]) {
      if (x?.type === "modifier" && champs.has(String(x.champ))) alors.push({ type: "modifier", champ: String(x.champ), valeur: t(x.valeur, 300) });
      else if (x?.type === "creer" && cols.has(String(x.collection))) {
        const cible = cols.get(String(x.collection))!;
        const data = Object.fromEntries(Object.entries(x.data && typeof x.data === "object" ? x.data : {}).filter(([k]) => cible.has(k)).slice(0, 12).map(([k, v]) => [k, t(v, 300)]));
        if (Object.keys(data).length) alors.push({ type: "creer", collection: String(x.collection), data });
      } else if (x?.type === "email" && t(x.sujet, 120)) alors.push({ type: "email", sujet: t(x.sujet, 120), texte: String(x.texte ?? "").replace(/[<>]/g, "").trim().slice(0, 1200) });
    }
    if (!alors.length) continue;
    out.push({ id: /^[a-z0-9]{6,12}$/.test(String(a.id ?? "")) ? String(a.id) : crypto.randomUUID().replace(/-/g, "").slice(0, 8), nom: t(a.nom, 80) || "Automatisation", actif: a.actif !== false, evenement: a.evenement, collection: String(a.collection), ...(si ? { si } : {}), alors });
  }
  return out;
}

export function conditionVraie(si: Condition | undefined, d: Record<string, unknown>): boolean {
  if (!si) return true;
  const v = d?.[si.champ], s = String(v ?? "").trim().toLowerCase(), c = String(si.valeur ?? "").trim().toLowerCase();
  if (si.op === "rempli") return s !== "";
  if (si.op === "=") return s === c;
  if (si.op === "!=") return s !== c;
  if (si.op === "contient") return c !== "" && s.includes(c);
  const a = Number(String(v ?? "").replace(",", ".")), b = Number(c.replace(",", "."));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return si.op === ">" ? a > b : a < b;
}

/** Remplace {{champ}} par la valeur de la fiche, {{aujourdhui}} par la date du jour. */
export function remplir(modele: string, d: Record<string, unknown>): string {
  return String(modele ?? "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, k) => k === "aujourdhui" ? new Date().toISOString().slice(0, 10) : String(d?.[k] ?? "").slice(0, 300));
}

/** Lance les automatisations d'un événement. Rend les données de la fiche (modifiées si une action « modifier » a joué). */
export async function lancerAutos(e: {
  admin: any; app: any; evenement: "fiche_creee" | "fiche_modifiee"; col: string; row: { id: string; data: Record<string, unknown> }; avant?: Record<string, unknown>;
  espace: string; userId: string; limite: number; email?: (sujet: string, texte: string, cle: string) => Promise<void>;
}): Promise<Record<string, unknown>> {
  let data = { ...(e.row.data ?? {}) };
  const autos = ((e.app.spec?.automatisations ?? []) as Auto[]).filter((a) => a?.actif !== false && a.evenement === e.evenement && a.collection === e.col).slice(0, 12);
  const faits: string[] = [];
  for (const a of autos) {
    try {
      if (!conditionVraie(a.si, data)) continue;
      // Modification : seulement quand la condition devient vraie (sinon chaque retouche de la fiche relancerait l'action)
      if (e.evenement === "fiche_modifiee" && a.si && e.avant && conditionVraie(a.si, e.avant)) continue;
      for (const x of a.alors) {
        if (x.type === "modifier") data = { ...data, [x.champ]: remplir(x.valeur, data) };
        else if (x.type === "creer") {
          const { count } = await e.admin.from("saas_app_rows").select("id", { count: "exact", head: true }).eq("app_id", e.app.id).eq("espace_id", e.espace);
          if ((count ?? 0) >= e.limite) continue;
          await e.admin.from("saas_app_rows").insert({ app_id: e.app.id, user_id: e.userId, espace_id: e.espace, col: x.collection, data: Object.fromEntries(Object.entries(x.data).map(([k, v]) => [k, remplir(v, data)])) });
        } else if (x.type === "email" && e.email) await e.email(remplir(x.sujet, data).slice(0, 120), remplir(x.texte, data), `auto-${a.id}-${e.row.id}`);
      }
      faits.push(a.id);
    } catch (x) { console.error("automatisation", a.id, String((x as any)?.message ?? x).slice(0, 120)); }
  }
  if (faits.length) {
    if (JSON.stringify(data) !== JSON.stringify(e.row.data ?? {})) await e.admin.from("saas_app_rows").update({ data, maj: new Date().toISOString() }).eq("id", e.row.id);
    console.log(`automatisations ${e.app.slug ?? e.app.id} ${e.evenement} ${e.col} : ${faits.length} lancée(s)`);
  }
  return data;
}
