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

/** Fiche « Ce que Bingoo! peut répondre » sans les lignes encore à compléter. */
export function knowledgeOf(ws: { knowledge?: string }) {
  return (ws.knowledge ?? "").split("\n").filter((l) => !/\[à compléter/i.test(l)).join("\n").trim().slice(0, 4000);
}

// ---------------------------------------------------------------- Abonnements
// ai : budget IA mensuel en euros (coût réel pour Bingoo!), plafond du coût IA par client.
// Grille du 10 nov. 2026 (le TrendTrack des SaaS) : Starter 19,99 €, Pro 39,99 € (29 € à vie pour les 50 premiers, voir FOUNDER),
// Business 69,99 €, Entreprise sur devis ; annuel : −20 %. Ces trois formules sont la veille du marché, sans prospection.
// Solo, Pro (ancien) et Équipe ne sont plus vendues : les abonnés existants les gardent, avec la prospection.
// Plafonds IA réglés pour garder au moins ~50 % de marge brute même quand le client consomme tout son quota.
// Grille par quota (business plan du 6 nov. 2026) : quota = prospects contactés par mois (premier e-mail parti, contact trouvé et vérifié).
// Relances, Radar et Espion restent compris dans la limite IA. credits = recherches vérifiées d'e-mails (comptées seulement si trouvé).
export const PLANS: Record<string, { label: string; price: number; factor: number; seats: number; credits: number; ai: number; quota: number }> = {
  // Gratuit : presque aucune IA (2 centimes par mois au plus) ; tout ce qui ne demande pas d'IA reste ouvert
  essai: { label: "Aperçu gratuit", price: 0, factor: 0.5, seats: 1, credits: 0, ai: 0.02, quota: 0 },
  // Veille du marché SaaS, sans prospection (pas d'envoi, pas de tâches de prospection de nuit)
  explorer: { label: "Trouver", price: 9.99, factor: 0.5, seats: 1, credits: 0, ai: 1, quota: 0 },
  explorer_pro: { label: "Lancer", price: 24.99, factor: 0.5, seats: 1, credits: 0, ai: 4, quota: 0 },
  business: { label: "Lancer à plusieurs", price: 69.99, factor: 1, seats: 3, credits: 0, ai: 12, quota: 0 },
  // 20 nov. 2026 : formule supérieure de Lancer, toujours un seul SaaS, pour ceux qui modifient beaucoup
  lancer_pro: { label: "Lancer Pro", price: 39.99, factor: 1, seats: 1, credits: 0, ai: 10, quota: 0 },
  // 20 nov. 2026 : un site web (vitrine d'un commerce, d'un artisan, d'un indépendant), sans les données ni les outils SaaS
  site: { label: "Site", price: 9.99, factor: 0.5, seats: 1, credits: 0, ai: 2, quota: 0 },
  // Anciennes formules (prospection), plus vendues
  solo: { label: "Solo", price: 39.99, factor: 1, seats: 1, credits: 140, ai: 6, quota: 100 },
  pro: { label: "Pro (prospection)", price: 69.99, factor: 2, seats: 2, credits: 420, ai: 14, quota: 300 },
  equipe: { label: "Équipe", price: 109, factor: 4, seats: 5, credits: 1000, ai: 24, quota: 700 },
  fondateur: { label: "Fondateur", price: 0, factor: 1, seats: 50, credits: 5000, ai: 15, quota: 5000 },
};
/** Limites de chaque formule, par mois (le 1er du mois remet tout à zéro). Au-delà : les crédits.
 *  Pensées pour que l'IA d'un abonné coûte toujours moins que son abonnement, même au prix annuel (9,99 €/mois).
 *  ia = plafond de dépense IA du mois pour l'espace, en euros (constructions comprises). */
/** Ce que l'offre gratuite peut demander à l'IA : l'aperçu d'une idée et une vidéo par mois (limitée dans la route), rien d'autre. */
export const GRATUIT_IA = /^(explorer\/idee-apercu|video|support)$/;
/** Marque blanche (retirer le badge « Built by Bingoo! », brancher son nom de domaine) : l'offre du dessus seulement. */
export const MARQUE_BLANCHE = ["lancer_pro", "business", "fondateur"];
export const marqueBlanche = (ws: { plan?: string | null; plan_status?: string | null } | null | undefined) => !!ws && MARQUE_BLANCHE.includes(ws.plan ?? "") && ["active", "trialing", "past_due"].includes(ws.plan_status ?? "");
/** Aperçus d'idée offerts chaque mois sur l'offre gratuite. */
export const APERCUS_GRATUITS = 2;
export const LIMITES: Record<string, { construire: number; modifier: number; tiktok: number; pareil: number; scripts: number; ia: number }> = {
  explorer: { construire: 0, modifier: 0, tiktok: 0, pareil: 0, scripts: 0, ia: 1 },
  explorer_pro: { construire: 3, modifier: 30, tiktok: 4, pareil: 20, scripts: 4, ia: 4 },
  business: { construire: 10, modifier: 100, tiktok: 12, pareil: 60, scripts: 12, ia: 12 },
  lancer_pro: { construire: 3, modifier: 100, tiktok: 8, pareil: 40, scripts: 8, ia: 10 },
  site: { construire: 2, modifier: 30, tiktok: 0, pareil: 0, scripts: 0, ia: 2 },
  fondateur: { construire: 10, modifier: 100, tiktok: 12, pareil: 60, scripts: 12, ia: 12 },
};
export const limitesDe = (plan?: string | null) => LIMITES[plan ?? ""] ?? LIMITES.explorer;
/** Ce qui compte pour chaque limite (le type d'activité enregistré) */
export const ACTIVITE_LIMITE = { construire: "construire", modifier: "modifier_app", tiktok: "tiktok", pareil: "tiktok_pareil", scripts: "scripts_video" } as const;
export type Limite = keyof typeof ACTIVITE_LIMITE;
const NOMS_LIMITE: Record<Limite, string> = { construire: "constructions", modifier: "modifications", tiktok: "recherches TikTok", pareil: "scripts « Faire pareil »", scripts: "lots de 10 scripts vidéo" };
export async function utiliseMois(wsId: string, k: Limite) {
  const { count } = await admin.from("activity").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).eq("kind", ACTIVITE_LIMITE[k]).gte("created_at", monthStart());
  return count ?? 0;
}
/** Vérifie la limite du mois ; 402 avec un message clair si elle est atteinte. */
export async function limiteMois(wsId: string, plan: string | null | undefined, k: Limite) {
  const max = limitesDe(plan)[k];
  const utilise = await utiliseMois(wsId, k);
  if (max <= 0) throw new HttpError(402, "Cette fonction est comprise dans la formule Lancer.");
  if (max === 0) throw new HttpError(402, k === "construire" || k === "modifier" ? "La construction de ton SaaS est incluse dans l'offre Lancer. Passe à Lancer depuis Abonnement pour que Bingoo! construise ta version." : `Ça fait partie de l'offre Lancer : passe à Lancer depuis Abonnement.`);
  if (utilise >= max) throw new HttpError(402, `Tu as utilisé tes ${max} ${NOMS_LIMITE[k]} du mois. Ça repart le 1er du mois${k === "modifier" || k === "construire" ? ", ou continue avec tes crédits" : ""}.`);
  return { utilise, max };
}

/** Prix fondateur : les 50 premiers abonnés au mois paient 19 € par mois à vie. */
export const FOUNDER = { plan: "explorer_pro", price: 19, places: 50 };
/** Formule en vente : « Lancer », un seul SaaS par abonnement, payé au mois, au trimestre ou à l'année (prix affichés par mois).
 *  Plus la durée est longue, plus elle comprend de choses. Les anciennes formules (Trouver, Lancer à plusieurs) restent pour leurs abonnés. */
export const PERIODES: Record<string, { label: string; mois: number; parMois: number; inclus: string[] }> = {
  mois: { label: "1 mois", mois: 1, parMois: 24.99, inclus: ["Ton SaaS construit et en ligne, à ton nom", "Tes SaaS à succès, avec leur nom et leurs chiffres", "Ton plan sur 30 jours, avec l'étape du jour chaque matin par e-mail", "Tes 10 premiers clients : des établissements à contacter, trouvés pour toi", "40 scripts de vidéos par mois, prêts à tourner", "L'assistant IA de ton SaaS"] },
  trimestre: { label: "3 mois", mois: 3, parMois: 16.99, inclus: ["Tout ce qu'il y a dans 1 mois", "Moins cher chaque mois", "Facturé tous les 3 mois"] },
  an: { label: "12 mois", mois: 12, parMois: 9.99, inclus: ["Tout ce qu'il y a dans 1 mois", "Le prix le plus bas par mois", "Changer de SaaS une fois dans l'année", "Réponse prioritaire par e-mail"] },
};
export const VENTE = ["explorer_pro", "lancer_pro", "explorer", "site"];
/** « Trouver » : seulement les chiffres (pas de construction), au mois, sans engagement. Les autres formules suivent PERIODES. */
export const PERIODES_PAR_PLAN: Record<string, typeof PERIODES> = {
  explorer: { mois: { label: "1 mois", mois: 1, parMois: 9.99, inclus: ["Tous les revenus vérifiés, la croissance et le trafic", "Le classement et les SaaS à vendre", "Valider une idée, les applis, les niches", "Le connecteur Claude / ChatGPT (5 000 questions par mois)", "Sans engagement"] } },
};
// Lancer Pro : mêmes durées que Lancer, avec 100 modifications par mois et plus d'IA
PERIODES_PAR_PLAN.lancer_pro = {
  mois: { label: "1 mois", mois: 1, parMois: 39.99, inclus: ["Tout ce qu'il y a dans Lancer", "Ton nom de domaine, et sans le badge « Built by Bingoo! » ni le « Fait avec Bingoo! » des vidéos", "100 modifications par mois dans l'atelier (au lieu de 30)", "1 000 réponses de l'assistant IA de ton SaaS par mois", "Tes 10 premiers clients en 7 jours compris"] },
  trimestre: { label: "3 mois", mois: 3, parMois: 29.99, inclus: ["Tout ce qu'il y a dans 1 mois", "Moins cher chaque mois", "Facturé tous les 3 mois"] },
  an: { label: "12 mois", mois: 12, parMois: 19.99, inclus: ["Tout ce qu'il y a dans 1 mois", "Le prix le plus bas par mois", "Changer de SaaS une fois dans l'année", "Réponse prioritaire par e-mail"] },
};
// Site : moins cher qu'un SaaS (pas de données de marché, pas de comptes clients ni d'abonnements à gérer)
PERIODES_PAR_PLAN.site = {
  mois: { label: "1 mois", mois: 1, parMois: 9.99, inclus: ["Ton site en ligne, hébergement inclus", "Les demandes de tes clients reçues par e-mail et rangées", "Tes services, tes prix et tes horaires modifiables à tout moment", "Ton plan pour tes premiers clients du quartier", "30 modifications par mois dans l'atelier"] },
  an: { label: "12 mois", mois: 12, parMois: 7.99, inclus: ["Tout ce qu'il y a dans 1 mois", "95,88 € facturés une fois par an (2 € de moins chaque mois)", "Réponse prioritaire par e-mail"] },
};
/** Formules qui permettent de construire un SaaS (la formule Site ne construit que des sites) */
export const CONSTRUIT_SAAS = ["explorer_pro", "lancer_pro", "business", "fondateur"];
export const periodesDe = (plan: string) => PERIODES_PAR_PLAN[plan] ?? PERIODES;
export const VEILLE_SEULE = ["explorer", "explorer_pro", "lancer_pro", "business", "site"];
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
/** Abonnement à jour ET formule qui comprend la prospection (Explorer seul n'en a pas) : pour les tâches de prospection. */
export function prospectionOk(ws: PlanFields) {
  return planOk(ws) && !VEILLE_SEULE.includes(ws.plan ?? "");
}

/** Domaine de la plateforme qui reçoit les réponses de tous les espaces (r-<jeton>@…). */
export const PLATFORM_DOMAIN = () => env("PLATFORM_REPLY_DOMAIN", "maisonravita.fr");
/** Les réponses des prospects reviennent-elles bien dans Bingoo! ? (sinon pas de relance automatique) */
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
export async function quota(workspaceId: string, kind: string, max: number, wanted = 1, offert = false): Promise<number> {
  const { data: w } = await admin.from("workspaces").select("plan, plan_status, trial_ends").eq("id", workspaceId).single();
  // offert : action de l'offre gratuite (aperçu d'une idée), ouverte même après la fin de l'essai
  if (!(offert && (w?.plan ?? "essai") === "essai")) assertPlan(w ?? {});
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
export type AskOpts = { fast?: boolean; maxTokens?: number; system?: string; cacheSystem?: boolean; tools?: unknown[]; sources?: string[]; images?: string[] };

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
  if (ctx.compteur) {
    const k = ctx.compteur; k.cout += aiCost(model, u); k.appels++;
    k.entree += (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0); k.sortie += u.output_tokens ?? 0;
    k.modeles[model] = (k.modeles[model] ?? 0) + 1;
  }
  await admin.from("ai_usage").insert({
    workspace_id: ctx.ws ?? null, feature: (ctx.feature ?? "autre").slice(0, 80), model,
    input_tokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0), output_tokens: u.output_tokens ?? 0,
    searches: u.server_tool_use?.web_search_requests ?? 0, cost_eur: aiCost(model, u),
  }).then(() => null, (e: unknown) => console.error("ai_usage", e));
}
export const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };
const dayStart = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
/** Dépense IA (euros) d'un espace depuis le début du mois, ou de toute la plateforme depuis minuit. */
export async function aiSpent(wsId: string | null, since = wsId ? monthStart() : dayStart()) {
  const { data } = await admin.rpc("ai_spent", { p_ws: wsId, p_since: since });
  return Number(data ?? 0);
}
export async function aiSpentUsage(wsId: string) {
  const { data } = await admin.rpc("ai_spent_usage", { p_ws: wsId, p_since: monthStart() });
  return Number(data ?? 0);
}
/** Budget IA mensuel d'un espace (réglage propre à l'espace, sinon celui de son offre). */
export async function aiBudget(wsId: string) {
  const { data: w } = await admin.from("workspaces").select("plan, ai_budget_eur").eq("id", wsId).single();
  return Number(w?.ai_budget_eur ?? LIMITES[w?.plan ?? ""]?.ia ?? PLANS[w?.plan ?? "essai"]?.ai ?? 4);
}
/** Recharges achetées et pas encore consommées (elles ne servent qu'au-delà de l'enveloppe du mois). */
export async function aiBalance(wsId: string) {
  const { data } = await admin.rpc("ai_balance", { p_ws: wsId });
  return Number(data ?? 0);
}
/** Recharges IA vendues : prix payé (HT) → travail IA ajouté (coût pour Bingoo!), environ 50 % de marge. */
export const PACKS: Record<string, { label: string; price: number; credit: number; work: string; prospects?: number; credits?: number }> = {
  s: { label: "Recharge S", price: 7, credit: 3.5, work: "environ 500 e-mails rédigés de plus" },
  m: { label: "Recharge M", price: 17, credit: 9, work: "environ 1 300 e-mails rédigés de plus" },
  l: { label: "Recharge L", price: 35, credit: 19, work: "environ 2 800 e-mails rédigés de plus" },
  p100: { label: "Recharge 100 prospects", price: 19, credit: 0, work: "100 prospects contactés de plus ce mois-ci", prospects: 100 },
  // Crédits Bingoo! (formule Lancer) : modification en plus 1, vidéo pub 10, autre SaaS 60
  c20: { label: "20 crédits", price: 9.99, credit: 0, work: "20 modifications, ou 2 vidéos pub", credits: 20 },
  c60: { label: "60 crédits", price: 24.99, credit: 0, work: "1 autre SaaS, ou 6 vidéos pub", credits: 60 },
  c150: { label: "150 crédits", price: 49.99, credit: 0, work: "2 autres SaaS et 3 vidéos pub", credits: 150 },
};
/** Ce que coûte chaque action en crédits Bingoo! */
export const COUT_CREDITS = { modification: 1, video: 10, video_retouche: 3, saas: 60 };
export async function creditsSolde(wsId: string): Promise<number> {
  const { data } = await admin.rpc("credits_solde", { p_ws: wsId });
  return Number(data ?? 0);
}
/** Dépense des crédits ; sinon 402 avec un message clair (combien il en faut, combien il en reste). */
export async function creditsDepenser(wsId: string, n: number, motif: string) {
  const { data, error } = await admin.rpc("credits_depenser", { p_ws: wsId, p_n: n, p_motif: motif });
  if (error) throw new HttpError(500, "Crédits : " + error.message);
  if (!data) {
    const solde = await creditsSolde(wsId);
    throw new HttpError(402, `Il te faut ${n} crédit${n > 1 ? "s" : ""} (tu en as ${solde}). Recharge tes crédits dans Abonnement.`);
  }
}
/** Rend des crédits (travail qui a échoué). */
export async function creditsRendre(wsId: string, n: number, motif: string) {
  await admin.from("credits").insert({ workspace_id: wsId, delta: n, motif });
}
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

// ---------------------------------------------------------------- Garde-fou du crédit IA (le compte Anthropic rechargé)
// app_secrets : « ia_credit_eur » = ce qui a été mis sur le compte, « ia_credit_depuis » = date de la recharge,
// « ia_reserve_eur » = ce qu'on garde pour les clients. Dépense comptée avec 30 % de marge (le compteur sous-estimait : compte vide le 20/11 alors qu'il annonçait 3 €).
// Sous la réserve : seules les demandes des personnes connectées passent (construire, Atelier…), plus aucune tâche de fond.
// Sous 0,50 € : tout s'arrête proprement, avant que le compte Anthropic ne soit à zéro.
let soldeCache: { at: number; restant: number | null } = { at: 0, restant: null };
export async function iaSolde(): Promise<{ credit: number; depense: number; restant: number; reserve: number } | null> {
  const { data } = await admin.from("app_secrets").select("name, value").in("name", ["ia_credit_eur", "ia_credit_depuis", "ia_reserve_eur", "ia_credit_epuise_at"]);
  const v = (k: string) => (data ?? []).find((x: { name: string }) => x.name === k)?.value ?? null;
  const credit = Number(v("ia_credit_eur")), depuis = v("ia_credit_depuis");
  if (!credit || !depuis) return null;
  const { data: u } = await admin.from("ai_usage").select("cost_eur").gte("at", depuis).limit(100000);
  const depense = (u ?? []).reduce((a: number, r: { cost_eur: number | null }) => a + Number(r.cost_eur ?? 0), 0) * 1.3;
  const epuise = v("ia_credit_epuise_at");
  if (epuise && new Date(epuise).getTime() > new Date(depuis).getTime()) return { credit, depense: credit, restant: 0, reserve: Number(v("ia_reserve_eur") ?? 3) };
  return { credit, depense: Math.round(depense * 100) / 100, restant: Math.round((credit - depense) * 100) / 100, reserve: Number(v("ia_reserve_eur") ?? 3) };
}
/** Prévient Jean par e-mail (adresse dans app_secrets « ia_alerte_email »). Ne bloque jamais l'appelant. */
export async function alerteJean(sujet: string, texte: string) {
  try {
    const { data: to } = await admin.from("app_secrets").select("value").eq("name", "ia_alerte_email").maybeSingle();
    const key = env("RESEND_API_KEY"), dom = PLATFORM_DOMAIN();
    if (!to?.value || !key || !dom) return;
    await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: `Bingoo! <alertes@${dom}>`, to: [to.value], subject: sujet, text: texte }) });
  } catch (_) { /* une alerte ratée ne doit rien casser */ }
}
async function alerteSolde(niveau: string, restant: number) {
  const nom = `ia_alerte_${niveau}`;
  const { data: deja } = await admin.from("app_secrets").select("value").eq("name", nom).maybeSingle();
  const { data: dep } = await admin.from("app_secrets").select("value").eq("name", "ia_credit_depuis").maybeSingle();
  if (deja?.value && dep?.value && new Date(deja.value).getTime() >= new Date(dep.value).getTime()) return; // déjà prévenu depuis la dernière recharge
  await admin.from("app_secrets").upsert({ name: nom, value: new Date().toISOString() });
  const { data: to } = await admin.from("app_secrets").select("value").eq("name", "ia_alerte_email").maybeSingle();
  const key = env("RESEND_API_KEY"), dom = PLATFORM_DOMAIN();
  if (!to?.value || !key || !dom) return;
  const texte = niveau === "bas"
    ? `Il reste environ ${restant.toFixed(2)} € de crédit IA, soit à peu près une construction de SaaS. Recharge le compte Anthropic dès le prochain abonnement encaissé, puis dis-le à Claude pour mettre le compteur à jour.`
    : niveau === "stop"
    ? `Le crédit IA de Bingoo! est presque vide (${restant.toFixed(2)} € restants) : toute l'IA est en pause pour ne pas atteindre zéro. Recharge le compte Anthropic, puis dis-le à Claude pour relancer.`
    : `Il reste ${restant.toFixed(2)} € de crédit IA : les tâches de fond (lecture et classement des SaaS) sont en pause, seules les demandes des utilisateurs passent encore.`;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: `Bingoo! <alertes@${dom}>`, to: [to.value], subject: niveau === "bas" ? "Bingoo! : moins d'1 € de crédit IA, pense à recharger" : niveau === "stop" ? "Bingoo! : crédit IA presque vide, IA en pause" : "Bingoo! : crédit IA bas, tâches de fond en pause", text: texte }) }).catch(() => null);
}
async function gardeCredit(live: boolean) {
  if (Date.now() - soldeCache.at > 30000) soldeCache = { at: Date.now(), restant: (await iaSolde().catch(() => null))?.restant ?? null };
  const r = soldeCache.restant;
  if (r == null) return;
  if (r <= 1 && r > 0.5) await alerteSolde("bas", r);
  if (r <= 0.5) {
    await alerteSolde("stop", r);
    // Décision de Jean (20 nov.) : la pause automatique ne bloque plus les clients (interrupteur « ia_sans_limite » = 1 dans app_secrets).
    // Les demandes des utilisateurs passent jusqu'au vrai solde Anthropic ; seules les tâches de fond restent en pause.
    const { data: sl } = await admin.from("app_secrets").select("value").eq("name", "ia_sans_limite").maybeSingle();
    if (!(sl?.value === "1" && live)) throw new HttpError(503, "Bingoo! fait une courte pause de maintenance sur l'IA. Réessaie un peu plus tard.");
    return;
  }
  const { data } = await admin.from("app_secrets").select("value").eq("name", "ia_reserve_eur").maybeSingle();
  const reserve = Number(data?.value ?? 3);
  if (r <= reserve && !live) { await alerteSolde("reserve", r); throw new HttpError(503, "Tâches IA de fond en pause : crédit réservé aux utilisateurs."); }
}

export async function aiGuard() {
  const ctx = aiCtx.getStore() ?? {};
  await gardeCredit(!!ctx.live);
  if (ctx.essential) return; // réponses de prospects : toujours traitées (plafond par prospect dans pro.ts)
  // Plafonds réglables sans redéploiement (app_secrets « ia_plafond_jour », « ia_plafond_explorer », en euros par jour)
  const { data: regl } = await admin.from("app_secrets").select("name, value").in("name", ["ia_plafond_jour", "ia_plafond_explorer", "ia_plafond_verif", "catalogue_ia", "ia_plafond_apps"]);
  const reg = (k: string) => { const v = (regl ?? []).find((x: { name: string }) => x.name === k)?.value; return v != null && v !== "" && !isNaN(Number(v)) ? Number(v) : null; };
  const cap = reg("ia_plafond_jour") ?? Number(env("AI_DAILY_CAP_EUR", "12"));
  const ws = ctx.ws;
  if (!ws && String(ctx.feature ?? "").startsWith("app/")) {
    // IA des SaaS construits par Bingoo! (utilisée par leurs clients) : enveloppe à part, plafonnée aussi par application et par compte
    // Réglable sans redéploiement : app_secrets « ia_plafond_apps » (euros par jour, toutes les apps ensemble)
    const capApps = reg("ia_plafond_apps") ?? Number(env("AI_APPS_CAP_EUR", "0.5"));
    const { data } = await admin.from("ai_usage").select("cost_eur").is("workspace_id", null).like("feature", "app/%").gte("at", dayStart());
    if ((data ?? []).reduce((a, r) => a + Number(r.cost_eur ?? 0), 0) >= capApps) throw new HttpError(503, "L'assistant IA est très demandé aujourd'hui, réessaie dans quelques heures.");
    return;
  }
  if (!ws && ctx.feature === "explorer/verif") {
    // Vérification « Bingoo! sait-il le construire ? » : prioritaire (c'est ce qui décide ce qu'on montre), enveloppe à part et petite
    const capV = reg("ia_plafond_verif") ?? 0.3;
    const { data } = await admin.from("ai_usage").select("cost_eur").is("workspace_id", null).eq("feature", "explorer/verif").gte("at", dayStart());
    if ((data ?? []).reduce((a, r) => a + Number(r.cost_eur ?? 0), 0) >= capV) throw new HttpError(503, "Vérification des SaaS en pause jusqu'à demain (enveloppe du jour atteinte).");
    return;
  }
  if (!ws && String(ctx.feature ?? "").startsWith("explorer/") && reg("catalogue_ia") !== 1) {
    // Ajout de nouveaux SaaS au catalogue (lecture des sites, amorçage, niches, sous-niches, enrichissements) : SANS IA.
    // Chaque étape bascule sur sa version sans IA (mots-clés, prix affichés, signes d'un SaaS). Rallumer : app_secrets catalogue_ia = 1.
    throw new HttpError(503, "Catalogue : lecture sans IA");
  }
  if (!ws && String(ctx.feature ?? "").startsWith("explorer/")) {
    // Base Explorer (lecture des SaaS, niches, recherche) : enveloppe à part, pour ne pas épuiser celle des outils gratuits
    const capEx = reg("ia_plafond_explorer") ?? Number(env("AI_EXPLORER_CAP_EUR", "6"));
    const { data } = await admin.from("ai_usage").select("cost_eur").is("workspace_id", null).like("feature", "explorer/%").neq("feature", "explorer/verif").gte("at", dayStart());
    if ((data ?? []).reduce((a, r) => a + Number(r.cost_eur ?? 0), 0) >= capEx) throw new HttpError(503, "Lecture de la base Explorer en pause jusqu'à demain (enveloppe du jour atteinte).");
    return;
  }
  if (!ws) {
    // Outils gratuits et travaux de la plateforme : enveloppe à part, qui ne peut pas priver les clients
    const freeCap = Number(env("AI_FREE_CAP_EUR", "2"));
    const { data } = await admin.from("ai_usage").select("cost_eur").is("workspace_id", null).not("feature", "like", "explorer/%").gte("at", dayStart());
    if ((data ?? []).reduce((a, r) => a + Number(r.cost_eur ?? 0), 0) >= freeCap) throw new HttpError(503, "L'outil gratuit est très demandé aujourd'hui : crée ton compte Bingoo! pour y accéder tout de suite.");
    return;
  }
  // Offre gratuite : seuls les aperçus d'idée appellent l'IA, et jamais plus de 2 centimes par mois (vérifié ici, côté serveur)
  {
    const { data: wp } = await admin.from("workspaces").select("plan").eq("id", ws).maybeSingle();
    // Premier outil ou jeu offert : sa construction, sa vérification et quelques retouches, dans une enveloppe de 50 centimes
    if (wp?.plan === "essai" && /^construire/.test(String(ctx.feature ?? ""))) {
      const { data: offerts } = await admin.from("saas_apps").select("id, o1:spec->offert, o2:brouillon->offert").eq("workspace_id", ws).limit(3);
      if (!(offerts ?? []).some((a: any) => a.o1 === true || a.o2 === true)) {
        // Pas encore d'application : la construction du projet offert démarre juste après (vérifiée par la route)
        const { count } = await admin.from("saas_projets").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("data->>offert", "true");
        if (!(count ?? 0)) throw new HttpError(402, "Ça fait partie des offres payantes : choisis une offre dans Abonnement pour que Bingoo! s'en occupe.");
      }
      if ((await aiSpent(ws)) > Number(env("OUTIL_OFFERT_EUR", "0.5"))) throw new HttpError(402, "Tu as utilisé tout ce qui était offert avec ton premier projet. Pour continuer à le modifier, choisis une offre dans Abonnement : il reste en ligne.");
    } else
    if (wp?.plan === "essai") {
      if (!GRATUIT_IA.test(String(ctx.feature ?? ""))) throw new HttpError(402, "Ça fait partie des offres payantes : choisis une offre dans Abonnement pour que Bingoo! s'en occupe.");
      // Garde-fou contre les visiteurs en série : au-delà de 4 € d'aperçus gratuits dans la journée (toute la plateforme), on demande un compte
      const { data: jour } = await admin.from("ai_usage").select("cost_eur").eq("feature", "explorer/idee-apercu").gte("at", dayStart()).limit(5000);
      if ((jour ?? []).reduce((x, r) => x + Number(r.cost_eur ?? 0), 0) >= Number(env("APERCUS_GRATUITS_JOUR_EUR", "4"))) throw new HttpError(403, "Beaucoup de monde aujourd'hui : crée ton compte gratuit pour voir l'aperçu de ton idée.");
      if ((await aiSpent(ws)) + 0.008 > PLANS.essai.ai) throw new HttpError(402, "Tu as utilisé tes aperçus gratuits du mois. Ils reviennent le 1er du mois, ou choisis une offre pour construire tout de suite.");
    }
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
    // « ia_sans_limite » = 1 : les demandes des utilisateurs ne sont plus arrêtées par le plafond de la plateforme
    // (leur seule limite est la leur : modifications du mois, crédits, budget IA de leur formule). Les tâches de fond, si.
    let sansLimite = false;
    if (ctx.live && spent >= cap) { const { data: sl } = await admin.from("app_secrets").select("value").eq("name", "ia_sans_limite").maybeSingle(); sansLimite = sl?.value === "1"; }
    if ((spent >= cap && !sansLimite) || (!ctx.live && spent >= cap * 0.7)) throw new HttpError(503, "Pause de sécurité : le plafond quotidien d'IA de la plateforme est atteint. Reprise automatique dans la nuit (à minuit UTC).");
  }
  // Construire, réparer, modifier un SaaS : déjà limités par les quotas mensuels de la formule
  // (3 ou 10 constructions, 30 ou 100 modifications) ; ils ne doivent pas s'arrêter à mi-chemin faute d'enveloppe.
  if (/^construire|^video/.test(String(ctx.feature ?? ""))) {
    // Une construction ne doit pas s'arrêter à mi-chemin : seulement un plafond dur, très au-dessus de l'usage normal
    // (les constructions et modifications en plus sont payées en crédits).
    const [spent, budget, extra] = await Promise.all([aiSpent(ws), aiBudget(ws), aiBalance(ws)]);
    if (spent >= budget * 2.5 + extra) throw new HttpError(402, "Tu as atteint la limite d'utilisation de l'IA de ce mois. Elle repart le 1er du mois.");
    return;
  }
  // Les constructions ont leur propre quota : elles ne comptent pas dans l'enveloppe des autres usages
  const [spent, budget] = await Promise.all([aiSpentUsage(ws), aiBudget(ws)]);
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
    // cacheSystem : consigne longue et identique d'un appel à l'autre (moteur de pages), relue à 10 % du prix
    system: opts.system && opts.cacheSystem ? [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }] : opts.system ?? "Tu es un expert en développement commercial B2B en France. Réponds en français.",
    // Images jointes (adresses publiques) : l'IA les voit avant de lire la demande
    messages: [{ role: "user", content: opts.images?.length ? [...opts.images.slice(0, 4).map((url) => ({ type: "image", source: { type: "url", url } })), { type: "text", text: prompt }] : prompt }],
  };
  if (opts.tools?.length) base.tools = opts.tools;
  const text = (d: { content?: Block[] }) => (d.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  // Pas de réflexion étendue : elle consomme le budget de sortie et peut couper la réponse
  base.thinking = { type: "disabled" };
  // Les adresses réellement renvoyées par la recherche web (pour écarter un lien qui n'en vient pas)
  // deno-lint-ignore no-explicit-any
  const garder = (d: any) => { if (!opts.sources) return; for (const b of d?.content ?? []) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const x of b.content) if (x?.url) opts.sources.push(String(x.url));
    for (const c of b.citations ?? []) if (c?.url) opts.sources.push(String(c.url));
  } };
  const run = async () => {
    let r = await call(base, key);
    if (r.ok) garder(r.data);
    // Selon le modèle, « disabled » est refusé : Sonnet 5.5 coupe la réflexion préalable avec « between_tools »
    // (sinon elle mange le budget de sortie et le temps de la fonction) ; en dernier recours, le réglage par défaut
    if (!r.ok && r.status === 400 && /thinking/i.test(r.data?.error?.message ?? "")) {
      base.thinking = { type: "between_tools" };
      r = await call(base, key);
      if (!r.ok && r.status === 400 && /thinking/i.test(r.data?.error?.message ?? "")) { delete base.thinking; r = await call(base, key); }
    }
    for (let i = 0; i < 3 && r.ok && r.data?.stop_reason === "pause_turn"; i++) {
      base.messages = [{ role: "user", content: prompt }, { role: "assistant", content: r.data.content }];
      r = await call(base, key);
      if (r.ok) garder(r.data);
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
    if (/credit balance/i.test(msg)) {
      // Le vrai solde Anthropic fait foi : on note l'épuisement (compteur à zéro jusqu'à la prochaine recharge) et on prévient Jean une fois
      await admin.from("app_secrets").upsert({ name: "ia_credit_epuise_at", value: new Date().toISOString() }).then(() => null, () => null);
      soldeCache = { at: Date.now(), restant: 0 };
      await alerteSolde("stop", 0).catch(() => null);
      throw new HttpError(503, "Bingoo! fait une courte pause de maintenance sur l'IA. Réessaie un peu plus tard."); // Jean est prévenu par e-mail
    }
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
