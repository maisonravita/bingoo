// Radar adapté au métier du client, et signaux propres aux éditeurs de logiciels (SaaS) :
// - type d'entreprise (déduit du site, corrigeable) ;
// - outils installés sur les sites des entreprises suivies, avec leur historique (ajout, retrait) ;
// - offres d'emploi publiées sur les pages carrières (listes publiques des logiciels de recrutement) ;
// - date anniversaire probable de l'abonnement chez un concurrent (archives publiques du web) ;
// - obligations réglementaires qui poussent tes clients à s'équiper.
// Rien d'inventé : chaque signal pointe vers sa source (page, offre, archive, texte officiel).
import { admin, aiRoom, askJson, type Workspace } from "./core.ts";
import type { Opp } from "./radar-signals.ts";
import { norm } from "./radar-signals.ts";
import { type Ats, atsIn, careersLink, catOf, CAT_LABEL, FP, type Job, jobsOf, roleMatch, toolsIn, toolsNamed } from "./tech-fp.ts";

type W = Workspace & { radar_cfg?: Record<string, unknown> | null };
const today = () => new Date().toISOString().slice(0, 10);
const host = (u: string) => { try { return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, ""); } catch { return ""; } };
const base = (h: string) => h.split(".").slice(-2).join(".");
const full = (u: string) => /^https?:/.test(u) ? u : `https://${u}`;
const moisFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

/** Petit lot parallèle borné dans le temps. */
async function pool<T>(items: T[], n: number, until: number, job: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length && Date.now() < until) { const x = items[i++]; await job(x).catch((e) => console.error("pool", e)); }
  }));
}

// ---------------------------------------------------------------- Type d'entreprise
export type BizType = "saas" | "services" | "terrain" | "produits";
export const BIZ_LABEL: Record<BizType, string> = { saas: "Logiciel / SaaS", services: "Services aux entreprises (conseil, agence, à distance)", terrain: "Services sur site (nettoyage, sécurité, BTP, maintenance…)", produits: "Produits (fabrication, négoce, distribution)" };

/** Type d'entreprise : celui du profil, sinon déduit une fois de l'offre (et enregistré). */
export async function bizType(ws: W): Promise<BizType> {
  const t = (ws.profile as { type?: string } | null)?.type;
  if (t && t in BIZ_LABEL) return t as BizType;
  const pr = ws.profile ?? {};
  const r = await askJson<{ type: BizType; vend_public: boolean }>(`Entreprise : ${pr.nom ?? ws.name} — ${pr.resume ?? ""} — Offre : ${pr.offre ?? ""} — Clients : ${pr.clients_types ?? ""}
Classe-la dans UN type :
- "saas" : elle vend un logiciel, une application, une plateforme en ligne ou un abonnement numérique
- "services" : services aux entreprises rendus surtout à distance ou intellectuels (conseil, agence, formation, prospection, comptabilité…)
- "terrain" : services rendus sur place (nettoyage, sécurité, BTP, maintenance, restauration collective…)
- "produits" : elle fabrique, distribue ou vend des produits
Et vend_public : true si elle vend aussi à des acheteurs publics (collectivités, hôpitaux, administrations).
Format : {"type": "saas", "vend_public": false}`, { fast: true, maxTokens: 100 }).catch(() => ({ type: "services" as BizType, vend_public: true }));
  const type: BizType = r.type in BIZ_LABEL ? r.type : "services";
  const profile = { ...(ws.profile ?? {}), type, vend_public: r.vend_public !== false };
  await admin.from("workspaces").update({ profile }).eq("id", ws.id);
  ws.profile = profile;
  return type;
}

/** Outils concurrents de l'offre du client (parmi ceux qu'on sait repérer), choisis une fois. */
export async function rivalTools(ws: W): Promise<string[]> {
  const c = ws.radar_cfg ?? {};
  if (Array.isArray(c.outils_rivaux)) return c.outils_rivaux as string[];
  const pr = ws.profile ?? {};
  const { data: comps } = await admin.from("competitors").select("name").eq("workspace_id", ws.id).neq("status", "ecarte");
  const r = await askJson<{ rivaux: string[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""}
Concurrents connus : ${((comps ?? []) as { name: string }[]).map((x) => x.name).join(", ") || "aucun"}
Parmi ces outils, lesquels sont des CONCURRENTS DIRECTS de cette offre (une entreprise qui l'utilise pourrait le remplacer par cette offre) ? Liste vide si aucun.
${FP.map((f) => `${f.name} (${CAT_LABEL[f.cat] ?? f.cat})`).join(" ; ")}
Format : {"rivaux": [""]}`, { fast: true, maxTokens: 300 }).catch(() => ({ rivaux: [] as string[] }));
  const names = new Set(FP.map((f) => f.name));
  const out = (r.rivaux ?? []).filter((x) => names.has(x)).slice(0, 12);
  const { data } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  await admin.from("workspaces").update({ radar_cfg: { ...((data?.radar_cfg as Record<string, unknown>) ?? {}), outils_rivaux: out } }).eq("id", ws.id);
  return out;
}

// ---------------------------------------------------------------- Lecture des sites : outils (avec historique) et page carrières
type Target = { key: string; name: string; siren: string | null; url: string; prospect_id: string | null; watch_id: string | null };
type ScanRow = { key: string; scanned_at: string | null; tech: string[] | null; ats: string | null; ats_slug: string | null; jobs_at: string | null; name: string; siren: string | null; url: string; prospect_id: string | null; watch_id: string | null };

/** Entreprises à lire : comptes surveillés (chaque semaine), puis prospects avec site (chaque mois), les mieux notés d'abord. */
async function targets(ws: W, max: number): Promise<{ todo: Target[]; known: Map<string, ScanRow> }> {
  const [{ data: wl }, { data: ps }, { data: sc }] = await Promise.all([
    admin.from("radar_watch").select("id, siren, name, url").eq("workspace_id", ws.id).not("url", "is", null).limit(200),
    admin.from("prospects").select("id, name, siren, website").eq("workspace_id", ws.id).neq("website", "").in("status", ["nouveau", "pret", "a_valider", "envoye", "relance"]).order("score", { ascending: false, nullsFirst: false }).limit(600),
    admin.from("company_scan").select("key, scanned_at, tech, ats, ats_slug, jobs_at, name, siren, url, prospect_id, watch_id").eq("workspace_id", ws.id).limit(5000),
  ]);
  const known = new Map(((sc ?? []) as ScanRow[]).map((r) => [r.key, r]));
  const week = new Date(Date.now() - 7 * 864e5).toISOString(), month = new Date(Date.now() - 30 * 864e5).toISOString();
  const all: (Target & { due: string })[] = [
    ...((wl ?? []) as { id: string; siren: string | null; name: string; url: string }[]).map((w) => ({ key: w.siren || norm(w.name), name: w.name, siren: w.siren, url: w.url, prospect_id: null, watch_id: w.id, due: week })),
    ...((ps ?? []) as { id: string; name: string; siren: string | null; website: string }[]).map((p) => ({ key: p.siren || norm(p.name), name: p.name, siren: p.siren, url: p.website, prospect_id: p.id, watch_id: null, due: month })),
  ].filter((t) => t.key && host(t.url));
  const seen = new Set<string>();
  const todo = all.filter((t) => { if (seen.has(t.key)) return false; seen.add(t.key); const k = known.get(t.key); return !k?.scanned_at || k.scanned_at < t.due; }).slice(0, max);
  return { todo, known };
}

/** Lit les sites : outils installés (historique : ajoutés, retirés), clients de tes concurrents, page carrières. */
export async function webScan(ws: W, opts: { max?: number; until?: number } = {}): Promise<Opp[]> {
  const type = await bizType(ws);
  const max = opts.max ?? (type === "saas" ? 40 : 15);
  const until = opts.until ?? Date.now() + 55_000;
  const { fetchHtml, textOf } = await import("./analyze.ts");
  const [{ todo, known }, { data: comps }, rivalT] = await Promise.all([
    targets(ws, max),
    admin.from("competitors").select("name, url").eq("workspace_id", ws.id).neq("status", "ecarte"),
    rivalTools(ws).catch(() => [] as string[]),
  ]);
  const rivals = ((comps ?? []) as { name: string; url: string }[]).map((c) => ({ name: c.name.replace(/\s*[—(].*$/, "").trim(), host: host(c.url ?? ""), word: norm(c.name).split(" ")[0] })).filter((r) => r.host || r.word.length > 3);
  const { data: prevT } = todo.length ? await admin.from("tech_seen").select("key, tool, first_seen, last_seen, source").eq("workspace_id", ws.id).in("key", todo.map((t) => t.key)) : { data: [] };
  const prev = new Map<string, { tool: string; first_seen: string; last_seen: string; source: string }[]>();
  for (const r of (prevT ?? []) as { key: string; tool: string; first_seen: string; last_seen: string; source: string }[]) (prev.get(r.key) ?? prev.set(r.key, []).get(r.key)!).push(r);
  const out: Opp[] = [];
  const now = new Date().toISOString(), d0 = today();
  await pool(todo, 6, until, async (t) => {
    const url = full(t.url);
    const html = await fetchHtml(url);
    const k = known.get(t.key);
    if (!html) { await admin.from("company_scan").upsert({ workspace_id: ws.id, key: t.key, name: t.name, siren: t.siren, url: t.url, prospect_id: t.prospect_id, watch_id: t.watch_id, scanned_at: now }); return; }
    const tools = toolsIn(html);
    // Page carrières : sur la page d'accueil, sinon sur la page « Carrières / Recrutement » du site
    let ats = atsIn(html);
    if (!ats && !k?.ats) { const c = careersLink(html, url); if (c && base(host(c)) === base(host(url))) { const ch = await fetchHtml(c); if (ch) ats = atsIn(ch); } }
    const wasScanned = !!k?.scanned_at && (k.tech ?? []).length > 0;
    const before = new Set((prev.get(t.key) ?? []).filter((x) => x.source === "site" && x.last_seen >= String(k?.scanned_at ?? "").slice(0, 10)).map((x) => x.tool));
    const added = wasScanned ? tools.filter((x) => !before.has(x)) : [];
    const removed = wasScanned ? [...before].filter((x) => !tools.includes(x)) : [];
    // Historique des outils
    if (tools.length) await admin.from("tech_seen").upsert(tools.map((tool) => ({ workspace_id: ws.id, key: t.key, tool, source: "site", first_seen: (prev.get(t.key) ?? []).find((x) => x.tool === tool)?.first_seen ?? d0, last_seen: d0 })), { onConflict: "workspace_id,key,tool" });
    await admin.from("company_scan").upsert({ workspace_id: ws.id, key: t.key, name: t.name, siren: t.siren, url: t.url, prospect_id: t.prospect_id, watch_id: t.watch_id, tech: tools, scanned_at: now, ...(ats ? { ats: ats.ats, ats_slug: ats.slug } : {}) });
    if (t.watch_id) await admin.from("radar_watch").update({ tech: tools, tech_at: now }).eq("id", t.watch_id);
    if (t.prospect_id) {
      const { data: p } = await admin.from("prospects").select("insight").eq("id", t.prospect_id).single();
      await admin.from("prospects").update({ insight: { ...((p?.insight as Record<string, unknown>) ?? {}), tech: tools, tech_at: now } }).eq("id", t.prospect_id);
    }
    const base = { company: t.name, url, source: "Site de l'entreprise", published: d0, siren: t.siren, prospect_id: t.prospect_id, raw: { tech: tools, ...(t.watch_id ? { watch: true } : {}) } };
    // Cliente d'un concurrent : son domaine dans la page, son nom dans le texte, ou un outil concurrent installé
    const text = textOf(html).toLowerCase();
    const byName = rivals.filter((r) => (r.host && html.toLowerCase().includes(r.host)) || (r.word.length > 4 && new RegExp(`\\b${r.word}\\b`, "i").test(text))).map((r) => r.name);
    const self = (x: string) => norm(x).split(" ")[0] === norm(t.name).split(" ")[0] || host(url).startsWith(norm(x).replace(/ /g, ""));
    const byTool = tools.filter((x) => rivalT.includes(x) && !self(x));
    const found = [...new Set([...byName.filter((x) => !self(x)), ...byTool])];
    if (found.length) out.push({ ...base, key: `tech:${t.key}:${found.map(norm).join("-")}`.slice(0, 300), kind: "client_concurrent", title: `${t.name} · utilise ${found[0]}`,
      summary: `${byTool.length ? `Outil installé sur son site : ${byTool.join(", ")}` : `Son site mentionne ${byName.join(", ")}`}${tools.length ? ` · autres outils : ${tools.filter((x) => !found.includes(x)).slice(0, 5).join(", ")}` : ""}`,
      why: `Elle travaille avec ${found[0]}. Ton dossier Espion sur ce concurrent te donne l'angle pour lui proposer de comparer.`, raw: { ...base.raw, concurrents: found } });
    // Changement d'outils : l'entreprise est en train de changer sa façon de travailler
    const meaningful = (x: string) => !["cms", "analytics", "pub", "consentement"].includes(catOf(x));
    const a2 = added.filter(meaningful), r2 = removed.filter(meaningful);
    if (a2.length || r2.length) out.push({ ...base, key: `outil:${t.key}:${d0.slice(0, 7)}:${[...a2, ...r2].map(norm).join("-")}`.slice(0, 300), kind: "outil",
      title: `${t.name} · ${a2.length ? `vient d'installer ${a2.join(", ")}` : `a retiré ${r2.join(", ")}`}`,
      summary: [a2.length ? `Nouveau sur son site : ${a2.map((x) => `${x} (${CAT_LABEL[catOf(x)] ?? ""})`).join(", ")}` : "", r2.length ? `Retiré : ${r2.join(", ")}` : ""].filter(Boolean).join(" · "),
      why: r2.some((x) => rivalT.includes(x)) ? `Elle vient de quitter ${r2.find((x) => rivalT.includes(x))} : elle cherche peut-être une solution de remplacement en ce moment.` : "Une entreprise qui change ses outils revoit sa façon de travailler : c'est le moment où elle écoute des propositions.",
      raw: { ...base.raw, ajoutes: a2, retires: r2 } });
  });
  return out;
}

// ---------------------------------------------------------------- Offres d'emploi (pages carrières)
/** Lit les offres d'emploi des entreprises dont on connaît la page carrières : postes « signal », volume, outils cités. */
export async function jobsScan(ws: W, postes: string[], opts: { max?: number; until?: number } = {}): Promise<Opp[]> {
  const until = opts.until ?? Date.now() + 40_000;
  const week = new Date(Date.now() - 6 * 864e5).toISOString();
  const { data } = await admin.from("company_scan").select("key, name, siren, url, prospect_id, watch_id, ats, ats_slug, jobs_at").eq("workspace_id", ws.id).not("ats_slug", "is", null).or(`jobs_at.is.null,jobs_at.lt.${week}`).order("jobs_at", { ascending: true, nullsFirst: true }).limit(opts.max ?? 30);
  const rivalT = await rivalTools(ws).catch(() => [] as string[]);
  const out: Opp[] = [];
  const d0 = today();
  // Une page carrières partagée (groupe) n'est attribuée qu'à l'entreprise dont le nom correspond
  const { data: same } = await admin.from("company_scan").select("name, ats_slug").eq("workspace_id", ws.id).not("ats_slug", "is", null).limit(5000);
  const owner = new Map<string, string[]>();
  for (const r of (same ?? []) as { name: string; ats_slug: string }[]) (owner.get(r.ats_slug) ?? owner.set(r.ats_slug, []).get(r.ats_slug)!).push(r.name);
  const fits = (name: string, slug: string) => { const a = norm(name).replace(/ /g, ""), b = norm(slug).replace(/ /g, ""); return a.includes(b) || b.includes(a) || b.includes(norm(name).split(" ")[0]); };
  await pool(((data ?? []) as ScanRow[]).filter((c) => (owner.get(String(c.ats_slug)) ?? []).length < 2 || fits(c.name, String(c.ats_slug))), 5, until, async (c) => {
    const jobs = await jobsOf(c.ats as Ats, String(c.ats_slug));
    await admin.from("company_scan").update({ jobs_at: new Date().toISOString(), ...(jobs ? { jobs_n: jobs.length, jobs: jobs.slice(0, 60).map((j) => ({ title: j.title, url: j.url, date: j.date, place: j.place })) } : {}) }).eq("workspace_id", ws.id).eq("key", c.key);
    if (!jobs?.length) return;
    // Outils cités dans les offres = preuve qu'ils sont utilisés
    const named = [...new Set(jobs.flatMap((j) => toolsNamed(`${j.title} ${j.text}`)))];
    if (named.length) {
      const { data: had } = await admin.from("tech_seen").select("tool, first_seen, source").eq("workspace_id", ws.id).eq("key", c.key);
      const old = new Map(((had ?? []) as { tool: string; first_seen: string; source: string }[]).map((h) => [h.tool, h]));
      await admin.from("tech_seen").upsert(named.map((tool) => ({ workspace_id: ws.id, key: c.key, tool, source: old.get(tool)?.source ?? "offre", first_seen: old.get(tool)?.first_seen ?? d0, last_seen: d0 })), { onConflict: "workspace_id,key,tool" });
    }
    const hits = jobs.map((j) => ({ j, poste: roleMatch(j.title, postes) })).filter((x) => x.poste) as { j: Job; poste: string }[];
    const base = { company: c.name, source: `Page carrières (${c.ats === "wttj" ? "Welcome to the Jungle" : c.ats})`, siren: c.siren, prospect_id: c.prospect_id };
    const usesRival = named.filter((x) => rivalT.includes(x));
    if (hits.length) {
      const latest = hits.map((h) => h.j.date).filter(Boolean).sort().at(-1) ?? d0;
      out.push({ ...base, key: `job:${c.key}:${hits.map((h) => norm(h.j.title)).sort().join("|")}`.slice(0, 300), kind: "recrutement",
        title: `${c.name} recrute : ${hits[0].j.title}${hits.length > 1 ? ` (+${hits.length - 1})` : ""}`,
        summary: `${hits.length} poste${hits.length > 1 ? "s" : ""} « ${[...new Set(hits.map((h) => h.poste))].join(", ")} » sur ${jobs.length} offre${jobs.length > 1 ? "s" : ""} ouverte${jobs.length > 1 ? "s" : ""}${named.length ? ` · outils cités : ${named.slice(0, 5).join(", ")}` : ""}`,
        why: `Une entreprise qui recrute « ${hits[0].poste} » a besoin des outils qui vont avec : la personne arrivera avec un budget et l'envie de bien démarrer.${usesRival.length ? ` Ses offres citent ${usesRival[0]}, ton concurrent.` : ""}`,
        url: hits[0].j.url || full(c.url), published: latest, raw: { offres: hits.slice(0, 8).map((h) => ({ title: h.j.title, url: h.j.url, date: h.j.date, place: h.j.place })), total: jobs.length, outils: named, ...(c.watch_id ? { watch: true } : {}) } });
    } else if (jobs.length >= 8) {
      out.push({ ...base, key: `jobs:${c.key}:${d0.slice(0, 7)}`, kind: "croissance", title: `${c.name} · ${jobs.length} postes ouverts`,
        summary: `${jobs.length} offres d'emploi ouvertes en ce moment (${jobs.slice(0, 3).map((j) => j.title).join(", ")}…)`, why: "Une entreprise qui recrute fort grandit vite : ses outils et ses prestataires actuels ne suivent souvent plus.",
        url: full(c.url), published: d0, raw: { total: jobs.length, outils: named, ...(c.watch_id ? { watch: true } : {}) } });
    }
  });
  return out;
}

// ---------------------------------------------------------------- Date anniversaire de l'abonnement concurrent
/** Première apparition d'un outil sur le site d'après les archives publiques du web (recherche par dichotomie, au mois près). */
export async function adoptedAt(url: string, tool: string, trace: string[] = []): Promise<string | null> {
  const fp = FP.find((f) => f.name === tool);
  if (!fp) return null;
  // Adresse finale de la page d'accueil (après redirections : agicap.com → agicap.com/fr/), c'est elle qu'archive le web
  const live = await fetch(full(url), { redirect: "follow", signal: AbortSignal.timeout(12000) }).catch(() => null);
  const fin = live?.url ? live.url.replace(/^https?:\/\//, "").replace(/[?#].*$/, "") : host(url);
  await live?.body?.cancel().catch(() => null);
  const h = fin.replace(/^www\./, "");
  const cdx = await fetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(h)}&output=json&fl=timestamp&filter=statuscode:200&collapse=timestamp:6&from=2016`, { signal: AbortSignal.timeout(15000) }).then((r) => r.ok ? r.json() : null).catch(() => null) as string[][] | null;
  const ts = (cdx ?? []).slice(1).map((r) => r[0]).filter(Boolean);
  trace.push(`${h} : ${ts.length} captures${cdx ? "" : " (archive injoignable)"}`);
  if (ts.length < 2) return null;
  const has = async (t: string) => { const r = await fetch(`https://web.archive.org/web/${t}id_/${full(h)}`, { signal: AbortSignal.timeout(12000) }).catch(() => null); const v = r?.ok ? fp.re.test((await r.text()).slice(0, 400_000)) : null; trace.push(`${t.slice(0, 6)}: ${v === null ? `erreur ${r?.status ?? "réseau"}` : v ? "oui" : "non"}`); return v; };
  // L'outil est-il dans la plus ancienne capture ? Alors on ne connaît que « avant » : pas de date fiable
  if (await has(ts[0])) return null;
  let lo = 0, hi = ts.length - 1;
  if (!(await has(ts[hi]))) return null; // pas visible dans l'archive récente
  for (let i = 0; i < 7 && hi - lo > 1; i++) {
    const mid = (lo + hi) >> 1;
    const v = await has(ts[mid]);
    if (v === null) { lo = mid; continue; }
    if (v) hi = mid; else lo = mid;
  }
  const t = ts[hi];
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8) || "01"}`;
}

/** Abonnements annuels chez un concurrent : date d'arrivée estimée, puis alerte 1 à 3 mois avant la date anniversaire. */
export async function anniversaries(ws: W, opts: { max?: number; until?: number } = {}): Promise<Opp[]> {
  const rivalT = await rivalTools(ws).catch(() => [] as string[]);
  if (!rivalT.length) return [];
  const until = opts.until ?? Date.now() + 40_000;
  const { data: todo } = await admin.from("tech_seen").select("key, tool").eq("workspace_id", ws.id).in("tool", rivalT).is("adopted_at", null).limit(opts.max ?? 3);
  if ((todo ?? []).length) {
    const { data: sc } = await admin.from("company_scan").select("key, url").eq("workspace_id", ws.id).in("key", (todo ?? []).map((t) => t.key));
    const urls = new Map(((sc ?? []) as { key: string; url: string }[]).map((s) => [s.key, s.url]));
    for (const t of (todo ?? []) as { key: string; tool: string }[]) {
      if (Date.now() > until) break;
      const u = urls.get(t.key);
      const d = u ? await adoptedAt(u, t.tool).catch(() => null) : null;
      await admin.from("tech_seen").update({ adopted: d, adopted_how: d ? "archive" : null, adopted_at: new Date().toISOString() }).eq("workspace_id", ws.id).eq("key", t.key).eq("tool", t.tool);
    }
  }
  // Alerte quand la prochaine date anniversaire tombe dans 30 à 100 jours
  const { data: rows } = await admin.from("tech_seen").select("key, tool, adopted").eq("workspace_id", ws.id).in("tool", rivalT).not("adopted", "is", null).limit(1000);
  if (!(rows ?? []).length) return [];
  const { data: sc2 } = await admin.from("company_scan").select("key, name, siren, url, prospect_id, watch_id").eq("workspace_id", ws.id).in("key", [...new Set((rows ?? []).map((r) => r.key))]);
  const co = new Map(((sc2 ?? []) as ScanRow[]).map((s) => [s.key, s]));
  const out: Opp[] = [];
  const now = Date.now();
  for (const r of (rows ?? []) as { key: string; tool: string; adopted: string }[]) {
    const a = new Date(r.adopted), next = new Date(a);
    next.setFullYear(new Date().getFullYear());
    if (next.getTime() < now) next.setFullYear(next.getFullYear() + 1);
    const days = (next.getTime() - now) / 864e5;
    const c = co.get(r.key);
    if (c && norm(c.name).split(" ")[0] === norm(r.tool).split(" ")[0]) continue; // le concurrent lui-même
    if (!c || days < 30 || days > 100 || next.getFullYear() - a.getFullYear() < 1) continue;
    const nd = next.toISOString().slice(0, 10);
    out.push({ key: `abo:${r.key}:${norm(r.tool)}:${nd.slice(0, 4)}`, kind: "abonnement", title: `${c.name} · abonnement ${r.tool} renouvelable vers ${moisFr(nd)}`, company: c.name,
      summary: `${r.tool} est apparu sur son site vers ${moisFr(r.adopted)} (archives du web). Date anniversaire probable : ${new Date(nd).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.`,
      why: `Les abonnements annuels se renouvellent à date anniversaire, souvent avec un préavis. C'est maintenant qu'elle peut comparer avant de reprendre ${r.tool} pour un an. Date estimée : à confirmer avec elle.`,
      url: `https://web.archive.org/web/*/${host(c.url)}`, source: "Archives du web (Internet Archive)", published: today(), deadline: nd, expires_at: nd, siren: c.siren, prospect_id: c.prospect_id,
      raw: { outil: r.tool, adopte: r.adopted, anniversaire: nd, ...(c.watch_id ? { watch: true } : {}) } });
  }
  return out;
}

// ---------------------------------------------------------------- Obligations réglementaires
// Textes vérifiés (novembre 2026). Les dates « prévues » dépendent de textes en cours : elles sont présentées comme telles.
export type Obligation = { id: string; titre: string; qui: string; tranches: string[]; date: string | null; statut: "en_vigueur" | "prevue" | "en_cours"; resume: string; source: string };
export const OBLIGATIONS: Obligation[] = [
  { id: "facture_pme", titre: "Facturation électronique : émission obligatoire pour les PME et micro-entreprises", qui: "PME et micro-entreprises", tranches: ["00", "01", "02", "03", "11", "12", "21", "22", "31", "32"], date: "2027-09-01", statut: "prevue",
    resume: "Depuis le 1er septembre 2026, toutes les entreprises doivent pouvoir recevoir des factures électroniques. Au 1er septembre 2027, les PME et micro-entreprises devront aussi les émettre, via une plateforme agréée.", source: "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises" },
  { id: "facture_ge", titre: "Facturation électronique : émission obligatoire pour les grandes entreprises et ETI", qui: "Grandes entreprises et ETI", tranches: ["41", "42", "51", "52", "53"], date: "2026-09-01", statut: "en_vigueur",
    resume: "Depuis le 1er septembre 2026, les grandes entreprises et les ETI doivent émettre leurs factures en format électronique via une plateforme agréée, et toutes les entreprises doivent pouvoir en recevoir.", source: "https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises" },
  { id: "nis2", titre: "Cybersécurité NIS 2", qui: "Entreprises moyennes et grandes de secteurs dits essentiels ou importants (50 salariés et plus)", tranches: ["21", "22", "31", "32", "41", "42", "51", "52", "53"], date: null, statut: "en_cours",
    resume: "La directive européenne NIS 2 impose gestion des risques cyber et déclaration des incidents. Sa loi de transposition est en cours d'examen au Parlement français ; l'ANSSI propose déjà un pré-enregistrement.", source: "https://cyber.gouv.fr/la-directive-nis-2" },
  { id: "transparence_salaires", titre: "Transparence des salaires (directive européenne)", qui: "Toutes les entreprises pour le recrutement ; rapport sur les écarts de salaire à partir de 100 salariés", tranches: ["22", "31", "32", "41", "42", "51", "52", "53"], date: "2027-01-01", statut: "prevue",
    resume: "Fourchette de salaire dans les offres, droit d'information des salariés et rapport sur les écarts femmes-hommes. Application en France annoncée pour 2027, transposition en cours.", source: "https://travail-emploi.gouv.fr" },
  { id: "index_egalite", titre: "Index de l'égalité professionnelle", qui: "Entreprises de 50 salariés et plus", tranches: ["21", "22", "31", "32", "41", "42", "51", "52", "53"], date: "03-01", statut: "en_vigueur",
    resume: "Calcul et publication chaque année au plus tard le 1er mars de l'index d'égalité femmes-hommes.", source: "https://travail-emploi.gouv.fr/index-de-legalite-professionnelle-calcul-et-questions-reponses" },
  { id: "decret_tertiaire", titre: "Décret tertiaire : réduction de la consommation d'énergie", qui: "Entreprises occupant 1 000 m² ou plus de bureaux, commerces ou entrepôts", tranches: ["21", "22", "31", "32", "41", "42", "51", "52", "53"], date: "09-30", statut: "en_vigueur",
    resume: "Déclaration annuelle des consommations sur la plateforme OPERAT avant le 30 septembre, objectif −40 % en 2030.", source: "https://operat.ademe.fr" },
  { id: "beges", titre: "Bilan carbone réglementaire (BEGES)", qui: "Entreprises de plus de 500 salariés", tranches: ["32", "41", "42", "51", "52", "53"], date: null, statut: "en_vigueur",
    resume: "Bilan des émissions de gaz à effet de serre et plan de transition, mis à jour tous les 4 ans.", source: "https://bilans-ges.ademe.fr" },
  { id: "accessibilite", titre: "Accessibilité numérique (European Accessibility Act)", qui: "Sites, applications et services numériques vendus aux particuliers (hors micro-entreprises)", tranches: ["11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"], date: null, statut: "en_vigueur",
    resume: "Depuis le 28 juin 2025, les services numériques grand public (e-commerce, banque, transport…) doivent être accessibles aux personnes handicapées.", source: "https://accessibilite.numerique.gouv.fr" },
  { id: "duerp", titre: "Document unique d'évaluation des risques (DUERP)", qui: "Tous les employeurs ; mise à jour annuelle à partir de 11 salariés", tranches: ["11", "12", "21", "22", "31", "32", "41", "42", "51", "52", "53"], date: null, statut: "en_vigueur",
    resume: "Évaluation écrite des risques professionnels, mise à jour au moins chaque année dans les entreprises de 11 salariés et plus, conservée 40 ans.", source: "https://travail-emploi.gouv.fr" },
  { id: "rgpd", titre: "RGPD : protection des données personnelles", qui: "Toutes les entreprises qui traitent des données de clients ou de salariés", tranches: [], date: null, statut: "en_vigueur",
    resume: "Registre des traitements, information des personnes, sécurité des données ; contrôles et sanctions de la CNIL.", source: "https://www.cnil.fr" },
];
/** Obligations trop générales pour être choisies automatiquement (le client peut les cocher lui-même). */
const GENERIC_OBL = ["rgpd", "duerp"];
const nextDate = (d: string | null) => {
  if (!d) return null;
  if (/^\d{4}-/.test(d)) return d;
  const [m, j] = d.split("-").map(Number), now = new Date();
  const x = new Date(Date.UTC(now.getFullYear(), m - 1, j));
  if (x.getTime() < now.getTime()) x.setUTCFullYear(now.getUTCFullYear() + 1);
  return x.toISOString().slice(0, 10);
};

/** Obligations que l'offre du client aide à respecter (choisies une fois), avec l'angle commercial. */
export async function obligationsFor(ws: W, force = false): Promise<{ id: string; angle: string }[]> {
  const c = ws.radar_cfg ?? {};
  if (!force && Array.isArray(c.obligations)) return c.obligations as { id: string; angle: string }[];
  const pr = ws.profile ?? {};
  const r = await askJson<{ obligations: { id: string; angle: string }[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""}
Parmi ces obligations réglementaires françaises, lesquelles cette offre aide-t-elle DIRECTEMENT ses clients à respecter (un client soumis à l'obligation a une vraie raison d'acheter) ? Sois strict : liste vide si aucune.
${OBLIGATIONS.filter((o) => !GENERIC_OBL.includes(o.id)).map((o) => `- ${o.id} : ${o.titre} — ${o.resume}`).join("\n")}
Pour chacune retenue : l'angle d'un message en une phrase (concret, sans exagérer les sanctions).
Format : {"obligations": [{"id": "", "angle": ""}]}`, { fast: true, maxTokens: 600 }).catch(() => ({ obligations: [] }));
  const ids = new Set(OBLIGATIONS.map((o) => o.id));
  const out = (r.obligations ?? []).filter((o) => ids.has(o.id) && !GENERIC_OBL.includes(o.id)).slice(0, 4).map((o) => ({ id: o.id, angle: String(o.angle ?? "").slice(0, 240) }));
  const { data } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  await admin.from("workspaces").update({ radar_cfg: { ...((data?.radar_cfg as Record<string, unknown>) ?? {}), obligations: out } }).eq("id", ws.id);
  return out;
}

/** Chaque semaine : des entreprises de tes cibles concernées par ces obligations (taille et secteur), avec l'échéance. */
export async function obligationSignals(ws: W, zone: string[]): Promise<Opp[]> {
  const c = ws.radar_cfg ?? {};
  if (c.oblig_at && String(c.oblig_at) > new Date(Date.now() - 6 * 864e5).toISOString()) return [];
  if (!(await aiRoom(ws.id, 0.8))) return [];
  const chosen = await obligationsFor(ws);
  const { data: cur } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  await admin.from("workspaces").update({ radar_cfg: { ...((cur?.radar_cfg as Record<string, unknown>) ?? {}), oblig_at: new Date().toISOString() } }).eq("id", ws.id);
  if (!chosen.length) return [];
  const targets = (ws.targets ?? []).filter((t) => t.actif !== false && t.naf?.length);
  const out: Opp[] = [];
  const week = Math.floor(Date.now() / (7 * 864e5));
  for (const ch of chosen) {
    const o = OBLIGATIONS.find((x) => x.id === ch.id)!;
    const due = nextDate(o.date);
    for (const t of targets.slice(0, 3)) {
      const tr = (t.tranches?.length ? t.tranches.filter((x) => !o.tranches.length || o.tranches.includes(x)) : o.tranches);
      if (o.tranches.length && t.tranches?.length && !tr.length) continue; // cible trop petite ou trop grande pour cette obligation
      const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
      const params: Record<string, string> = { activite_principale: t.naf.join(","), etat_administratif: "A", per_page: "6", page: String(1 + (week % 5)) };
      if (tr.length) params.tranche_effectif_salarie = tr.join(",");
      if (zone.length) params.departement = zone.slice(0, 10).join(",");
      for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
      const d = await fetch(u, { signal: AbortSignal.timeout(12000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
      await new Promise((x) => setTimeout(x, 200));
      // deno-lint-ignore no-explicit-any
      for (const h of (d?.results ?? []) as any[]) {
        const name = String(h.nom_complet ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m: string) => m.toUpperCase());
        out.push({ key: `oblig:${o.id}:${h.siren}`, kind: "obligation", title: `${name} · ${o.titre}`, company: name, siren: h.siren,
          summary: `${o.qui}. ${o.statut === "prevue" && due ? `Échéance prévue : ${new Date(due).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : o.statut === "en_cours" ? "Loi en cours d'adoption." : due ? `Prochaine échéance : ${new Date(due).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : "Obligation en vigueur."}`,
          why: ch.angle || o.resume, city: h.siege?.libelle_commune ?? "", dept: String(h.siege?.code_postal ?? "").slice(0, 2), url: o.source, source: "Texte officiel + registre des entreprises",
          published: today(), deadline: o.statut !== "en_cours" ? due : null, raw: { obligation: o.id, tranche: h.tranche_effectif_salarie, cible: t.label, statut: o.statut } });
      }
    }
  }
  return out.slice(0, 40);
}

// ---------------------------------------------------------------- Intentions publiques : demandes de recommandation, clients mécontents d'un concurrent
/** Chaque semaine (recherche web) : des entreprises qui demandent publiquement une solution comme la tienne, ou qui se plaignent d'un concurrent. */
export async function intentSignals(ws: W): Promise<Opp[]> {
  const c = ws.radar_cfg ?? {};
  if (c.intent_at && String(c.intent_at) > new Date(Date.now() - 7 * 864e5).toISOString()) return [];
  if (!(await aiRoom(ws.id, 0.6))) return [];
  const { data: cur } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  await admin.from("workspaces").update({ radar_cfg: { ...((cur?.radar_cfg as Record<string, unknown>) ?? {}), intent_at: new Date().toISOString() } }).eq("id", ws.id);
  const pr = ws.profile ?? {};
  const { data: comps } = await admin.from("competitors").select("name").eq("workspace_id", ws.id).neq("status", "ecarte").limit(8);
  const rivals = [...new Set([...((comps ?? []) as { name: string }[]).map((x) => x.name.replace(/\s*[—(].*$/, "").trim()), ...((c.outils_rivaux as string[] | undefined) ?? [])])].slice(0, 8);
  type S = { type: "demande" | "avis"; entreprise: string; fait: string; concurrent?: string; date: string; url: string; pourquoi: string };
  const r = await askJson<{ signaux: S[] }>(`Trouve sur le web (moins de 45 jours, en français, entreprises en France) des signaux d'achat publics pour cette offre.
Offre : ${pr.offre ?? ""} (${pr.nom ?? ws.name}) — Clients visés : ${(ws.targets ?? []).filter((t) => t.actif !== false).map((t) => t.label).join(" ; ") || "entreprises"}
${rivals.length ? `Concurrents : ${rivals.join(", ")}` : ""}

Types (6 recherches maximum) :
- "demande" : une entreprise (ou son dirigeant, au nom de l'entreprise) demande publiquement une recommandation ou cherche un prestataire / un outil comme cette offre (forum, groupe, publication publique, appel à prestataires sur un site) ;
${rivals.length ? `- "avis" : une entreprise identifiable se plaint publiquement d'un de ces concurrents ou cherche une alternative (avis signé d'une entreprise, publication, fil de discussion « alternative à … »).` : ""}
Règles strictes : chaque signal a l'URL exacte de la page publique qui le prouve ; l'entreprise doit être identifiable (nom d'entreprise, pas de nom de personne) ; n'invente rien ; 0 à 8 signaux ; liste vide si rien de fiable.
Format : {"signaux": [{"type": "demande", "entreprise": "", "fait": "une phrase", "concurrent": "", "date": "AAAA-MM-JJ", "url": "", "pourquoi": "une phrase : comment l'aborder"}]}`,
    { maxTokens: 4000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] }).catch(() => ({ signaux: [] as S[] }));
  return (r.signaux ?? []).filter((x) => (x.type === "demande" || (x.type === "avis" && rivals.length)) && /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(x.url ?? "") && x.entreprise && x.fait).slice(0, 8).map((x) => ({
    key: `intent:${x.type}:${norm(x.entreprise)}:${String(x.date ?? "").slice(0, 7)}`.slice(0, 300), kind: x.type,
    title: `${String(x.entreprise).slice(0, 120)} · ${x.type === "avis" ? `mécontente de ${x.concurrent || "son prestataire"}` : "cherche une solution"}`, company: String(x.entreprise).slice(0, 160),
    summary: String(x.fait).slice(0, 300), why: String(x.pourquoi ?? "").slice(0, 300), url: x.url,
    source: (() => { try { return new URL(x.url).hostname.replace(/^www\./, ""); } catch { return "web"; } })(),
    published: /^\d{4}-\d{2}-\d{2}$/.test(x.date ?? "") ? x.date : today(), raw: { presse: true, ...(x.concurrent ? { concurrent: x.concurrent } : {}) },
  }));
}

// ---------------------------------------------------------------- Anciens utilisateurs : un contact d'un de tes clients change d'entreprise
/** Un e-mail à un contact d'un de tes clients revient en erreur : il a probablement changé d'entreprise. On cherche où (pages professionnelles publiques). */
export async function championSignals(ws: W, opts: { max?: number } = {}): Promise<Opp[]> {
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const { data: msgs } = await admin.from("messages").select("prospect_id").eq("workspace_id", ws.id).eq("bounced", true).gte("created_at", since).limit(500);
  const ids = [...new Set(((msgs ?? []) as { prospect_id: string | null }[]).map((m) => m.prospect_id).filter(Boolean))] as string[];
  if (!ids.length) return [];
  const { data: ps } = await admin.from("prospects").select("id, name, contact_name, contact_role, insight, won_at, status").in("id", ids.slice(0, 300)).eq("workspace_id", ws.id);
  const todo = ((ps ?? []) as { id: string; name: string; contact_name: string | null; contact_role: string | null; insight: Record<string, unknown> | null; won_at: string | null; status: string }[])
    .filter((p) => (p.won_at || p.status === "client") && p.contact_name && !(p.insight as { champion_at?: string } | null)?.champion_at).slice(0, opts.max ?? 3);
  const out: Opp[] = [];
  for (const p of todo) {
    if (!(await aiRoom(ws.id, 0.7))) break;
    const r = await askJson<{ trouve: boolean; entreprise: string; poste: string; url: string; depuis: string }>(`${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}, travaillait chez ${p.name} (France). Son adresse e-mail professionnelle ne fonctionne plus.
Cherche sur le web (pages professionnelles publiques : site d'entreprise, annonce de nomination, presse) s'il ou elle a rejoint une autre entreprise. Ne réponds que si c'est clairement la même personne.
Format : {"trouve": false, "entreprise": "", "poste": "", "url": "", "depuis": "AAAA-MM"}`, { maxTokens: 1200, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] }).catch(() => null);
    await admin.from("prospects").update({ insight: { ...(p.insight ?? {}), champion_at: new Date().toISOString(), ...(r?.trouve ? { champion: { entreprise: r.entreprise, url: r.url } } : {}) } }).eq("id", p.id);
    if (r?.trouve && r.entreprise && /^https?:\/\//.test(r.url ?? "") && norm(r.entreprise) !== norm(p.name)) {
      out.push({ key: `champion:${p.id}:${norm(r.entreprise)}`.slice(0, 300), kind: "champion", title: `${r.entreprise} · ${p.contact_name} y est arrivé(e)`, company: r.entreprise,
        summary: `${p.contact_name}, qui utilisait ton offre chez ${p.name}, est maintenant ${r.poste || "en poste"} chez ${r.entreprise}${r.depuis ? ` (depuis ${r.depuis})` : ""}.`,
        why: `Il ou elle connaît déjà ta valeur : c'est le prospect le plus facile à convertir. Félicite-le pour sa prise de poste et propose de mettre en place la même chose chez ${r.entreprise}.`,
        url: r.url, source: (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return "web"; } })(), published: today(), raw: { ancien_client: p.name, contact: p.contact_name, poste: r.poste } });
    }
  }
  return out;
}

// ---------------------------------------------------------------- Essais gratuits : plusieurs personnes d'une même entreprise s'inscrivent
export const FREE_MAIL = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|gmx|protonmail|proton|orange|wanadoo|free|sfr|neuf|laposte|bbox|numericable|club-internet|aliceadsl|tutanota|zoho|mail|yandex)\./i;

/** Domaines d'entreprise qui ont plusieurs inscriptions à l'essai gratuit du client (30 derniers jours). */
export async function trialSignals(ws: W): Promise<Opp[]> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const { data } = await admin.from("trial_signups").select("domain, n, first_at, last_at").eq("workspace_id", ws.id).gte("last_at", since).gte("n", 2).order("n", { ascending: false }).limit(30);
  const out: Opp[] = [];
  const { fetchHtml } = await import("./analyze.ts");
  for (const t of (data ?? []) as { domain: string; n: number; first_at: string; last_at: string }[]) {
    const html = await fetchHtml(`https://${t.domain}`).catch(() => "");
    const site = html.match(/property=["']og:site_name["'][^>]*content=["']([^"']{2,60})/i)?.[1] ?? html.match(/content=["']([^"']{2,60})["'][^>]*property=["']og:site_name/i)?.[1];
    const label = t.domain.split(".").slice(-2)[0];
    const name = (site ?? label.charAt(0).toUpperCase() + label.slice(1)).replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
    out.push({ key: `essai:${t.domain}:${String(t.first_at).slice(0, 7)}`, kind: "essai", title: `${name} · ${t.n} personnes à l'essai`, company: name,
      summary: `${t.n} inscriptions à ton essai gratuit avec une adresse @${t.domain} entre le ${new Date(t.first_at).toLocaleDateString("fr-FR")} et le ${new Date(t.last_at).toLocaleDateString("fr-FR")}.`,
      why: "Plusieurs personnes de la même entreprise testent ton produit : c'est un achat d'équipe en préparation. Propose une démo à l'équipe et une offre adaptée avant la fin de l'essai.",
      url: `https://${t.domain}`, source: "Ton essai gratuit", published: String(t.last_at).slice(0, 10), raw: { domaine: t.domain, inscriptions: t.n } });
  }
  return out;
}
