// Connecteur Bingoo! pour Claude, ChatGPT et tout client MCP (protocole Model Context Protocol, transport HTTP sans session).
// Adresse : /functions/v1/t/mcp/<clé>  (ou la clé en « Authorization: Bearer »). La clé se crée dans Bingoo! (Réglages > Connecteur).
// Aucun appel d'IA côté Bingoo! : c'est l'IA du client qui pose les questions, Bingoo! fournit les données.
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const SITE = "https://kairo.maisonravita.fr";
const CANAUX = ["seo", "reseaux", "prospection", "pub", "bouche"];
const TRIS = ["croissance", "revenu", "encaisse", "copiable", "recent"];

const INSTRUCTIONS = `Bingoo! est une base de SaaS avec leurs revenus VÉRIFIÉS chez leur outil de paiement (Stripe, Dodo, Lemon Squeezy… via TrustMRR) : MRR, argent encaissé, croissance, abonnés, visiteurs, comment ils trouvent leurs clients, à qui ils vendent, taille de l'équipe, niches précises, SaaS à vendre.
Pour « trouve-moi des SaaS qui scalent dans X » : appelle lister_niches si tu ne connais pas le slug de la niche, puis chercher_saas (tri « croissance », verifie=true). Donne toujours le revenu vérifié et la croissance, et le lien Bingoo! de chaque SaaS.
« mrr » est en dollars par mois. Une croissance très forte sur un petit revenu est fragile : dis-le. Un revenu vérifié n'est pas un bénéfice : il ne dit rien des marges.
Pour suivre un SaaS (alerte chaque lundi quand ses prix, son recrutement ou ses nouveautés bougent) : suivre_saas.`;

const outils = (niches: string[]) => [
  { name: "chercher_saas", description: "Cherche des SaaS dans Bingoo! avec des filtres. Renvoie pour chacun : revenu mensuel vérifié (mrr, en $), croissance sur 30 jours (%), argent encaissé sur 30 jours, abonnés, visiteurs, canaux d'acquisition, cible, équipe, niche, lien Bingoo!.",
    inputSchema: { type: "object", properties: {
      texte: { type: "string", description: "Mots-clés (anglais ou français) cherchés dans le nom et la description, ex. « pinterest », « invoice », « résumé|cv ». Expression régulière acceptée." },
      niche: { type: "string", enum: niches, description: "Micro-niche (voir lister_niches)." },
      pays: { type: "string", description: "Code pays à 2 lettres, ex. FR, US." },
      cible: { type: "string", enum: ["B2B", "B2C"], description: "Vend aux professionnels (B2B) ou aux particuliers (B2C)." },
      canal: { type: "string", enum: CANAUX, description: "Comment il trouve ses clients : seo (Google, blog, contenu), reseaux (TikTok, X, Instagram, Reddit, LinkedIn…), prospection (e-mails, messages, appels), pub (Google/Meta Ads, influenceurs), bouche (bouche-à-oreille, affiliation)." },
      mrr_min: { type: "number", description: "Revenu mensuel vérifié minimum ($)." },
      mrr_max: { type: "number", description: "Revenu mensuel vérifié maximum ($)." },
      croissance_min: { type: "number", description: "Croissance minimum du MRR sur 30 jours (%)." },
      verifie: { type: "boolean", description: "Seulement les SaaS au revenu vérifié (conseillé)." },
      solo: { type: "boolean", description: "Seulement ceux tenus par une seule personne." },
      recent: { type: "boolean", description: "Seulement ceux créés il y a moins de 12 mois." },
      a_vendre: { type: "boolean", description: "Seulement ceux mis en vente." },
      sans_concurrent_francais: { type: "boolean", description: "Niches sans SaaS français repéré." },
      tri: { type: "string", enum: TRIS, description: "croissance (qui scalent), revenu, encaisse (argent encaissé sur 30 jours), copiable (facile à copier), recent." },
      nombre: { type: "number", description: "Nombre de résultats (1 à 50, 10 par défaut)." },
    } } },
  { name: "fiche_saas", description: "Tout ce que Bingoo! sait d'un SaaS : revenus vérifiés par période (24 h à depuis le début), revenu par mois, croissance, abonnés, visiteurs, marge, prix, formules, version gratuite, promesse, cible, équipe, financement, technologies, canaux d'acquisition, mise en vente, et ce qui le rend facile ou non à copier.",
    inputSchema: { type: "object", properties: { domaine: { type: "string", description: "Adresse du SaaS, ex. url2pin.com" } }, required: ["domaine"] } },
  { name: "lister_niches", description: "Les micro-niches de SaaS (ex. « Humaniser les textes IA », « Pinterest ») avec, pour chacune : nombre de SaaS, nombre avec un revenu vérifié, revenu médian, revenu cumulé, croissance médiane, concurrents français, le plus gros SaaS.",
    inputSchema: { type: "object", properties: { tri: { type: "string", enum: ["rentables", "croissance", "mediane", "sans_fr"], description: "Ordre." }, nombre: { type: "number" } } } },
  { name: "classement", description: "Classement des SaaS au revenu vérifié : encaisse (le plus d'argent encaissé en 30 jours), mois (plus forte croissance du MRR en 30 jours), trimestre (croissance sur 3 mois), revenu (plus gros MRR), jeunes (créés il y a moins d'un an).",
    inputSchema: { type: "object", properties: { type: { type: "string", enum: ["encaisse", "mois", "trimestre", "revenu", "jeunes"] }, nombre: { type: "number" } }, required: ["type"] } },
  { name: "saas_a_vendre", description: "Les SaaS à vendre : prix demandé, revenu mensuel (vérifié ou déclaré), multiple, offres reçues, message du vendeur, lien pour faire une offre.", inputSchema: { type: "object", properties: { nombre: { type: "number" } } } },
  { name: "suivre_saas", description: "Ajoute un SaaS aux suivis du compte Bingoo! : alerte chaque lundi quand ses prix, son recrutement ou ses nouveautés bougent.", inputSchema: { type: "object", properties: { domaine: { type: "string" } }, required: ["domaine"] } },
  { name: "mes_suivis", description: "Les SaaS et catégories suivis par le compte Bingoo!.", inputSchema: { type: "object", properties: {} } },
];

const lien = (d: string) => `${SITE}/#/explorer/${d}`;
const nb = (v: unknown, def: number, max: number) => Math.max(1, Math.min(max, Math.round(Number(v ?? def)) || def));

async function appeler(admin: SupabaseClient, ws: string, nom: string, a: any) {
  if (nom === "chercher_saas") {
    const p: Record<string, unknown> = {};
    for (const k of ["texte", "niche", "pays", "cible", "canal", "mrr_min", "mrr_max", "croissance_min", "tri"]) if (a?.[k] != null && a[k] !== "") p[k] = a[k];
    for (const k of ["verifie", "solo", "recent", "a_vendre"]) if (a?.[k] === true) p[k] = "true";
    if (a?.sans_concurrent_francais === true) p.sans_fr = "true";
    p.nombre = nb(a?.nombre, 10, 50);
    const { data, error } = await admin.rpc("saas_recherche", { p });
    if (error) throw new Error(error.message);
    return { total: data.total, saas: (data.saas ?? []).map((s: any) => ({ ...s, lien_bingoo: lien(s.domaine), copier: `${SITE}/#/explorer/lancer?d=${s.domaine}` })) };
  }
  if (nom === "fiche_saas") {
    const d = String(a?.domaine ?? "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
    const { data: s } = await admin.from("saas").select("domaine, nom, statut, categorie, micro, description, cible, pays, prix_entree_eur, prix_affiche, gratuit, essai, sur_devis, formules, recrute, postes, nouveaute, succes, trustmrr, copiable, copiable_raisons, constructible, rang_web, lu_at").eq("domaine", d).maybeSingle();
    if (!s || ["pas_saas", "doublon"].includes(s.statut)) return { trouve: false, message: `${d} n'est pas dans Bingoo!. On peut l'ajouter depuis ${SITE}/#/explorer/chiffres?u=${d}` };
    const t = s.trustmrr ?? {};
    const { jours: _j, lu_at: _l, captures: _c, ...trustmrr } = t;
    return { ...s, trustmrr, revenu_par_jour_30j: t.jours ?? null, courbe_mensuelle: s.succes?.courbe ?? null, lien_bingoo: lien(d), copier: `${SITE}/#/explorer/lancer?d=${d}` };
  }
  if (nom === "lister_niches") {
    const { data } = await admin.rpc("saas_micro_stats");
    const k: Record<string, (x: any) => number> = { rentables: (x) => -x.n_rev, croissance: (x) => -(x.n_rev >= 3 ? x.crois_med ?? -999 : -999), mediane: (x) => -(x.n_rev >= 3 ? x.mrr_med ?? 0 : -1), sans_fr: (x) => (x.fr > 0 ? 1e9 : 0) - x.n_rev };
    const f = k[a?.tri] ?? k.rentables;
    return { niches: [...(data ?? [])].sort((x: any, y: any) => f(x) - f(y)).slice(0, nb(a?.nombre, 84, 84)).map((x: any) => ({ niche: x.slug, nom: x.nom, description: x.phrase, saas: x.n, avec_revenu_verifie: x.n_rev, revenu_median_mois: x.mrr_med, revenu_cumule_mois: x.mrr_total, croissance_mediane_30j: x.crois_med, concurrents_francais: x.fr, plus_gros: x.top?.[0] ?? null })) };
  }
  if (nom === "classement") {
    const { data } = await admin.rpc("saas_classement", { p_tri: a?.type ?? "encaisse" });
    return { classement: (data ?? []).slice(0, nb(a?.nombre, 20, 100)).map((x: any, i: number) => ({ rang: i + 1, nom: x.nom, domaine: x.domaine, mrr: x.mrr, encaisse_30j: x.j30, croissance_mrr_30j: x.crois_30j, croissance_3_mois: x.crois_3m, cree: x.fonde, verifie_le: x.verifie_at, paiement: x.paiement, lien_bingoo: lien(x.domaine) })) };
  }
  if (nom === "saas_a_vendre") {
    const { data } = await admin.rpc("saas_a_vendre", { ws });
    return { a_vendre: (data ?? []).slice(0, nb(a?.nombre, 20, 100)).map((x: any) => ({ nom: x.nom, domaine: x.domaine, ou: x.source === "trustmrr" ? "TrustMRR" : "annonce Bingoo!", prix_demande: x.prix, mrr: x.mrr ?? x.mrr_declare, revenu: x.mrr ? "vérifié" : x.mrr_declare ? "déclaré" : null, multiple: x.multiple, offres_recues: x.offres, message: x.message, faire_une_offre: x.offre_url ?? `${SITE}/#/explorer/vendre` })) };
  }
  if (nom === "suivre_saas") {
    const d = String(a?.domaine ?? "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase();
    const { data: s } = await admin.from("saas").select("id, nom").eq("domaine", d).eq("statut", "ok").maybeSingle();
    if (!s) return { ok: false, message: `${d} n'est pas (encore) dans Bingoo!.` };
    const { data: deja } = await admin.from("saas_suivis").select("id").eq("workspace_id", ws).eq("saas_id", s.id).maybeSingle();
    if (!deja) await admin.from("saas_suivis").insert({ workspace_id: ws, saas_id: s.id });
    return { ok: true, message: `${s.nom} est suivi : alerte chaque lundi s'il bouge.`, lien_bingoo: lien(d) };
  }
  if (nom === "mes_suivis") {
    const { data } = await admin.from("saas_suivis").select("categorie, saas:saas_id(nom, domaine)").eq("workspace_id", ws);
    return { suivis: (data ?? []).map((x: any) => x.saas ? { nom: x.saas.nom, domaine: x.saas.domaine, lien_bingoo: lien(x.saas.domaine) } : { categorie: x.categorie }) };
  }
  throw new Error(`Outil inconnu : ${nom}`);
}

const json = (o: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*", ...extra } });

export async function mcpBingoo(req: Request, admin: SupabaseClient, cleChemin: string | null) {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, mcp-session-id, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Connecteur Bingoo! : envoie des requêtes MCP en POST.", { status: 405, headers: { ...cors, Allow: "POST" } });
  const cle = cleChemin || (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const empreinte = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cle)))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const { data: k } = cle ? await admin.from("saas_api_cles").select("id, workspace_id, appels, revoquee").eq("empreinte", empreinte).maybeSingle() : { data: null };
  if (!k || k.revoquee) return json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Clé Bingoo! invalide ou révoquée : crée-en une dans Bingoo!, Réglages > Connecteur." } }, 401, cors);
  let corps: any; try { corps = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalide" } }, 400, cors); }
  const { data: microListe } = await admin.from("saas_micro").select("slug").order("ordre");
  const niches = (microListe ?? []).map((x: any) => x.slug);
  const traiter = async (m: any) => {
    if (!m || typeof m !== "object") return { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Requête invalide" } };
    if (m.id === undefined || m.id === null) return null; // notification : pas de réponse
    try {
      if (m.method === "initialize") return { jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params?.protocolVersion ?? "2025-03-26", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "Bingoo!", version: "1.0.0" }, instructions: INSTRUCTIONS } };
      if (m.method === "ping") return { jsonrpc: "2.0", id: m.id, result: {} };
      if (m.method === "tools/list") return { jsonrpc: "2.0", id: m.id, result: { tools: outils(niches) } };
      if (m.method === "tools/call") {
        await admin.from("saas_api_cles").update({ appels: (k.appels ?? 0) + 1, dernier_usage: new Date().toISOString() }).eq("id", k.id);
        if ((k.appels ?? 0) > 5000) throw new Error("Limite d'appels atteinte pour cette clé : écris à bingoo@maisonravita.fr.");
        const r = await appeler(admin, k.workspace_id, m.params?.name, m.params?.arguments ?? {});
        return { jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: JSON.stringify(r) }], structuredContent: r } };
      }
      if (m.method === "resources/list") return { jsonrpc: "2.0", id: m.id, result: { resources: [] } };
      if (m.method === "prompts/list") return { jsonrpc: "2.0", id: m.id, result: { prompts: [] } };
      return { jsonrpc: "2.0", id: m.id, error: { code: -32601, message: `Méthode inconnue : ${m.method}` } };
    } catch (e) {
      if (m.method === "tools/call") return { jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: `Erreur : ${(e as Error).message}` }], isError: true } };
      return { jsonrpc: "2.0", id: m.id, error: { code: -32603, message: (e as Error).message } };
    }
  };
  if (Array.isArray(corps)) {
    const r = (await Promise.all(corps.map(traiter))).filter(Boolean);
    return r.length ? json(r, 200, cors) : new Response(null, { status: 202, headers: cors });
  }
  const r = await traiter(corps);
  return r ? json(r, 200, cors) : new Response(null, { status: 202, headers: cors });
}
