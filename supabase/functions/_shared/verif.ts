// Vérification d'une adresse avant envoi : ce qui protège la boîte du client (un taux de rebond au-dessus de 3 à 5 %
// et les messageries classent ses e-mails en indésirables).
// Gratuit et toujours actif : forme de l'adresse, adresses jetables ou techniques, domaine qui reçoit du courrier,
// adresse ou domaine déjà revenu en erreur. Si une clé MillionVerifier est configurée (MILLIONVERIFIER_API_KEY,
// environ 0,4 centime par adresse), la boîte elle-même est vérifiée, une fois par adresse (résultat gardé 60 jours).
import { admin, env } from "./core.ts";
import { mxOk } from "./agents.ts";

export type Verif = { statut: "valide" | "risque" | "invalide"; raison: string; via: string };

const JETABLES = new Set(["yopmail.com", "yopmail.fr", "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "trashmail.com", "jetable.org", "getnada.com", "sharklasers.com", "maildrop.cc", "dispostable.com", "throwawaymail.com", "fakeinbox.com"]);
const TECHNIQUES = /^(no-?reply|ne-?pas-?repondre|noreply|donotreply|do-not-reply|postmaster|mailer-daemon|abuse|bounce[s]?|unsubscribe|desabonnement|webmaster|hostmaster|root)@/i;
const FORME = /^[a-z0-9._%+'-]{1,64}@[a-z0-9.-]+\.[a-z]{2,24}$/i;

export async function verifierEmail(email: string, workspaceId: string): Promise<Verif> {
  const e = email.trim().toLowerCase();
  const dom = e.split("@")[1] ?? "";
  if (!FORME.test(e) || e.includes("..")) return { statut: "invalide", raison: "adresse mal formée", via: "forme" };
  if (JETABLES.has(dom)) return { statut: "invalide", raison: "adresse jetable", via: "liste" };
  if (TECHNIQUES.test(e)) return { statut: "invalide", raison: "adresse technique, personne ne la lit", via: "liste" };
  // Déjà revenue en erreur (dans n'importe quel espace) : on ne réessaie jamais
  const { data: rebond } = await admin.from("messages").select("id, prospects!inner(email)").eq("bounced", true).eq("prospects.email", e).limit(1);
  if (rebond?.length) return { statut: "invalide", raison: "cette adresse est déjà revenue en erreur", via: "historique" };
  if (!(await mxOk(e))) return { statut: "invalide", raison: "son domaine ne reçoit pas de courrier", via: "dns" };
  // Plusieurs rebonds sur ce domaine pour cet espace : adresse devinée ou domaine qui refuse, prudence
  const { count: domRebonds } = await admin.from("messages").select("id, prospects!inner(email)", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("bounced", true).ilike("prospects.email", `%@${dom}`);
  const key = env("MILLIONVERIFIER_API_KEY");
  if (key) {
    const { data: cache } = await admin.from("email_verifs").select("statut, raison, at").eq("email", e).maybeSingle();
    if (cache && Date.now() - Date.parse(cache.at) < 60 * 864e5) return { statut: cache.statut, raison: cache.raison, via: "millionverifier (mémoire)" };
    try {
      const r = await fetch(`https://api.millionverifier.com/api/v3/?api=${encodeURIComponent(key)}&email=${encodeURIComponent(e)}&timeout=10`, { signal: AbortSignal.timeout(15000) });
      const d = await r.json();
      const res = String(d.result ?? "");
      const v: Verif = res === "ok" ? { statut: "valide", raison: "boîte vérifiée", via: "millionverifier" }
        : res === "invalid" || res === "disposable" ? { statut: "invalide", raison: res === "disposable" ? "adresse jetable" : "cette boîte n'existe pas", via: "millionverifier" }
        : { statut: "risque", raison: res === "catch_all" ? "le domaine accepte toutes les adresses : impossible de confirmer la boîte" : "vérification non concluante", via: "millionverifier" };
      if (r.ok && res) await admin.from("email_verifs").upsert({ email: e, statut: v.statut, raison: v.raison, at: new Date().toISOString() }, { onConflict: "email" });
      if (r.ok && res) return v;
    } catch { /* service indisponible : on garde les contrôles gratuits */ }
  }
  if ((domRebonds ?? 0) >= 2) return { statut: "risque", raison: `${domRebonds} adresses de ce domaine sont déjà revenues en erreur`, via: "historique" };
  return { statut: "valide", raison: key ? "contrôles passés" : "domaine valide (boîte non vérifiée)", via: key ? "millionverifier" : "dns" };
}
