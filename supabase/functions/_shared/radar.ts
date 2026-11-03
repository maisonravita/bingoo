// Kairo Radar : opportunités commerciales réelles et sourcées.
// - Appels d'offres : API officielle du BOAMP (DILA), filtrés par la zone puis par l'IA (pertinence pour l'offre).
// - Croissance / recrutements : recherche web sourcée (une URL par signal) + signaux du registre déjà connus.
// Rien n'est inventé : chaque opportunité a une source vérifiable.
import { HttpError } from "./http.ts";
import { admin, aiRoom, askJson, log, setAi, type Workspace } from "./core.ts";
import { estimateValues } from "./radar-extra.ts";
import { anniversaries, bizType, championSignals, intentSignals, jobsScan, obligationSignals, trialSignals, visitorSignals, webScan } from "./radar-saas.ts";
import { findTwins, ftOffers, ftReady, lbbCompanies, pickTop3, radarPress, siteWatch, whoToCall, zoneEvents } from "./radar-plus.ts";
import { learn, nameRenewals, newCompanies, type Opp, type PublicItem, rejected, renewals, rescore, tagProspects, tedTenders, watchProspects } from "./radar-signals.ts";

const BOAMP = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
const REGISTRY = "https://recherche-entreprises.api.gouv.fr/search";
const WEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const day = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

type Cfg = { v: 1; mots_cles: string[]; postes: string[]; marches: boolean; panier?: number; web_at?: string; activites?: string[]; europe?: boolean; bodacc_at?: string; poids?: Record<string, number>; appris?: unknown; webhook?: string | null; press_at?: string; twins_at?: string; type_at?: string };

/** Mots-clés des marchés publics et postes « signal », déduits une fois de l'offre de l'entreprise. */
async function config(ws: Workspace & { radar_cfg?: Cfg | null }, force = false): Promise<Cfg> {
  if (!force && ws.radar_cfg?.v === 1 && ws.radar_cfg.mots_cles?.length) {
    if (ws.radar_cfg.activites) return ws.radar_cfg;
    // Activités des entreprises visées, telles qu'écrites au registre du commerce (pour repérer les créations dans tes secteurs)
    const a = await askJson<{ activites: string[] }>(`Cibles commerciales : ${(ws.targets ?? []).filter((t) => t.actif !== false).map((t) => t.label).join(" ; ")}
Donne 4 à 8 mots ou expressions courtes, tels qu'ils apparaissent dans la description d'activité d'une entreprise au registre du commerce français, qui désignent ces cibles (ex. pour « cabinets de conseil » : "conseil en gestion", "conseil aux entreprises" ; pour « agences immobilières » : "agence immobilière", "transaction immobilière").
Format : {"activites": [""]}`, { fast: true, maxTokens: 400 }).catch(() => ({ activites: [] as string[] }));
    const cfg = { ...ws.radar_cfg, activites: (a.activites ?? []).map((x) => String(x).replace(/["\\]/g, "").trim()).filter((x) => x.length > 3 && x.length < 40).slice(0, 8) };
    await admin.from("workspaces").update({ radar_cfg: cfg }).eq("id", ws.id);
    return cfg;
  }
  const pr = ws.profile ?? {};
  const r = await askJson<{ mots_cles: string[]; postes: string[]; marches: boolean }>(`Entreprise : ${pr.nom ?? ws.name} — ${pr.resume ?? ""} — Offre : ${pr.offre ?? ""}
Cibles : ${(ws.targets ?? []).map((t) => t.label).join(" ; ")}

1. mots_cles : 4 à 8 mots ou expressions courtes, tels qu'ils apparaissent dans l'OBJET des appels d'offres publics français, qui désignent ce que vend cette entreprise (ex. pour une entreprise de nettoyage : "nettoyage", "entretien des locaux", "vitrerie" ; pour un éditeur de logiciel RH : "logiciel RH", "SIRH", "gestion des temps"). Pas de mots trop génériques ("prestation", "service", "marché").
2. marches : true si cette entreprise peut raisonnablement répondre à des marchés publics, false sinon.
3. postes : 2 à 4 intitulés de postes dont le recrutement par une entreprise cible signale un besoin de cette offre (ex. une entreprise qui recrute un "business developer" a besoin de prospects).
Format : {"mots_cles": [""], "marches": true, "postes": [""]}`, { fast: true, maxTokens: 800 });
  const cfg: Cfg = {
    ...((ws.radar_cfg ?? {}) as Cfg),
    v: 1,
    mots_cles: (r.mots_cles ?? []).map((x) => String(x).replace(/["\\]/g, "").trim()).filter((x) => x.length > 2 && x.length < 40).slice(0, 8),
    postes: (r.postes ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 4),
    marches: r.marches !== false,
    web_at: ws.radar_cfg?.web_at, activites: ws.radar_cfg?.activites, europe: ws.radar_cfg?.europe, bodacc_at: ws.radar_cfg?.bodacc_at, webhook: ws.radar_cfg?.webhook, press_at: ws.radar_cfg?.press_at, twins_at: ws.radar_cfg?.twins_at,
  };
  await admin.from("workspaces").update({ radar_cfg: cfg }).eq("id", ws.id);
  return cfg;
}

async function getJson(u: string) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (r?.status === 429) { await new Promise((x) => setTimeout(x, 1200)); continue; }
    if (!r || !r.ok) return null;
    return await r.json().catch(() => null);
  }
  return null;
}

/** Appels d'offres ouverts (BOAMP), publiés depuis 30 jours, dans la zone. Le tri de pertinence se fait ensuite, avec TED et les renouvellements. */
async function tenders(ws: Workspace, cfg: Cfg): Promise<PublicItem[]> {
  if (!cfg.marches || !cfg.mots_cles.length) return [];
  const q = (s: string) => `"${s}"`;
  const zone = (ws.zone ?? []).filter((d) => /^(\d{2}|2A|2B|97\d)$/.test(d));
  const where = [
    `(${cfg.mots_cles.map((k) => `search(objet,${q(k)})`).join(" or ")})`,
    `datelimitereponse>now()`,
    `dateparution>=date'${day(30)}'`,
    `nature_libelle="Avis de marché"`,
    zone.length ? `(${zone.map((d) => `code_departement=${q(d)}`).join(" or ")})` : "",
  ].filter(Boolean).join(" and ");
  const u = new URL(BOAMP);
  u.searchParams.set("where", where);
  u.searchParams.set("order_by", "dateparution desc");
  u.searchParams.set("limit", "60");
  u.searchParams.set("select", "idweb,objet,nomacheteur,code_departement,dateparution,datelimitereponse,type_marche,descripteur_libelle,url_avis");
  const d = await getJson(u.toString());
  const rows = (d?.results ?? []) as { idweb: string; objet: string; nomacheteur: string; code_departement: string[]; dateparution: string; datelimitereponse: string; type_marche: string[]; descripteur_libelle: string[]; url_avis: string }[];
  return rows.map((r) => ({
    text: `[appel d'offres ouvert] ${r.objet.slice(0, 220)} — acheteur : ${r.nomacheteur} — ${(r.descripteur_libelle ?? []).join(", ")}`,
    opp: {
      key: `boamp:${r.idweb}`, kind: "appel_offres" as const,
      title: r.objet.replace(/\s+/g, " ").slice(0, 240), company: (r.nomacheteur ?? "").slice(0, 160),
      summary: [(r.type_marche ?? []).map((t) => t.toLowerCase()).join(", "), (r.descripteur_libelle ?? []).slice(0, 2).join(", ")].filter(Boolean).join(" · "),
      dept: (zone.find((z) => r.code_departement?.includes(z)) ?? r.code_departement?.[0] ?? ""),
      url: r.url_avis, source: "BOAMP (journal officiel des marchés publics)",
      published: r.dateparution, deadline: r.datelimitereponse, expires_at: r.datelimitereponse, raw: { idweb: r.idweb, depts: r.code_departement },
    },
  }));
}

/** Tri de pertinence unique (BOAMP + TED + renouvellements) : un mot-clé peut apparaître dans un marché sans rapport. Les rejets passés guident l'IA. */
async function relevant(ws: Workspace, items: PublicItem[]): Promise<Opp[]> {
  if (!items.length) return [];
  // Doublons BOAMP / TED : même marché publié aux deux endroits
  const boamp = items.filter((i) => i.opp.key.startsWith("boamp:")).map((i) => norm(i.opp.title).slice(0, 40));
  const list = items.filter((i) => !i.opp.key.startsWith("ted:") || !boamp.some((b) => b && norm(i.opp.title).startsWith(b.slice(0, 30)))).slice(0, 140);
  const pr = ws.profile ?? {};
  const no = await rejected(ws.id);
  const v = await askJson<{ retenus: { i: number; pourquoi: string }[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""}
Voici des marchés publics (appels d'offres ouverts, et contrats en cours qui vont être renouvelés). Garde UNIQUEMENT ceux que cette entreprise pourrait réellement assurer avec son offre actuelle, et dis pourquoi en une phrase courte.${no.length ? `\nLe client a jugé « pas pertinent » ces exemples ; écarte ce qui leur ressemble :\n${no.map((x) => `- ${x}`).join("\n")}` : ""}
${list.map((r, i) => `${i}. ${r.text.slice(0, 260)}`).join("\n")}
Format : {"retenus": [{"i": 0, "pourquoi": ""}]}`, { fast: true, maxTokens: 4000 });
  const keep = new Map((v.retenus ?? []).filter((x) => Number.isInteger(x.i) && list[x.i]).map((x) => [x.i, String(x.pourquoi ?? "").slice(0, 200)]));
  return list.flatMap((r, i) => keep.has(i) ? [{ ...r.opp, why: r.opp.kind === "renouvellement" ? r.opp.why : keep.get(i) ?? "", raw: { ...(r.opp.raw ?? {}), pertinence: keep.get(i) } }] : []);
}

/** Signaux de croissance et recrutements trouvés sur le web, chacun avec sa source. */
async function webSignals(ws: Workspace, cfg: Cfg, noRecruit = false): Promise<Opp[]> {
  const zone = (ws.zone ?? []).join(", ") || "France entière";
  const targets = (ws.targets ?? []).slice(0, 5).map((t) => t.label).join(" ; ");
  const r = await askJson<{ signaux: { entreprise: string; ville: string; departement: string; type: string; fait: string; date: string; url: string; pourquoi: string }[] }>(`Trouve des entreprises qui pourraient avoir besoin de cette offre MAINTENANT, à partir de signaux publics récents (moins de 3 mois).
Offre : ${ws.profile?.offre ?? ""} (${ws.profile?.nom ?? ws.name})
Types d'entreprises visées : ${targets}
Zone (départements, les premiers en priorité) : ${zone}

Signaux à chercher (6 recherches maximum) :
- "croissance" : levée de fonds, ouverture d'un nouveau site ou d'une agence, rachat, fort développement annoncé dans la presse.
${noRecruit ? "" : `- "recrutement" : offre d'emploi récente pour un de ces postes : ${cfg.postes.join(", ") || "postes commerciaux"}.`}
Règles strictes :
- Uniquement des entreprises réelles des types visés, dans la zone, avec l'URL exacte de la page qui prouve le signal (article, offre d'emploi, communiqué).
- fait : le fait précis en une phrase (ex. « Lève 3 M€ pour ouvrir 2 agences »), sans rien ajouter qui ne soit pas dans la source.
- date : AAAA-MM-JJ si la source la donne, sinon "".
- pourquoi : en une phrase, pourquoi ce signal rend l'offre utile maintenant.
- 0 à 10 signaux. Si tu ne trouves rien de fiable, renvoie une liste vide.
Format : {"signaux": [{"entreprise": "", "ville": "", "departement": "", "type": "croissance|recrutement", "fait": "", "date": "", "url": "", "pourquoi": ""}]}`,
    { maxTokens: 8000, tools: WEB(6), system: "Tu es un analyste commercial B2B rigoureux en France. Tu utilises l'outil de recherche web pour trouver les signaux (au moins 3 recherches avant de conclure). Chaque signal doit être réel, récent et sourcé par une page que tu as trouvée. Tu n'inventes jamais une entreprise, un fait ou une URL." });
  const limit = day(120);
  return (r.signaux ?? []).flatMap((s) => {
    const kind = s.type === "recrutement" ? "recrutement" : s.type === "croissance" ? "croissance" : null;
    const url = String(s.url ?? "");
    if (!kind || !/^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(url) || !s.entreprise || !s.fait) return [];
    const date = /^\d{4}-\d{2}-\d{2}$/.test(s.date ?? "") ? s.date : null;
    if (date && date < limit) return [];
    let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return []; }
    return [{
      key: `web:${kind}:${norm(s.entreprise)}`, kind,
      title: String(s.entreprise).slice(0, 120), company: String(s.entreprise).slice(0, 120),
      summary: String(s.fait).slice(0, 240), why: String(s.pourquoi ?? "").slice(0, 200),
      city: String(s.ville ?? "").slice(0, 80), dept: String(s.departement ?? "").replace(/\D/g, "").slice(0, 3),
      url: url.slice(0, 500), source: host, published: date,
    }];
  });
}

/** Signaux du registre déjà repérés sur tes prospects (ouverture récente, réseau qui s'étend). */
async function registrySignals(ws: Workspace): Promise<Opp[]> {
  const { data } = await admin.from("prospects").select("id, name, city, postal_code, signals, created_at").eq("workspace_id", ws.id)
    .not("signals", "is", null).not("status", "in", "(client,refus,ignore)").order("created_at", { ascending: false }).limit(400);
  return ((data ?? []) as { id: string; name: string; city: string; postal_code: string; signals: { type: string; label: string }[] }[])
    .flatMap((p) => {
      const s = (p.signals ?? []).find((x) => x.type === "ouverture" || x.type === "creation");
      return s ? [{ key: `reg:${p.id}`, kind: "croissance" as const, title: p.name, company: p.name, summary: s.label, why: "Une structure qui démarre ou s'étend s'équipe et choisit ses prestataires.", city: p.city, dept: (p.postal_code ?? "").slice(0, 2), url: "", source: "Registre national des entreprises", prospect_id: p.id }] : [];
    }).slice(0, 15);
}

async function save(ws: Workspace, opps: Opp[]) {
  if (!opps.length) return 0;
  opps = [...new Map(opps.map((o) => [o.key, o])).values()];
  // Toutes les lignes doivent avoir les mêmes colonnes (insertion groupée)
  const rows = opps.map((o) => ({
    workspace_id: ws.id, key: o.key, kind: o.kind, title: o.title ?? "", company: o.company ?? "", summary: o.summary ?? "", why: o.why ?? "",
    city: o.city ?? "", dept: o.dept ?? "", url: o.url ?? "", source: o.source ?? "", published: o.published ?? null, deadline: o.deadline ?? null,
    prospect_id: o.prospect_id ?? null, status: o.prospect_id && o.key.startsWith("reg:") ? "ajoute" : "nouveau", raw: o.raw ?? {},
    siren: o.siren ?? null, expires_at: o.expires_at ?? null,
  }));
  const { data, error } = await admin.from("radar_opps").upsert(rows, { onConflict: "workspace_id,key", ignoreDuplicates: true }).select("id");
  if (error) throw new HttpError(500, error.message);
  return data?.length ?? 0;
}

/** Analyse complète. Le web (plus coûteux) n'est relancé qu'une fois par semaine sauf demande explicite. */
/** Zone du Radar : d'abord celles des missions actives (pour que Radar → Mission trouve des entreprises qu'elle peut prendre), puis celle de l'espace. */
async function radarZone(ws: Workspace): Promise<string[]> {
  const { data } = await admin.from("missions").select("zone").eq("workspace_id", ws.id).eq("status", "active");
  const fromMissions = ((data ?? []) as { zone: string[] | null }[]).flatMap((m) => m.zone ?? []);
  return [...new Set([...fromMissions, ...(ws.zone ?? [])])];
}

type Step = { s: "a_venir" | "en_cours" | "fait" | "saute" | "erreur"; at?: string; n?: number };
type StepKey = "lance" | "marches" | "renouvellements" | "annonces" | "emploi" | "web" | "registre" | "tri";
type Progress = { started_at: string; done_at: string | null; added: number | null; steps: Record<StepKey, Step>; result?: unknown };

export async function scanRadar(ws0: Workspace & { radar_cfg?: Cfg | null }, opts: { web?: boolean; top?: boolean } = {}) {
  const at = () => new Date().toISOString();
  // Avancement réel, écrit à chaque étape : l'écran le lit pendant l'analyse
  const p: Progress = { started_at: at(), done_at: null, added: null, steps: { lance: { s: "en_cours", at: at() }, marches: { s: "a_venir" }, renouvellements: { s: "a_venir" }, annonces: { s: "a_venir" }, emploi: { s: "a_venir" }, web: { s: "a_venir" }, registre: { s: "a_venir" }, tri: { s: "a_venir" } } };
  const put = () => admin.from("workspaces").update({ radar_progress: p }).eq("id", ws0.id).then(() => null, () => null);
  await put();
  try {
    const ws = { ...ws0, zone: await radarZone(ws0) };
    const cfg = await config(ws);
    // Adapté au métier : un éditeur de logiciel qui ne vend pas au public n'a pas besoin des marchés publics (réglage modifiable)
    const type = await bizType(ws).catch(() => "services");
    if (!cfg.type_at) {
      if (type === "saas" && (ws.profile as { vend_public?: boolean }).vend_public === false) cfg.marches = false;
      cfg.type_at = at();
      await admin.from("workspaces").update({ radar_cfg: cfg }).eq("id", ws.id);
    }
    const zone = (ws.zone ?? []).filter((d) => /^(\d{2}|2A|2B|97\d)$/.test(d));
    // Recherche web (la partie payante) : chaque semaine, et seulement si l'espace a encore de la marge sur son budget IA
    const webDue = opts.web ?? ((!cfg.web_at || cfg.web_at < new Date(Date.now() - 6 * 864e5).toISOString()) && (await aiRoom(ws.id, 0.7)));
    // Fenêtre BODACC : depuis la dernière lecture moins 7 jours (annonces parfois indexées en retard), au plus 30 jours. Les doublons sont ignorés.
    const back7 = cfg.bodacc_at ? new Date(new Date(cfg.bodacc_at).getTime() - 7 * 864e5).toISOString().slice(0, 10) : day(30);
    const bodaccSince = back7 > day(30) ? back7 : day(30);
    const pub = cfg.marches && cfg.mots_cles.length > 0;
    const errors: string[] = [];
    p.steps.lance = { s: "fait", at: p.steps.lance.at };
    p.steps.marches = pub ? { s: "en_cours", at: at() } : { s: "saute" };
    p.steps.renouvellements = pub && zone.length ? { s: "en_cours", at: at() } : { s: "saute" };
    p.steps.annonces = { s: "en_cours", at: at() };
    p.steps.emploi = ftReady() && zone.length ? { s: "en_cours", at: at() } : { s: "saute" };
    p.steps.web = webDue ? { s: "en_cours", at: at() } : { s: "saute" };
    p.steps.registre = { s: "en_cours", at: at() };
    await put();
    const step = <T,>(k: Exclude<StepKey, "lance" | "tri">, job: Promise<T[]>, label: string) => job.then(
      (r) => { if (p.steps[k].s !== "saute") p.steps[k] = { s: "fait", at: at(), n: r.length }; put(); return r; },
      (e) => { console.error("radar", k, e); if (label) errors.push(label); p.steps[k] = { s: "erreur", at: at() }; put(); return [] as T[]; });
    const [boamp, ted, ren, legal, fresh, w, g, jobs, sites, zev, techs, intent, press] = await Promise.all([
      pub ? tenders(ws, cfg).catch((e) => { console.error("boamp", e); errors.push("appels d'offres"); return [] as PublicItem[]; }) : Promise.resolve([] as PublicItem[]),
      pub ? tedTenders(cfg.mots_cles, zone, !!cfg.europe).catch((e) => { console.error("ted", e); errors.push("appels d'offres européens"); return [] as PublicItem[]; }) : Promise.resolve([] as PublicItem[]),
      pub && zone.length ? renewals(ws, cfg.mots_cles, zone).catch((e) => { console.error("decp", e); errors.push("renouvellements"); return [] as PublicItem[]; }) : Promise.resolve([] as PublicItem[]),
      watchProspects(ws, bodaccSince).catch((e) => { console.error("bodacc", e); errors.push("annonces légales"); return [] as Opp[]; }),
      newCompanies(ws, cfg.activites ?? [], zone).catch((e) => { console.error("creations", e); return [] as Opp[]; }),
      step("web", webDue ? webSignals(ws, cfg, ftReady()) : Promise.resolve([] as Opp[]), "signaux web"),
      step("registre", registrySignals(ws), ""),
      step("emploi", ftReady() && zone.length ? Promise.all([
        ftOffers(ws, cfg.postes, zone).catch((e) => { console.error("offres", e); return [] as Opp[]; }), // accès sur demande chez France Travail
        lbbCompanies({ ...ws, radar_cfg: cfg as unknown as Record<string, unknown> }, zone).catch((e) => { console.error("lbb", e); errors.push("La Bonne Boîte"); return [] as Opp[]; }),
      ]).then(([a, b]) => [...a, ...b]) : Promise.resolve([] as Opp[]), ""),
      siteWatch(ws).catch((e) => { console.error("sites", e); return [] as Opp[]; }),
      zoneEvents(ws, cfg.activites ?? [], zone).catch((e) => { console.error("zone", e); return [] as Opp[]; }),
      // Sites (outils, page carrières) puis offres d'emploi publiées, puis dates anniversaires des abonnements concurrents
      (async () => {
        const t0 = Date.now(), wsc = { ...ws, radar_cfg: cfg as unknown as Record<string, unknown> };
        const a = await webScan(wsc, { until: t0 + 45_000 }).catch((e) => { console.error("sites", e); return [] as Opp[]; });
        const b = await jobsScan(wsc, cfg.postes ?? [], { until: t0 + 75_000 }).catch((e) => { console.error("offres", e); return [] as Opp[]; });
        const c = await anniversaries(wsc, { until: t0 + 95_000 }).catch((e) => { console.error("abonnements", e); return [] as Opp[]; });
        const d = await obligationSignals(wsc, zone).catch((e) => { console.error("obligations", e); return [] as Opp[]; });
        const e = await trialSignals(wsc).catch((x) => { console.error("essais", x); return [] as Opp[]; });
        const v = await visitorSignals(wsc).catch((x) => { console.error("visiteurs", x); return [] as Opp[]; });
        const f = opts.web === false ? [] : await championSignals(wsc).catch((x) => { console.error("anciens", x); return [] as Opp[]; });
        return [...a, ...b, ...c, ...d, ...e, ...f, ...v];
      })(),
      opts.web === false ? Promise.resolve([] as Opp[]) : intentSignals({ ...ws, radar_cfg: cfg as unknown as Record<string, unknown> }).catch((e) => { console.error("intentions", e); return [] as Opp[]; }),
      opts.web === false ? Promise.resolve([] as Opp[]) : radarPress({ ...ws, radar_cfg: cfg as unknown as Record<string, unknown> }, zone).catch((e) => { console.error("presse", e); return [] as Opp[]; }),
    ]);
    p.steps.annonces = { s: "fait", at: at(), n: legal.length + fresh.length + sites.length + zev.length }; await put();
    // Un seul tri par l'IA pour tous les marchés publics
    const pubOk = await relevant(ws, [...boamp, ...ted, ...ren]).catch((e) => { console.error("tri marches", e); errors.push("tri des marchés"); return [] as Opp[]; });
    const t = pubOk.filter((o) => o.kind === "appel_offres"), r = pubOk.filter((o) => o.kind === "renouvellement");
    if (r.length) { const { data: comp } = await admin.from("competitors").select("name").eq("workspace_id", ws.id).neq("status", "ecarte"); await nameRenewals(r, ((comp ?? []) as { name: string }[]).map((c) => norm(c.name).split(" ")[0])); }
    if (pub) p.steps.marches = { s: "fait", at: at(), n: t.length };
    if (p.steps.renouvellements.s === "en_cours") p.steps.renouvellements = { s: "fait", at: at(), n: r.length };
    p.steps.tri = { s: "en_cours", at: at() }; await put();
    const all = [...t, ...r, ...legal, ...fresh, ...w, ...g, ...jobs, ...sites, ...zev, ...press, ...techs, ...intent];
    const added = await save(ws, all);
    await tagProspects(legal).catch(() => null);
    // Qui appeler (dirigeant, recruteur, service achats) et entreprises fermées ; jumeaux de tes clients (chaque semaine)
    await whoToCall(ws).catch((e) => console.error("contacts", e));
    await findTwins(ws).catch((e) => console.error("jumeaux", e));
    // Apprentissage + score « entreprise chaude » + date limite + filtre + alertes
    const brain = await learn(ws.id);
    await estimateValues({ ...ws, radar_cfg: cfg as unknown as Record<string, unknown> }).catch((e) => console.error("valeurs", e));
    const sc = await rescore(ws, brain.poids);
    // Chaque matin (tâche planifiée) : les 3 entreprises du jour, contact cherché et message préparé
    const top3 = opts.top ? await pickTop3(ws).catch((e) => { console.error("top3", e); return null; }) : null;
    const now = at();
    p.steps.tri = { s: "fait", at: now, n: added }; p.done_at = now; p.added = added; p.result = sc;
    // Relit la configuration (presse, jumeaux ont pu y écrire pendant l'analyse) avant de la compléter
    const { data: fresh_ } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
    // Champs écrits par d'autres tâches pendant l'analyse (ou par le client) : on garde la version en base
    const fr = (fresh_?.radar_cfg ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...fr, ...cfg };
    for (const k of ["intent_at", "press_at", "lbb_at", "partenaires", "partners_at", "calendrier", "twins_at", "webhook", "outils_rivaux", "obligations", "oblig_at"]) if (k in fr) merged[k] = fr[k];
    await admin.from("workspaces").update({ radar_at: now, radar_progress: p, radar_cfg: { ...merged, ...(webDue ? { web_at: now } : {}), bodacc_at: now.slice(0, 10), poids: brain.poids, appris: brain.by } }).eq("id", ws.id);
    await log(ws.id, "radar_scan", `Radar : ${added} nouvelle${added > 1 ? "s" : ""} opportunité${added > 1 ? "s" : ""} (${t.length} appels d'offres, ${r.length} contrats à renouveler, ${legal.length + fresh.length} annonces légales, ${w.length} signaux web)`);
    return { added, tenders: t.length, renewals: r.length, legal: legal.length, creations: fresh.length, jobs: jobs.length, sites: sites.length, web: w.length, registry: g.length, web_scanned: webDue, errors, keywords: cfg.mots_cles, top3, ...sc };
  } catch (e) {
    for (const k of Object.keys(p.steps) as StepKey[]) if (p.steps[k].s === "en_cours") p.steps[k] = { s: "erreur", at: at() };
    p.done_at = at(); await put();
    throw e;
  }
}

/** Ce que le Radar cherche, modifiable par le client : postes « signal », mots-clés des marchés publics, marchés oui/non. */
export async function radarSetConfig(ws: Workspace & { radar_cfg?: Cfg | null }, b: { postes?: unknown; mots_cles?: unknown; marches?: unknown; activites?: unknown; europe?: unknown; webhook?: unknown; panier?: unknown }) {
  const cur = await config(ws);
  const clean = (v: unknown, max: number) => Array.isArray(v) ? [...new Set(v.map((x) => String(x).replace(/["\\]/g, "").trim()).filter((x) => x.length > 1 && x.length < 60))].slice(0, max) : undefined;
  const cfg: Cfg = { ...cur, postes: clean(b.postes, 6) ?? cur.postes, mots_cles: clean(b.mots_cles, 10) ?? cur.mots_cles, marches: typeof b.marches === "boolean" ? b.marches : cur.marches, activites: clean(b.activites, 10) ?? cur.activites, europe: typeof b.europe === "boolean" ? b.europe : cur.europe,
    panier: b.panier !== undefined && b.panier !== "" ? Math.max(0, Math.min(10_000_000, Number(b.panier) || 0)) : cur.panier,
    webhook: typeof b.webhook === "string" ? (/^https:\/\/\S+$/.test(b.webhook.trim()) ? b.webhook.trim().slice(0, 400) : null) : cur.webhook };
  await admin.from("workspaces").update({ radar_cfg: cfg }).eq("id", ws.id);
  await log(ws.id, "radar", "Réglages du Radar modifiés");
  return { radar_cfg: cfg };
}

/** Lecture de la configuration (calculée à la première demande). */
export async function radarGetConfig(ws: Workspace & { radar_cfg?: Cfg | null }) {
  return { radar_cfg: await config(ws), zone: await radarZone(ws) };
}

/** Transforme une opportunité (entreprise) en prospect, en la retrouvant dans le registre officiel. */
export async function radarToProspect(ws: Workspace, id: string) {
  const { data: o } = await admin.from("radar_opps").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!o) throw new HttpError(404, "Opportunité introuvable");
  if (o.prospect_id) return { prospect_id: o.prospect_id, existing: true };
  if (o.kind === "appel_offres") throw new HttpError(400, "Un appel d'offres se traite en répondant à l'avis, pas en prospection");
  const u = new URL(REGISTRY);
  u.searchParams.set("q", o.siren || o.company);
  if (!o.siren && /^\d{2}$/.test(o.dept)) u.searchParams.set("departement", o.dept);
  u.searchParams.set("etat_administratif", "A");
  u.searchParams.set("per_page", "5");
  const d = await getJson(u.toString());
  // deno-lint-ignore no-explicit-any
  const hit = ((d?.results ?? []) as any[]).find((r) => (o.siren && r.siren === o.siren) || norm(r.nom_complet ?? "").includes(norm(o.company).split(" ")[0] ?? ""));
  const naf = (hit?.activite_principale ?? "") as string;
  const target = (ws.targets ?? []).find((t) => t.naf?.includes(naf))?.id ?? "";
  const siege = hit?.siege ?? {};
  const boss = (hit?.dirigeants ?? []).find((x: { type_dirigeant: string; nom?: string }) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire|suppl[ée]ant/i.test(x.qualite ?? ""));
  const cap = (s: string) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
  const row = {
    workspace_id: ws.id, target, name: o.company, org: hit ? cap(hit.nom_complet ?? "") : "",
    siren: hit?.siren ?? null, siret: siege.siret ?? null, activity: target ? (ws.targets.find((t) => t.id === target)?.label ?? "") : (hit ? "Radar" : "Radar (hors registre)"),
    address: siege.adresse ?? "", postal_code: siege.code_postal ?? "", city: siege.libelle_commune ? cap(siege.libelle_commune) : o.city,
    contact_name: boss ? cap(`${boss.prenoms?.split(" ")[0] ?? ""} ${boss.nom}`.trim()) : "", contact_role: boss?.qualite ?? "",
    signals: [{ type: o.kind === "recrutement" ? "recrutement" : ["dirigeant", "demenagement", "creation", "renouvellement", "besoin"].includes(o.kind) ? o.kind : "croissance", label: o.kind === "renouvellement" ? `Contrat public en fin de période (${o.raw?.fin ?? ""}) : ${o.title}` : o.summary, url: o.url }],
  };
  let pid: string | null = null;
  if (row.siret) {
    const { data: ex } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("siret", row.siret).maybeSingle();
    pid = ex?.id ?? null;
  }
  if (!pid) {
    const { data: p, error } = await admin.from("prospects").insert(row).select("id").single();
    if (error) throw new HttpError(500, error.message);
    pid = p.id;
  }
  await admin.from("radar_opps").update({ prospect_id: pid, status: "ajoute" }).eq("id", o.id);
  await log(ws.id, "radar", `${o.company} ajoutée aux prospects depuis le Radar`);
  return { prospect_id: pid, existing: false, registry: !!hit };
}

export async function radarCron() {
  // Quelques espaces par passage (le plus anciennement analysé d'abord) pour rester dans le temps d'exécution
  const since = new Date(Date.now() - 20 * 36e5).toISOString();
  const { data } = await admin.from("workspaces").select("*").eq("onboarded", true).or(`radar_at.is.null,radar_at.lt.${since}`).order("radar_at", { ascending: true, nullsFirst: true }).limit(3);
  let n = 0;
  const t0 = Date.now();
  for (const ws of data ?? []) {
    if (Date.now() - t0 > 150_000) break; // le reste au prochain passage
    setAi({ ws: ws.id });
    try { await scanRadar(ws, { top: true }); n++; } catch (e) { console.error("radar cron", ws.id, e); }
  }
  return { workspaces: n };
}
