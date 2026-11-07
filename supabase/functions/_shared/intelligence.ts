// Bingoo! Intelligence : ce que la prospection apprend, transformé en actions (FAQ, corrections du site, segments à viser).
import { HttpError } from "./http.ts";
import { admin, askJson, log, type Workspace } from "./core.ts";

const CONTACTED = ["envoye", "repondu", "rdv", "client", "refus"];
const POSITIVE = ["interesse", "question", "prix", "rappel"];

/** Lecture légère du site : accueil + pages FAQ, tarifs, à propos (texte visible uniquement). */
async function siteText(url: string) {
  const get = async (u: string) => {
    try {
      const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; Bingoo!/1.0)", "accept-language": "fr-FR,fr" }, signal: AbortSignal.timeout(12000) });
      return r.ok && (r.headers.get("content-type") ?? "").includes("html") ? (await r.text()).slice(0, 300000) : "";
    } catch { return ""; }
  };
  const strip = (h: string) => h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
  const home = await get(url);
  if (!home) return "";
  const origin = new URL(url).origin;
  const links = [...new Set([...home.matchAll(/href=["']([^"'#]{1,200})["']/gi)].map((m) => { try { return new URL(m[1], origin).href; } catch { return ""; } })
    .filter((h) => h.startsWith(origin) && /(faq|questions|tarif|prix|pricing|propos|about|offre|services|fonctionnalit|features|securite|integration|clients)/i.test(h)))].slice(0, 3);
  const pages = await Promise.all(links.map(get));
  return [`# Accueil\n${strip(home).slice(0, 4500)}`, ...pages.map((h, i) => h && `# ${links[i]}\n${strip(h).slice(0, 1800)}`)].filter(Boolean).join("\n\n").slice(0, 9000);
}

export type Segment = { key: string; label: string; contacted: number; replied: number; positive: number; rdv: number; clients: number; reply_rate: number; positive_rate: number };

/** Statistiques calculées (pas d'IA) : taux de réponse et de RDV par cible. */
export async function segmentStats(ws: Workspace) {
  const { data: ps } = await admin.from("prospects").select("id, target, activity, status").eq("workspace_id", ws.id).in("status", CONTACTED).limit(10000);
  const { data: reps } = await admin.from("replies").select("prospect_id, class").eq("workspace_id", ws.id).limit(5000);
  const pos = new Set((reps ?? []).filter((r) => POSITIVE.includes(r.class)).map((r) => r.prospect_id));
  const labels = new Map((ws.targets ?? []).map((t) => [t.id, t.label]));
  const by = new Map<string, Segment>();
  for (const p of ps ?? []) {
    const key = p.target || `act:${p.activity || "Autres"}`;
    const s = by.get(key) ?? { key, label: labels.get(p.target) ?? (p.activity || "Autres"), contacted: 0, replied: 0, positive: 0, rdv: 0, clients: 0, reply_rate: 0, positive_rate: 0 };
    s.contacted++;
    if (["repondu", "rdv", "client", "refus"].includes(p.status)) s.replied++;
    if (pos.has(p.id) || ["rdv", "client"].includes(p.status)) s.positive++;
    if (["rdv", "client"].includes(p.status)) s.rdv++;
    if (p.status === "client") s.clients++;
    by.set(key, s);
  }
  const segs = [...by.values()].map((s) => ({ ...s, reply_rate: s.contacted ? Math.round((s.replied / s.contacted) * 1000) / 10 : 0, positive_rate: s.contacted ? Math.round((s.positive / s.contacted) * 1000) / 10 : 0 }))
    .sort((a, b) => b.positive_rate - a.positive_rate || b.contacted - a.contacted);
  return segs;
}

type Intel = {
  verdict: string;
  faq: { question: string; frequence: number; source: string; reponse: string; sur_le_site: string; ou: string }[];
  objections: { objection: string; frequence: number; source: string; reponse: string; correction: { page: string; quoi: string; texte: string } }[];
  segments: { conseil: string; concentrer: string[]; ralentir: string[] };
  messages: { ce_qui_marche: string[]; a_changer: string[] };
  pages: { titre: string; pourquoi: string; contenu: string[] }[];
  actions: { action: string; impact: "fort" | "moyen"; ou: string }[];
};

export async function intelligence(ws: Workspace) {
  const segs = await segmentStats(ws);
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  const { data: reps } = await admin.from("replies").select("class, summary, body, prospects(target, activity)").eq("workspace_id", ws.id)
    .not("class", "in", "(absence,stop)").gte("created_at", since).order("created_at", { ascending: false }).limit(120);
  const { data: mts } = await admin.from("meetings").select("followup, company").eq("workspace_id", ws.id).not("followup", "is", null).order("starts_at", { ascending: false }).limit(30);
  const { data: qs } = await admin.from("quotes").select("status").eq("workspace_id", ws.id).neq("status", "brouillon");
  const { data: camps } = await admin.from("campaigns").select("name, variants, winner, analysis").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(5);

  let site = "";
  if (ws.website) site = await siteText(ws.website);

  const replies = (reps ?? []).map((r) => `[${r.class}] ${r.summary} — « ${String(r.body).replace(/\s+/g, " ").slice(0, 280)} »`).join("\n");
  const meetings = (mts ?? []).map((m) => `${m.company} : besoin ${m.followup?.besoin ?? "?"} ; objections ${(m.followup?.objections ?? []).join(", ")}`).join("\n");
  const quotes = { envoyes: (qs ?? []).length, signes: (qs ?? []).filter((q) => q.status === "signe").length, refuses: (qs ?? []).filter((q) => q.status === "refuse").length };
  const realData = (reps ?? []).length >= 5;
  const pr = ws.profile ?? {};

  const a = await askJson<Intel>(`Tu es directeur commercial et consultant en conversion B2B. Analyse ce que la prospection de ${pr.nom ?? ws.name} a appris, et transforme-le en actions concrètes.

ENTREPRISE : ${pr.resume ?? ""} — Offre : ${pr.offre ?? ""} — Ce qui la distingue : ${pr.differenciation ?? ""} — Preuves : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
Cibles : ${(ws.targets ?? []).map((t) => `${t.label} (${t.interlocuteur ?? ""})`).join(" ; ")}
Si l'entreprise vend un logiciel / SaaS, pense aux sujets propres au SaaS : intégrations, sécurité et RGPD, migration depuis l'outil actuel, prix par utilisateur, essai gratuit, pages comparatives (« alternative à… »), cas clients chiffrés. Sinon, pense aux sujets d'une entreprise de services : zone d'intervention, délais, références, certifications, devis.

RÉSULTATS PAR SEGMENT (calculés, fiables) : ${JSON.stringify(segs.slice(0, 15).map(({ label, contacted, replied, positive, rdv, clients, reply_rate, positive_rate }) => ({ label, contacted, replied, positive, rdv, clients, reply_rate, positive_rate })))}
DEVIS : ${JSON.stringify(quotes)}
CAMPAGNES : ${JSON.stringify((camps ?? []).map((c) => ({ nom: c.name, versions: c.variants, gagnante: c.winner, verdict: c.analysis?.verdict }))).slice(0, 2500)}

RÉPONSES DES PROSPECTS (${(reps ?? []).length}, les plus récentes d'abord) :
${replies || "aucune pour l'instant"}

APRÈS LES RENDEZ-VOUS :
${meetings || "aucun compte rendu"}

FICHE « CE QUE KAIRO PEUT RÉPONDRE » : ${ws.knowledge ? ws.knowledge.slice(0, 2500) : "vide"}

CONTENU ACTUEL DU SITE (${ws.website || "pas de site"}) :
${site || "(non lu)"}

${realData ? "Il y a assez de réponses : appuie-toi d'abord sur elles. Compte combien de fois chaque question ou objection revient (frequence), source = \"réponses\"." : "Il y a encore peu de réponses : complète avec les questions et objections les plus probables pour ces cibles, en les marquant source = \"hypothèse\" et frequence = 0. Ne les présente jamais comme constatées."}

Règles :
- N'invente aucun fait, chiffre, client, prix ou certification. Si une réponse demande une information que tu n'as pas, écris-la entre crochets à compléter, ex. [délai d'intervention].
- Pour chaque question : la réponse à publier dans la FAQ (2 à 4 phrases), et si le site y répond déjà (\"oui\", \"partiellement\", \"non\") d'après son contenu.
- Pour chaque objection : la réponse à donner en rendez-vous, et la correction à faire sur le site (quelle page, quoi changer, texte prêt à coller).
- segments : ne conclus qu'avec au moins 15 prospects contactés dans un segment ; sinon dis qu'il faut plus d'envois.
- pages : 0 à 3 pages manquantes sur le site qui lèveraient le plus d'objections (titre, pourquoi, sections).
- actions : 3 à 6, de la plus rentable à la moins rentable.

Format :
{"verdict": "3 phrases : ce que tes prospects te disent, et la priorité",
 "faq": [{"question": "", "frequence": 0, "source": "réponses|hypothèse", "reponse": "", "sur_le_site": "oui|partiellement|non", "ou": "page où l'ajouter"}],
 "objections": [{"objection": "", "frequence": 0, "source": "réponses|hypothèse", "reponse": "", "correction": {"page": "", "quoi": "", "texte": ""}}],
 "segments": {"conseil": "", "concentrer": [""], "ralentir": [""]},
 "messages": {"ce_qui_marche": [""], "a_changer": [""]},
 "pages": [{"titre": "", "pourquoi": "", "contenu": [""]}],
 "actions": [{"action": "", "impact": "fort|moyen", "ou": "site|prospection|rendez-vous|offre"}]}`,
    { maxTokens: 9000, system: "Tu es un directeur commercial B2B français, factuel. Tu distingues ce qui est constaté de ce qui est supposé, et tu n'inventes rien." });
  if (!a || typeof a !== "object" || (!a.verdict && !a.faq)) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  const out = { ...a, stats: segs, data: { replies: (reps ?? []).length, meetings: (mts ?? []).length, quotes, site_read: !!site }, real: realData };
  const now = new Date().toISOString();
  await admin.from("workspaces").update({ intelligence: out, intelligence_at: now }).eq("id", ws.id);
  await log(ws.id, "intelligence", `Analyse des apprentissages : ${(a.faq ?? []).length} questions, ${(a.objections ?? []).length} objections`);
  return { intelligence: out, at: now };
}

/** Ce que Bingoo! a appris, réinjecté dans la rédaction des e-mails et des réponses. */
export function learned(ws: Workspace & { intelligence?: Intel & { real?: boolean } }) {
  const i = ws.intelligence;
  if (!i?.real) return "";
  const obj = (i.objections ?? []).filter((o) => o.source === "réponses").slice(0, 3).map((o) => `« ${o.objection} » → ${o.reponse}`);
  const faq = (i.faq ?? []).filter((f) => f.source === "réponses" && !/\[/.test(f.reponse)).slice(0, 3).map((f) => `${f.question} → ${f.reponse}`);
  if (!obj.length && !faq.length) return "";
  return `\n\nCe que les prospects disent le plus souvent (appris des vraies réponses) :${obj.length ? `\nObjections : ${obj.join(" | ")}` : ""}${faq.length ? `\nQuestions : ${faq.join(" | ")}` : ""}\nUtilise-le pour anticiper sans le citer mot pour mot.`;
}
