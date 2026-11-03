// Extension Chrome : fiche Bingoo! de l'entreprise dont le client visite le site (signaux Radar, outils, contacts), ajout aux prospects.
import { HttpError } from "./http.ts";
import { admin, type Workspace } from "./core.ts";

// Domaine enregistrable : « gouv.fr », « co.uk »… comptent comme un seul suffixe (sinon tous les sites publics se confondraient)
const SUFFIX2 = /\.(gouv|asso|nom|presse|tm|com|net|org|ac|co|ltd|plc|me|sch|gov|edu|or|ne|go|in|qc|ab)\.[a-z]{2}$/i;
const base = (h: string) => { const x = h.toLowerCase().replace(/^www\./, "").split("."); return x.slice(SUFFIX2.test(h) ? -3 : -2).join("."); };
const esc = (v: string) => v.replace(/[%_\\]/g, "\\$&");
const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
const LABEL: Record<string, string> = { appel_offres: "Appel d'offres", renouvellement: "Contrat public à renouveler", dirigeant: "Nouveau dirigeant", demenagement: "Déménagement", creation: "Création", etablissement: "Nouvel établissement", recrutement: "Recrutement", croissance: "Croissance", levee: "Levée de fonds", client_concurrent: "Cliente d'un concurrent", abonnement: "Abonnement concurrent à renouveler", outil: "Changement d'outils", obligation: "Obligation réglementaire", visite: "A visité ton site", essai: "Équipe à l'essai", demande: "Cherche une solution", avis: "Mécontente d'un concurrent", champion: "Ancien utilisateur", site: "Site modifié", besoin: "Besoin exprimé", aide: "Aide publique", permis: "Permis de construire", budget: "Projet voté", salon: "Salon", difficulte: "Difficultés financières" };

/** Fiche de l'entreprise d'un site : ce que Bingoo! sait déjà, sinon le registre officiel et les outils du site. */
export async function extLookup(ws: Workspace, url: string) {
  let host = "";
  try { host = new URL(url).hostname; } catch { throw new HttpError(400, "Adresse invalide"); }
  if (!/\./.test(host) || /^(localhost|127\.)/.test(host)) throw new HttpError(400, "Ouvre le site d'une entreprise");
  if (/(^|\.)(linkedin\.com|google\.[a-z.]+|facebook\.com|instagram\.com|youtube\.com|x\.com|twitter\.com)$/i.test(host)) return { unsupported: true, message: "Bingoo! lit les sites d'entreprises. LinkedIn et les réseaux sociaux ne sont pas lus automatiquement." };
  const dom = base(host);
  const [{ data: comps }, { data: ps }, { data: scan }] = await Promise.all([
    admin.from("competitors").select("id, name, url").eq("workspace_id", ws.id).neq("status", "ecarte").ilike("url", `%${esc(dom)}%`).limit(1),
    admin.from("prospects").select("id, name, siren, city, status, contact_name, contact_role, email, phone, website, score").eq("workspace_id", ws.id).ilike("website", `%${esc(dom)}%`).limit(1),
    admin.from("company_scan").select("name, siren, tech, ats, jobs_n").eq("workspace_id", ws.id).ilike("url", `%${esc(dom)}%`).limit(1),
  ]);
  if (comps?.[0]) return { competitor: { id: comps[0].id, name: comps[0].name }, message: "C'est un de tes concurrents : son dossier complet est dans Espion." };
  const p = ps?.[0] ?? null;
  // Outils et nom de l'entreprise lus sur le site
  const { fetchHtml } = await import("./analyze.ts");
  const { toolsIn } = await import("./tech-fp.ts");
  const html = await fetchHtml(`https://${host}`).catch(() => "");
  const tools = (scan?.[0]?.tech as string[] | undefined)?.length ? scan![0].tech as string[] : toolsIn(html);
  const siteName = (html.match(/property=["']og:site_name["'][^>]*content=["']([^"']{2,60})/i)?.[1] ?? html.match(/<title[^>]*>([^<]{2,80})/i)?.[1] ?? dom.split(".")[0]).split(/\s[|–—-]\s/)[0].replace(/&amp;/g, "&").trim();
  // Registre officiel : SIREN, ville, dirigeant
  let reg: { siren: string; nom: string; ville: string; naf: string; dirigeant: string | null; role: string | null } | null = null;
  const siren = p?.siren ?? scan?.[0]?.siren ?? null;
  const { lookup } = await import("./radar-signals.ts");
  if (siren) { const c = await lookup(siren).catch(() => null); if (c) reg = { siren, nom: c.nom, ville: c.ville ?? "", naf: c.naf ?? "", dirigeant: c.dirigeant ?? null, role: c.role ?? null }; }
  else {
    const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    u.searchParams.set("q", siteName); u.searchParams.set("per_page", "3"); u.searchParams.set("etat_administratif", "A");
    const d = await fetch(u, { signal: AbortSignal.timeout(10000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
    // deno-lint-ignore no-explicit-any
    const h = ((d?.results ?? []) as any[]).find((x) => String(x.nom_complet ?? "").toLowerCase().includes(siteName.toLowerCase().split(/\s/)[0])) ?? null;
    if (h) {
      // deno-lint-ignore no-explicit-any
      const b = (h.dirigeants ?? []).find((x: any) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire/i.test(x.qualite ?? ""));
      reg = { siren: h.siren, nom: cap(h.nom_complet), ville: cap(h.siege?.libelle_commune ?? ""), naf: h.activite_principale ?? "", dirigeant: b ? cap(`${String(b.prenoms ?? "").split(" ")[0]} ${b.nom}`) : null, role: b ? cap(b.qualite ?? "Dirigeant") : null };
    }
  }
  // Signaux Radar sur cette entreprise
  const sir = p?.siren ?? reg?.siren ?? null;
  const name = p?.name ?? reg?.nom ?? siteName;
  let q = admin.from("radar_opps").select("kind, title, summary, why, score, deadline, created_at").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi", "ajoute"]).order("score", { ascending: false }).limit(5);
  // Sans SIREN : correspondance sur le nom complet (jamais sur un premier mot du type « Le » ou « Groupe »)
  q = sir ? q.eq("siren", sir) : q.ilike("company", esc(name.trim()));
  const { data: opps } = await q;
  const { data: contacts } = p ? await admin.from("contacts").select("name, role, email, email_status, linkedin_url").eq("prospect_id", p.id).limit(4) : { data: [] };
  const { data: cfg } = await admin.from("workspaces").select("radar_cfg").eq("id", ws.id).single();
  const rivals = ((cfg?.radar_cfg as { outils_rivaux?: string[] } | null)?.outils_rivaux ?? []);
  return {
    company: { name, siren: sir, city: p?.city ?? reg?.ville ?? "", naf: reg?.naf ?? "", site: host },
    prospect: p ? { id: p.id, status: p.status, email: p.email, phone: p.phone } : null,
    signals: ((opps ?? []) as { kind: string; title: string; summary: string; why: string; score: number; deadline: string | null }[]).map((o) => ({ label: LABEL[o.kind] ?? o.kind, title: o.title, why: o.why || o.summary, score: o.score, deadline: o.deadline })),
    tools, rival_tools: tools.filter((t) => rivals.includes(t)),
    contacts: (contacts ?? []).length ? contacts : reg?.dirigeant ? [{ name: reg.dirigeant, role: reg.role, email: "", email_status: "", linkedin_url: "" }] : [],
    hiring: scan?.[0]?.jobs_n ?? null,
  };
}

/** Ajoute l'entreprise du site visité aux prospects (registre officiel quand on la trouve). */
export async function extAdd(ws: Workspace, url: string) {
  const f = await extLookup(ws, url);
  if ("unsupported" in f || "competitor" in f) throw new HttpError(400, String((f as { message?: string }).message ?? "Impossible d'ajouter cette page"));
  if (f.prospect) return { prospect_id: f.prospect.id, existing: true };
  const c0 = (f.contacts as { name: string; role: string | null }[])[0];
  const { data, error } = await admin.from("prospects").insert({
    workspace_id: ws.id, target: "", name: f.company.name, siren: f.company.siren, city: f.company.city, website: `https://${f.company.site}`,
    contact_name: c0?.name ?? "", contact_role: c0?.role ?? "", source: "extension", notes: "Ajouté depuis l'extension Chrome Bingoo!",
  }).select("id").single();
  if (error) throw new HttpError(500, error.message);
  await admin.from("activity").insert({ workspace_id: ws.id, kind: "prospect", summary: `${f.company.name} ajouté depuis l'extension Chrome` });
  return { prospect_id: data.id, existing: false };
}
