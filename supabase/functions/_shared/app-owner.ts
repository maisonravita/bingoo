// Réglages d'un SaaS construit par Bingoo!, côté créateur : encaissement (Stripe), nom de domaine (Vercel), chiffres.
// deno-lint-ignore-file no-explicit-any
import { admin, ask, askJson } from "./core.ts";
import { HttpError } from "./http.ts";

// ---------------------------------------------------------------- Paiement
/** Branche le compte Stripe du créateur : la clé est vérifiée auprès de Stripe, gardée côté serveur, jamais renvoyée. */
export async function appPaiement(appId: string, b: any) {
  const { data: app } = await admin.from("saas_apps").select("paiement").eq("id", appId).single();
  const pay = { ...(app?.paiement ?? {}) } as any;
  if (b.cle !== undefined) {
    const cle = String(b.cle ?? "").trim();
    if (!cle) {
      await admin.from("saas_app_secrets").delete().eq("app_id", appId);
      Object.assign(pay, { actif: false, compte: null, test: null });
    } else {
      if (!/^(sk|rk)_(live|test)_[A-Za-z0-9]{20,}$/.test(cle)) throw new HttpError(400, "Clé Stripe invalide : elle commence par sk_live_, sk_test_, rk_live_ ou rk_test_");
      const r = await fetch("https://api.stripe.com/v1/account", { headers: { authorization: `Bearer ${cle}` } });
      const acc = await r.json().catch(() => ({}));
      if (!r.ok) throw new HttpError(400, `Stripe refuse cette clé : ${acc?.error?.message ?? r.status}`);
      await admin.from("saas_app_secrets").upsert({ app_id: appId, stripe_key: cle, maj: new Date().toISOString() });
      Object.assign(pay, { actif: true, test: cle.includes("_test_"), compte: acc?.settings?.dashboard?.display_name ?? acc?.business_profile?.name ?? acc?.email ?? acc?.id ?? null });
    }
  }
  if (b.actif !== undefined) {
    if (b.actif && !(await admin.from("saas_app_secrets").select("app_id").eq("app_id", appId).maybeSingle()).data) throw new HttpError(400, "Branche d'abord ton compte Stripe");
    pay.actif = !!b.actif;
  }
  // Modèle : abonnement mensuel (SaaS) ou paiement unique (appli web, accès à vie)
  if (b.modele !== undefined) pay.modele = b.modele === "unique" ? "unique" : "abonnement";
  if (b.essai_jours !== undefined) pay.essai_jours = Math.max(0, Math.min(60, Math.round(Number(b.essai_jours) || 0)));
  await admin.from("saas_apps").update({ paiement: pay }).eq("id", appId);
  return pay;
}

// ---------------------------------------------------------------- Nom de domaine (projet Vercel qui héberge Bingoo!)
async function vercelConf() {
  const env = (k: string) => Deno.env.get(k) ?? "";
  let token = env("VERCEL_TOKEN"), projet = env("VERCEL_PROJECT_ID"), equipe = env("VERCEL_TEAM_ID");
  if (!token || !projet) {
    const { data } = await admin.from("app_secrets").select("name, value").in("name", ["vercel_token", "vercel_project_id", "vercel_team_id"]);
    const m = Object.fromEntries((data ?? []).map((x) => [x.name, x.value]));
    token ||= m.vercel_token ?? ""; projet ||= m.vercel_project_id ?? ""; equipe ||= m.vercel_team_id ?? "";
  }
  if (!token || !projet) throw new HttpError(503, "Les noms de domaine personnalisés ne sont pas encore activés sur Bingoo! (accès Vercel à configurer).");
  return { token, projet, q: equipe ? `?teamId=${encodeURIComponent(equipe)}` : "" };
}
async function vercel(path: string, method = "GET", body?: unknown) {
  const c = await vercelConf();
  const r = await fetch(`https://api.vercel.com${path.replace("{p}", encodeURIComponent(c.projet))}${c.q}`, { method, headers: { authorization: `Bearer ${c.token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d };
}
const apex = (d: string) => d.split(".").length === 2;
const consignes = (d: string, v?: any[]) => [
  apex(d) ? { type: "A", nom: "@", valeur: "76.76.21.21" } : { type: "CNAME", nom: d.split(".")[0], valeur: "cname.vercel-dns.com" },
  ...(apex(d) ? [{ type: "CNAME", nom: "www", valeur: "cname.vercel-dns.com" }] : []),
  ...((v ?? []).map((x: any) => ({ type: x.type, nom: x.domain, valeur: x.value }))),
];

// Chez qui est le domaine (serveurs DNS publics) : pour ouvrir directement la bonne page de réglages
const REGISTRAIRES: [RegExp, string, (d: string) => string][] = [
  [/ovh\.(net|com|ca)/, "OVHcloud", (d) => `https://www.ovh.com/manager/#/web/domain/${d}/zone`],
  [/gandi\.net/, "Gandi", (d) => `https://admin.gandi.net/domain/dns/${d}/records`],
  [/ui-dns|ionos|1and1/, "IONOS", () => "https://my.ionos.fr/domains"],
  [/domaincontrol\.com/, "GoDaddy", (d) => `https://dcc.godaddy.com/control/dnsmanagement?domainName=${d}`],
  [/cloudflare\.com/, "Cloudflare", () => "https://dash.cloudflare.com/"],
  [/registrar-servers\.com/, "Namecheap", (d) => `https://ap.www.namecheap.com/Domains/DomainControlPanel/${d}/advancedns`],
  [/hostinger|dns-parking/, "Hostinger", () => "https://hpanel.hostinger.com/domains"],
  [/o2switch/, "o2switch", () => "https://www.o2switch.fr/"],
  [/googledomains|squarespace/, "Squarespace", () => "https://account.squarespace.com/domains"],
  [/awsdns/, "Amazon Route 53", () => "https://console.aws.amazon.com/route53/"],
];
export async function registraire(d: string) {
  try {
    const racine = d.split(".").slice(-2).join(".");
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(racine)}&type=NS`, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) });
    const ns = ((await r.json()).Answer ?? []).map((a: any) => String(a.data).toLowerCase()).join(" ");
    const m = REGISTRAIRES.find(([re]) => re.test(ns));
    return m ? { nom: m[1], lien: m[2](racine) } : ns ? { nom: null, lien: null } : null;
  } catch { return null; }
}

/** Vérifie toutes les heures les domaines en attente ; prévient le créateur quand son SaaS est en ligne. */
export async function appDomainesAttente() {
  const { data } = await admin.from("saas_apps").select("id, domaine, workspace_id, spec").eq("domaine_statut", "attente").not("domaine", "is", null).limit(50);
  let enLigne = 0;
  for (const a of (data ?? []) as any[]) {
    const r = await appDomaineVerifier(a.id).catch(() => null);
    if (r?.statut !== "ok") continue;
    enLigne++;
    const { teamAddress, sendSystem } = await import("./mail.ts");
    const { data: w } = await admin.from("workspaces").select("*").eq("id", a.workspace_id).single();
    const to = w ? await teamAddress(w as any).catch(() => null) : null;
    if (to) await sendSystem({ to, subject: `${a.spec?.nom ?? "Ton SaaS"} est en ligne sur ${a.domaine}`, text: `Bonne nouvelle : ton SaaS répond maintenant sur https://${a.domaine}/ (le certificat https est actif).\n\nTu peux partager cette adresse à tes premiers clients.`, key: `domaine-ok-${a.id}-${a.domaine}` }).catch(() => null);
  }
  return { verifies: (data ?? []).length, en_ligne: enLigne };
}

export async function appDomaine(appId: string, brut: unknown) {
  const { data: app } = await admin.from("saas_apps").select("domaine").eq("id", appId).single();
  const d = String(brut ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (app?.domaine && app.domaine !== d) {
    for (const x of [app.domaine, `www.${app.domaine}`]) await vercel(`/v9/projects/{p}/domains/${encodeURIComponent(x)}`, "DELETE").catch(() => null);
    await admin.from("saas_apps").update({ domaine: null, domaine_statut: null }).eq("id", appId);
  }
  if (!d) return { domaine: null };
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d) || /maisonravita\.fr$|vercel\.app$/.test(d)) throw new HttpError(400, "Nom de domaine invalide");
  const { data: pris } = await admin.from("saas_apps").select("id").eq("domaine", d).neq("id", appId).maybeSingle();
  if (pris) throw new HttpError(409, "Ce nom de domaine est déjà utilisé par une autre application");
  const r = await vercel("/v10/projects/{p}/domains", "POST", { name: d });
  if (!r.ok && r.d?.error?.code !== "domain_already_in_use_by_project" && !/already/i.test(r.d?.error?.message ?? "")) throw new HttpError(400, `Ajout impossible : ${r.d?.error?.message ?? r.status}`);
  if (apex(d)) await vercel("/v10/projects/{p}/domains", "POST", { name: `www.${d}`, redirect: d });
  await admin.from("saas_apps").update({ domaine: d, domaine_statut: "attente" }).eq("id", appId);
  return { domaine: d, statut: "attente", dns: consignes(d, r.d?.verification), registraire: await registraire(d) };
}

export async function appDomaineVerifier(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("domaine").eq("id", appId).single();
  const d = app?.domaine;
  if (!d) return { domaine: null };
  const p = await vercel(`/v9/projects/{p}/domains/${encodeURIComponent(d)}`);
  if (p.ok && p.d?.verified === false) await vercel(`/v9/projects/{p}/domains/${encodeURIComponent(d)}/verify`, "POST");
  const conf = await vercel(`/v6/domains/${encodeURIComponent(d)}/config`);
  const ok = p.ok && p.d?.verified !== false && conf.ok && conf.d?.misconfigured === false;
  await admin.from("saas_apps").update({ domaine_statut: ok ? "ok" : "attente" }).eq("id", appId);
  return { domaine: d, statut: ok ? "ok" : "attente", dns: consignes(d, p.d?.verification), registraire: ok ? null : await registraire(d) };
}

// ---------------------------------------------------------------- Chiffres
export async function appChiffres(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("spec, paiement").eq("id", appId).single();
  const { data: us } = await admin.from("saas_app_users").select("email, at, abonnement").eq("app_id", appId).not("email", "like", "demo-%@demo.local").limit(10000);
  const prix = Object.fromEntries((((app?.spec as any)?.formules ?? []) as any[]).map((f) => [f.nom, Number(f.prix) || 0]));
  const abonnes = (us ?? []).filter((u: any) => ["active", "past_due"].includes(u.abonnement?.statut));
  const essaiJours = Number((app?.paiement as any)?.essai_jours ?? 14);
  const essais = (us ?? []).filter((u: any) => !["active", "past_due"].includes(u.abonnement?.statut) && Date.now() - new Date(u.at).getTime() < essaiJours * 864e5).length;
  const { data: vis } = await admin.from("saas_app_visites").select("vues").eq("app_id", appId).gte("jour", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  return {
    visites_30j: (vis ?? []).reduce((a: number, v: any) => a + Number(v.vues ?? 0), 0),
    essais,
    comptes: (us ?? []).length,
    nouveaux_7j: (us ?? []).filter((u: any) => Date.now() - new Date(u.at).getTime() < 7 * 864e5).length,
    abonnes: abonnes.length,
    mrr: Math.round(abonnes.reduce((a: number, u: any) => a + (prix[u.abonnement?.formule] ?? 0), 0) * 100) / 100,
  };
}

// ---------------------------------------------------------------- Le jumeau : ce que sort le SaaS d'inspiration, à ajouter au sien
// Trois sources, de la plus sûre à la plus large :
// 1. ses nouvelles pages produit (plan du site), 2. ses changements de prix relevés par Bingoo!, 3. une recherche web (s'il n'a pas de plan lisible).
type Sugg = { type: string; titre: string; detail: string; source: string | null; donnees?: unknown };
const arrondi = (n: number) => Math.max(1, Math.round(n));

export async function appJumeau(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("id, workspace_id, spec, projet_id, jumeau_at").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const insp = (pr?.data as any)?.inspire ?? {};
  if (!insp.domaine) return { nouvelles: 0 };
  const { data: s } = await admin.from("saas").select("id, nom, domaine, prix_entree_eur").eq("domaine", insp.domaine).maybeSingle();
  const { data: deja } = await admin.from("saas_app_suggestions").select("titre, source, type, donnees").eq("app_id", appId);
  const spec = (app?.spec ?? {}) as any;
  const nomInsp = insp.nom ?? insp.domaine;
  const sugg: Sugg[] = [];
  const connu = (t: string, src?: string | null) => (deja ?? []).some((d: any) => d.titre.toLowerCase() === t.toLowerCase() || (src && d.source === src));

  // 1. Nouvelles pages produit
  const { pagesNouvelles } = await import("./leader-pages.ts");
  const pages = s ? await pagesNouvelles(s.id, s.domaine).catch((e) => { console.error("pages", e); return null; }) : null;
  const fraiches = (pages ?? []).filter((p) => !connu("", p.url));
  if (fraiches.length) {
    // L'IA dit ce qu'il faut ajouter, avec ses mots ; sans IA, on garde le titre de la page
    let parIa: Sugg[] = [];
    try {
      const r = await askJson<{ suggestions: Sugg[] }>(`Le SaaS « ${spec.nom} » est un concurrent de ${nomInsp}. Ses écrans : ${(spec.ecrans ?? []).map((e: any) => `${e.titre} (${(e.fonctions ?? []).join(", ")})`).join(" ; ")}.
${nomInsp} vient de publier ces pages :
${fraiches.map((p, i) => `${i + 1}. ${p.titre} — ${p.resume} (${p.url})`).join("\n")}
Pour chaque page qui annonce une fonctionnalité utile que ${spec.nom} n'a pas encore, rends un objet type "fonction", titre (« Ajouter … », 8 mots au plus), detail (2 phrases : ce que ${nomInsp} propose, puis ce qu'il faut ajouter à ${spec.nom}, avec tes mots, pour un développeur), source (l'adresse de la page). Ignore les pages marketing sans nouveauté.
Rends { suggestions : [...] } (0 à 3 éléments).`, { fast: true, maxTokens: 1000 });
      parIa = (r.suggestions ?? []).filter((x) => x?.titre);
    } catch (e) {
      console.error("jumeau ia", e);
      parIa = fraiches.slice(0, 3).map((p) => ({ type: "fonction", titre: `Ajouter « ${p.titre.slice(0, 60)} »`, detail: `${nomInsp} a publié une nouvelle page : ${p.titre}.${p.resume ? ` ${p.resume}` : ""} L'équivalent dans ${spec.nom}, avec tes mots.`, source: p.url }));
    }
    sugg.push(...parIa);
  }

  // 2. Changement de prix du leader depuis le dernier passage : tes prix suivent dans les mêmes proportions
  if (s?.prix_entree_eur && (spec.formules ?? []).length) {
    const depuis = app!.jumeau_at ?? new Date(Date.now() - 30 * 864e5).toISOString();
    const { data: ev } = await admin.from("saas_evenements").select("type, avant, apres, at").eq("saas_id", s.id).in("type", ["prix_hausse", "prix_baisse"]).gte("at", depuis).order("at", { ascending: false }).limit(1);
    const e = ev?.[0];
    const avant = Number(String(e?.avant ?? "").replace(/[^\d.,]/g, "").replace(",", ".")), apres = Number(String(e?.apres ?? "").replace(/[^\d.,]/g, "").replace(",", "."));
    if (e && avant > 0 && apres > 0) {
      const ratio = apres / avant;
      const formules = (spec.formules ?? []).map((f: any) => ({ nom: f.nom, avant: Number(f.prix), apres: arrondi(Number(f.prix) * ratio) }));
      const titre = `${nomInsp} ${ratio > 1 ? "monte" : "baisse"} ses prix : ${avant} € → ${apres} €`;
      if (!connu(titre)) sugg.push({ type: "prix", titre, detail: `${nomInsp} est passé de ${avant} € à ${apres} € par mois (${ratio > 1 ? "+" : ""}${Math.round((ratio - 1) * 100)} %). Pour garder le même écart avec lui : ${formules.map((f: any) => `${f.nom} ${f.avant} € → ${f.apres} €`).join(", ")}.`, source: null, donnees: { formules, ratio } });
    }
  }

  // 3. Pas de plan du site lisible : recherche web des nouveautés annoncées (au plus une fois par mois)
  const dernierWeb = (deja ?? []).length ? null : 1;
  if (pages === null && (dernierWeb || !app!.jumeau_at || Date.now() - new Date(app!.jumeau_at).getTime() > 28 * 864e5)) {
    try {
      const notes = await ask(`Quelles nouvelles fonctionnalités ${nomInsp} (${insp.domaine}) a-t-il annoncées ces 60 derniers jours ? Cherche son changelog, ses notes de version, son blog produit. Liste chaque nouveauté avec sa date et l'adresse de la page source. Si rien de récent, dis-le.`,
        { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }], maxTokens: 1500 });
      const r = await askJson<{ suggestions: Sugg[] }>(`Le SaaS « ${spec.nom} » (écrans : ${(spec.ecrans ?? []).map((e: any) => e.titre).join(", ")}) est un concurrent de ${nomInsp}.
Nouveautés de ${nomInsp} : ${String(notes).slice(0, 4000)}
Rends { suggestions : 0 à 3 objets type "fonction", titre (« Ajouter … », 8 mots au plus), detail (2 phrases), source (adresse ou null) } : seulement des nouveautés réelles, datées des 60 derniers jours, utiles à ${spec.nom}.`, { fast: true, maxTokens: 900 });
      sugg.push(...(r.suggestions ?? []).filter((x) => x?.titre));
    } catch (e) { console.error("jumeau web", e); }
  }

  const nouv = sugg.filter((x) => !connu(String(x.titre), x.source)).slice(0, 4);
  if (nouv.length) {
    await admin.from("saas_app_suggestions").insert(nouv.map((x) => ({ app_id: appId, type: x.type === "prix" ? "prix" : "fonction", titre: String(x.titre).slice(0, 140), detail: String(x.detail ?? "").slice(0, 900), source: x.source && /^https?:\/\//.test(x.source) ? x.source : null, donnees: x.donnees ?? null })));
    await admin.from("activity").insert({ workspace_id: app!.workspace_id, kind: "jumeau", summary: `${nomInsp} a bougé : ${nouv.length} idée${nouv.length > 1 ? "s" : ""} pour ${spec.nom}` });
  }
  await admin.from("saas_apps").update({ jumeau_at: new Date().toISOString() }).eq("id", appId);
  return { nouvelles: nouv.length, pages: pages === null ? "pas de plan du site" : pages.length ? `${pages.length} nouvelle(s) page(s)` : "référence enregistrée ou rien de neuf" };
}

/** Applique les prix proposés par le jumeau aux formules de l'app. */
export async function appPrixSuggeres(appId: string, suggestionId: string) {
  const { data: sg } = await admin.from("saas_app_suggestions").select("id, type, donnees, statut").eq("id", suggestionId).eq("app_id", appId).maybeSingle();
  const f = (sg?.donnees as any)?.formules;
  if (!sg || sg.type !== "prix" || !Array.isArray(f)) throw new HttpError(404, "Suggestion introuvable");
  const { data: app } = await admin.from("saas_apps").select("spec, version").eq("id", appId).single();
  const spec = { ...(app!.spec as any) };
  spec.formules = (spec.formules ?? []).map((x: any) => { const n = f.find((y: any) => y.nom === x.nom); return n ? { ...x, prix: n.apres } : x; });
  await admin.from("saas_apps").update({ spec, version: (app!.version ?? 1) + 1, maj: new Date().toISOString() }).eq("id", appId);
  await admin.from("saas_app_suggestions").update({ statut: "ajoutee" }).eq("id", sg.id);
  return { formules: spec.formules };
}

/** Aperçu d'une modification : la mettre en ligne, ou l'abandonner. */
export async function appBrouillon(appId: string, valider: boolean) {
  const { data: app } = await admin.from("saas_apps").select("spec, brouillon, version, statut").eq("id", appId).single();
  const b = app?.brouillon as any;
  if (!b?._modif) throw new HttpError(404, "Aucune modification en attente");
  if (valider) {
    const { _modif, ...spec } = b;
    await admin.from("saas_apps").update({ spec, brouillon: null, version: (app!.version ?? 1) + 1, maj: new Date().toISOString() }).eq("id", appId);
    const ids = (_modif.liste ?? [_modif]).map((x: any) => x.suggestion).filter(Boolean);
    if (ids.length) await admin.from("saas_app_suggestions").update({ statut: "ajoutee" }).in("id", ids).eq("app_id", appId);
  } else await admin.from("saas_apps").update({ brouillon: null }).eq("id", appId);
  return { ok: true };
}

// ---------------------------------------------------------------- Kit de lancement : articles (pages indexables), e-mails
export async function appLancement(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("spec, projet_id, slug").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const s = (app?.spec ?? {}) as any, p = (pr?.data ?? {}) as any;
  const r = await askJson<any>(`Prépare le lancement en France du SaaS « ${s.nom} » : ${s.pitch}
Pour : ${s.cible}. Besoin : ${s.probleme}. Concurrent principal : ${p.inspire?.nom ?? "?"}. Prix : ${(s.formules ?? []).map((f: any) => `${f.nom} ${f.prix} €/mois`).join(", ")}.
Rends un objet JSON :
- articles : 3 objets slug (court, mots-clés, tirets), titre (ce que la cible tape dans Google, ex. « Alternative à … », « Comment … »), resume (une phrase), mots_cles (3 à 5), contenu (500 à 700 mots en Markdown simple : ## titres, paragraphes, listes « - », gras **…** ; utile et honnête, sans chiffres inventés, qui présente ${s.nom} comme une solution parmi d'autres et finit par un appel à l'essai gratuit).
- emails : 3 objets but (« Prospection à froid », « Annonce à ton réseau », « Relance »), sujet, corps (80 à 140 mots, tutoiement pour le réseau et vouvoiement pour la prospection, avec {prenom} et {entreprise} comme champs à remplacer, sans promesse invérifiable, avec une ligne de désinscription pour la prospection).
- plan : 6 étapes courtes pour les 30 premiers jours (canal + action concrète).`, { maxTokens: 9000 });
  const articles = (r.articles ?? []).slice(0, 3).map((a: any, i: number) => ({ slug: String(a.slug ?? `article-${i + 1}`).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || `article-${i + 1}`, titre: String(a.titre ?? "").slice(0, 120), resume: String(a.resume ?? "").slice(0, 240), mots_cles: (a.mots_cles ?? []).slice(0, 5), contenu: String(a.contenu ?? "").slice(0, 9000), at: new Date().toISOString() }));
  const lancement = { articles, emails: (r.emails ?? []).slice(0, 3), plan: (r.plan ?? []).slice(0, 8), at: new Date().toISOString() };
  await admin.from("saas_apps").update({ lancement }).eq("id", appId);
  return lancement;
}

// ---------------------------------------------------------------- Tests A/B : prix ou durée d'essai
// Chaque visiteur reçoit A ou B. Mesure : revenu par visite quand il y a assez d'abonnés (5 au moins), sinon taux d'inscription.
// Décision bayésienne : probabilité que B fasse mieux que A (tirages dans des lois Bêta) ; gagnant à 95 % et 50 visites par côté.
function gamma(k: number): number {
  if (k < 1) return gamma(k + 1) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { const u1 = Math.random(), u2 = Math.random(); x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const beta = (a: number, b: number) => { const x = gamma(a); return x / (x + gamma(b)); };
function probaB(a: { n: number; k: number; valeur: number }, b: { n: number; k: number; valeur: number }) {
  let gagne = 0; const N = 4000;
  for (let i = 0; i < N; i++) if (beta(1 + b.k, 1 + Math.max(0, b.n - b.k)) * b.valeur > beta(1 + a.k, 1 + Math.max(0, a.n - a.k)) * a.valeur) gagne++;
  return gagne / N;
}

export async function appAb(appId: string, b: any) {
  const { data: app } = await admin.from("saas_apps").select("ab, spec, version, paiement").eq("id", appId).single();
  const ab = { ...((app?.ab ?? {}) as any) };
  if (b.appliquer) return await appliquerAb(appId, b.appliquer === "B" ? "B" : "A");
  if (b.actif !== undefined) {
    ab.actif = !!b.actif;
    if (b.actif) {
      ab.debut = new Date().toISOString();
      ab.type = b.type === "essai" ? "essai" : "prix";
      ab.ecart = Math.max(-50, Math.min(100, Math.round(Number(b.ecart ?? ab.ecart ?? 20) || 20)));
      ab.essai_b = Math.max(0, Math.min(60, Math.round(Number(b.essai_b ?? 7))));
      ab.essai_a = Number((app?.paiement as any)?.essai_jours ?? 14);
    }
  }
  if (b.auto !== undefined) ab.auto = !!b.auto;
  await admin.from("saas_apps").update({ ab }).eq("id", appId);
  return appAbResultats(appId);
}

/** Garde le gagnant (B : les prix ou la durée d'essai du test deviennent la règle), arrête le test et l'ajoute à l'historique. */
export async function appliquerAb(appId: string, gagnant: "A" | "B") {
  const { data: app } = await admin.from("saas_apps").select("ab, spec, version, paiement").eq("id", appId).single();
  const ab = (app?.ab ?? {}) as any;
  const r = await appAbResultats(appId);
  if (gagnant === "B") {
    if (ab.type === "essai") await admin.from("saas_apps").update({ paiement: { ...(app!.paiement as any), essai_jours: ab.essai_b } }).eq("id", appId);
    else {
      const spec = { ...(app!.spec as any) };
      spec.formules = (spec.formules ?? []).map((f: any) => ({ ...f, prix: Math.round(Number(f.prix) * (1 + Number(ab.ecart ?? 0) / 100)) }));
      await admin.from("saas_apps").update({ spec, version: (app!.version ?? 1) + 1 }).eq("id", appId);
    }
  }
  const histo = [...(ab.historique ?? []), { type: ab.type ?? "prix", ecart: ab.ecart, essai_a: ab.essai_a, essai_b: ab.essai_b, gagnant, proba_b: r.proba_b, resultats: r.resultats, du: ab.debut, au: new Date().toISOString() }].slice(-10);
  await admin.from("saas_apps").update({ ab: { actif: false, auto: ab.auto, historique: histo } }).eq("id", appId);
  return appAbResultats(appId);
}

export async function appAbResultats(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("ab, spec").eq("id", appId).single();
  const ab = (app?.ab ?? {}) as any;
  const depuis = ab.debut ?? new Date().toISOString();
  const [{ data: vues }, { data: us }] = await Promise.all([
    admin.from("saas_app_vues").select("variante, vues").eq("app_id", appId).gte("jour", String(depuis).slice(0, 10)),
    admin.from("saas_app_users").select("variante, abonnement, at").eq("app_id", appId).eq("role", "admin").not("email", "like", "demo-%@demo.local").gte("at", depuis),
  ]);
  const res: Record<string, { vues: number; inscrits: number; abonnes: number; revenu: number }> = { A: { vues: 0, inscrits: 0, abonnes: 0, revenu: 0 }, B: { vues: 0, inscrits: 0, abonnes: 0, revenu: 0 } };
  for (const v of (vues ?? []) as any[]) if (res[v.variante]) res[v.variante].vues += v.vues;
  for (const u of (us ?? []) as any[]) {
    const k = u.variante === "B" ? "B" : "A";
    res[k].inscrits++;
    if (["active", "past_due"].includes(u.abonnement?.statut)) { res[k].abonnes++; res[k].revenu += Number(u.abonnement?.montant ?? 0); }
  }
  if (!ab.debut) return { ...ab, resultats: res, proba_b: null, gagnant: null, mesure: null };
  // Revenu par visite (abonnés × revenu moyen par abonné) dès 5 abonnés, sinon taux d'inscription
  const parRevenu = res.A.abonnes + res.B.abonnes >= 5;
  const moyen = (k: string) => res[k].abonnes ? res[k].revenu / res[k].abonnes : 1;
  const p = probaB(
    { n: res.A.vues, k: parRevenu ? res.A.abonnes : res.A.inscrits, valeur: parRevenu ? moyen("A") : 1 },
    { n: res.B.vues, k: parRevenu ? res.B.abonnes : res.B.inscrits, valeur: parRevenu ? moyen("B") : 1 },
  );
  const assez = res.A.vues >= 50 && res.B.vues >= 50;
  const gagnant = assez && p >= 0.95 ? "B" : assez && p <= 0.05 ? "A" : null;
  return { ...ab, resultats: res, proba_b: Math.round(p * 100) / 100, gagnant, assez, mesure: parRevenu ? "revenu par visite" : "taux d'inscription" };
}

/** Tâche quotidienne : un test en mode automatique s'arrête de lui-même dès qu'un gagnant est sûr, et le créateur est prévenu. */
export async function appsAbCron() {
  const { data: apps } = await admin.from("saas_apps").select("id, workspace_id, spec").eq("ab->>actif", "true").eq("ab->>auto", "true");
  const out: unknown[] = [];
  for (const a of apps ?? []) {
    const r = await appAbResultats(a.id);
    if (!r.gagnant) { out.push({ id: a.id, proba_b: r.proba_b }); continue; }
    await appliquerAb(a.id, r.gagnant);
    const nom = (a.spec as any)?.nom ?? "Ton SaaS";
    await admin.from("activity").insert({ workspace_id: a.workspace_id, kind: "ab", summary: `Test terminé sur ${nom} : ${r.gagnant === "B" ? "la version B l'emporte et devient la règle" : "ta version actuelle reste la meilleure"}` });
    out.push({ id: a.id, gagnant: r.gagnant });
  }
  return out;
}

// ---------------------------------------------------------------- Monde, classement et bourse
export async function appPublic(appId: string, oui: boolean) {
  await admin.from("saas_apps").update({ public: !!oui }).eq("id", appId);
  return { public: !!oui };
}
export async function appBourse(appId: string, b: any) {
  if (b.retirer) { await admin.from("saas_bourse").update({ statut: "retire" }).eq("app_id", appId); return { statut: "retire" }; }
  const prix = Math.round(Number(b.prix));
  if (!(prix >= 100 && prix <= 10_000_000)) throw new HttpError(400, "Prix de vente entre 100 € et 10 M€");
  const { data: app } = await admin.from("saas_apps").select("public").eq("id", appId).single();
  if (!app?.public) await admin.from("saas_apps").update({ public: true }).eq("id", appId);
  await admin.from("saas_bourse").upsert({ app_id: appId, prix, description: String(b.description ?? "").slice(0, 1500), statut: "en_vente", at: new Date().toISOString() }, { onConflict: "app_id" });
  return { statut: "en_vente", prix };
}

// ---------------------------------------------------------------- Revenu vérifié : synchronisation Stripe, historique, jalons
const ACTIFS = ["active", "trialing", "past_due"];

/** Relit tous les abonnements de l'app chez Stripe (compte du créateur) : le revenu affiché reste vrai même si les clients ne se connectent pas. */
export async function appStripeSync(appId: string) {
  const { data: sec } = await admin.from("saas_app_secrets").select("stripe_key").eq("app_id", appId).maybeSingle();
  if (!sec?.stripe_key) return { synchro: false };
  const subs: any[] = [];
  let apres = "";
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams({ status: "all", limit: "100", ...(apres ? { starting_after: apres } : {}) });
    const r = await fetch(`https://api.stripe.com/v1/subscriptions?${q}`, { headers: { authorization: `Bearer ${sec.stripe_key}` } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Stripe : ${d?.error?.message ?? r.status}`);
    subs.push(...(d.data ?? []));
    if (!d.has_more || !d.data?.length) break;
    apres = d.data.at(-1).id;
  }
  // Pour chaque client : l'abonnement en cours d'abord, sinon le plus récent
  const parClient = new Map<string, any>();
  for (const s of subs) {
    const c = typeof s.customer === "string" ? s.customer : s.customer?.id;
    const cur = parClient.get(c);
    if (!cur || (ACTIFS.includes(s.status) && !ACTIFS.includes(cur.status)) || (ACTIFS.includes(s.status) === ACTIFS.includes(cur.status) && s.created > cur.created)) parClient.set(c, s);
  }
  const { data: us } = await admin.from("saas_app_users").select("id, stripe_customer").eq("app_id", appId).not("stripe_customer", "is", null);
  const maintenant = new Date().toISOString();
  for (const u of us ?? []) {
    const s = parClient.get(u.stripe_customer);
    if (!s) continue;
    const it = s.items?.data?.[0]?.price;
    const montant = it?.unit_amount != null ? Math.round((it.unit_amount / 100) * (it.recurring?.interval === "year" ? 1 / 12 : 1) * 100) / 100 : null;
    await admin.from("saas_app_users").update({ verifie_at: maintenant, abonnement: { statut: s.status, formule: s.metadata?.formule ?? null, montant, fin_periode: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null, annule: !!s.cancel_at_period_end } }).eq("id", u.id);
  }
  await admin.from("saas_apps").update({ stripe_sync_at: maintenant }).eq("id", appId);
  return { synchro: true, abonnements: subs.length };
}

const etageDe = (mrr: number) => Math.floor(mrr / 1000);

/** Photo du jour (revenu, abonnés, comptes) et jalons franchis : un étage de plus, le phare, le premier abonné. */
export async function appPhotoDuJour(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("workspace_id, spec, slug").eq("id", appId).single();
  const { data: mrr } = await admin.rpc("saas_app_mrr", { p_app: appId });
  const [{ count: abonnes }, { count: comptes }] = await Promise.all([
    admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", appId).in("abonnement->>statut", ["active", "past_due"]),
    admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", appId).not("email", "like", "demo-%@demo.local"),
  ]);
  const m = Number(mrr ?? 0);
  const { data: hier } = await admin.from("saas_app_mrr_jour").select("mrr, abonnes").eq("app_id", appId).lt("jour", new Date().toISOString().slice(0, 10)).order("jour", { ascending: false }).limit(1).maybeSingle();
  await admin.from("saas_app_mrr_jour").upsert({ app_id: appId, jour: new Date().toISOString().slice(0, 10), mrr: m, abonnes: abonnes ?? 0, comptes: comptes ?? 0 }, { onConflict: "app_id,jour" });
  if (!hier) return { mrr: m };
  const nom = (app!.spec as any)?.nom ?? "Ton SaaS";
  const jalons: string[] = [];
  if (!hier.abonnes && (abonnes ?? 0) > 0) jalons.push(`${nom} a son premier abonné payant 🎉`);
  if (etageDe(m) > etageDe(Number(hier.mrr))) jalons.push(m >= 10000 && Number(hier.mrr) < 10000 ? `${nom} passe ${Math.floor(m / 1000)} 000 € par mois : le phare s'allume 🗼` : `${nom} passe ${Math.floor(m / 1000)} 000 € par mois : un étage de plus sur l'île des créateurs 🏢`);
  for (const j of jalons) await admin.from("activity").insert({ workspace_id: app!.workspace_id, kind: "jalon", summary: j });
  if (jalons.length) {
    try {
      const { sendSystem, teamAddress } = await import("./mail.ts");
      const { data: w } = await admin.from("workspaces").select("*").eq("id", app!.workspace_id).single();
      const to = await teamAddress(w as never);
      if (to) await sendSystem({ to, subject: jalons[0], text: `${jalons.join("\n")}\n\nRevenu mensuel vérifié : ${Math.round(m)} €, ${abonnes} abonné${(abonnes ?? 0) > 1 ? "s" : ""}.\n\nVoir ton SaaS : https://kairo.maisonravita.fr/#/explorer/createurs\n\nBingoo!`, key: `jalon-${appId}-${new Date().toISOString().slice(0, 10)}` });
    } catch (e) { console.error("jalon", e); }
  }
  return { mrr: m, jalons };
}

/** Tâche quotidienne : synchronisation Stripe puis photo du jour, pour chaque SaaS construit. */
export async function appsCreateursCron(max = 40) {
  const { data: apps } = await admin.from("saas_apps").select("id, paiement, stripe_sync_at").not("spec->ecrans", "is", null).order("stripe_sync_at", { ascending: true, nullsFirst: true }).limit(max);
  const out: unknown[] = [];
  for (const a of apps ?? []) {
    const r: Record<string, unknown> = { id: a.id };
    if ((a.paiement as any)?.compte) r.stripe = await appStripeSync(a.id).catch((e) => ({ erreur: String(e?.message ?? e) }));
    else await admin.from("saas_apps").update({ stripe_sync_at: new Date().toISOString() }).eq("id", a.id);
    r.photo = await appPhotoDuJour(a.id).catch((e) => ({ erreur: String(e?.message ?? e) }));
    out.push(r);
  }
  return out;
}

/** Coche une étape du plan de lancement (gardé avec le kit). */
export async function appLancementFait(appId: string, cle: string, fait: boolean) {
  const { data: app } = await admin.from("saas_apps").select("lancement").eq("id", appId).single();
  const l = { ...((app?.lancement ?? {}) as any) };
  l.fait = { ...(l.fait ?? {}), [String(cle).slice(0, 60)]: fait ? new Date().toISOString() : null };
  await admin.from("saas_apps").update({ lancement: l }).eq("id", appId);
  return { fait: l.fait };
}

// ---------------------------------------------------------------- Identité visuelle : logo, couleur, style (choisis par le créateur)
const STYLES_OK = ["moderne", "doux", "sombre", "editorial", "vif"];
export async function appIdentite(appId: string, b: any) {
  const { data: app } = await admin.from("saas_apps").select("slug, spec, brouillon, version").eq("id", appId).single();
  const patch: Record<string, unknown> = {};
  if (b.couleur !== undefined) { if (!/^#[0-9a-f]{6}$/i.test(String(b.couleur))) throw new HttpError(400, "Couleur invalide"); patch.couleur = String(b.couleur); }
  if (b.style !== undefined) { if (!STYLES_OK.includes(String(b.style))) throw new HttpError(400, "Style inconnu"); patch.style = String(b.style); }
  if (b.logo === null) patch.logo = null;
  else if (b.logo !== undefined) {
    // Image seulement (PNG, JPEG, WebP), redimensionnée par le navigateur ; pas de SVG (il pourrait contenir du code)
    const m = String(b.logo).match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m || m[2].length > 700_000) throw new HttpError(400, "Logo invalide (PNG, JPG ou WebP, 500 Ko au plus)");
    const bin = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const chemin = `logos/${app!.slug}-${crypto.randomUUID().slice(0, 8)}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    const { error } = await admin.storage.from("apps").upload(chemin, bin, { contentType: `image/${m[1]}`, upsert: true, cacheControl: "31536000" });
    if (error) throw new HttpError(500, `Stockage : ${error.message}`);
    patch.logo = admin.storage.from("apps").getPublicUrl(chemin).data.publicUrl;
  }
  if (!Object.keys(patch).length) return { ok: true };
  const appliquer = (sp: any) => { const n = { ...(sp ?? {}), ...patch }; if (n.logo === null) delete n.logo; return n; };
  // Aussi dans le brouillon en cours (sinon sa mise en ligne effacerait le logo)
  await admin.from("saas_apps").update({ spec: appliquer(app!.spec), ...(app!.brouillon ? { brouillon: appliquer(app!.brouillon) } : {}), version: (app!.version ?? 0) + 1, maj: new Date().toISOString() }).eq("id", appId);
  return { ok: true, ...patch };
}

// ---------------------------------------------------------------- Icônes PNG de l'app (rendues dans le navigateur du créateur, gardées dans le stockage public)
export async function appIcones(appId: string, b: any) {
  const { data: app } = await admin.from("saas_apps").select("slug").eq("id", appId).single();
  const out: Record<string, string> = {};
  for (const [k, taille] of [["png512", 512], ["png192", 192]] as const) {
    const m = String(b[k] ?? "").match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
    if (!m || m[1].length > 400_000) throw new HttpError(400, "Icône invalide");
    const bin = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0));
    const chemin = `icones/${app!.slug}-${taille}-${String(b.cle ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 12)}.png`;
    const { error } = await admin.storage.from("apps").upload(chemin, bin, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
    if (error) throw new HttpError(500, `Stockage : ${error.message}`);
    out[taille === 512 ? "u512" : "u192"] = admin.storage.from("apps").getPublicUrl(chemin).data.publicUrl;
  }
  const icones = { ...out, cle: String(b.cle ?? "").slice(0, 80) };
  await admin.from("saas_apps").update({ icones }).eq("id", appId);
  return icones;
}

// ---------------------------------------------------------------- Plan de croissance : tes chiffres réels, face au SaaS copié
// Sans IA : les canaux visibles sur le site du modèle, les leçons de son histoire (avec sources), sa courbe de revenu vérifiée,
// et le rythme réel de l'app (abonnés gagnés sur 30 jours) pour estimer la date de chaque palier.
export async function appCroissance(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("id, spec, projet_id").eq("id", appId).single();
  const { data: pr } = await admin.from("saas_projets").select("data").eq("id", app!.projet_id).single();
  const insp = (pr?.data as any)?.inspire ?? {};
  const ch = await appChiffres(appId);
  const { data: us } = await admin.from("saas_app_users").select("at, abonnement").eq("app_id", appId).not("email", "like", "demo-%@demo.local").limit(10000);
  const il30 = Date.now() - 30 * 864e5;
  const abonnes30 = (us ?? []).filter((u: any) => ["active", "past_due"].includes(u.abonnement?.statut) && new Date(u.at).getTime() >= il30).length;
  const formules = (((app?.spec as any)?.formules ?? []) as any[]).map((f) => Number(f.prix) || 0).filter((p) => p > 0);
  const prixMoyen = ch.abonnes ? ch.mrr / ch.abonnes : formules.length ? formules.reduce((a, b) => a + b, 0) / formules.length : 0;
  const { data: src } = await admin.rpc("saas_app_sources", { p_app: appId });
  let modele: any = null;
  if (insp.domaine) {
    const { data: s } = await admin.from("saas").select("id, nom, domaine, methode, succes, copiable_raisons").eq("domaine", insp.domaine).maybeSingle();
    if (s) {
      const { data: h } = await admin.from("saas_histoires").select("lecons, annee_creation").eq("saas_id", s.id).eq("statut", "ok").maybeSingle();
      const { count: mails } = await admin.from("saas_emails").select("id", { count: "exact", head: true }).eq("saas_id", s.id);
      const { count: pubs } = await admin.from("saas_pubs").select("id", { count: "exact", head: true }).eq("saas_id", s.id).then((r) => r, () => ({ count: 0 }));
      const sc = (s.succes ?? {}) as any;
      modele = {
        nom: s.nom, domaine: s.domaine, preuve: sc.preuve ?? null, source: sc.source ?? null,
        mrr_mensuel: sc.mrr ?? (sc.montant ? Math.round(sc.montant / 12 / 1.08) : null), courbe: sc.courbe ?? [],
        canaux: Object.entries((s.methode ?? {}) as Record<string, string>).filter(([, u]) => !!u).map(([k, u]) => ({ k, url: u })),
        lecons: (h?.lecons ?? []).slice(0, 5), creation: h?.annee_creation ?? null, emails: mails ?? 0, pubs: pubs ?? 0,
      };
    }
  }
  return { ...ch, abonnes_30j: abonnes30, prix_moyen: Math.round(prixMoyen * 100) / 100, sources: (src ?? []).slice(0, 5), modele };
}
