// Radar, étape 1 : comptes surveillés (site), recrutements France Travail, « tes 3 du jour », préparation d'un contact.
import { HttpError } from "./http.ts";
import { admin, aiRoom, env, log, quota, type Prospect, type Target, type Workspace } from "./core.ts";
import type { Opp } from "./radar-signals.ts";
import { lookup, norm } from "./radar-signals.ts";

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
export const WATCH_MAX: Record<string, number> = { essai: 20, solo: 50, pro: 100, equipe: 200, fondateur: 200 };

// ---------------------------------------------------------------- Comptes surveillés
/** Ajoute des entreprises à surveiller (nom, SIREN ou SIRET), vérifiées au registre officiel. */
export async function watchAdd(ws: Workspace & { plan?: string }, items: unknown) {
  const list = (Array.isArray(items) ? items : String(items ?? "").split(/[\n;]+/)).map((x) => String(x).trim()).filter((x) => x.length > 1).slice(0, 200);
  if (!list.length) throw new HttpError(400, "Indique au moins une entreprise");
  const { count } = await admin.from("radar_watch").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
  const max = WATCH_MAX[ws.plan ?? "essai"] ?? 50;
  let room = Math.max(0, max - (count ?? 0));
  if (!room) throw new HttpError(429, `Tu surveilles déjà ${max} entreprises, le maximum de ta formule`);
  const zone = (ws.zone ?? []).filter((d) => /^\d{2}$/.test(d));
  const added: string[] = [], missed: string[] = [];
  for (const it of list) {
    if (!room) { missed.push(`${it} (maximum atteint)`); continue; }
    const id = it.replace(/\s/g, "");
    let c = /^\d{9}(\d{5})?$/.test(id) ? await lookup(id.slice(0, 9)) : null;
    if (!c) {
      // Recherche par nom, dans la zone d'abord
      for (const d of [...zone.slice(0, 3), ""]) {
        const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
        u.searchParams.set("q", it); u.searchParams.set("per_page", "1"); u.searchParams.set("etat_administratif", "A");
        if (d) u.searchParams.set("departement", d);
        const r = await fetch(u, { signal: AbortSignal.timeout(12000) }).then((x) => x.ok ? x.json() : null).catch(() => null);
        const h = r?.results?.[0];
        if (h) { c = { siren: h.siren, nom: cap(h.nom_complet ?? it), naf: h.activite_principale ?? "", tranche: h.tranche_effectif_salarie ?? "", ville: cap(h.siege?.libelle_commune ?? ""), cp: h.siege?.code_postal ?? "" }; break; }
        await new Promise((x) => setTimeout(x, 200));
      }
    }
    if (!c) { missed.push(it); continue; }
    const { error } = await admin.from("radar_watch").upsert({ workspace_id: ws.id, siren: c.siren, name: c.nom, city: c.ville, dept: (c.cp ?? "").slice(0, 2), naf: c.naf }, { onConflict: "workspace_id,siren", ignoreDuplicates: true });
    if (!error) { added.push(c.nom); room--; }
  }
  if (added.length) await log(ws.id, "radar", `${added.length} entreprise${added.length > 1 ? "s" : ""} ajoutée${added.length > 1 ? "s" : ""} aux comptes surveillés`);
  return { added, missed };
}

/** Surveillance du site des comptes suivis : une page d'accueil qui change (nouvelle offre, recrutement, ouverture…). Gratuit, sans IA. */
export async function siteWatch(ws: Workspace): Promise<Opp[]> {
  const day = new Date(Date.now() - 20 * 36e5).toISOString();
  const { data } = await admin.from("radar_watch").select("id, siren, name, url, site_hash, dept, city").eq("workspace_id", ws.id).not("url", "is", null).or(`checked_at.is.null,checked_at.lt.${day}`).order("checked_at", { ascending: true, nullsFirst: true }).limit(15);
  if (!data?.length) return [];
  const { siteText, sha } = await import("./pro.ts");
  const out: Opp[] = [];
  for (const w of data as { id: string; siren: string; name: string; url: string; site_hash: string | null; dept: string; city: string }[]) {
    let text = "", hash = w.site_hash;
    try { text = await siteText(w.url); hash = text.length > 200 ? await sha(text) : w.site_hash; } catch { /* site illisible aujourd'hui */ }
    await admin.from("radar_watch").update({ checked_at: new Date().toISOString(), site_hash: hash }).eq("id", w.id);
    if (!w.site_hash || !hash || hash === w.site_hash) continue;
    const hints = [[/recrut|nous rejoindre|carri[eè]res?|offres? d'emploi/i, "parle de recrutement"], [/nouvel(le)? (agence|site|bureau|établissement)|ouverture|inaugur/i, "annonce une ouverture"], [/lev[ée]e de fonds|financement|investisseurs?/i, "parle de financement"], [/nouveau(x)? (service|offre|produit)|lancement/i, "lance une nouveauté"]]
      .filter(([re]) => (re as RegExp).test(text)).map(([, l]) => l as string);
    out.push({
      key: `site:${w.siren}:${new Date().toISOString().slice(0, 10)}`, kind: "site", title: `${w.name} · site modifié`, company: w.name,
      summary: hints.length ? `Sa page d'accueil a changé : elle ${hints.join(", ")}` : "Sa page d'accueil a changé depuis hier",
      why: "Un site qui bouge signale souvent une nouvelle offre, une réorganisation ou un recrutement : bon prétexte pour reprendre contact.",
      city: w.city, dept: w.dept, url: w.url, source: "Site de l'entreprise", published: new Date().toISOString().slice(0, 10), siren: w.siren, raw: { watch: true, indices: hints },
    });
  }
  return out;
}

// ---------------------------------------------------------------- France Travail : offres d'emploi officielles
let ftToken: { v: string; exp: number } | null = null;
export const ftReady = () => !!env("FT_CLIENT_ID") && !!env("FT_CLIENT_SECRET");
async function ftAuth() {
  if (ftToken && ftToken.exp > Date.now() + 60e3) return ftToken.v;
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: env("FT_CLIENT_ID"), client_secret: env("FT_CLIENT_SECRET"), scope: "api_offresdemploiv2 o2dsoffre" });
  const r = await fetch("https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`France Travail : connexion refusée (${r.status})`);
  ftToken = { v: j.access_token, exp: Date.now() + (Number(j.expires_in) || 1200) * 1000 };
  return ftToken.v;
}

/** Offres d'emploi des 7 derniers jours, dans la zone, pour les postes « signal » ; et toute offre d'un compte surveillé. */
export async function ftOffers(ws: Workspace, postes: string[], zone: string[]): Promise<Opp[]> {
  if (!ftReady() || !zone.length) return [];
  const token = await ftAuth();
  const now = new Date(), from = new Date(Date.now() - 7 * 864e5);
  const nafs = [...new Set((ws.targets ?? []).filter((t) => t.actif !== false).flatMap((t) => t.naf ?? []).map((n) => n.slice(0, 2)))];
  const { data: wl } = await admin.from("radar_watch").select("siren, name").eq("workspace_id", ws.id).limit(300);
  const watch = ((wl ?? []) as { siren: string; name: string }[]).map((w) => ({ ...w, n: norm(w.name).split(" ").filter((x) => x.length > 2).slice(0, 2).join(" ") })).filter((w) => w.n.length > 3);
  const seen = new Set<string>(), out: Opp[] = [];
  const get = async (params: Record<string, string>) => {
    const u = new URL("https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search");
    for (const [k, v] of Object.entries({ minCreationDate: iso(from), maxCreationDate: iso(now), range: "0-149", ...params })) u.searchParams.set(k, v);
    const r = await fetch(u, { headers: { authorization: `Bearer ${token}`, accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (r.status === 204) return [];
    if (!r.ok) throw new Error(`France Travail : recherche refusée (${r.status})`);
    return ((await r.json().catch(() => ({})))?.resultats ?? []) as Record<string, any>[]; // deno-lint-ignore no-explicit-any
  };
  const add = (o: Record<string, any>, why: string, watched = false) => { // deno-lint-ignore no-explicit-any
    const nom = String(o.entreprise?.nom ?? "").trim();
    if (!nom || seen.has(o.id)) return;
    seen.add(o.id);
    const cp = String(o.lieuTravail?.codePostal ?? ""), dept = cp.slice(0, 2) || String(o.lieuTravail?.libelle ?? "").slice(0, 2);
    out.push({
      key: `ft:${o.id}`, kind: "recrutement", title: cap(nom), company: cap(nom),
      summary: `Recrute : ${String(o.intitule ?? "").slice(0, 120)}${o.typeContratLibelle ? ` (${o.typeContratLibelle})` : ""}`,
      why, city: cap(String(o.lieuTravail?.libelle ?? "").replace(/^\d+\s*-\s*/, "")), dept: /^\d{2}$/.test(dept) ? dept : "",
      url: o.origineOffre?.urlOrigine || `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`, source: "France Travail (offres d'emploi officielles)",
      published: String(o.dateCreation ?? "").slice(0, 10) || null,
      raw: { ft: o.id, secteur: o.secteurActiviteLibelle ?? "", naf: o.secteurActivite ?? "", poste: o.intitule ?? "", ...(watched ? { watch: true } : {}),
        ...(o.contact?.nom ? { contact: { nom: cap(String(o.contact.nom).replace(/^(M\.|Mme|Madame|Monsieur)\s+/i, "")), role: "Recruteur (offre d'emploi)", source: "France Travail" } } : {}) },
    });
  };
  for (const d of zone.slice(0, 8)) {
    // 1. Postes « signal » (ceux qui révèlent un besoin de ton offre)
    for (const p of postes.slice(0, 3)) {
      const rows = await get({ departement: d, motsCles: p.slice(0, 60) }).catch((e) => { console.error("ft", e); return []; });
      for (const o of rows) if (!nafs.length || nafs.includes(String(o.secteurActivite ?? "").slice(0, 2))) add(o, "Elle recrute pour un poste lié à ce que tu vends : signe d'un besoin actuel et d'un budget.");
      await new Promise((x) => setTimeout(x, 350)); // limite de l'API : quelques appels par seconde
    }
  }
  // 2. Comptes surveillés : toute offre publiée, quel que soit le poste
  for (const w of watch.slice(0, 40)) {
    const rows = await get({ motsCles: w.n.slice(0, 40) }).catch(() => []);
    for (const o of rows) if (norm(String(o.entreprise?.nom ?? "")).includes(w.n)) { add(o, "Une entreprise que tu surveilles recrute : elle grandit ou se réorganise.", true); }
    await new Promise((x) => setTimeout(x, 350));
  }
  return out.slice(0, 120);
}

// ---------------------------------------------------------------- Préparer un contact à partir d'un signal (jamais d'envoi)
export async function prepareOpp(ws: Workspace, id: string) {
  const { radarToProspect } = await import("./radar.ts");
  const { draft, enrich } = await import("./agents.ts");
  const { data: o } = await admin.from("radar_opps").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!o) throw new HttpError(404, "Opportunité introuvable");
  if (o.kind === "appel_offres") throw new HttpError(400, "Un appel d'offres se traite en répondant à l'avis");
  const r = await radarToProspect(ws, o.id);
  const load = async () => (await admin.from("prospects").select("*").eq("id", r.prospect_id).single()).data as Prospect & { mission_id?: string | null };
  let p = await load();
  if (!p.mission_id) {
    const { data: ms } = await admin.from("missions").select("id, zone").eq("workspace_id", ws.id).eq("status", "active").order("created_at", { ascending: false });
    const m = (ms ?? []).find((x) => !(x.zone ?? []).length || (x.zone ?? []).includes(o.dept));
    if (m) await admin.from("prospects").update({ mission_id: m.id }).eq("id", p.id);
  }
  if (!p.enriched_at) {
    await quota(ws.id, "enquete", 40);
    const e = await enrich(p, ((ws.targets ?? []) as Target[]).find((x) => x.id === p.target)?.interlocuteur ?? "");
    await log(ws.id, "enquete", `${p.name} : ${e.email ? "e-mail trouvé" : "rien trouvé"} (Radar)`);
    p = await load();
  }
  const last = async () => (await admin.from("messages").select("id, subject, body, status").eq("prospect_id", p.id).eq("step", 0).order("created_at", { ascending: false }).limit(1)).data?.[0] ?? null;
  let msg = await last();
  if (!msg && p.email && ws.sender_name) {
    await quota(ws.id, "redaction", 80);
    await draft(ws, p);
    await log(ws.id, "redaction", `E-mail rédigé pour ${p.name} (Radar)`);
    msg = await last();
  }
  return {
    prospect: { id: p.id, name: p.name, contact_name: p.contact_name, contact_role: p.contact_role, email: p.email, phone: p.phone, website: p.website, linkedin_url: (p as { linkedin_url?: string }).linkedin_url ?? "" },
    message: msg, reason: !p.email ? "no_email" : !ws.sender_name ? "no_sender" : null,
  };
}

/** « Tes 3 entreprises à contacter aujourd'hui » : les plus chaudes, contact cherché et message préparé (à valider, jamais envoyé). */
export async function pickTop3(ws: Workspace) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: already } = await admin.from("radar_opps").select("id").eq("workspace_id", ws.id).eq("raw->>top_day", today).limit(3);
  if ((already ?? []).length >= 3) return { top: (already ?? []).length, prepared: 0 };
  const { data } = await admin.from("radar_opps").select("id, kind, company, score, raw").eq("workspace_id", ws.id).eq("status", "nouveau")
    .not("kind", "in", "(appel_offres,difficulte,salon,budget,besoin)").gte("score", 50).order("score", { ascending: false }).limit(10);
  const pick = (data ?? []).slice(0, 3 - (already ?? []).length) as { id: string; kind: string; company: string; score: number; raw: Record<string, unknown> }[];
  let prepared = 0;
  const room = await aiRoom(ws.id, 0.8);
  for (const o of pick) {
    await admin.from("radar_opps").update({ raw: { ...(o.raw ?? {}), top_day: today } }).eq("id", o.id);
    // Le message n'est préparé que s'il reste de la marge sur le budget IA du mois
    if (room) { try { await prepareOpp(ws, o.id); prepared++; } catch (e) { console.error("top3", o.id, (e as Error).message); } }
  }
  return { top: pick.length + (already ?? []).length, prepared };
}

// ---------------------------------------------------------------- Étape 3 : qui appeler, santé, toute la zone, jumeaux
/** Qui appeler : dirigeant au registre, recruteur de l'offre, ou service achats de l'acheteur public. Signale aussi les entreprises fermées. */
export async function whoToCall(ws: Workspace, max = 25) {
  const { data } = await admin.from("radar_opps").select("id, kind, siren, company, raw").eq("workspace_id", ws.id).eq("status", "nouveau").order("score", { ascending: false }).limit(200);
  const todo = ((data ?? []) as { id: string; kind: string; siren: string | null; company: string; raw: Record<string, unknown> | null }[]).filter((o) => !o.raw?.contact && !o.raw?.contact_checked);
  let n = 0;
  for (const o of todo) {
    let contact: Record<string, string> | null = null, ferme = false;
    if (o.kind === "appel_offres" || o.kind === "renouvellement" || o.kind === "budget") {
      contact = { nom: "Service de la commande publique", role: `Acheteur : ${o.company}`, source: "Avis officiel" };
    } else if (o.siren && n < max) {
      const c = await lookup(o.siren); n++;
      if (c?.dirigeant) contact = { nom: c.dirigeant, role: cap(c.role ?? "Dirigeant"), source: "Registre national des entreprises" };
      ferme = !!c?.ferme;
      await new Promise((x) => setTimeout(x, 160));
    } else if (!o.siren && n < max && o.company) {
      const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
      u.searchParams.set("q", o.company); u.searchParams.set("per_page", "1"); u.searchParams.set("etat_administratif", "A");
      const r = await fetch(u, { signal: AbortSignal.timeout(12000) }).then((x) => x.ok ? x.json() : null).catch(() => null); n++;
      const h = r?.results?.[0];
      if (h && norm(h.nom_complet ?? "").includes(norm(o.company).split(" ")[0] ?? "")) {
        // deno-lint-ignore no-explicit-any
        const b = (h.dirigeants ?? []).find((x: any) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire|suppl[ée]ant/i.test(x.qualite ?? ""));
        if (b) contact = { nom: cap(`${String(b.prenoms ?? "").split(" ")[0]} ${b.nom}`.trim()), role: cap(b.qualite ?? "Dirigeant"), source: "Registre national des entreprises" };
        await admin.from("radar_opps").update({ siren: h.siren }).eq("id", o.id);
      }
      await new Promise((x) => setTimeout(x, 160));
    } else continue;
    await admin.from("radar_opps").update({ raw: { ...(o.raw ?? {}), contact_checked: true, ...(contact ? { contact } : {}), ...(ferme ? { ferme: true } : {}) } }).eq("id", o.id);
  }
  return n;
}

/** Changements de dirigeant et déménagements dans toute la zone, chez les entreprises de tes secteurs (pas seulement tes prospects). */
export async function zoneEvents(ws: Workspace, activites: string[], zone: string[]): Promise<Opp[]> {
  if (!activites.length || !zone.length) return [];
  const { classifyBodacc, bodaccOpp, bodaccFetch } = await import("./radar-signals.ts");
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const rows = await bodaccFetch(`dateparution>=date'${since}' and familleavis in ("modification","vente") and (${zone.map((d) => `numerodepartement="${d}"`).join(" or ")}) and (${activites.map((a) => `search(listepersonnes,"${a.replace(/"/g, "")}") or search(listeetablissements,"${a.replace(/"/g, "")}")`).join(" or ")})`);
  const nafs = (ws.targets ?? []).filter((t) => t.actif !== false).flatMap((t) => t.naf ?? []).map((n) => n.slice(0, 4));
  const out: Opp[] = [];
  let looked = 0;
  for (const b of rows) {
    const c = classifyBodacc(b);
    if (!c || !["dirigeant", "demenagement"].includes(c.kind)) continue;
    const o = bodaccOpp(b, c);
    if (nafs.length && o.siren && looked < 30) {
      const r = await lookup(o.siren); looked++;
      if (!r?.naf || !nafs.includes(r.naf.slice(0, 4))) continue;
      o.raw = { ...o.raw, naf: r.naf, tranche: r.tranche, zone_entiere: true };
      await new Promise((x) => setTimeout(x, 160));
    } else if (nafs.length) continue;
    out.push(o);
  }
  return out.slice(0, 40);
}

/** Jumeaux de tes clients : même activité, même taille, même département. Ajoutés aux comptes surveillés (au plus 30). */
export async function findTwins(ws: Workspace & { radar_cfg?: Record<string, unknown> | null }) {
  const last = String(ws.radar_cfg?.twins_at ?? "");
  if (last && last > new Date(Date.now() - 7 * 864e5).toISOString()) return 0;
  const { data: cl } = await admin.from("prospects").select("siren, name").eq("workspace_id", ws.id).eq("status", "client").not("siren", "is", null).limit(10);
  const { count: have } = await admin.from("radar_watch").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("source", "jumeau");
  let room = Math.max(0, 30 - (have ?? 0)), added = 0;
  const { data: known } = await admin.from("prospects").select("siren").eq("workspace_id", ws.id).not("siren", "is", null).limit(5000);
  const skip = new Set(((known ?? []) as { siren: string }[]).map((k) => k.siren));
  for (const c of (cl ?? []) as { siren: string; name: string }[]) {
    if (!room) break;
    const me = await lookup(c.siren);
    if (!me?.naf) continue;
    const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    u.searchParams.set("activite_principale", me.naf); u.searchParams.set("etat_administratif", "A"); u.searchParams.set("per_page", "10");
    if (/^\d{2}/.test(me.cp)) u.searchParams.set("departement", me.cp.slice(0, 2));
    if (me.tranche && me.tranche !== "NN") u.searchParams.set("tranche_effectif_salarie", me.tranche);
    const r = await fetch(u, { signal: AbortSignal.timeout(12000) }).then((x) => x.ok ? x.json() : null).catch(() => null);
    for (const h of (r?.results ?? []) as { siren: string; nom_complet: string; siege?: { libelle_commune?: string; code_postal?: string } }[]) {
      if (!room || skip.has(h.siren) || h.siren === c.siren) continue;
      const { error } = await admin.from("radar_watch").upsert({ workspace_id: ws.id, siren: h.siren, name: cap(h.nom_complet), city: cap(h.siege?.libelle_commune ?? ""), dept: String(h.siege?.code_postal ?? "").slice(0, 2), naf: me.naf, source: "jumeau" }, { onConflict: "workspace_id,siren", ignoreDuplicates: true });
      if (!error) { added++; room--; skip.add(h.siren); }
    }
    await new Promise((x) => setTimeout(x, 300));
  }
  await admin.from("workspaces").update({ radar_cfg: { ...(ws.radar_cfg ?? {}), twins_at: new Date().toISOString() } }).eq("id", ws.id);
  if (added) await log(ws.id, "radar", `${added} entreprise${added > 1 ? "s" : ""} ressemblant à tes clients ajoutée${added > 1 ? "s" : ""} aux comptes surveillés`);
  return added;
}
