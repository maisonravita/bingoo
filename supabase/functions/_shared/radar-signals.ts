// Radar V3 : nouvelles sources ouvertes et autorisées, score « entreprise chaude », filtre, apprentissage, alertes.
// - Renouvellements : données essentielles de la commande publique (DECP, data.economie.gouv.fr) : contrat attribué + durée → fin estimée.
// - Appels d'offres européens : TED (Journal officiel de l'UE), API publique.
// - Changement de dirigeant, déménagement, ouverture d'établissement, rachat : BODACC (annonces légales officielles),
//   sur les entreprises déjà dans tes prospects ; créations récentes dans tes secteurs cibles, dans ta zone.
// Rien n'est inventé : chaque signal pointe vers sa source officielle.
import { admin, log, type Workspace } from "./core.ts";

const DECP = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/decp-v3-marches-valides/records";
const BODACC = "https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records";
const TED = "https://api.ted.europa.eu/v3/notices/search";
const REGISTRY = "https://recherche-entreprises.api.gouv.fr/search";

export const norm = (s: string) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date | string, n: number) => new Date(new Date(d).getTime() + n * 864e5);
const addMonths = (d: Date | string, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const q = (s: string) => `"${String(s).replace(/"/g, "")}"`;
const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

export type Kind = "appel_offres" | "croissance" | "recrutement" | "besoin" | "renouvellement" | "dirigeant" | "demenagement" | "creation" | "site" | "levee" | "permis" | "aide" | "budget" | "salon" | "difficulte" | "client_concurrent" | "obligation" | "abonnement" | "outil" | "avis" | "etablissement" | "demande" | "champion" | "essai" | "visite";
export type Opp = {
  key: string; kind: Kind; title: string; company: string; summary: string; why?: string; city?: string; dept?: string; url: string; source: string;
  published?: string | null; deadline?: string | null; prospect_id?: string | null; raw?: Record<string, unknown>; siren?: string | null; expires_at?: string | null;
};
/** Candidat « marché public » soumis au tri de pertinence par l'IA. */
export type PublicItem = { opp: Opp; text: string };

async function getJson(u: string, init?: RequestInit) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(u, { ...init, headers: { accept: "application/json", ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(20000) }).catch(() => null);
    if (r?.status === 429) { await new Promise((x) => setTimeout(x, 1500 * (i + 1))); continue; }
    if (!r || !r.ok) return null;
    return await r.json().catch(() => null);
  }
  return null;
}
const ods = (base: string, p: Record<string, string>) => { const u = new URL(base); for (const [k, v] of Object.entries(p)) u.searchParams.set(k, v); return u.toString(); };
const parse = (s: unknown) => { if (!s) return null; if (typeof s === "object") return s as Record<string, unknown>; try { return JSON.parse(String(s)); } catch { return null; } };

/** Fiche registre (nom, activité NAF, effectif, ville) : API publique Recherche d'entreprises, mise en cache pendant l'analyse. */
type Company = { siren: string; nom: string; naf: string; tranche: string; ville: string; cp: string; dirigeant?: string; role?: string; ferme?: boolean };
const cache = new Map<string, Company | null>();
export async function lookup(id: string): Promise<Company | null> {
  const k = String(id ?? "").replace(/\D/g, "");
  if (k.length < 9) return null;
  if (cache.has(k)) return cache.get(k)!;
  const d = await getJson(`${REGISTRY}?q=${k}&per_page=1`);
  // deno-lint-ignore no-explicit-any
  const r = (d?.results ?? [])[0] as any;
  // Dirigeant (personne physique, hors commissaires aux comptes) : la personne à appeler
  // deno-lint-ignore no-explicit-any
  const boss = (r?.dirigeants ?? []).find((x: any) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire|suppl[ée]ant/i.test(x.qualite ?? ""));
  const c = r ? { siren: r.siren, nom: cap(r.nom_complet ?? ""), naf: r.activite_principale ?? "", tranche: r.tranche_effectif_salarie ?? "", ville: cap(r.siege?.libelle_commune ?? ""), cp: r.siege?.code_postal ?? "",
    dirigeant: boss ? cap(`${String(boss.prenoms ?? "").split(" ")[0]} ${boss.nom}`.trim()) : "", role: boss?.qualite ?? "", ferme: r.etat_administratif === "C" } : null;
  cache.set(k, c);
  return c;
}
async function lookupMany(ids: string[], conc = 3) {
  const out = new Map<string, Company | null>();
  const list = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < list.length; i += conc) {
    const part = list.slice(i, i + conc);
    const rs = await Promise.all(part.map((x) => lookup(x)));
    part.forEach((x, j) => out.set(x, rs[j]));
    await new Promise((x) => setTimeout(x, 450)); // l'API publique limite à 7 requêtes par seconde
  }
  return out;
}

// ---------------------------------------------------------------- 1. Renouvellements de marchés publics
/** Contrats attribués dont la fin estimée tombe dans 2 à 14 mois : on se présente AVANT le nouvel appel d'offres. */
export async function renewals(ws: Workspace, keywords: string[], zone: string[]): Promise<PublicItem[]> {
  if (!keywords.length || !zone.length) return [];
  const now = new Date();
  // fin = notification + durée ; on veut fin ∈ [J+2 mois, J+14 mois] → notification ∈ [J+2 mois − d, J+14 mois − d] pour chaque durée courante
  const span = [6, 12, 18, 24, 36, 48, 60].map((d) => `(dureemois=${d} and datenotification>=date'${iso(addMonths(now, 2 - d))}' and datenotification<=date'${iso(addMonths(now, 14 - d))}')`);
  const where = [
    `(${keywords.map((k) => `search(objet,${q(k)})`).join(" or ")})`,
    `(${span.join(" or ")})`,
    `(${zone.map((d) => `startswith(lieuexecution_code,${q(d)})`).join(" or ")})`,
  ].join(" and ");
  const d = await getJson(ods(DECP, { where, limit: "80", order_by: "montant desc", select: "id,objet,acheteur_id,acheteur_nom,titulaire_id_1,datenotification,dureemois,montant,lieuexecution_code,procedure,nature" }));
  // deno-lint-ignore no-explicit-any
  const rows = (d?.results ?? []) as any[];
  const seen = new Set<string>();
  return rows.flatMap((r) => {
    const end = addMonths(r.datenotification, Number(r.dureemois) || 0);
    const k = norm(`${r.acheteur_id} ${String(r.objet).slice(0, 60)}`);
    if (seen.has(k)) return []; seen.add(k);
    const contactBy = new Date(Math.max(addDays(end, -150).getTime(), addDays(now, 14).getTime()));
    const opp: Opp = {
      key: `decp:${r.id}:${r.acheteur_id}`.slice(0, 300), kind: "renouvellement",
      title: String(r.objet ?? "").replace(/\s+/g, " ").slice(0, 240), company: String(r.acheteur_nom ?? ""), summary: "",
      dept: String(r.lieuexecution_code ?? "").slice(0, 2), url: `https://data.economie.gouv.fr/explore/dataset/decp-v3-marches-valides/table/?q=${encodeURIComponent(r.id)}`,
      source: "Données essentielles de la commande publique (DECP)", published: r.datenotification, deadline: end.toISOString(), expires_at: contactBy.toISOString(),
      siren: String(r.acheteur_id ?? "").slice(0, 9) || null,
      raw: { fin: iso(end), notification: r.datenotification, duree_mois: r.dureemois, montant: r.montant, titulaire_id: r.titulaire_id_1 ? String(r.titulaire_id_1) : "", acheteur_id: r.acheteur_id, procedure: r.procedure, nature: r.nature },
    };
    return [{ opp, text: `[contrat en cours, fin estimée ${iso(end)}] ${opp.title}` }];
  });
}

/** Noms de l'acheteur et du titulaire actuel (registre), seulement pour les renouvellements retenus. */
export async function nameRenewals(opps: Opp[], rivals: string[]) {
  const ids = [...opps.map((o) => String(o.raw?.acheteur_id ?? "")), ...opps.map((o) => String(o.raw?.titulaire_id ?? ""))];
  const m = await lookupMany(ids.slice(0, 70));
  for (const o of opps) {
    const a = m.get(String(o.raw?.acheteur_id ?? "")), t = m.get(String(o.raw?.titulaire_id ?? ""));
    if (a) { o.company = o.company || a.nom; o.city = a.ville; }
    if (!o.company) o.company = "Acheteur public";
    const titulaire = t?.nom ?? "";
    const isRival = titulaire && rivals.some((r) => r && norm(titulaire).includes(r));
    const end = new Date(String(o.deadline));
    o.summary = [`Contrat de ${o.raw?.duree_mois} mois notifié le ${new Date(String(o.published)).toLocaleDateString("fr-FR")}`, o.raw?.montant ? `${Math.round(Number(o.raw.montant)).toLocaleString("fr-FR")} €` : "", titulaire ? `tenu par ${titulaire}${isRival ? " (ton concurrent)" : ""}` : ""].filter(Boolean).join(" · ");
    o.why = `Fin estimée ${end.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} : le nouvel appel d'offres sortira quelques mois avant. Présente-toi à l'acheteur maintenant, avant la rédaction du cahier des charges.`;
    o.raw = { ...o.raw, titulaire, titulaire_concurrent: !!isRival };
  }
}

// ---------------------------------------------------------------- 2a. Appels d'offres européens (TED)
export async function tedTenders(keywords: string[], zone: string[], europe: boolean): Promise<PublicItem[]> {
  if (!keywords.length) return [];
  const since = iso(addDays(new Date(), -30)).replace(/-/g, "");
  const countries = europe ? "FRA BEL LUX DEU ESP ITA NLD PRT" : "FRA";
  const query = `buyer-country IN (${countries}) AND notice-type IN (cn-standard cn-social) AND publication-date>=${since} AND (${keywords.map((k) => `notice-title ~ (${q(k)})`).join(" OR ")})`;
  const d = await getJson(TED, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, fields: ["notice-title", "buyer-name", "buyer-post-code", "buyer-country", "deadline-receipt-tender-date-lot", "publication-number", "publication-date"], limit: 50 }) });
  // deno-lint-ignore no-explicit-any
  const rows = (d?.notices ?? []) as any[];
  const now = Date.now();
  return rows.flatMap((n) => {
    const dl = (n["deadline-receipt-tender-date-lot"] ?? []).map((x: string) => new Date(x.slice(0, 10)).getTime()).filter((x: number) => x > now).sort()[0];
    if (!dl) return [];
    const country = String((n["buyer-country"] ?? [])[0] ?? "FRA");
    const dept = country === "FRA" ? String((n["buyer-post-code"] ?? [])[0] ?? "").slice(0, 2) : "";
    if (country === "FRA" && zone.length && !zone.includes(dept)) return [];
    const t = n["notice-title"] ?? {};
    const title = String(t.fra ?? t.eng ?? Object.values(t)[0] ?? "").split(" – ").slice(2).join(" – ") || String(t.fra ?? "");
    const buyer = Object.values(n["buyer-name"] ?? {}).flat()[0] as string ?? "";
    const pub = String(n["publication-number"]);
    const opp: Opp = {
      key: `ted:${pub}`, kind: "appel_offres", title: title.slice(0, 240), company: String(buyer).slice(0, 160),
      summary: country === "FRA" ? "Appel d'offres publié au Journal officiel de l'Union européenne" : `Appel d'offres européen (${country})`,
      dept, url: `https://ted.europa.eu/fr/notice/-/detail/${pub}`, source: "TED (Journal officiel de l'UE)",
      published: String(n["publication-date"] ?? "").slice(0, 10) || null, deadline: new Date(dl).toISOString(), expires_at: new Date(dl).toISOString(),
      raw: { ted: pub, pays: country },
    };
    return [{ opp, text: `[appel d'offres ouvert${country !== "FRA" ? `, ${country}` : ""}] ${opp.title}` }];
  });
}

// ---------------------------------------------------------------- 2b. Événements légaux (BODACC)
type Bodacc = { id: string; familleavis: string; commercant: string; registre: string[]; dateparution: string; ville: string; cp: string; numerodepartement: string; modificationsgenerales?: string; listepersonnes?: string; listeetablissements?: string; acte?: string; jugement?: string };
const bodaccUrl = (id: string) => `https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:${id}`;
const sirenOf = (b: Bodacc) => (b.registre ?? []).map((x) => x.replace(/\D/g, "")).find((x) => x.length === 9) ?? "";

/** Lecture d'une annonce : changement de dirigeant, déménagement, ouverture, rachat… ou null si sans intérêt commercial. */
function classify(b: Bodacc): { kind: Kind; title: string; summary: string; why: string } | null {
  const mod = parse(b.modificationsgenerales), pers = parse(b.listepersonnes)?.personne ?? {}, etab = parse(b.listeetablissements)?.etablissement ?? {}, acte = parse(b.acte) ?? {};
  const desc = String(mod?.descriptif ?? "").toLowerCase(), admin_ = String(pers.administration ?? "");
  const adr = (a: Record<string, string> | undefined) => a ? [a.numeroVoie, a.typeVoie, a.nomVoie, a.codePostal, a.ville].filter(Boolean).join(" ") : "";
  if (b.familleavis === "modification") {
    if (/administration/.test(desc) || /(pr[ée]sident|g[ée]rant|directeur)/i.test(admin_)) {
      // Seulement les vrais changements de direction : on retire les commissaires aux comptes
      const parts = admin_.split(/\s*;\s*/).filter((x) => x && !/commissaire aux comptes/i.test(x));
      const lead = parts.filter((x) => /(pr[ée]sident|g[ée]rant|directeur|dirigeant)/i.test(x));
      if (!lead.length) return null;
      // Une simple liste de la direction accompagnée d'un changement de commissaire aux comptes n'est pas un changement de dirigeant
      const changed = lead.some((x) => /(nomination|partant|modification|remplacement|d[ée]mission|nouveau|nouvelle)/i.test(x));
      if (!changed && /commissaire aux comptes/i.test(admin_)) return null;
      return { kind: "dirigeant", title: "Changement de dirigeant", summary: lead.join(" ; ").slice(0, 240), why: "Un nouveau dirigeant revoit souvent ses prestataires dans ses premiers mois : c'est le moment de se présenter." };
    }
    if (/adresse du si[eè]ge|transfert/.test(desc)) {
      return { kind: "demenagement", title: "Déménagement du siège", summary: `Nouvelle adresse : ${adr(pers.adresseSiegeSocial) || adr(etab.adresse) || b.ville}`.slice(0, 240), why: "Un déménagement entraîne de nouveaux besoins (locaux, services, fournisseurs) et remet les contrats en jeu." };
    }
    return null;
  }
  if (b.familleavis === "creation" || b.familleavis === "immatriculation") {
    const cat = String(acte?.creation?.categorieCreation ?? "");
    const second = /secondaire|ouverture/i.test(cat) || /secondaire/i.test(String(etab.qualiteEtablissement ?? ""));
    return { kind: second ? "etablissement" : "creation", title: second ? "Ouvre un nouvel établissement" : "Entreprise créée récemment", summary: [String(etab.activite ?? pers.activite ?? "").slice(0, 180), adr(etab.adresse)].filter(Boolean).join(" · "), why: second ? "Un nouveau site s'équipe et choisit ses prestataires dans les semaines qui suivent l'ouverture." : "Une entreprise qui démarre met en place ses fournisseurs et ses outils : être là dès le début." };
  }
  if (b.familleavis === "collective") {
    // Santé financière : on prévient, on ne pousse pas à vendre
    const j = parse(b.jugement) ?? {};
    const nat = String(j.nature ?? j.famille ?? "Procédure collective");
    if (/cl[ôo]ture|homologation|plan de (sauvegarde|redressement) arr[êe]t[ée]/i.test(nat)) return null;
    return { kind: "difficulte", title: "Difficultés financières", summary: nat.slice(0, 200), why: "Attention : entreprise en procédure collective. Vérifie sa capacité à payer avant d'investir du temps commercial." };
  }
  if (b.familleavis === "vente") {
    const act = String(etab.activite ?? "").trim();
    return { kind: "dirigeant", title: "Reprise ou rachat", summary: act ? `Rachat d'un fonds : ${act.slice(0, 160)}` : "Rachat d'un fonds de commerce publié au BODACC", why: "Un nouveau propriétaire réorganise et renégocie ses contrats." };
  }
  return null;
}

/** « Nomination du Directeur général : Billiard, Vincent » → « Vincent Billiard, Directeur général ». */
export function newLeader(text: string) {
  const parts = String(text ?? "").split(/\s*;\s*/).filter((x) => !/partant|commissaire/i.test(x));
  const p = parts.find((x) => /nomination|nouveau|nouvelle/i.test(x)) ?? parts.find((x) => /(pr[ée]sident|g[ée]rant|directeur)/i.test(x));
  const m = p?.match(/(pr[ée]sident[^:]*|g[ée]rant[^:]*|directeur[^:]*)\s*:\s*([^;]+)/i);
  if (!m) return null;
  const role = m[1].replace(/^(nomination|modification) d[eu]s?\s*/i, "").trim();
  const raw = m[2].trim();
  if (/\b(SAS|SARL|SA|HOLDING|GROUPE|SOCIETE)\b/.test(raw)) return null; // personne morale
  // Formats : « MOREL, Victor Antoine » ; « LIEGEOIS Baptiste » ; « AZOULAY Samuel, Amos » ; « EIKYO MANAGEMENT » (société : ignorée)
  const segs = raw.split(",").map((x) => x.trim()).filter(Boolean);
  const words = (segs[0] ?? "").split(/\s+/);
  const upper = words.filter((w) => w.length > 1 && w === w.toUpperCase());
  const lower = words.filter((w) => !(w.length > 1 && w === w.toUpperCase()));
  let nom = "", prenom = "";
  if (segs.length > 1 && (!upper.length || !lower.length)) { nom = segs[0]; prenom = segs[1].split(/\s+/)[0]; }
  else if (lower.length && upper.length) { nom = upper.join(" "); prenom = lower[0]; }
  else return null; // tout en majuscules sans prénom : c'est une société
  const name = cap(`${prenom} ${nom}`.trim());
  return name.length > 3 ? { nom: name, role: cap(role).slice(0, 60), source: "BODACC" } : null;
}

function toOpp(b: Bodacc, c: ReturnType<typeof classify>, prospect?: { id?: string | null; name: string; watch?: boolean }): Opp {
  return {
    key: `bodacc:${b.id}`, kind: c!.kind, title: `${prospect?.name || cap(b.commercant)} · ${c!.title}`.slice(0, 240), company: (prospect?.name || cap(b.commercant)).slice(0, 160),
    summary: c!.summary, why: c!.why, city: cap(b.ville ?? ""), dept: String(b.numerodepartement ?? "").slice(0, 3), url: bodaccUrl(b.id), source: "BODACC (annonces légales officielles)",
    published: b.dateparution, siren: sirenOf(b) || null, prospect_id: prospect?.id || null,
    raw: { bodacc: b.id, evenement: c!.title, ...(prospect?.watch ? { watch: true } : {}), ...(c!.kind === "dirigeant" && newLeader(c!.summary) ? { contact: newLeader(c!.summary) } : {}) },
  };
}

/** Signaux légaux sur les entreprises déjà dans tes prospects (pas encore contactées). */
export async function watchProspects(ws: Workspace, since: string): Promise<Opp[]> {
  const { data } = await admin.from("prospects").select("id, name, siren").eq("workspace_id", ws.id).not("siren", "is", null).in("status", ["nouveau", "pret", "a_valider", "sans_email"]).limit(1200);
  const { data: wl } = await admin.from("radar_watch").select("siren, name").eq("workspace_id", ws.id).limit(300);
  const watched = new Set(((wl ?? []) as { siren: string }[]).map((w) => w.siren));
  const by = new Map<string, { id?: string | null; name: string; siren: string; watch?: boolean }>();
  for (const w of (wl ?? []) as { siren: string; name: string }[]) if (/^\d{9}$/.test(w.siren)) by.set(w.siren, { name: w.name, siren: w.siren, watch: true });
  for (const p of (data ?? []) as { id: string; name: string; siren: string }[]) if (/^\d{9}$/.test(p.siren ?? "")) by.set(p.siren, { id: p.id, name: p.name, siren: p.siren, watch: watched.has(p.siren) });
  const ps = [...by.values()];
  const out: Opp[] = [];
  for (let i = 0; i < ps.length; i += 80) {
    const part = ps.slice(i, i + 80);
    const where = `dateparution>=date'${since}' and familleavis in ("modification","creation","vente","collective") and (${part.map((p) => `registre=${q(p.siren)}`).join(" or ")})`;
    const d = await getJson(ods(BODACC, { where, limit: "100", order_by: "dateparution desc" }));
    for (const b of (d?.results ?? []) as Bodacc[]) {
      const c = classify(b), p = by.get(sirenOf(b));
      if (c && p) out.push(toOpp(b, c, p));
    }
  }
  // Une entreprise = un signal par type (le plus récent), pas trois annonces du même changement
  const best = new Map<string, Opp>();
  const rank = (o: Opp) => `${String(o.published)}${/nomination/i.test(o.summary) ? "1" : "0"}`;
  for (const o of out.sort((a, b) => rank(b).localeCompare(rank(a)))) { const k = `${o.siren}:${o.kind}`; if (!best.has(k)) best.set(k, o); }
  return [...best.values()];
}

/** Créations et ouvertures récentes dans tes secteurs cibles, dans ta zone (sociétés uniquement, vérifiées au registre). */
export async function newCompanies(ws: Workspace, activites: string[], zone: string[]): Promise<Opp[]> {
  if (!activites.length || !zone.length) return [];
  const since = iso(addDays(new Date(), -30));
  const where = `dateparution>=date'${since}' and familleavis="creation" and (${zone.map((d) => `numerodepartement=${q(d)}`).join(" or ")}) and (${activites.map((a) => `search(listeetablissements,${q(a)})`).join(" or ")})`;
  const d = await getJson(ods(BODACC, { where, limit: "100", order_by: "dateparution desc" }));
  const HOLDING = /(holding|participations?|parts sociales|valeurs mobili[eè]res|soci[ée]t[ée] civile immobili[eè]re|\bsci\b)/i;
  const rows = ((d?.results ?? []) as Bodacc[]).filter((b) => {
    const act = String(parse(b.listeetablissements)?.etablissement?.activite ?? parse(b.listepersonnes)?.personne?.activite ?? "");
    return parse(b.listepersonnes)?.personne?.typePersonne === "pm" && sirenOf(b) && !HOLDING.test(`${b.commercant} ${act}`);
  });
  const nafs = (ws.targets ?? []).filter((t) => t.actif !== false).flatMap((t) => t.naf ?? []).map((n) => n.slice(0, 4));
  const reg = await lookupMany(rows.slice(0, 30).map(sirenOf));
  return rows.slice(0, 30).flatMap((b) => {
    const c = classify(b); if (!c) return [];
    const r = reg.get(sirenOf(b));
    // Activité vérifiée au registre : hors de tes cibles, ou introuvable alors que tes cibles sont précises → on ne garde pas
    if (nafs.length && (!r?.naf || !nafs.includes(r.naf.slice(0, 4)))) return [];
    const o = toOpp(b, c);
    o.raw = { ...o.raw, naf: r?.naf ?? "", tranche: r?.tranche ?? "" };
    return [o];
  });
}

// ---------------------------------------------------------------- 3. Score, date limite, filtre, apprentissage, alertes
const BASE: Record<Kind, number> = { appel_offres: 70, renouvellement: 66, besoin: 62, dirigeant: 58, demenagement: 54, recrutement: 52, creation: 48, croissance: 48, levee: 60, budget: 58, permis: 52, aide: 50, salon: 40, site: 38, difficulte: 10, client_concurrent: 60, obligation: 50, abonnement: 68, outil: 56, avis: 64, etablissement: 54, demande: 66, champion: 72, essai: 74, visite: 70 };
const TTL: Record<Kind, number> = { appel_offres: 30, renouvellement: 120, besoin: 30, dirigeant: 90, demenagement: 60, recrutement: 45, creation: 60, croissance: 90, levee: 90, budget: 180, permis: 120, aide: 90, salon: 60, site: 30, difficulte: 180, client_concurrent: 120, obligation: 120, abonnement: 100, outil: 60, avis: 60, etablissement: 90, demande: 30, champion: 120, essai: 30, visite: 21 };
export const KIND_LABEL: Record<Kind, string> = { appel_offres: "appel d'offres", renouvellement: "contrat public à renouveler", besoin: "besoin exprimé", dirigeant: "nouveau dirigeant", demenagement: "déménagement", recrutement: "recrutement", creation: "création ou ouverture", croissance: "croissance", levee: "levée de fonds", budget: "projet voté par une collectivité", permis: "permis de construire", aide: "aide publique reçue", salon: "salon professionnel", site: "site web modifié", difficulte: "difficultés financières", client_concurrent: "cliente d'un concurrent", obligation: "obligation réglementaire", abonnement: "abonnement concurrent à renouveler", outil: "changement d'outils", avis: "client mécontent d'un concurrent", etablissement: "nouvel établissement", demande: "demande de recommandation", champion: "ancien utilisateur dans une nouvelle entreprise", essai: "équipe à l'essai", visite: "visite de ton site" };

type Row = { id: string; kind: Kind; company: string; siren: string | null; status: string; published: string | null; created_at: string; deadline: string | null; expires_at: string | null; prospect_id: string | null; raw: Record<string, unknown> | null; score: number | null; alerted_at: string | null; feedback: string | null; title: string };

/** Ce que le Radar a appris de tes retours : par type de signal, combien jugés « pas pertinent », transformés en prospects, réponses, RDV. */
export async function learn(wsId: string) {
  const { data } = await admin.from("radar_opps").select("kind, status, feedback, prospect_id").eq("workspace_id", wsId).limit(3000);
  const rows = (data ?? []) as { kind: Kind; status: string; feedback: string | null; prospect_id: string | null }[];
  const pids = [...new Set(rows.map((r) => r.prospect_id).filter(Boolean))] as string[];
  const [{ data: ps }, { data: rep }, { data: mt }] = pids.length ? await Promise.all([
    admin.from("prospects").select("id, status").in("id", pids.slice(0, 1000)),
    admin.from("replies").select("prospect_id, class").in("prospect_id", pids.slice(0, 1000)),
    admin.from("meetings").select("prospect_id").in("prospect_id", pids.slice(0, 1000)),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const st = new Map(((ps ?? []) as { id: string; status: string }[]).map((p) => [p.id, p.status]));
  const pos = new Set(((rep ?? []) as { prospect_id: string; class: string }[]).filter((r) => ["interesse", "question", "prix", "rappel"].includes(r.class)).map((r) => r.prospect_id));
  const rdv = new Set(((mt ?? []) as { prospect_id: string }[]).map((r) => r.prospect_id));
  const by: Record<string, { vus: number; pas_pertinent: number; prospects: number; reponses: number; rdv: number }> = {};
  for (const r of rows) {
    const x = (by[r.kind] ??= { vus: 0, pas_pertinent: 0, prospects: 0, reponses: 0, rdv: 0 });
    x.vus++;
    if (r.feedback === "pas_pertinent") x.pas_pertinent++;
    if (r.prospect_id) { x.prospects++; if (pos.has(r.prospect_id) || st.get(r.prospect_id) === "client") x.reponses++; if (rdv.has(r.prospect_id) || st.get(r.prospect_id) === "client") x.rdv++; }
  }
  // Poids : on ne bouge qu'avec assez de retours ; les réponses et RDV comptent plus que les rejets.
  const poids: Record<string, number> = {};
  for (const [k, x] of Object.entries(by)) {
    const judged = x.pas_pertinent + x.prospects;
    if (judged < 5) { poids[k] = 1; continue; }
    const good = (x.reponses + 2 * x.rdv) / Math.max(1, x.prospects), bad = x.pas_pertinent / judged;
    poids[k] = Math.round(Math.min(1.35, Math.max(0.65, 1 + 0.5 * Math.min(1, good) - 0.45 * bad)) * 100) / 100;
  }
  return { by, poids };
}

/** Exemples rejetés récemment (« pas pertinent ») : donnés à l'IA pour qu'elle n'en reprenne pas de semblables. */
export async function rejected(wsId: string) {
  const { data } = await admin.from("radar_opps").select("title").eq("workspace_id", wsId).eq("feedback", "pas_pertinent").order("created_at", { ascending: false }).limit(12);
  return ((data ?? []) as { title: string }[]).map((r) => r.title.slice(0, 120));
}

/** Recalcule tout : expiration, filtre automatique, regroupement par entreprise, score expliqué, alertes urgentes. */
export async function rescore(ws: Workspace, poids: Record<string, number>) {
  const now = Date.now();
  const [{ data }, { data: ex }, { data: comp }] = await Promise.all([
    admin.from("radar_opps").select("id, kind, company, siren, status, published, created_at, deadline, expires_at, prospect_id, raw, score, alerted_at, feedback, title").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi", "ajoute", "filtre"]).limit(2000),
    admin.from("prospects").select("id, siren, name, status").eq("workspace_id", ws.id).in("status", ["client", "refus", "envoye", "repondu"]).limit(5000),
    admin.from("competitors").select("name, url").eq("workspace_id", ws.id).neq("status", "ecarte"),
  ]);
  const rows = (data ?? []) as Row[];
  const { data: wl } = await admin.from("radar_watch").select("siren").eq("workspace_id", ws.id).limit(300);
  const watched = new Set(((wl ?? []) as { siren: string }[]).map((w) => w.siren));
  const excl = new Map<string, string>();
  for (const p of (ex ?? []) as { id: string; siren: string | null; name: string; status: string }[]) {
    const why = p.status === "client" ? "déjà client" : p.status === "refus" ? "a déjà refusé" : "déjà contactée";
    if (p.siren) excl.set(`s:${p.siren}`, why); excl.set(`p:${p.id}`, why); if (p.name) excl.set(`n:${norm(p.name)}`, why);
  }
  const rivals = ((comp ?? []) as { name: string; url: string }[]).flatMap((c) => [norm(c.name).split(" ")[0], (() => { try { return new URL(c.url).hostname.replace(/^www\./, "").split(".")[0]; } catch { return ""; } })()]).filter((x) => x && x.length > 3);
  const tranches = new Set((ws.targets ?? []).filter((t) => t.actif !== false).flatMap((t) => (t as { tranches?: string[] }).tranches ?? []));
  const nafs = (ws.targets ?? []).filter((t) => t.actif !== false).flatMap((t) => t.naf ?? []).map((n) => n.slice(0, 4));
  const groupOf = (r: Row) => r.siren ? `s:${r.siren}` : `n:${norm(r.company).split(" ").slice(0, 3).join(" ")}`;
  const filterWhy = (r: Row) => {
    if (r.feedback === "pas_pertinent") return null;
    const pub = ["appel_offres", "renouvellement"].includes(r.kind);
    const hit = (r.siren && excl.get(`s:${r.siren}`)) || (r.prospect_id && excl.get(`p:${r.prospect_id}`)) || (!pub && excl.get(`n:${norm(r.company)}`));
    if (hit) return hit;
    if (!pub && rivals.some((v) => norm(r.company).split(" ").includes(v))) return "c'est un concurrent";
    if (r.raw?.ferme) return "entreprise fermée";
    const naf = String(r.raw?.naf ?? ""), tr = String(r.raw?.tranche ?? "");
    if (!pub && naf && nafs.length && !nafs.includes(naf.slice(0, 4))) return "hors de tes secteurs";
    if (!pub && r.kind !== "creation" && tr && tr !== "NN" && tranches.size && !tranches.has(tr)) return "taille hors cible";
    return null;
  };
  const expiry = (r: Row) => r.expires_at ?? (r.kind === "appel_offres" && r.deadline ? r.deadline : addDays(r.published ?? r.created_at, TTL[r.kind] ?? 60).toISOString());

  // Groupes : plusieurs signaux sur la même entreprise = entreprise chaude
  const live = rows.filter((r) => r.status !== "filtre");
  const groups = new Map<string, Row[]>();
  for (const r of live) { const g = groupOf(r); groups.set(g, [...(groups.get(g) ?? []), r]); }

  const updates: { id: string; score: number; score_why: string[]; group_key: string; status?: string; expires_at?: string }[] = [];
  const alerts: Row[] = [];
  for (const r of rows) {
    const exp = expiry(r);
    const g = groupOf(r);
    let status: string | undefined;
    if (new Date(exp).getTime() < now && ["nouveau", "suivi"].includes(r.status)) status = "expire";
    const fw = filterWhy(r);
    if (fw && ["nouveau", "suivi"].includes(r.status)) status = "filtre";
    if (!fw && r.status === "filtre") status = "nouveau"; // ne l'est plus (ex. prospect remis à « nouveau »)
    const why: string[] = [];
    let s = BASE[r.kind] ?? 50;
    why.push(cap(KIND_LABEL[r.kind] ?? r.kind));
    const age = (now - new Date(r.published ?? r.created_at).getTime()) / 864e5;
    if (r.kind !== "renouvellement") { if (age <= 7) { s += 10; why.push("signal de moins de 7 jours"); } else if (age <= 30) s += 4; else s -= 6; }
    const left = (new Date(exp).getTime() - now) / 864e5;
    if (left >= 0 && left <= 10) { s += 8; why.push(`à traiter avant le ${new Date(exp).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`); }
    const others = [...new Set((groups.get(g) ?? []).filter((x) => x.id !== r.id && x.kind !== r.kind && x.kind !== "difficulte").map((x) => x.kind))];
    const trouble = r.kind !== "difficulte" && (groups.get(g) ?? []).some((x) => x.kind === "difficulte");
    if (trouble) { s -= 35; why.push("attention : entreprise en difficultés financières"); }
    const watch = !!r.raw?.watch || watched.has(String(r.siren ?? ""));
    if (watch) { s += 12; why.push("compte que tu surveilles"); }
    if (others.length) { s += Math.min(30, 15 * others.length); why.push(`autre${others.length > 1 ? "s" : ""} signal${others.length > 1 ? "s" : ""} : ${others.map((k) => KIND_LABEL[k]).join(", ")}`); }
    if (r.prospect_id) { s += 4; why.push("déjà dans tes prospects"); }
    if (r.raw?.titulaire_concurrent) { s += 6; why.push("le contrat est tenu par un concurrent"); }
    if (r.kind === "besoin" && Number(r.raw?.pertinence) >= 75) { s += 6; why.push("demande très proche de ton offre"); }
    // Qualité propre à chaque signal : ce qui le rend fort ou faible
    const raw = (r.raw ?? {}) as Record<string, unknown>;
    if (r.kind === "recrutement") { const n = (raw.offres as unknown[] | undefined)?.length ?? 1; if (n >= 2) { s += Math.min(12, 4 * n); why.push(`${n} postes liés à ton offre`); } }
    if (r.kind === "croissance" && raw.total && !raw.offres) { s -= 10; why.push("recrute beaucoup, mais pas sur un poste lié à ton offre"); }
    if (r.kind === "visite") {
      if (raw.formulaire) { s += 20; why.push("a envoyé un formulaire sur ton site"); }
      if (raw.alternative) { s += 15; why.push(`compare ${raw.alternative} avec toi`); }
      else if ((raw.chaud as unknown[] | undefined)?.length) { s += 12; why.push("a regardé tes tarifs, ta démo ou ton contact"); }
      if (Number(raw.sessions) >= 3) { s += 6; why.push(`${raw.sessions} visites`); }
    }
    if (r.kind === "renouvellement" && raw.fin) { const m = (new Date(String(raw.fin)).getTime() - now) / (30 * 864e5); if (m >= 0 && m <= 4) { s += 10; why.push("le contrat se termine dans moins de 4 mois"); } else if (m > 10) s -= 8; }
    if (r.kind === "obligation") { if (raw.statut === "en_cours") s -= 6; else if (r.deadline) { const d = (new Date(r.deadline).getTime() - now) / 864e5; if (d >= 0 && d <= 180) { s += 8; why.push("échéance dans moins de 6 mois"); } } }
    if (r.kind === "salon") s -= 8;
    if (r.kind === "client_concurrent" && (raw.tech as string[] | undefined)?.length) s += 2;
    if ((raw.contact as { nom?: string } | undefined)?.nom) { s += 4; why.push("contact identifié"); } else if (!r.siren && !r.prospect_id && !["appel_offres", "renouvellement", "budget", "salon"].includes(r.kind)) s -= 4;
    const w = poids[r.kind] ?? 1;
    if (w !== 1) why.push(w > 1 ? "ce type de signal te réussit" : "ce type de signal te réussit moins");
    s = Math.max(1, Math.min(99, Math.round(s * w)));
    if (fw) why.unshift(`retiré automatiquement : ${fw}`);
    updates.push({ id: r.id, score: s, score_why: why, group_key: g, ...(status ? { status } : {}), ...(!r.expires_at ? { expires_at: exp } : {}) });
    const finalStatus = status ?? r.status;
    // Alerte : un appel d'offres qui ferme bientôt, ou une autre opportunité très chaude
    const urgentTender = r.kind === "appel_offres" && left >= 1 && left <= 10 && s >= 65;
    const watchNews = watch && r.kind !== "site" && age <= 14; // tout vrai mouvement d'un compte surveillé est signalé le jour même
    if (!r.alerted_at && finalStatus === "nouveau" && (urgentTender || watchNews || (r.kind !== "appel_offres" && r.kind !== "difficulte" && s >= 80))) alerts.push({ ...r, score: s });
  }
  for (let i = 0; i < updates.length; i += 400) await admin.rpc("radar_set_scores", { p: updates.slice(i, i + 400) });

  // Alertes : au plus 5 par analyse, les plus fortes d'abord. La cloche et l'e-mail du matin les reprennent.
  const seenG = new Set<string>();
  const top = alerts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).filter((a) => { const k = groupOf(a); if (seenG.has(k)) return false; seenG.add(k); return true; }).slice(0, 5);
  for (const a of top) {
    const urgent = a.kind === "appel_offres" && a.deadline ? ` — réponse attendue avant le ${new Date(a.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "";
    const w = a.raw?.watch || watched.has(String(a.siren ?? "")) ? "Compte surveillé · " : "";
    await log(ws.id, "radar_alerte", `${w}${a.company || a.title} : ${KIND_LABEL[a.kind]}${urgent} (score ${a.score})`);
  }
  if (top.length) await admin.from("radar_opps").update({ alerted_at: new Date().toISOString() }).in("id", top.map((a) => a.id));
  // Alerte instantanée dans Slack ou Teams, si le client a branché un webhook
  const hook = (ws as Workspace & { radar_cfg?: { webhook?: string | null } }).radar_cfg?.webhook;
  if (top.length && hook) {
    const { pushWebhook } = await import("./radar-plus.ts");
    await pushWebhook(hook, `Bingoo! Radar : ${top.length} opportunité${top.length > 1 ? "s" : ""} à traiter\n${top.map((a) => `• ${a.company || a.title} : ${KIND_LABEL[a.kind]} (score ${a.score})`).join("\n")}`).catch(() => false);
  }
  return { scored: updates.length, expired: updates.filter((u) => u.status === "expire").length, filtered: updates.filter((u) => u.status === "filtre").length, alerts: top.length };
}

/** Ajoute le signal sur la fiche du prospect, pour qu'Hugo s'en serve dans l'e-mail. */
export async function tagProspects(opps: Opp[]) {
  for (const o of opps.filter((x) => x.prospect_id)) {
    const { data: p } = await admin.from("prospects").select("signals").eq("id", o.prospect_id!).maybeSingle();
    const cur = ((p?.signals ?? []) as { type: string; label: string; url?: string }[]);
    if (cur.some((s) => s.url === o.url)) continue;
    await admin.from("prospects").update({ signals: [{ type: o.kind, label: `${o.raw?.evenement ?? KIND_LABEL[o.kind]} : ${o.summary}`.slice(0, 200), url: o.url, date: o.published }, ...cur].slice(0, 12) }).eq("id", o.prospect_id!);
  }
}

// Accès partagés pour l'étape 3 (toute la zone)
export const classifyBodacc = (b: Bodacc) => classify(b);
export const bodaccOpp = (b: Bodacc, c: ReturnType<typeof classify>) => toOpp(b, c);
export async function bodaccFetch(where: string) {
  const d = await getJson(ods(BODACC, { where, limit: "100", order_by: "dateparution desc" }));
  return (d?.results ?? []) as Bodacc[];
}
