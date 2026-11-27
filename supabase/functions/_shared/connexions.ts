// Connexions sortantes : à chaque événement d'un projet (demande reçue sur le site, fiche créée ou modifiée dans le logiciel),
// Bingoo! prévient une adresse fournie par le membre (Zapier, Make, n8n, ou son propre serveur). C'est le pont vers Google Agenda,
// WhatsApp, la comptabilité… sans qu'aucune clé de ces services ne passe par Bingoo!.
// Sécurité : https seulement, jamais vers une adresse interne ; chaque envoi est signé (X-Bingoo-Signature, HMAC-SHA256 du corps
// avec le secret de la connexion) ; le journal ne garde que l'événement, l'heure et le code de réponse, jamais les données.
// deno-lint-ignore-file no-explicit-any
export const EVENEMENTS = { demande: "Une demande arrive depuis le site", fiche_creee: "Une fiche est créée dans le logiciel", fiche_modifiee: "Une fiche est modifiée dans le logiciel" } as const;
export type Evenement = keyof typeof EVENEMENTS;
export const MAX_CONNEXIONS = 5;

/** Adresse acceptable : https, un vrai nom de domaine public (pas d'adresse IP, pas de réseau interne, pas Bingoo! lui-même). */
export function urlConnexion(brut: unknown): string | null {
  let u: URL;
  try { u = new URL(String(brut ?? "").trim()); } catch { return null; }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) || /^\d+(\.\d+){3}$/.test(h) || h.includes(":")) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example)$/.test(h) || /(^|\.)(supabase\.co|supabase\.in|bingoo\.fr)$/.test(h)) return null;
  return u.toString().slice(0, 500);
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
async function signer(secret: string, corps: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(corps)));
}

/** Un envoi : 6 secondes au plus, aucune redirection suivie. Rend le code de réponse (0 = injoignable). */
export async function envoyer(w: { url: string; secret: string }, corps: Record<string, unknown>): Promise<number> {
  const url = urlConnexion(w.url);
  if (!url) return 0;
  // Messageries (Slack, Discord, Google Chat, Teams) : un message lisible au lieu des données brutes, reconnu à l'adresse
  const h = new URL(url).hostname;
  const message = () => { const d = (corps as any).donnees ?? {}; const lignes = Object.entries(d).filter(([, v]) => v !== null && v !== "" && typeof v !== "object").slice(0, 8).map(([k, v]) => `• ${k.replace(/_/g, " ")} : ${String(v).slice(0, 140)}`); return `${(EVENEMENTS as any)[(corps as any).evenement] ?? "Nouvel événement"} — ${(corps as any).nom || (corps as any).projet}${lignes.length ? "\n" + lignes.join("\n") : ""}`.slice(0, 1900); };
  const texte = /(^|\.)hooks\.slack\.com$|(^|\.)chat\.googleapis\.com$|\.webhook\.office\.com$/.test(h) ? JSON.stringify({ text: message() })
    : /(^|\.)discord(app)?\.com$/.test(h) ? JSON.stringify({ content: message() }) : JSON.stringify(corps);
  const fin = new AbortController(), t = setTimeout(() => fin.abort(), 6000);
  try {
    const r = await fetch(url, { method: "POST", redirect: "manual", signal: fin.signal, headers: { "content-type": "application/json", "user-agent": "Bingoo-Connexions/1", "x-bingoo-signature": await signer(w.secret, texte) }, body: texte });
    await r.body?.cancel();
    return r.status;
  } catch { return 0; } finally { clearTimeout(t); }
}

// ---------------------------------------------------------------- Notion et Airtable : une ligne ajoutée à chaque événement
// La clé du service reste sur le serveur (saas_app_secrets.connexions_cles) ; les colonnes sont reliées par leur nom.
const norme = (t: string) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const TITRES = ["titre", "nom", "service", "objet", "sujet", "prenom", "client"];
const titreDe = (d: Record<string, unknown>) => String(TITRES.map((k) => d[k]).find((v) => v) ?? Object.values(d).find((v) => typeof v === "string" && v) ?? "Nouvelle fiche").slice(0, 200);
export function cibleOutil(type: string, lien: unknown): Record<string, string> | null {
  const t = String(lien ?? "").trim();
  if (type === "notion") { const id = t.replace(/-/g, "").match(/([0-9a-f]{32})(?:\?|$|#)/i)?.[1] ?? t.replace(/-/g, "").match(/[0-9a-f]{32}/i)?.[0]; return id ? { base: id.toLowerCase() } : null; }
  if (type === "airtable") { const b = t.match(/\b(app[A-Za-z0-9]{14})\b/)?.[1], tb = t.match(/\b(tbl[A-Za-z0-9]{14})\b/)?.[1]; return b && tb ? { base: b, table: tb } : null; }
  return null;
}
async function lire(url: string, cle: string, extra: Record<string, string> = {}) {
  const fin = new AbortController(), t = setTimeout(() => fin.abort(), 8000);
  try { const r = await fetch(url, { signal: fin.signal, headers: { authorization: `Bearer ${cle}`, ...extra } }); return { status: r.status, j: await r.json().catch(() => ({})) as any }; }
  catch { return { status: 0, j: {} as any }; } finally { clearTimeout(t); }
}
async function ecrire(url: string, cle: string, corps: unknown, extra: Record<string, string> = {}) {
  const fin = new AbortController(), t = setTimeout(() => fin.abort(), 8000);
  try { const r = await fetch(url, { method: "POST", signal: fin.signal, headers: { authorization: `Bearer ${cle}`, "content-type": "application/json", ...extra }, body: JSON.stringify(corps) }); const j = await r.json().catch(() => ({})) as any; if (!r.ok) console.error("outil", r.status, String(j?.message ?? j?.error?.message ?? j?.error?.type ?? "").slice(0, 160)); return r.status; }
  catch { return 0; } finally { clearTimeout(t); }
}
const NOTION = { "Notion-Version": "2022-06-28" };
/** Vérifie que la clé ouvre bien la base, et rend son nom et ses colonnes (pour l'écran de réglage). */
export async function verifierOutil(type: string, cle: string, cible: Record<string, string>): Promise<{ ok: boolean; nom?: string; colonnes?: string[]; erreur?: string }> {
  if (type === "notion") {
    const r = await lire(`https://api.notion.com/v1/databases/${cible.base}`, cle, NOTION);
    if (r.status === 401) return { ok: false, erreur: "Notion refuse cette clé : copie de nouveau la clé secrète de ton intégration" };
    if (r.status === 404) return { ok: false, erreur: "Notion ne trouve pas cette base : ouvre-la, menu ••• → Connexions → ajoute ton intégration, puis réessaie" };
    if (r.status !== 200) return { ok: false, erreur: `Notion a répondu ${r.status || "rien"}` };
    return { ok: true, nom: (r.j.title ?? []).map((x: any) => x.plain_text).join("") || "Base Notion", colonnes: Object.keys(r.j.properties ?? {}) };
  }
  const r = await lire(`https://api.airtable.com/v0/meta/bases/${cible.base}/tables`, cle);
  if (r.status === 401) return { ok: false, erreur: "Airtable refuse cette clé : vérifie le jeton d'accès personnel" };
  if (r.status === 403 || r.status === 404) return { ok: false, erreur: "Airtable n'ouvre pas cette base : donne au jeton les droits data.records:write et schema.bases:read, et ajoute cette base au jeton" };
  if (r.status !== 200) return { ok: false, erreur: `Airtable a répondu ${r.status || "rien"}` };
  const t = (r.j.tables ?? []).find((x: any) => x.id === cible.table);
  if (!t) return { ok: false, erreur: "Table introuvable dans cette base : copie le lien de la table elle-même" };
  return { ok: true, nom: t.name, colonnes: (t.fields ?? []).map((f: any) => f.name) };
}
/** Ajoute une ligne : chaque donnée va dans la colonne qui porte le même nom (sans accents ni majuscules), le titre dans la colonne principale. */
export async function envoyerOutil(type: string, cle: string, cible: Record<string, string>, donnees: Record<string, unknown>): Promise<number> {
  const d = Object.fromEntries(Object.entries(donnees ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object"));
  if (type === "notion") {
    const r = await lire(`https://api.notion.com/v1/databases/${cible.base}`, cle, NOTION);
    if (r.status !== 200) return r.status;
    const props: Record<string, unknown> = {};
    for (const [nom, p] of Object.entries(r.j.properties ?? {}) as [string, any][]) {
      if (p.type === "title") { props[nom] = { title: [{ text: { content: titreDe(d) } }] }; continue; }
      const k = Object.keys(d).find((x) => norme(x) === norme(nom));
      if (!k) continue;
      const v = d[k], t = String(v).slice(0, 1900);
      const val = p.type === "rich_text" ? { rich_text: [{ text: { content: t } }] } : p.type === "number" ? (Number.isFinite(Number(v)) ? { number: Number(v) } : null)
        : p.type === "date" ? (/^\d{4}-\d{2}-\d{2}/.test(t) ? { date: { start: t.slice(0, 10) } } : null) : p.type === "email" ? { email: t } : p.type === "phone_number" ? { phone_number: t }
        : p.type === "url" ? (/^https?:\/\//.test(t) ? { url: t } : null) : p.type === "select" ? { select: { name: t.slice(0, 90).replace(/,/g, " ") } } : p.type === "status" ? { status: { name: t } }
        : p.type === "checkbox" ? { checkbox: v === true || /^(true|oui|1)$/i.test(t) } : null;
      if (val) props[nom] = val;
    }
    return await ecrire("https://api.notion.com/v1/pages", cle, { parent: { database_id: cible.base }, properties: props }, NOTION);
  }
  const r = await lire(`https://api.airtable.com/v0/meta/bases/${cible.base}/tables`, cle);
  if (r.status !== 200) return r.status;
  const t = (r.j.tables ?? []).find((x: any) => x.id === cible.table);
  if (!t) return 404;
  const fields: Record<string, unknown> = {};
  for (const f of (t.fields ?? []) as any[]) {
    const k = Object.keys(d).find((x) => norme(x) === norme(f.name));
    if (k) fields[f.name] = ["number", "currency", "percent"].includes(f.type) && Number.isFinite(Number(d[k])) ? Number(d[k]) : String(d[k]).slice(0, 5000);
    else if (f.id === t.primaryFieldId && ["singleLineText", "multilineText"].includes(f.type)) fields[f.name] = titreDe(d);
  }
  return await ecrire(`https://api.airtable.com/v0/${cible.base}/${cible.table}`, cle, { records: [{ fields }], typecast: true });
}

/** Prévient les connexions d'un projet qui écoutent cet événement, sans retarder la réponse au visiteur. */
export function prevenir(admin: any, app: { id: string; slug: string; spec?: any; connexions?: any }, evenement: Evenement, donnees: Record<string, unknown>, col?: string) {
  const liste = (Array.isArray(app.connexions?.liste) ? app.connexions.liste : []).filter((w: any) => w?.url && (w.evenements ?? []).includes(evenement));
  if (!liste.length) return;
  // Jamais de champs internes (préfixe _) ni de mots de passe dans l'envoi
  const propre = Object.fromEntries(Object.entries(donnees ?? {}).filter(([k]) => !/^_/.test(k) && !/mot_?de_?passe|password|token|secret/i.test(k)));
  const travail = (async () => {
    const cles = liste.some((w: any) => w.type) ? (((await admin.from("saas_app_secrets").select("connexions_cles").eq("app_id", app.id).maybeSingle()).data?.connexions_cles ?? {}) as Record<string, string>) : {};
    const codes = await Promise.all(liste.map((w: any) => w.type ? (w.collection && col && w.collection !== col ? Promise.resolve(-1) : cles[w.id] ? envoyerOutil(w.type, cles[w.id], w.cible ?? {}, { ...propre, ...(col ? { collection: col } : {}) }) : Promise.resolve(401))
      : envoyer(w, { evenement, projet: app.slug, nom: app.spec?.nom ?? "", ...(col ? { collection: col } : {}), date: new Date().toISOString(), donnees: propre })));
    const { data } = await admin.from("saas_apps").select("connexions").eq("id", app.id).single();
    const journal = [...liste.map((w: any, i: number) => ({ id: w.id, evenement, at: new Date().toISOString(), code: codes[i] })).filter((x: any) => x.code !== -1), ...((data?.connexions?.journal ?? []) as any[])].slice(0, 12);
    await admin.from("saas_apps").update({ connexions: { ...(data?.connexions ?? {}), journal } }).eq("id", app.id);
    console.log(`connexions ${app.slug} ${evenement} : ${codes.filter((c) => c >= 200 && c < 300).length}/${codes.length} reçus`);
  })().catch((e) => console.error("connexions", String(e?.message ?? e).slice(0, 120)));
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(travail);
}
