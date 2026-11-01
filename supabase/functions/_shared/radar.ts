// Kairo Radar : opportunités commerciales réelles et sourcées.
// - Appels d'offres : API officielle du BOAMP (DILA), filtrés par la zone puis par l'IA (pertinence pour l'offre).
// - Croissance / recrutements : recherche web sourcée (une URL par signal) + signaux du registre déjà connus.
// Rien n'est inventé : chaque opportunité a une source vérifiable.
import { HttpError } from "./http.ts";
import { admin, askJson, log, type Workspace } from "./core.ts";

const BOAMP = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
const REGISTRY = "https://recherche-entreprises.api.gouv.fr/search";
const WEB = (n: number) => [{ type: "web_search_20250305", name: "web_search", max_uses: n, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const day = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

type Cfg = { v: 1; mots_cles: string[]; postes: string[]; marches: boolean; web_at?: string };
type Opp = { key: string; kind: "appel_offres" | "croissance" | "recrutement"; title: string; company: string; summary: string; why?: string; city?: string; dept?: string; url: string; source: string; published?: string | null; deadline?: string | null; prospect_id?: string | null; raw?: unknown };

/** Mots-clés des marchés publics et postes « signal », déduits une fois de l'offre de l'entreprise. */
async function config(ws: Workspace & { radar_cfg?: Cfg | null }, force = false): Promise<Cfg> {
  if (!force && ws.radar_cfg?.v === 1 && ws.radar_cfg.mots_cles?.length) return ws.radar_cfg;
  const pr = ws.profile ?? {};
  const r = await askJson<{ mots_cles: string[]; postes: string[]; marches: boolean }>(`Entreprise : ${pr.nom ?? ws.name} — ${pr.resume ?? ""} — Offre : ${pr.offre ?? ""}
Cibles : ${(ws.targets ?? []).map((t) => t.label).join(" ; ")}

1. mots_cles : 4 à 8 mots ou expressions courtes, tels qu'ils apparaissent dans l'OBJET des appels d'offres publics français, qui désignent ce que vend cette entreprise (ex. pour une entreprise de nettoyage : "nettoyage", "entretien des locaux", "vitrerie" ; pour un éditeur de logiciel RH : "logiciel RH", "SIRH", "gestion des temps"). Pas de mots trop génériques ("prestation", "service", "marché").
2. marches : true si cette entreprise peut raisonnablement répondre à des marchés publics, false sinon.
3. postes : 2 à 4 intitulés de postes dont le recrutement par une entreprise cible signale un besoin de cette offre (ex. une entreprise qui recrute un "business developer" a besoin de prospects).
Format : {"mots_cles": [""], "marches": true, "postes": [""]}`, { fast: true, maxTokens: 800 });
  const cfg: Cfg = {
    v: 1,
    mots_cles: (r.mots_cles ?? []).map((x) => String(x).replace(/["\\]/g, "").trim()).filter((x) => x.length > 2 && x.length < 40).slice(0, 8),
    postes: (r.postes ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 4),
    marches: r.marches !== false,
    web_at: ws.radar_cfg?.web_at,
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

/** Appels d'offres ouverts (BOAMP), publiés depuis 30 jours, dans la zone, triés par pertinence par l'IA. */
async function tenders(ws: Workspace, cfg: Cfg): Promise<Opp[]> {
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
  if (!rows.length) return [];
  // Tri de pertinence : un mot-clé peut apparaître dans un marché sans rapport (ex. « nettoyage » d'une station d'épuration).
  const pr = ws.profile ?? {};
  const v = await askJson<{ retenus: { i: number; pourquoi: string }[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""}
Voici des appels d'offres publics. Garde UNIQUEMENT ceux auxquels cette entreprise pourrait réellement répondre avec son offre actuelle, et dis pourquoi en une phrase courte.
${rows.map((r, i) => `${i}. ${r.objet.slice(0, 220)} — acheteur : ${r.nomacheteur} — ${(r.descripteur_libelle ?? []).join(", ")}`).join("\n")}
Format : {"retenus": [{"i": 0, "pourquoi": ""}]}`, { fast: true, maxTokens: 2500 });
  const keep = new Map((v.retenus ?? []).filter((x) => Number.isInteger(x.i) && rows[x.i]).map((x) => [x.i, String(x.pourquoi ?? "").slice(0, 200)]));
  return rows.flatMap((r, i) => keep.has(i) ? [{
    key: `boamp:${r.idweb}`, kind: "appel_offres" as const,
    title: r.objet.replace(/\s+/g, " ").slice(0, 240), company: (r.nomacheteur ?? "").slice(0, 160),
    summary: [(r.type_marche ?? []).map((t) => t.toLowerCase()).join(", "), (r.descripteur_libelle ?? []).slice(0, 2).join(", ")].filter(Boolean).join(" · "),
    why: keep.get(i) ?? "", dept: (zone.find((z) => r.code_departement?.includes(z)) ?? r.code_departement?.[0] ?? ""),
    url: r.url_avis, source: "BOAMP (journal officiel des marchés publics)",
    published: r.dateparution, deadline: r.datelimitereponse, raw: { idweb: r.idweb, depts: r.code_departement },
  }] : []);
}

/** Signaux de croissance et recrutements trouvés sur le web, chacun avec sa source. */
async function webSignals(ws: Workspace, cfg: Cfg): Promise<Opp[]> {
  const zone = (ws.zone ?? []).join(", ") || "France entière";
  const targets = (ws.targets ?? []).slice(0, 5).map((t) => t.label).join(" ; ");
  const r = await askJson<{ signaux: { entreprise: string; ville: string; departement: string; type: string; fait: string; date: string; url: string; pourquoi: string }[] }>(`Trouve des entreprises qui pourraient avoir besoin de cette offre MAINTENANT, à partir de signaux publics récents (moins de 3 mois).
Offre : ${ws.profile?.offre ?? ""} (${ws.profile?.nom ?? ws.name})
Types d'entreprises visées : ${targets}
Zone (départements) : ${zone}

Signaux à chercher (6 recherches maximum) :
- "croissance" : levée de fonds, ouverture d'un nouveau site ou d'une agence, rachat, fort développement annoncé dans la presse.
- "recrutement" : offre d'emploi récente pour un de ces postes : ${cfg.postes.join(", ") || "postes commerciaux"}.
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
  // Toutes les lignes doivent avoir les mêmes colonnes (insertion groupée)
  const rows = opps.map((o) => ({
    workspace_id: ws.id, key: o.key, kind: o.kind, title: o.title ?? "", company: o.company ?? "", summary: o.summary ?? "", why: o.why ?? "",
    city: o.city ?? "", dept: o.dept ?? "", url: o.url ?? "", source: o.source ?? "", published: o.published ?? null, deadline: o.deadline ?? null,
    prospect_id: o.prospect_id ?? null, status: o.prospect_id ? "ajoute" : "nouveau", raw: o.raw ?? {},
  }));
  const { data, error } = await admin.from("radar_opps").upsert(rows, { onConflict: "workspace_id,key", ignoreDuplicates: true }).select("id");
  if (error) throw new HttpError(500, error.message);
  return data?.length ?? 0;
}

/** Analyse complète. Le web (plus coûteux) n'est relancé qu'une fois par semaine sauf demande explicite. */
export async function scanRadar(ws: Workspace & { radar_cfg?: Cfg | null }, opts: { web?: boolean } = {}) {
  const cfg = await config(ws);
  const webDue = opts.web ?? (!cfg.web_at || cfg.web_at < new Date(Date.now() - 6 * 864e5).toISOString());
  const errors: string[] = [];
  const [t, w, g] = await Promise.all([
    tenders(ws, cfg).catch((e) => { console.error("radar boamp", e); errors.push("appels d'offres"); return [] as Opp[]; }),
    webDue ? webSignals(ws, cfg).catch((e) => { console.error("radar web", e); errors.push("signaux web"); return [] as Opp[]; }) : Promise.resolve([] as Opp[]),
    registrySignals(ws).catch(() => [] as Opp[]),
  ]);
  const added = await save(ws, [...t, ...w, ...g]);
  const now = new Date().toISOString();
  await admin.from("workspaces").update({ radar_at: now, ...(webDue ? { radar_cfg: { ...cfg, web_at: now } } : {}) }).eq("id", ws.id);
  await log(ws.id, "radar_scan", `Radar : ${added} nouvelle${added > 1 ? "s" : ""} opportunité${added > 1 ? "s" : ""} (${t.length} appels d'offres, ${w.length} signaux web)`);
  return { added, tenders: t.length, web: w.length, registry: g.length, web_scanned: webDue, errors, keywords: cfg.mots_cles };
}

/** Transforme une opportunité (entreprise) en prospect, en la retrouvant dans le registre officiel. */
export async function radarToProspect(ws: Workspace, id: string) {
  const { data: o } = await admin.from("radar_opps").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!o) throw new HttpError(404, "Opportunité introuvable");
  if (o.prospect_id) return { prospect_id: o.prospect_id, existing: true };
  if (o.kind === "appel_offres") throw new HttpError(400, "Un appel d'offres se traite en répondant à l'avis, pas en prospection");
  const u = new URL(REGISTRY);
  u.searchParams.set("q", o.company);
  if (/^\d{2}$/.test(o.dept)) u.searchParams.set("departement", o.dept);
  u.searchParams.set("etat_administratif", "A");
  u.searchParams.set("per_page", "5");
  const d = await getJson(u.toString());
  // deno-lint-ignore no-explicit-any
  const hit = ((d?.results ?? []) as any[]).find((r) => norm(r.nom_complet ?? "").includes(norm(o.company).split(" ")[0] ?? ""));
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
    signals: [{ type: o.kind === "recrutement" ? "recrutement" : "croissance", label: o.summary, url: o.url }],
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
  for (const ws of data ?? []) {
    try { await scanRadar(ws); n++; } catch (e) { console.error("radar cron", ws.id, e); }
  }
  return { workspaces: n };
}
