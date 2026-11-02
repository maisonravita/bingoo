// Radar, compléments : outils et prestataires visibles sur les sites (clients de tes concurrents), valeur estimée,
// partenaires apporteurs d'affaires et sociétés d'apport d'affaires, calendrier d'achat du secteur, acheteurs qui ont changé de prestataire.
import { admin, aiRoom, askJson, log, type Workspace } from "./core.ts";
import type { Opp } from "./radar-signals.ts";
import { norm } from "./radar-signals.ts";

const cap = (s: string) => String(s ?? "").toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

// ---------------------------------------------------------------- 1. Outils et prestataires visibles sur les sites
/** Outils courants repérables dans le code d'une page (sans IA). */
const TOOLS: [string, RegExp][] = [
  ["HubSpot", /js\.hs-scripts\.com|hs-analytics|hubspot/i], ["Salesforce", /salesforce|pardot/i], ["Pipedrive", /pipedrive/i],
  ["Lemlist", /lemlist/i], ["Waalaxy", /waalaxy/i], ["Calendly", /calendly\.com/i], ["Intercom", /intercom/i], ["Zendesk", /zendesk|zdassets/i],
  ["Crisp", /crisp\.chat/i], ["Axonaut", /axonaut/i], ["Sellsy", /sellsy/i], ["Brevo", /sendinblue|brevo/i], ["Mailchimp", /mailchimp|list-manage/i],
  ["Shopify", /cdn\.shopify|myshopify/i], ["WordPress", /wp-content|wp-includes/i], ["Wix", /wix\.com|wixstatic/i], ["Webflow", /webflow/i],
  ["Google Ads", /googleadservices|gtag\/js\?id=AW-/i], ["Meta Pixel", /connect\.facebook\.net|fbq\(/i], ["LinkedIn Insight", /snap\.licdn\.com/i],
  ["Doctolib", /doctolib/i], ["Malt", /malt\.fr/i], ["Welcome to the Jungle", /welcometothejungle/i], ["Indeed", /indeed\.com/i],
];

/** Lit le site des comptes surveillés et des prospects prioritaires : outils installés, concurrents cités (logo, lien, « partenaire de »). */
export async function techScan(ws: Workspace, max = 15) {
  const { fetchHtml, textOf } = await import("./analyze.ts");
  const [{ data: comps }, { data: wl }, { data: ps }] = await Promise.all([
    admin.from("competitors").select("name, url").eq("workspace_id", ws.id).neq("status", "ecarte"),
    admin.from("radar_watch").select("id, siren, name, url, tech_at").eq("workspace_id", ws.id).not("url", "is", null).order("tech_at", { ascending: true, nullsFirst: true }).limit(max),
    admin.from("prospects").select("id, name, siren, website, insight").eq("workspace_id", ws.id).not("website", "is", null).in("status", ["nouveau", "pret", "a_valider"]).order("score", { ascending: false, nullsFirst: false }).limit(200),
  ]);
  const rivals = ((comps ?? []) as { name: string; url: string }[]).map((c) => ({ name: c.name.replace(/\s*[—(].*$/, "").trim(), host: host(c.url), word: norm(c.name).split(" ")[0] })).filter((r) => r.host || r.word.length > 3);
  const todo: { kind: "watch" | "prospect"; id: string; siren: string | null; name: string; url: string }[] = [
    ...((wl ?? []) as { id: string; siren: string; name: string; url: string }[]).map((w) => ({ kind: "watch" as const, id: w.id, siren: w.siren, name: w.name, url: w.url })),
    ...((ps ?? []) as { id: string; name: string; siren: string | null; website: string; insight: Record<string, unknown> | null }[]).filter((p) => !(p.insight as { tech_at?: string } | null)?.tech_at).slice(0, Math.max(0, max - (wl ?? []).length)).map((p) => ({ kind: "prospect" as const, id: p.id, siren: p.siren, name: p.name, url: p.website })),
  ];
  const out: Opp[] = [];
  for (const t of todo) {
    let html = "";
    try { html = await fetchHtml(/^https?:/.test(t.url) ? t.url : `https://${t.url}`); } catch { /* site illisible */ }
    const tools = html ? TOOLS.filter(([, re]) => re.test(html)).map(([n]) => n) : [];
    const text = html ? textOf(html).toLowerCase() : "";
    const found = rivals.filter((r) => (r.host && html.toLowerCase().includes(r.host)) || (r.word.length > 4 && new RegExp(`\\b${r.word}\\b`, "i").test(text)));
    const now = new Date().toISOString();
    if (t.kind === "watch") await admin.from("radar_watch").update({ tech: tools, tech_at: now }).eq("id", t.id);
    else {
      const { data: p } = await admin.from("prospects").select("insight").eq("id", t.id).single();
      await admin.from("prospects").update({ insight: { ...((p?.insight as Record<string, unknown>) ?? {}), tech: tools, tech_at: now, ...(found.length ? { concurrent_site: found.map((f) => f.name) } : {}) } }).eq("id", t.id);
    }
    if (found.length) {
      out.push({
        key: `tech:${t.siren ?? norm(t.name)}:${found.map((f) => norm(f.name)).join("-")}`.slice(0, 300), kind: "client_concurrent", title: `${t.name} · cliente de ${found[0].name}`, company: t.name,
        summary: `Son site mentionne ${found.map((f) => f.name).join(", ")} (lien, logo ou « partenaire »)${tools.length ? ` · outils : ${tools.slice(0, 5).join(", ")}` : ""}`,
        why: `Elle travaille probablement avec ${found[0].name}. Ton dossier Espion sur ce concurrent te donne l'angle pour la convaincre de comparer.`,
        url: t.url, source: "Site de l'entreprise", published: now.slice(0, 10), siren: t.siren, prospect_id: t.kind === "prospect" ? t.id : null,
        raw: { tech: tools, concurrents: found.map((f) => f.name), ...(t.kind === "watch" ? { watch: true } : {}) },
      });
    }
    await new Promise((x) => setTimeout(x, 250));
  }
  return out;
}

// ---------------------------------------------------------------- 5. Valeur estimée de chaque opportunité
/** Valeur annuelle estimée : montant réel pour un marché public ; sinon panier moyen de tes clients (ou celui que tu as indiqué), ajusté à la taille. */
export async function estimateValues(ws: Workspace & { radar_cfg?: Record<string, unknown> | null }) {
  const set = Number(ws.radar_cfg?.panier ?? 0);
  let base = set;
  if (!base) {
    const { data: won } = await admin.from("prospects").select("deal_value").eq("workspace_id", ws.id).eq("status", "client").gt("deal_value", 0).limit(200);
    const v = ((won ?? []) as { deal_value: number }[]).map((x) => Number(x.deal_value)).sort((a, b) => a - b);
    base = v.length ? v[Math.floor(v.length / 2)] : 0;
  }
  const { data } = await admin.from("radar_opps").select("id, kind, raw, deadline, published").eq("workspace_id", ws.id).in("status", ["nouveau", "suivi"]).limit(1500);
  // Taille : tranche d'effectif INSEE → multiplicateur du panier moyen
  const mult = (tr: string) => ({ "00": 0.5, "01": 0.6, "02": 0.7, "03": 0.8, "11": 1, "12": 1.3, "21": 1.8, "22": 2.5, "31": 3.5, "32": 5, "41": 7, "42": 10, "51": 14, "52": 20 } as Record<string, number>)[tr] ?? 1;
  const ups: { id: string; raw: Record<string, unknown> }[] = [];
  for (const o of (data ?? []) as { id: string; kind: string; raw: Record<string, unknown> | null }[]) {
    const r = o.raw ?? {};
    let v = 0, how = "";
    if (o.kind === "renouvellement" && r.montant && r.duree_mois) { v = (Number(r.montant) / Number(r.duree_mois)) * 12; how = "montant réel du contrat en cours, ramené à l'année"; }
    else if (base && !["appel_offres", "difficulte", "salon", "budget", "site"].includes(o.kind)) { v = base * mult(String(r.tranche ?? "")); how = set ? "ton panier moyen, ajusté à sa taille" : "le panier moyen de tes clients, ajusté à sa taille"; }
    if (v > 0 && Math.round(v) !== Number(r.valeur ?? 0)) ups.push({ id: o.id, raw: { ...r, valeur: Math.round(v), valeur_how: how } });
  }
  for (const u of ups.slice(0, 400)) await admin.from("radar_opps").update({ raw: u.raw }).eq("id", u.id);
  return { estimées: ups.length, panier: base };
}

// ---------------------------------------------------------------- 4. Partenaires apporteurs d'affaires et sociétés d'apport d'affaires
type Partner = { label: string; naf: string[]; pourquoi: string; message: string };
/** Les métiers qui servent les mêmes clients que toi sans te concurrencer (déduits une fois de ton offre), puis les vraies entreprises de ta zone. */
export async function partnersRefresh(ws: Workspace & { radar_cfg?: Record<string, unknown> | null }) {
  const zone = (ws.zone ?? []).filter((d) => /^\d{2}$/.test(d));
  let types = (ws.radar_cfg?.partenaires ?? null) as Partner[] | null;
  if (!types?.length) {
    if (!(await aiRoom(ws.id, 0.8))) return { skipped: "budget" };
    const pr = ws.profile ?? {};
    const r = await askJson<{ partenaires: Partner[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""} — Clients visés : ${(ws.targets ?? []).map((t) => t.label).join(" ; ")}
Liste 4 à 6 types d'entreprises qui servent les MÊMES clients sans être concurrentes, et qui pourraient recommander cette offre (apporteurs d'affaires naturels). Exemple pour une entreprise de nettoyage : syndics de copropriété, gestionnaires d'immeubles, agences immobilières d'entreprise, architectes.
Pour chacun : 1 à 3 codes NAF exacts (format 68.32A), pourquoi en une phrase, et l'angle d'un premier message de partenariat en une phrase.
Format : {"partenaires": [{"label": "", "naf": ["68.32A"], "pourquoi": "", "message": ""}]}`, { fast: true, maxTokens: 1500 });
    types = (r.partenaires ?? []).map((p) => ({ ...p, naf: (p.naf ?? []).filter((n) => /^\d{2}\.\d{2}[A-Z]$/.test(n)).slice(0, 3) })).filter((p) => p.label && p.naf.length).slice(0, 6);
    await admin.from("workspaces").update({ radar_cfg: { ...(ws.radar_cfg ?? {}), partenaires: types } }).eq("id", ws.id);
  }
  const found: Record<string, unknown>[] = [];
  const search = async (params: Record<string, string>) => {
    const u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    for (const [k, v] of Object.entries({ etat_administratif: "A", per_page: "10", ...params })) u.searchParams.set(k, v);
    const r = await fetch(u, { signal: AbortSignal.timeout(12000) }).then((x) => x.ok ? x.json() : null).catch(() => null);
    await new Promise((x) => setTimeout(x, 200));
    return (r?.results ?? []) as { siren: string; nom_complet: string; activite_principale: string; tranche_effectif_salarie: string; siege?: { libelle_commune?: string; code_postal?: string }; dirigeants?: { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string }[] }[];
  };
  const pick = (h: Awaited<ReturnType<typeof search>>[number], type: string, pourquoi: string, message: string) => {
    const b = (h.dirigeants ?? []).find((x) => x.type_dirigeant === "personne physique" && x.nom && !/commissaire/i.test(x.qualite ?? ""));
    return { workspace_id: ws.id, siren: h.siren, name: cap(h.nom_complet), type, pourquoi, message, naf: h.activite_principale, tranche: h.tranche_effectif_salarie,
      city: cap(h.siege?.libelle_commune ?? ""), dept: String(h.siege?.code_postal ?? "").slice(0, 2), contact: b ? `${cap(`${String(b.prenoms ?? "").split(" ")[0]} ${b.nom}`)} (${cap(b.qualite ?? "dirigeant")})` : null };
  };
  // Partenaires naturels : plus grosses structures d'abord (tranches 11 et plus), dans chaque département de la zone
  for (const t of types) {
    for (const d of zone.slice(0, 4)) {
      for (const n of t.naf) {
        for (const h of await search({ activite_principale: n, departement: d, tranche_effectif_salarie: "11,12,21,22,31" })) found.push(pick(h, t.label, t.pourquoi, t.message));
      }
    }
  }
  // Sociétés d'apport d'affaires : intermédiaires commerciaux qui vendent des mises en relation
  for (const d of zone.slice(0, 4)) {
    for (const q of ["apport d'affaires", "apporteur d'affaires", "mise en relation commerciale"]) {
      for (const h of await search({ q, departement: d })) found.push(pick(h, "Société d'apport d'affaires", "Son métier est de présenter des clients à des entreprises comme la tienne, contre commission.", "Proposer un partenariat rémunéré à la commission sur les clients apportés."));
    }
  }
  // Dédoublonne, puis 20 au plus par type, les sociétés d'apport d'affaires en premier
  const dedup = [...new Map(found.reverse().map((f) => [f.siren as string, f])).values()];
  const perType = new Map<string, number>();
  const uniq = dedup.sort((x, y) => Number(y.type === "Société d'apport d'affaires") - Number(x.type === "Société d'apport d'affaires"))
    .filter((f) => { const n = perType.get(f.type as string) ?? 0; perType.set(f.type as string, n + 1); return n < 20; }).slice(0, 140);
  if (uniq.length) await admin.from("radar_partners").upsert(uniq, { onConflict: "workspace_id,siren", ignoreDuplicates: true });
  await admin.from("workspaces").update({ radar_cfg: { ...(ws.radar_cfg ?? {}), partenaires: types, partners_at: new Date().toISOString() } }).eq("id", ws.id);
  await log(ws.id, "radar", `${uniq.length} partenaires apporteurs d'affaires repérés dans ta zone`);
  return { types: types.length, partenaires: uniq.length };
}

// ---------------------------------------------------------------- 3. Calendrier d'achat du secteur
type Moment = { mois: number[]; titre: string; pourquoi: string; action: string; cible: string };
/** Les périodes où tes clients décident (budgets, renouvellements, saisons), déduites une fois de ton offre et de tes cibles. */
export async function buyingCalendar(ws: Workspace & { radar_cfg?: Record<string, unknown> | null }, force = false) {
  const cur = ws.radar_cfg?.calendrier as { at: string; moments: Moment[] } | undefined;
  if (!force && cur?.moments?.length && cur.at > new Date(Date.now() - 90 * 864e5).toISOString()) return cur;
  if (!(await aiRoom(ws.id, 0.8))) return cur ?? { at: "", moments: [] };
  const pr = ws.profile ?? {};
  const r = await askJson<{ moments: Moment[] }>(`Entreprise : ${pr.nom ?? ws.name} — Offre : ${pr.offre ?? ""} — Clients visés : ${(ws.targets ?? []).map((t) => t.label).join(" ; ")} — ${ws.radar_cfg?.marches === false ? "pas de marchés publics" : "répond aussi aux marchés publics"}
Donne 5 à 8 moments de l'année où ces clients décident ou renouvellent ce type d'achat en France (vote des budgets des collectivités, clôture d'exercice, rentrée, saisonnalité du secteur, salons, échéances réglementaires…).
Pour chacun : les mois concernés (1 à 12), un titre court, pourquoi en une phrase, l'action à mener et quand (ex. « se présenter 6 semaines avant »), et la cible concernée. N'invente pas de dates précises d'événements.
Format : {"moments": [{"mois": [12, 1], "titre": "", "pourquoi": "", "action": "", "cible": ""}]}`, { fast: true, maxTokens: 1800 });
  const cal = { at: new Date().toISOString(), moments: (r.moments ?? []).filter((m) => m.titre && (m.mois ?? []).every((x) => x >= 1 && x <= 12)).slice(0, 8) };
  await admin.from("workspaces").update({ radar_cfg: { ...(ws.radar_cfg ?? {}), calendrier: cal } }).eq("id", ws.id);
  return cal;
}

// ---------------------------------------------------------------- 6. Acheteurs qui ont changé de prestataire
/** Dans le marché public du secteur : acheteurs dont le dernier contrat a changé de titulaire (ouverts au changement), et ceux qu'un concurrent a perdus. */
export async function switchedBuyers(wsId: string) {
  const { data } = await admin.from("public_contracts").select("buyer_id, buyer_name, holder_name, holder_id, objet, notified, montant, fin").eq("workspace_id", wsId).eq("relevant", true).not("holder_id", "is", null).order("notified", { ascending: true }).limit(2000);
  const { data: comps } = await admin.from("competitors").select("name").eq("workspace_id", wsId).neq("status", "ecarte");
  const rivals = ((comps ?? []) as { name: string }[]).map((c) => norm(c.name).split(" ")[0]).filter((x) => x.length > 3);
  const by = new Map<string, { buyer_name: string | null; holder_name: string | null; holder_id: string; objet: string; notified: string; montant: number | null; fin: string | null }[]>();
  for (const c of (data ?? []) as { buyer_id: string }[] & Record<string, unknown>[]) { const k = String(c.buyer_id); by.set(k, [...(by.get(k) ?? []), c as never]); }
  const out: { buyer: string; avant: string; apres: string; objet: string; date: string; rival_perdu: boolean; montant: number | null }[] = [];
  for (const list of by.values()) {
    if (list.length < 2) continue;
    const last = list[list.length - 1], prev = list[list.length - 2];
    if (!last.holder_id || !prev.holder_id || last.holder_id.slice(0, 9) === prev.holder_id.slice(0, 9)) continue;
    out.push({ buyer: last.buyer_name ?? "Acheteur public", avant: prev.holder_name ?? "titulaire précédent", apres: last.holder_name ?? "nouveau titulaire", objet: last.objet, date: last.notified, montant: last.montant,
      rival_perdu: rivals.some((r) => norm(prev.holder_name ?? "").includes(r)) });
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 40);
}
