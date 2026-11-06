// Accès base (service), contrôle d'accès par espace, appels à Claude.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { HttpError } from "./http.ts";
import { aiCtx, setAi } from "./ai-ctx.ts";
export { setAi } from "./ai-ctx.ts";

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
// ai : budget IA mensuel en euros (coût réel pour Bingoo!), plafond du coût IA par client.
// Prix placés sous les outils de référence (La Growth Machine, lemlist, Waalaxy Business) ; annuel : −20 %.
// Grille par quota (business plan du 6 nov. 2026) : quota = prospects contactés par mois (premier e-mail parti, contact trouvé et vérifié).
// Relances, Radar et Espion restent compris dans la limite IA. credits = recherches vérifiées d'e-mails (comptées seulement si trouvé).
export const PLANS: Record<string, { label: string; price: number; factor: number; seats: number; credits: number; ai: number; quota: number }> = {
  essai: { label: "Essai gratuit", price: 0, factor: 0.5, seats: 1, credits: 40, ai: 4, quota: 30 },
  solo: { label: "Solo", price: 49, factor: 1, seats: 1, credits: 200, ai: 11, quota: 150 },
  pro: { label: "Pro", price: 119, factor: 2, seats: 3, credits: 650, ai: 24, quota: 500 },
  equipe: { label: "Équipe", price: 229, factor: 4, seats: 10, credits: 1300, ai: 46, quota: 1000 },
  fondateur: { label: "Fondateur", price: 0, factor: 1, seats: 50, credits: 5000, ai: 15, quota: 5000 },
};
type PlanFields = { plan?: string; plan_status?: string; trial_ends?: string | null };
/** Bloque les actions payantes quand l'essai est fini ou que l'abonnement n'est plus réglé. */
export function assertPlan(ws: PlanFields) {
  const plan = ws.plan ?? "essai";
  if (plan === "fondateur") return;
  if (plan === "essai") {
    // Tant que le paiement en ligne n'est pas ouvert (pas de clé Stripe), un essai ne bloque jamais : le client ne pourrait pas payer
    if (ws.trial_ends && ws.trial_ends < new Date().toISOString().slice(0, 10) && env("STRIPE_SECRET_KEY")) throw new HttpError(402, "Ton essai gratuit est terminé : choisis une formule dans Réglages → Abonnement pour continuer.");
    return;
  }
  if (!(plan in PLANS)) throw new HttpError(402, "Formule inconnue : choisis une formule dans Réglages → Abonnement.");
  // Liste blanche : seuls un abonnement réglé ou une période d'essai Stripe donnent accès aux actions payantes
  const st = ws.plan_status ?? "";
  if (st === "active" || st === "trialing") return;
  if (["past_due", "unpaid"].includes(st)) throw new HttpError(402, "Ton dernier paiement a échoué : mets à jour ta carte dans Réglages → Abonnement.");
  if (["incomplete", "paused"].includes(st)) throw new HttpError(402, "Ton paiement n'est pas encore confirmé : termine-le dans Réglages → Abonnement.");
  throw new HttpError(402, "Ton abonnement est arrêté : choisis une formule dans Réglages → Abonnement pour reprendre.");
}
/** Même règle, sans erreur : sert à écarter les espaces non à jour des tâches planifiées. */
export function planOk(ws: PlanFields) {
  try { assertPlan(ws); return true; } catch { return false; }
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
  differenciation?: string; ville?: string; ton?: string; type?: "saas" | "services" | "terrain" | "produits"; vend_public?: boolean;
};
export type Target = {
  id: string; label: string; pourquoi?: string; naf: string[]; tranches?: string[]; siege_only?: boolean;
  interlocuteur?: string; angle?: string; pour_qui?: string; actif?: boolean; total?: number; next_page?: number | null;
  confiance?: "forte" | "moyenne" | "a_tester"; moment?: string;
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
export async function requireMember(req: Request, workspaceId: unknown): Promise<{ userId: string; ws: Workspace; role: string }> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Connexion requise");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expirée, reconnecte-toi");
  if (typeof workspaceId !== "string" || !/^[0-9a-f-]{36}$/.test(workspaceId)) throw new HttpError(400, "Espace manquant");
  const { data: m } = await admin.from("members").select("role").eq("workspace_id", workspaceId).eq("user_id", data.user.id).maybeSingle();
  if (!m) throw new HttpError(403, "Accès refusé à cet espace");
  setAi({ ws: workspaceId, live: true });
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();
  return { userId: data.user.id, ws: ws as Workspace, role: m.role as string };
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

// ---------------------------------------------------------------- Coût IA : mesure, budgets, garde-fous
// Prix en dollars par million de jetons (entrée, sortie), modifiables via le secret AI_PRICES (JSON). Recherche web : par requête.
const PRICES = (): Record<string, [number, number]> => {
  try { return { opus: [5, 25], sonnet: [3, 15], haiku: [1, 5], ...JSON.parse(env("AI_PRICES", "{}")) }; } catch { return { opus: [5, 25], sonnet: [3, 15], haiku: [1, 5] }; }
};
const USD_EUR = () => Number(env("USD_EUR", "0.92")) || 0.92;
type Usage = { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number; server_tool_use?: { web_search_requests?: number } };
export function aiCost(model: string, u: Usage) {
  const p = PRICES(), fam = Object.keys(p).find((k) => model.includes(k)) ?? "sonnet";
  const [pin, pout] = p[fam];
  const input = (u.input_tokens ?? 0) + 1.25 * (u.cache_creation_input_tokens ?? 0) + 0.1 * (u.cache_read_input_tokens ?? 0);
  const usd = (input * pin + (u.output_tokens ?? 0) * pout) / 1e6 + (u.server_tool_use?.web_search_requests ?? 0) * Number(env("AI_SEARCH_USD", "0.01"));
  return Math.round(usd * USD_EUR() * 1e5) / 1e5;
}
export async function aiRecord(model: string, u: Usage) {
  const ctx = aiCtx.getStore() ?? {};
  await admin.from("ai_usage").insert({
    workspace_id: ctx.ws ?? null, feature: (ctx.feature ?? "autre").slice(0, 80), model,
    input_tokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), output_tokens: u.output_tokens ?? 0,
    searches: u.server_tool_use?.web_search_requests ?? 0, cost_eur: aiCost(model, u),
  }).then(() => null, (e: unknown) => console.error("ai_usage", e));
}
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };
const dayStart = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
/** Dépense IA (euros) d'un espace depuis le début du mois, ou de toute la plateforme depuis minuit. */
export async function aiSpent(wsId: string | null, since = wsId ? monthStart() : dayStart()) {
  const { data } = await admin.rpc("ai_spent", { p_ws: wsId, p_since: since });
  return Number(data ?? 0);
}
/** Budget IA mensuel d'un espace (réglage propre à l'espace, sinon celui de son offre). */
export async function aiBudget(wsId: string) {
  const { data: w } = await admin.from("workspaces").select("plan, ai_budget_eur").eq("id", wsId).single();
  return Number(w?.ai_budget_eur ?? PLANS[w?.plan ?? "essai"]?.ai ?? 4);
}
/** Recharges achetées et pas encore consommées (elles ne servent qu'au-delà de l'enveloppe du mois). */
export async function aiBalance(wsId: string) {
  const { data } = await admin.rpc("ai_balance", { p_ws: wsId });
  return Number(data ?? 0);
}
/** Recharges IA vendues : prix payé (HT) → travail IA ajouté (coût pour Bingoo!), environ 50 % de marge. */
export const PACKS: Record<string, { label: string; price: number; credit: number; work: string; prospects?: number }> = {
  s: { label: "Recharge S", price: 7, credit: 3.5, work: "environ 500 e-mails rédigés de plus" },
  m: { label: "Recharge M", price: 17, credit: 9, work: "environ 1 300 e-mails rédigés de plus" },
  l: { label: "Recharge L", price: 35, credit: 19, work: "environ 2 800 e-mails rédigés de plus" },
  p100: { label: "Recharge 100 prospects", price: 19, credit: 0, work: "100 prospects contactés de plus ce mois-ci", prospects: 100 },
};
/** Reste-t-il de la marge pour un travail optionnel (veille de nuit, recherches web) ? share = part du budget qu'il peut atteindre. */
export async function aiRoom(wsId: string, share = 0.6) {
  const [spent, budget, extra] = await Promise.all([aiSpent(wsId), aiBudget(wsId), aiBalance(wsId)]);
  return spent < (budget + extra) * share;
}
/** Garde-fou avant chaque appel : plafond quotidien de toute la plateforme, puis budget mensuel de l'espace. */
/** IA automatique (app_secrets « background_ai ») : « on » partout, « clients » = seulement les vrais clients
 *  (les espaces « fondateur », tes espaces de test, ne consomment plus rien la nuit), « off » = arrêtée partout. */
export async function bgMode(): Promise<"on" | "off" | "clients"> {
  const { data } = await admin.from("app_secrets").select("value").eq("name", "background_ai").maybeSingle();
  return data?.value === "off" ? "off" : data?.value === "clients" ? "clients" : "on";
}
export async function backgroundPaused() { return (await bgMode()) === "off"; }
/** Espace de test (formule fondateur) : pas d'IA automatique en mode « clients ». */
export const isTestSpace = (w: { plan?: string | null }) => w.plan === "fondateur";

export async function aiGuard() {
  const ctx = aiCtx.getStore() ?? {};
  if (ctx.essential) return; // réponses de prospects : toujours traitées (plafond par prospect dans pro.ts)
  const cap = Number(env("AI_DAILY_CAP_EUR", "12"));
  const ws = ctx.ws;
  if (!ws) {
    // Outils gratuits et travaux de la plateforme : enveloppe à part, qui ne peut pas priver les clients
    const freeCap = Number(env("AI_FREE_CAP_EUR", "2"));
    const { data } = await admin.from("ai_usage").select("cost_eur").is("workspace_id", null).gte("at", dayStart());
    if ((data ?? []).reduce((a, r) => a + Number(r.cost_eur ?? 0), 0) >= freeCap) throw new HttpError(503, "L'outil gratuit est très demandé aujourd'hui : crée ton compte Bingoo! pour y accéder tout de suite.");
    return;
  }
  if (!ctx.live) {
    // Interrupteur général de l'IA automatique (nuit, tâches de fond) : app_secrets « background_ai » = « off ».
    // Ce que l'utilisateur lance lui-même et les réponses des prospects continuent.
    const mode = await bgMode();
    if (mode === "off") throw new HttpError(503, "IA automatique en pause sur la plateforme.");
    if (mode === "clients" && ws) {
      const { data: w } = await admin.from("workspaces").select("plan").eq("id", ws).maybeSingle();
      if (w && isTestSpace(w)) throw new HttpError(503, "IA automatique en pause sur les espaces de test.");
    }
  }
  if (cap > 0) {
    // Les tâches de fond s'arrêtent à 70 % du plafond pour laisser la place aux demandes des utilisateurs connectés
    const spent = await aiSpent(null);
    if (spent >= cap || (!ctx.live && spent >= cap * 0.7)) throw new HttpError(503, "Pause de sécurité : le plafond quotidien d'IA de la plateforme est atteint. Reprise automatique demain.");
  }
  const [spent, budget] = await Promise.all([aiSpent(ws), aiBudget(ws)]);
  if (spent >= budget) {
    // Au-delà de l'enveloppe : on puise dans les recharges achetées, s'il en reste
    const extra = await aiBalance(ws);
    if (extra > 0) return;
    const { count } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("kind", "budget_ia").ilike("summary", "Enveloppe IA du mois utilisée%").gte("created_at", monthStart());
    if (!count) await admin.from("activity").insert({ workspace_id: ws, kind: "budget_ia", summary: "Enveloppe IA du mois utilisée : ton équipe IA est en pause. Recharge pour continuer tout de suite (réponses des prospects toujours traitées)." });
    throw new HttpError(402, "L'enveloppe IA du mois est utilisée : ton équipe IA est en pause. Ajoute une recharge dans Abonnement pour continuer tout de suite, ou attends le 1er du mois.");
  }
  if (spent >= budget * 0.8) {
    const { count } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("kind", "budget_ia").ilike("summary", "80 %%").gte("created_at", monthStart());
    if (!count) await admin.from("activity").insert({ workspace_id: ws, kind: "budget_ia", summary: "80 % de l'enveloppe IA du mois utilisée : la veille de nuit passe en mode économe. Une recharge permet de garder le plein régime." });
  }
}

async function call(body: Record<string, unknown>, key: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.usage) await aiRecord(String(body.model), data.usage);
  return { ok: res.ok, status: res.status, data };
}

export async function ask(prompt: string, opts: AskOpts = {}): Promise<string> {
  const key = env("ANTHROPIC_API_KEY");
  if (!key) throw new HttpError(500, "Clé ANTHROPIC_API_KEY manquante dans les secrets Supabase");
  await aiGuard();
  // Mode économe pour le travail de fond (nuit, tâches automatiques) : les recherches web, de loin le poste le plus cher,
  // passent au modèle rapide avec 4 recherches au plus. Ce que l'utilisateur lance lui-même garde le modèle complet.
  // Désactivable avec le secret AI_ECO_BACKGROUND=0.
  const ctx = aiCtx.getStore() ?? {};
  const web = (opts.tools ?? []).some((t) => (t as { name?: string }).name === "web_search");
  const eco = web && !ctx.live && !ctx.essential && env("AI_ECO_BACKGROUND", "1") !== "0";
  if (eco) opts = { ...opts, fast: true, tools: (opts.tools ?? []).map((t) => (t as { name?: string }).name === "web_search" ? { ...(t as object), max_uses: Math.min(Number((t as { max_uses?: number }).max_uses ?? 4), 4) } : t) };
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
