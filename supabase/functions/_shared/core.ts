// Accès base (service), contrôle d'accès par espace, appels à Claude.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { HttpError } from "./http.ts";

export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const env = (name: string, fallback = "") => Deno.env.get(name) || Deno.env.get(`${name}_KAIRO`) || fallback;

export type Workspace = {
  id: string; name: string; website: string;
  profile: Profile; targets: Target[]; zone: string[];
  sender_name: string; sender_email: string; signature: string; postal_address: string;
  domain: string; domain_id: string; domain_status: string; domain_records: unknown[];
  daily_limit: number; onboarded: boolean;
  booking_slug: string; availability: Record<string, [string, string][]>; meeting_minutes: number; meeting_location: string;
  catalog: { label: string; unit: string; price: number }[]; vat_rate: number; autonomy: "valider" | "auto";
  reply_domain: string; reply_domain_id: string; reply_status: string; reply_records: unknown[]; legal_name: string; siret: string; app_url: string;
  warmup_started: string | null; plan: string; plan_status: string; trial_ends: string | null;
  stripe_customer: string; stripe_subscription: string; period_end: string | null;
  integrations: { mailbox?: { ok: boolean; email: string; provider: string; at: string }; hubspot?: { ok: boolean; at: string; portal?: string }; pipedrive?: { ok: boolean; at: string; company?: string } };
  calendar_token: string;
  intelligence?: any; intelligence_at?: string | null; knowledge?: string;
};

/** Fiche « Ce que Kairo peut répondre » sans les lignes encore à compléter. */
export function knowledgeOf(ws: { knowledge?: string }) {
  return (ws.knowledge ?? "").split("\n").filter((l) => !/\[à compléter/i.test(l)).join("\n").trim().slice(0, 4000);
}

// ---------------------------------------------------------------- Abonnements
export const PLANS: Record<string, { label: string; price: number; factor: number; seats: number; credits: number }> = {
  essai: { label: "Essai gratuit", price: 0, factor: 0.5, seats: 1, credits: 30 },
  solo: { label: "Solo", price: 79, factor: 1, seats: 1, credits: 300 },
  pro: { label: "Pro", price: 149, factor: 2, seats: 3, credits: 1000 },
  equipe: { label: "Équipe", price: 299, factor: 4, seats: 10, credits: 3000 },
  fondateur: { label: "Fondateur", price: 0, factor: 1, seats: 50, credits: 5000 },
};
type PlanFields = { plan?: string; plan_status?: string; trial_ends?: string | null };
/** Bloque les actions payantes quand l'essai est fini ou que l'abonnement n'est plus réglé. */
export function assertPlan(ws: PlanFields) {
  const plan = ws.plan ?? "essai";
  if (plan === "fondateur") return;
  if (plan === "essai") {
    if (ws.trial_ends && ws.trial_ends < new Date().toISOString().slice(0, 10)) throw new HttpError(402, "Ton essai gratuit est terminé : choisis une formule dans Réglages → Abonnement pour continuer.");
    return;
  }
  if (["past_due", "unpaid"].includes(ws.plan_status ?? "")) throw new HttpError(402, "Ton dernier paiement a échoué : mets à jour ta carte dans Réglages → Abonnement.");
  if (["canceled", "incomplete_expired"].includes(ws.plan_status ?? "")) throw new HttpError(402, "Ton abonnement est arrêté : choisis une formule dans Réglages → Abonnement pour reprendre.");
}

/** Domaine de la plateforme qui reçoit les réponses de tous les espaces (r-<jeton>@…). */
export const PLATFORM_DOMAIN = () => env("PLATFORM_REPLY_DOMAIN", "maisonravita.fr");
/** Les réponses des prospects reviennent-elles bien dans Kairo ? (sinon pas de relance automatique) */
export function repliesTracked(ws: Workspace) {
  return (ws.reply_status === "verified" && !!ws.reply_domain) || !!PLATFORM_DOMAIN();
}

/** L'espace peut-il envoyer des e-mails ? (domaine vérifié ou boîte mail connectée) */
export function sendReady(ws: Workspace) {
  if (ws.integrations?.mailbox?.ok) return !!ws.postal_address;
  return ws.domain_status === "verified" && !!ws.postal_address && ws.sender_email.toLowerCase().endsWith("@" + ws.domain);
}
export type Profile = {
  nom?: string; resume?: string; offre?: string; clients_types?: string; preuves?: string[];
  differenciation?: string; ville?: string; ton?: string;
};
export type Target = {
  id: string; label: string; pourquoi?: string; naf: string[]; tranches?: string[]; siege_only?: boolean;
  interlocuteur?: string; angle?: string; pour_qui?: string; actif?: boolean; total?: number; next_page?: number | null;
};
export type Prospect = {
  id: string; workspace_id: string; target: string; name: string; org: string; siren: string | null; siret: string | null;
  activity: string; address: string; postal_code: string; city: string; contact_name: string; contact_role: string;
  website: string; email: string; phone: string; status: string; enriched_at: string | null; enrich_note: string;
  public_token: string; next_action_at: string | null; next_action: string; notes: string; signals: { type: string; label: string }[];
  insight: Record<string, unknown> | null; score: number | null; deal_value: number | null; margin_pct: number | null;
  linkedin_status: string;
};

/** Utilisateur connecté + vérification qu'il est membre de l'espace demandé. */
export async function requireMember(req: Request, workspaceId: unknown): Promise<{ userId: string; ws: Workspace }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Connexion requise");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expirée, reconnecte-toi");
  if (typeof workspaceId !== "string" || !/^[0-9a-f-]{36}$/.test(workspaceId)) throw new HttpError(400, "Espace manquant");
  const { data: m } = await admin.from("members").select("role").eq("workspace_id", workspaceId).eq("user_id", data.user.id).maybeSingle();
  if (!m) throw new HttpError(403, "Accès refusé à cet espace");
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();
  return { userId: data.user.id, ws: ws as Workspace };
}

export async function log(workspaceId: string, kind: string, summary: string) {
  await admin.from("activity").insert({ workspace_id: workspaceId, kind, summary });
}

/** Limite quotidienne d'actions IA par espace (protège le budget). */
export async function quota(workspaceId: string, kind: string, max: number, wanted = 1): Promise<number> {
  const { data: w } = await admin.from("workspaces").select("plan, plan_status, trial_ends").eq("id", workspaceId).single();
  assertPlan(w ?? {});
  max = Math.max(1, Math.round(max * (PLANS[w?.plan ?? "essai"]?.factor ?? 1)));
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await admin.from("activity").select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId).eq("kind", kind).gte("created_at", since.toISOString());
  const left = Math.max(0, max - (count ?? 0));
  if (left <= 0) throw new HttpError(429, "Limite du jour atteinte pour cette action, elle se réinitialise demain");
  return Math.min(left, wanted);
}

// ---------------------------------------------------------------- Claude
const WRITE_MODEL = () => env("ANTHROPIC_MODEL", "claude-sonnet-5-5");
const FAST_MODEL = () => env("ANTHROPIC_FAST_MODEL", "claude-haiku-5-5");
type Block = { type: string; text?: string };
export type AskOpts = { fast?: boolean; maxTokens?: number; system?: string; tools?: unknown[] };

async function call(body: Record<string, unknown>, key: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export async function ask(prompt: string, opts: AskOpts = {}): Promise<string> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) throw new HttpError(500, "Clé ANTHROPIC_API_KEY manquante dans les secrets Supabase");
  const base: Record<string, unknown> = {
    model: opts.fast ? FAST_MODEL() : WRITE_MODEL(),
    max_tokens: Math.max(opts.maxTokens ?? 1500, 1500),
    system: opts.system ?? "Tu es un expert en développement commercial B2B en France. Réponds en français.",
    messages: [{ role: "user", content: prompt }],
  };
  if (opts.tools?.length) base.tools = opts.tools;
  const text = (d: { content?: Block[] }) => (d.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  // Pas de réflexion étendue : elle consomme le budget de sortie et peut couper la réponse
  base.thinking = { type: "disabled" };
  const run = async () => {
    let r = await call(base, key);
    if (!r.ok && r.status === 400 && /thinking/i.test(r.data?.error?.message ?? "")) {
      delete base.thinking;
      r = await call(base, key);
    }
    for (let i = 0; i < 3 && r.ok && r.data?.stop_reason === "pause_turn"; i++) {
      base.messages = [{ role: "user", content: prompt }, { role: "assistant", content: r.data.content }];
      r = await call(base, key);
    }
    return r;
  };
  let r = await run();
  // Réponse coupée faute de place : on relance une fois avec un budget plus large
  if (r.ok && r.data?.stop_reason === "max_tokens" && !opts.tools?.length && Number(base.max_tokens) < 32000) {
    console.warn("max_tokens atteint", base.max_tokens, JSON.stringify(r.data?.usage ?? {}));
    base.max_tokens = Math.min(32000, Number(base.max_tokens) * 2);
    base.messages = [{ role: "user", content: prompt }];
    r = await run();
  }
  if (!r.ok) {
    const msg = r.data?.error?.message ?? `erreur ${r.status}`;
    if (/credit balance/i.test(msg)) throw new HttpError(402, "Crédit IA épuisé : recharge le compte Anthropic pour continuer");
    throw new HttpError(502, "IA : " + msg);
  }
  const out = text(r.data);
  if (!out) throw new HttpError(502, `L'IA n'a renvoyé aucun texte (${r.data?.stop_reason ?? "?"})`);
  return out;
}

/** Referme un JSON tronqué au dernier élément complet. */
export function repairJson(t: string): unknown {
  if (!t.startsWith("{")) return null;
  const stack: string[] = [];
  let inStr = false, esc = false;
  const cuts: { at: number; closers: string }[] = [];
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      stack.pop();
      if (!stack.length) { cuts.push({ at: i + 1, closers: "" }); break; }
      cuts.push({ at: i + 1, closers: [...stack].reverse().join("") });
    } else if (c === ",") cuts.push({ at: i, closers: [...stack].reverse().join("") });
  }
  for (let k = cuts.length - 1; k >= 0 && k >= cuts.length - 40; k--) {
    try { return JSON.parse(t.slice(0, cuts[k].at) + cuts[k].closers); } catch { /* point de coupe précédent */ }
  }
  return null;
}

export async function askJson<T>(prompt: string, opts: AskOpts = {}): Promise<T> {
  const text = await ask(prompt + "\n\nRéponds uniquement avec un objet JSON valide, sans texte autour.", opts);
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].at(-1);
  if (fenced) { try { return JSON.parse(fenced[1]) as T; } catch { /* suite */ } }
  const first = text.indexOf("{"), end = text.lastIndexOf("}");
  if (first >= 0 && end > first) { try { return JSON.parse(text.slice(first, end + 1)) as T; } catch { /* suite */ } }
  // Réponse coupée en cours de route : on garde tout ce qui est complet
  if (first >= 0) {
    const repaired = repairJson(text.slice(first));
    if (repaired && typeof repaired === "object") { console.warn("JSON réparé", text.length); return repaired as T; }
  }
  // Texte parasite avec des accolades avant le JSON : on avance d'accolade en accolade
  for (let start = text.indexOf("{", first + 1); start >= 0 && start < end; start = text.indexOf("{", start + 1)) {
    try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { /* on avance */ }
  }
  console.error("JSON illisible", text.length, text.slice(0, 300), "…", text.slice(-300));
  throw new HttpError(502, "Réponse de l'IA illisible, réessaie");
}
