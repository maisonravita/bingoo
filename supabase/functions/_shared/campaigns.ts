// Directeur de campagne : campagnes nommées, test A/B, statistiques (ouvertures, clics, réponses, RDV),
// analyse IA, et veille des campagnes publicitaires des concurrents.
import { HttpError } from "./http.ts";
import { admin, askJson, log, type Workspace } from "./core.ts";

export type Variant = { key: string; nom?: string; angle: string; objet?: string };
export type Campaign = { id: string; workspace_id: string; name: string; target_id: string; goal: string; status: string; followups: boolean; variants: Variant[]; winner: string | null };

const GOALS: Record<string, string> = { rdv: "obtenir un rendez-vous de 15 à 20 minutes", devis: "obtenir une demande de devis", visite: "obtenir une visite sur place", essai: "obtenir un essai ou une démonstration" };
const CWEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];

function hashId(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

/** Variante attribuée à un prospect : la gagnante si elle est connue, sinon une répartition stable. */
export function pickVariant(c: Campaign, prospectId: string): Variant | null {
  const vs = (c.variants ?? []).filter((v) => v.angle);
  if (!vs.length) return null;
  return vs.find((v) => v.key === c.winner) ?? vs[hashId(prospectId) % vs.length];
}

export async function campaignOf(id: string | null | undefined): Promise<Campaign | null> {
  if (!id) return null;
  const { data } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  return (data as Campaign) ?? null;
}

export function goalText(goal: string) { return GOALS[goal] ?? GOALS.rdv; }

/** L'IA propose deux versions (A/B) pour une cible. */
export async function suggestVariants(ws: Workspace, targetId: string, goal: string) {
  const t = (ws.targets ?? []).find((x) => x.id === targetId);
  if (!t) throw new HttpError(400, "Choisis une cible");
  const pr = ws.profile ?? {};
  const r = await askJson<{ variants: Variant[]; conseil?: string }>(`Prépare un test A/B pour une campagne de prospection par e-mail.
Entreprise : ${pr.nom ?? ws.name} — ${pr.offre ?? ""} — ce qui la distingue : ${pr.differenciation ?? ""} — preuves : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
Cible : ${t.label} (interlocuteur : ${t.interlocuteur ?? ""}, bénéficiaires : ${t.pour_qui ?? ""}). Pourquoi ils ont besoin de l'offre : ${t.pourquoi ?? ""}
Objectif : ${goalText(goal)}.
Propose 2 versions réellement différentes (pas deux formulations du même argument) : par exemple A = gain concret / B = risque évité, ou A = preuve / B = question.
Pour chacune : nom court, angle (2 phrases qui guideront la rédaction de chaque e-mail), objet d'e-mail (3 à 7 mots, sans majuscules partout, sans point d'exclamation). N'invente aucun fait.
Format : {"variants": [{"key": "A", "nom": "", "angle": "", "objet": ""}, {"key": "B", "nom": "", "angle": "", "objet": ""}], "conseil": "une phrase sur ce que ce test va t'apprendre"}`,
    { fast: true, maxTokens: 2000 });
  const variants = (r.variants ?? []).slice(0, 3).map((v, i) => ({ key: "ABC"[i], nom: String(v.nom ?? "").slice(0, 60), angle: String(v.angle ?? "").slice(0, 500), objet: String(v.objet ?? "").slice(0, 120) })).filter((v) => v.angle);
  if (!variants.length) throw new HttpError(502, "L'IA n'a pas proposé de versions, réessaie");
  return { variants, conseil: String(r.conseil ?? "") };
}

/** Crée la campagne et y rattache des prospects de la cible. */
export async function createCampaign(ws: Workspace, b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 100);
  const target = String(b.target_id ?? "");
  if (!name) throw new HttpError(400, "Donne un nom à la campagne");
  if (!(ws.targets ?? []).some((t) => t.id === target)) throw new HttpError(400, "Choisis une cible");
  const variants = (Array.isArray(b.variants) ? b.variants : []).slice(0, 3).map((v: Variant, i: number) => ({ key: "ABC"[i], nom: String(v.nom ?? "").slice(0, 60), angle: String(v.angle ?? "").slice(0, 500), objet: String(v.objet ?? "").slice(0, 120) })).filter((v) => v.angle);
  const goal = GOALS[String(b.goal)] ? String(b.goal) : "rdv";
  const ends = /^\d{4}-\d{2}-\d{2}$/.test(String(b.ends_on ?? "")) ? String(b.ends_on) : null;
  const { data: c, error } = await admin.from("campaigns").insert({ workspace_id: ws.id, name, target_id: target, goal, variants, followups: b.followups !== false, ends_on: ends }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  const n = Math.min(Math.max(Number(b.count) || 50, 1), 500);
  const { data: ps } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("target", target).is("campaign_id", null)
    .in("status", ["pret", "nouveau", "sans_email"]).order("score", { ascending: false, nullsFirst: false }).limit(n);
  const ids = (ps ?? []).map((x) => x.id);
  for (let i = 0; i < ids.length; i += 200) await admin.from("prospects").update({ campaign_id: c.id }).in("id", ids.slice(i, i + 200));
  await log(ws.id, "campagne", `Campagne « ${name} » lancée : ${ids.length} prospects, ${variants.length > 1 ? `test A/B sur ${variants.length} versions` : "une version"}`);
  return { id: c.id, assigned: ids.length };
}

// ---------------------------------------------------------------- Statistiques
type Row = { prospect_id: string; variant: string; status: string; opened_at: string | null; clicked_at: string | null; bounced: boolean; prospects: { status: string } | null };
type Stat = { sent: number; opened: number; clicked: number; bounced: number; replied: number; rdv: number; clients: number };
export async function campaignStats(campaignId: string): Promise<Record<string, Stat>> {
  const { data } = await admin.from("messages").select("prospect_id, variant, status, opened_at, clicked_at, bounced, prospects(status)").eq("campaign_id", campaignId).eq("status", "envoye").limit(5000);
  // Une ligne par prospect contacté (premier message + relances confondus)
  const per = new Map<string, { v: string; opened: boolean; clicked: boolean; bounced: boolean; st: string }>();
  for (const m of (data ?? []) as unknown as Row[]) {
    const cur = per.get(m.prospect_id) ?? { v: m.variant || "A", opened: false, clicked: false, bounced: false, st: m.prospects?.status ?? "" };
    cur.opened ||= !!m.opened_at; cur.clicked ||= !!m.clicked_at; cur.bounced ||= !!m.bounced;
    per.set(m.prospect_id, cur);
  }
  const by: Record<string, Stat> = {};
  for (const x of per.values()) {
    const s = (by[x.v] ??= { sent: 0, opened: 0, clicked: 0, bounced: 0, replied: 0, rdv: 0, clients: 0 });
    s.sent++; if (x.opened) s.opened++; if (x.clicked) s.clicked++; if (x.bounced) s.bounced++;
    if (["repondu", "rdv", "client", "refus"].includes(x.st)) s.replied++;
    if (["rdv", "client"].includes(x.st)) s.rdv++;
    if (x.st === "client") s.clients++;
  }
  return by;
}

/** Désigne une gagnante quand l'écart est net (test de proportions, ~95 % unilatéral) et qu'il y a assez d'envois. */
export function decideWinner(stats: Record<string, { sent: number; replied: number; rdv: number }>, min = 25) {
  const ks = Object.keys(stats).filter((k) => stats[k].sent >= min);
  if (ks.length < 2) return null;
  const rate = (k: string) => stats[k].replied / stats[k].sent;
  ks.sort((a, b) => rate(b) - rate(a));
  const [a, b] = ks; const n1 = stats[a].sent, n2 = stats[b].sent, p1 = rate(a), p2 = rate(b);
  const p = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)) || 1;
  return (p1 - p2) / se > 1.65 ? a : null;
}

export async function analyzeCampaign(ws: Workspace, id: string) {
  const c = await campaignOf(id);
  if (!c || c.workspace_id !== ws.id) throw new HttpError(404, "Campagne introuvable");
  const stats = await campaignStats(id);
  const winner = c.winner ?? decideWinner(stats);
  const t = (ws.targets ?? []).find((x) => x.id === c.target_id);
  const total = Object.values(stats).reduce((s, v) => s + v.sent, 0);
  let analysis: Record<string, unknown>;
  if (total < 5) {
    analysis = { verdict: "Pas encore assez d'envois pour juger : il faut au moins une vingtaine d'e-mails par version.", ce_qui_marche: [], a_changer: [], prochaine_etape: "Laisse tourner la campagne et valide les messages en attente." };
  } else {
    analysis = await askJson<Record<string, unknown>>(`Analyse cette campagne de prospection B2B comme un directeur commercial.
Campagne : ${c.name} — cible : ${t?.label ?? ""} — objectif : ${goalText(c.goal)}
Versions : ${JSON.stringify(c.variants)}
Résultats par version (envoyés, ouverts, cliqués, rebonds, réponses, RDV, clients) : ${JSON.stringify(stats)}
${winner ? `Version gagnante statistiquement : ${winner}.` : "Aucune version n'est encore gagnante de façon fiable."}
Repères : en prospection à froid B2B, 2 à 8 % de réponses est courant ; les ouvertures sont peu fiables (bloqueurs d'images, Apple) : fie-toi d'abord aux réponses et aux RDV.
Sois honnête sur la taille de l'échantillon. Ne conclus pas sur moins de 25 envois par version.
Format : {"verdict": "2 phrases", "ce_qui_marche": [""], "a_changer": [""], "prochaine_etape": "une action concrète", "nouvelle_version": {"nom": "", "angle": "", "objet": ""}}`, { fast: true, maxTokens: 2000 });
  }
  await admin.from("campaigns").update({ analysis, analyzed_at: new Date().toISOString(), winner }).eq("id", id);
  return { stats, winner, analysis };
}

/** Appelé par le pilote : fixe la gagnante sans IA quand l'écart devient net. */
export async function autoWinners(ws: Workspace) {
  const { data } = await admin.from("campaigns").select("*").eq("workspace_id", ws.id).eq("status", "active").is("winner", null);
  let n = 0;
  for (const c of data ?? []) {
    if ((c.variants ?? []).length < 2) continue;
    const w = decideWinner(await campaignStats(c.id));
    if (w) { await admin.from("campaigns").update({ winner: w }).eq("id", c.id); await log(ws.id, "campagne", `« ${c.name} » : la version ${w} gagne, elle est maintenant envoyée à tous`); n++; }
  }
  return n;
}

// ---------------------------------------------------------------- Suivi Resend (ouvertures, clics, rebonds)
export async function trackEvent(type: string, d: Record<string, unknown>) {
  const id = String(d.email_id ?? d.id ?? "");
  if (!id) return { skipped: "sans id" };
  const { data: m } = await admin.from("messages").select("id, opens, clicks, opened_at, clicked_at, prospect_id, workspace_id").eq("provider_id", id).maybeSingle();
  if (!m) return { skipped: "message inconnu" };
  const now = new Date().toISOString();
  if (type === "email.opened") await admin.from("messages").update({ opens: (m.opens ?? 0) + 1, opened_at: m.opened_at ?? now }).eq("id", m.id);
  if (type === "email.clicked") await admin.from("messages").update({ clicks: (m.clicks ?? 0) + 1, clicked_at: m.clicked_at ?? now, opened_at: m.opened_at ?? now }).eq("id", m.id);
  if (type === "email.bounced") {
    await admin.from("messages").update({ bounced: true }).eq("id", m.id);
    await admin.from("prospects").update({ email: "", status: "sans_email", channel: "", enrich_level: 1, enrich_note: "L'adresse e-mail n'existe plus (rebond) : nouvelle enquête nécessaire" }).eq("id", m.prospect_id);
    await admin.from("messages").update({ status: "ignore", error: "Adresse en rebond" }).eq("prospect_id", m.prospect_id).eq("status", "brouillon");
    await log(m.workspace_id, "envoi", "Adresse en rebond retirée, le prospect repart en enquête");
  }
  if (type === "email.complained") {
    await admin.from("prospects").update({ status: "refus", next_action_at: null, next_action: "" }).eq("id", m.prospect_id);
    await admin.from("messages").update({ status: "ignore", error: "Signalé comme indésirable" }).eq("prospect_id", m.prospect_id).eq("status", "brouillon");
    const { data: pr } = await admin.from("prospects").select("email").eq("id", m.prospect_id).maybeSingle();
    if (pr?.email) await admin.from("suppressions").upsert({ email: pr.email.toLowerCase(), source: "signalement indésirable" }, { onConflict: "email", ignoreDuplicates: true });
  }
  return { ok: true, type };
}

// ---------------------------------------------------------------- Campagnes des concurrents
export async function competitorAds(ws: Workspace, id: string) {
  const { data: c } = await admin.from("competitors").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  const host = (() => { try { return new URL(c.url).hostname.replace(/^www\./, ""); } catch { return c.url; } })();
  const nom = c.name || c.summary?.nom || host;
  const me = ws.profile ?? {};
  const a = await askJson<Record<string, unknown>>(`Tu es analyste en veille marketing. Trouve les campagnes publicitaires et marketing actuelles de ce concurrent en France, puis analyse-les pour ${me.nom ?? ws.name} (${me.offre ?? ""}).
Concurrent : ${nom} (${c.url})

Cherche (6 recherches maximum) :
1. Ses publicités actives ou récentes : Bibliothèque publicitaire Meta (Facebook / Instagram), bibliothèque d'annonces LinkedIn, Centre de transparence des annonces Google. Cite le message, l'offre, le format et depuis quand.
2. Ses autres actions marketing des 6 derniers mois : promotions et offres de lancement, salons et événements, webinaires, livres blancs, newsletters, partenariats, campagnes presse ou radio, sponsoring.
Les bibliothèques publicitaires sont souvent mal indexées par les moteurs de recherche : si tu ne trouves rien, dis-le simplement et donne le lien direct de recherche pour que l'utilisateur vérifie lui-même.

Règles : n'invente aucune publicité, aucun budget, aucun chiffre. Les budgets et résultats ne sont pas publics : ne les estime pas. Chaque élément porte sa source.
Format :
{"pubs": [{"plateforme": "meta|linkedin|google|autre", "message": "", "offre": "", "format": "image|vidéo|carrousel|texte", "cible": "ce qu'on peut déduire du message", "depuis": "", "source": ""}],
 "actions": [{"type": "promotion|salon|webinaire|contenu|newsletter|partenariat|presse|autre", "titre": "", "date": "", "source": ""}],
 "liens_verification": [{"plateforme": "", "url": ""}],
 "angles": ["les arguments qu'ils martèlent"],
 "ce_qu_ils_poussent": "l'offre ou le segment qu'ils mettent en avant en ce moment",
 "angles_libres": ["les angles que personne n'occupe et que tu peux prendre"],
 "contre_campagne": {"angle": "", "objet_email": "", "accroche": ""},
 "recommandations": [""],
 "synthese": "3 phrases"}`,
    { maxTokens: 9000, tools: CWEB(6), system: "Tu es analyste senior en veille marketing B2B. Tu cites tes sources et tu n'inventes rien. Réponds en français." });
  if (!a || typeof a !== "object" || (!a.synthese && !a.pubs && !a.actions)) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  const encoded = encodeURIComponent(nom);
  const fallback = [
    { plateforme: "Meta (Facebook, Instagram)", url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=FR&q=${encoded}` },
    { plateforme: "LinkedIn", url: `https://www.linkedin.com/ad-library/search?keyword=${encoded}` },
    { plateforme: "Google", url: `https://adstransparency.google.com/?region=FR&domain=${encodeURIComponent(host)}` },
  ];
  a.liens_verification = fallback;
  const now = new Date().toISOString();
  await admin.from("competitors").update({ ads: a, ads_at: now }).eq("id", c.id);
  await log(ws.id, "veille", `${nom} : campagnes analysées`);
  return { ads: a, at: now };
}
