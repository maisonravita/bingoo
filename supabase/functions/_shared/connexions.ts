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
  const texte = JSON.stringify(corps);
  const fin = new AbortController(), t = setTimeout(() => fin.abort(), 6000);
  try {
    const r = await fetch(url, { method: "POST", redirect: "manual", signal: fin.signal, headers: { "content-type": "application/json", "user-agent": "Bingoo-Connexions/1", "x-bingoo-signature": await signer(w.secret, texte) }, body: texte });
    await r.body?.cancel();
    return r.status;
  } catch { return 0; } finally { clearTimeout(t); }
}

/** Prévient les connexions d'un projet qui écoutent cet événement, sans retarder la réponse au visiteur. */
export function prevenir(admin: any, app: { id: string; slug: string; spec?: any; connexions?: any }, evenement: Evenement, donnees: Record<string, unknown>, col?: string) {
  const liste = (Array.isArray(app.connexions?.liste) ? app.connexions.liste : []).filter((w: any) => w?.url && (w.evenements ?? []).includes(evenement));
  if (!liste.length) return;
  // Jamais de champs internes (préfixe _) ni de mots de passe dans l'envoi
  const propre = Object.fromEntries(Object.entries(donnees ?? {}).filter(([k]) => !/^_/.test(k) && !/mot_?de_?passe|password|token|secret/i.test(k)));
  const travail = (async () => {
    const codes = await Promise.all(liste.map((w: any) => envoyer(w, { evenement, projet: app.slug, nom: app.spec?.nom ?? "", ...(col ? { collection: col } : {}), date: new Date().toISOString(), donnees: propre })));
    const { data } = await admin.from("saas_apps").select("connexions").eq("id", app.id).single();
    const journal = [...liste.map((w: any, i: number) => ({ id: w.id, evenement, at: new Date().toISOString(), code: codes[i] })), ...((data?.connexions?.journal ?? []) as any[])].slice(0, 12);
    await admin.from("saas_apps").update({ connexions: { ...(data?.connexions ?? {}), journal } }).eq("id", app.id);
    console.log(`connexions ${app.slug} ${evenement} : ${codes.filter((c) => c >= 200 && c < 300).length}/${codes.length} reçus`);
  })().catch((e) => console.error("connexions", String(e?.message ?? e).slice(0, 120)));
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(travail);
}
