// Moteur des SaaS construits par Bingoo! : comptes, équipes et données des applications générées.
// Appelé par la fonction publique « t » (chemin /t/app/<slug>/<action>), depuis l'application qui tourne dans un cadre isolé.
// - Données : partagées par les comptes d'un même espace (équipe), invisibles des autres espaces.
// - Mots de passe hachés (PBKDF2), jeton de session gardé haché.
// - Abonnements : encaissés sur le compte Stripe du créateur (sa clé, gardée côté serveur) ; l'abonnement vaut pour tout l'espace.
// - Pas de nombre maximal de comptes ; les inscriptions sont limitées par adresse IP (anti-abus).
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const LIM = { inscriptionsParHeure: 15, rows: 20000, taille: 20000 };
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function pbkdf2(pass: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
const egal = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;
const estDemo = (email: string) => /@demo\.local$/.test(email);

class Err extends Error { constructor(public status: number, msg: string) { super(msg); } }
const colOk = (c: unknown) => { const s = String(c ?? ""); if (!/^[a-z][a-z0-9_]{0,39}$/.test(s)) throw new Err(400, "Collection invalide"); return s; };
const propre = (d: unknown) => {
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new Err(400, "Données invalides");
  const o = { ...(d as Record<string, unknown>) }; delete o.id; delete o.created_at; delete o.updated_at;
  if (JSON.stringify(o).length > LIM.taille) throw new Err(413, "Élément trop volumineux");
  return o;
};
const ligne = (r: any) => ({ ...(r.data ?? {}), id: r.id, created_at: r.at, updated_at: r.maj });

async function session(admin: SupabaseClient, user: any) {
  const jeton = hex(crypto.getRandomValues(new Uint8Array(32)));
  await admin.from("saas_app_users").update({ jeton: await sha(jeton) }).eq("id", user.id);
  return { token: jeton, user: { id: user.id, email: user.email, nom: user.nom } };
}

// ---------------------------------------------------------------- Prix (A/B) et abonnements (Stripe du créateur)
/** Prix d'une formule pour une variante : la variante B affiche les prix du test (écart en %). */
export const prixVariante = (prix: number, variante: string | null | undefined, ab: any) =>
  variante === "B" && ab?.actif && ab?.type !== "essai" ? Math.round(prix * (1 + Number(ab.ecart ?? 20) / 100)) : Number(prix);

async function stripe(key: string, path: string, params?: Record<string, string>, method = "POST") {
  const url = `https://api.stripe.com/v1/${path}${method === "GET" && params ? `?${new URLSearchParams(params)}` : ""}`;
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${key}`, "content-type": "application/x-www-form-urlencoded" }, body: method === "GET" ? undefined : new URLSearchParams(params ?? {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Err(502, `Paiement indisponible : ${d?.error?.message ?? r.status}`);
  return d;
}
const cleStripe = async (admin: SupabaseClient, appId: string) => (await admin.from("saas_app_secrets").select("stripe_key").eq("app_id", appId).maybeSingle()).data?.stripe_key ?? null;
const ACTIF = ["active", "trialing", "past_due"];
const COLS = "id, email, nom, at, stripe_customer, abonnement, verifie_at, espace_id, role, variante, vu_at";

/** Accès de l'espace : application gratuite, compte de démo, abonnement en cours, ou essai pas encore terminé. */
function etat(app: any, titulaire: any) {
  const pay = app.paiement ?? {};
  // Test sur la durée d'essai : la variante B a sa propre durée (gardée même après le test pour ceux qui l'ont reçue)
  const jours = titulaire.variante === "B" && app.ab?.type === "essai" && app.ab?.essai_b != null && (app.ab?.actif || !app.ab?.historique) ? Number(app.ab.essai_b) : Number(pay.essai_jours ?? 14);
  const essaiFin = new Date(new Date(titulaire.at).getTime() + jours * 864e5).toISOString();
  const ab = titulaire.abonnement ?? null;
  const demo = estDemo(titulaire.email);
  const acces = !pay.actif || demo || ACTIF.includes(ab?.statut) || Date.now() < new Date(essaiFin).getTime();
  return { acces, payant: !!pay.actif && !demo, essai_fin: essaiFin, abonnement: ab };
}

/** Relit l'abonnement chez Stripe (au retour du paiement, puis toutes les 10 minutes au plus). */
async function rafraichir(admin: SupabaseClient, app: any, u: any, force = false) {
  // Accès de précommande encore valable : rien à relire chez Stripe tant qu'il court
  if (u.abonnement?.precommande && (!u.abonnement.fin_periode || new Date(u.abonnement.fin_periode).getTime() > Date.now()) && !force) return u;
  if (!app.paiement?.actif || !u.stripe_customer) return u;
  if (!force && u.verifie_at && Date.now() - new Date(u.verifie_at).getTime() < 10 * 60e3) return u;
  const key = await cleStripe(admin, app.id);
  if (!key) return u;
  // Paiement unique (appli web) : l'accès est acquis dès qu'un paiement réussi existe pour cette app
  if (app.paiement?.modele === "unique") {
    if (u.abonnement?.unique && u.abonnement?.statut === "active") return u;
    try {
      const d = await stripe(key, "payment_intents", { customer: u.stripe_customer, limit: "20" }, "GET");
      const pi = ((d.data ?? []) as any[]).find((x) => x.status === "succeeded" && x.metadata?.app === app.slug);
      const abonnement = pi ? { statut: "active", formule: pi.metadata?.formule ?? null, montant: pi.amount_received / 100, unique: true, fin_periode: null, annule: false } : u.abonnement ?? null;
      await admin.from("saas_app_users").update({ abonnement, verifie_at: new Date().toISOString() }).eq("id", u.id);
      return { ...u, abonnement };
    } catch (e) { console.error("stripe", e); return u; }
  }
  try {
    const d = await stripe(key, "subscriptions", { customer: u.stripe_customer, status: "all", limit: "5" }, "GET");
    const subs = (d.data ?? []) as any[];
    const s = subs.find((x) => ACTIF.includes(x.status)) ?? subs[0];
    const it = s?.items?.data?.[0]?.price;
    const montant = it?.unit_amount != null ? (it.unit_amount / 100) * (it.recurring?.interval === "year" ? 1 / 12 : 1) : null;
    const abonnement = s ? { statut: s.status, formule: s.metadata?.formule ?? null, montant, fin_periode: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null, annule: !!s.cancel_at_period_end } : null;
    await admin.from("saas_app_users").update({ abonnement, verifie_at: new Date().toISOString() }).eq("id", u.id);
    return { ...u, abonnement };
  } catch (e) { console.error("stripe", e); return u; }
}

// Adresse de retour après paiement : l'adresse de l'application (lien Bingoo!, son domaine, ou là où le créateur héberge le code)
function retourOk(retour: string) {
  try {
    const u = new URL(retour);
    if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) return null;
    return u.toString();
  } catch { return null; }
}

// Données d'exemple : chaque nouvel espace démarre avec une application vivante
async function semer(admin: SupabaseClient, app: any, userId: string) {
  const demo = (app.spec?.demo ?? {}) as Record<string, unknown[]>;
  // Les liens entre exemples (client_id: "c1") pointent vers le champ ref : on les remplace par les vrais identifiants
  const refs = new Map<string, string>();
  const items = Object.entries(demo).flatMap(([col, xs]) => /^[a-z][a-z0-9_]{0,39}$/.test(col) && Array.isArray(xs)
    ? xs.slice(0, 15).filter((x) => x && typeof x === "object" && !Array.isArray(x)).map((x: any) => { const id = crypto.randomUUID(); if (x.ref != null) refs.set(String(x.ref), id); return { id, col, x }; }) : []);
  const rows = items.map(({ id, col, x }, i) => {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) if (k !== "ref" && k !== "id") data[k] = typeof v === "string" && refs.has(v) && /_id$/.test(k) ? refs.get(v) : v;
    return { id, app_id: app.id, user_id: userId, espace_id: userId, col, data, at: new Date(Date.now() - i * 3600e3 * 7).toISOString() };
  });
  if (rows.length) await admin.from("saas_app_rows").insert(rows);
}

// ---------------------------------------------------------------- Équipes : places selon la formule
/** Nombre de places de la formule (« 5 utilisateurs » dans ses avantages) ; null = sans limite. */
function places(app: any, titulaire: any): number | null {
  if (!app.paiement?.actif || !["active", "trialing", "past_due"].includes(titulaire.abonnement?.statut)) return null;
  const f = (app.spec?.formules ?? []).find((x: any) => x.nom === titulaire.abonnement?.formule);
  for (const t of f?.inclus ?? []) {
    const m = String(t).match(/(\d+)\s*(utilisateurs?|membres?|collaborateurs?|si[eè]ges?|comptes?|personnes?)/i);
    if (m) return Number(m[1]);
    if (/(1|un) seul utilisateur|utilisateur unique/i.test(String(t))) return 1;
  }
  return null;
}
const ROLES = ["admin", "membre", "lecture"];

// ---------------------------------------------------------------- Application installable (manifeste et icône)
const echap = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export async function appFichier(admin: SupabaseClient, slug: string, quoi: string): Promise<{ status: number; type: string; body: string }> {
  const { data: app } = await admin.from("saas_apps").select("slug, spec, domaine, domaine_statut, icones").eq("slug", slug).maybeSingle();
  const s = (app?.spec ?? {}) as any;
  if (!app || !s.ecrans?.length) return { status: 404, type: "text/plain", body: "introuvable" };
  const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/t/app/${slug}`;
  if (quoi === "icone.svg") {
    return { status: 200, type: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${couleur}"/><text x="256" y="340" font-family="Inter,Arial,sans-serif" font-size="280" font-weight="800" fill="#fff" text-anchor="middle">${echap(String(s.nom ?? "S").slice(0, 1).toUpperCase())}</text></svg>` };
  }
  // Badge « revenu vérifié par Bingoo! » à poser sur son site (seulement si le créateur affiche son SaaS dans le monde)
  if (quoi === "badge.svg") {
    const { data: a } = await admin.from("saas_apps").select("id, public").eq("slug", slug).single();
    const { data: mrr } = a?.public ? await admin.rpc("saas_app_mrr", { p_app: a.id }) : { data: null };
    const txt = a?.public ? `${Math.round(Number(mrr ?? 0)).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} € / mois` : "Construit avec Bingoo!";
    const w = 132 + txt.length * 7.4;
    return { status: 200, type: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="36" viewBox="0 0 ${Math.round(w)} 36"><rect width="100%" height="36" rx="10" fill="#15161A"/><rect x="4" y="4" width="28" height="28" rx="8" fill="${couleur}"/><text x="18" y="24" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">${echap(String(s.nom ?? "S").slice(0, 1).toUpperCase())}</text><text x="40" y="15" font-family="Inter,Arial,sans-serif" font-size="9.5" fill="#F6A06B" font-weight="700">${a?.public ? "REVENU VÉRIFIÉ PAR BINGOO!" : echap(String(s.nom ?? ""))}</text><text x="40" y="28" font-family="Inter,Arial,sans-serif" font-size="12.5" fill="#fff" font-weight="800">${echap(txt)}</text></svg>` };
  }
  if (quoi === "manifest") {
    const propre = app.domaine_statut === "ok" && app.domaine;
    const debut = propre ? "/" : `/?app=${slug}#/app/${slug}`;
    const ic = (app.icones ?? {}) as any;
    // Icônes PNG (rendues par Bingoo! à la couleur de l'app) : exigées par Android et iOS ; l'SVG reste en secours
    const icons = [
      ...(ic.u192 ? [{ src: ic.u192, sizes: "192x192", type: "image/png", purpose: "any" }] : []),
      ...(ic.u512 ? [{ src: ic.u512, sizes: "512x512", type: "image/png", purpose: "any" }, { src: ic.u512, sizes: "512x512", type: "image/png", purpose: "maskable" }] : []),
      { src: `${base}/icone.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ];
    // Raccourcis (appui long sur l'icône) : les premiers écrans de l'app
    const raccourci = (id: string) => propre ? `/?ecran=${id}` : `/?app=${slug}&ecran=${id}#/app/${slug}`;
    return { status: 200, type: "application/manifest+json", body: JSON.stringify({
      id: propre ? "/" : `/?app=${slug}`, name: s.nom, short_name: String(s.nom ?? "").slice(0, 12), description: s.pitch ?? "",
      start_url: debut, scope: "/", display: "standalone", display_override: ["standalone", "minimal-ui"], orientation: "any",
      background_color: "#F8FAFC", theme_color: couleur, lang: "fr", categories: ["business", "productivity"], icons,
      shortcuts: (s.ecrans ?? []).filter((e: any) => e.code).slice(0, 4).map((e: any) => ({ name: e.titre, url: raccourci(e.id), ...(ic.u192 ? { icons: [{ src: ic.u192, sizes: "192x192", type: "image/png" }] } : {}) })),
    }) };
  }
  return { status: 404, type: "text/plain", body: "introuvable" };
}

// ---------------------------------------------------------------- API
export async function appApi(admin: SupabaseClient, req: Request, slug: string, action: string): Promise<{ status: number; body: unknown }> {
  try {
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) throw new Err(404, "Application introuvable");
    const { data: app } = await admin.from("saas_apps").select("id, slug, workspace_id, spec, statut, paiement, domaine, domaine_statut, ab, email_dom, emails, validation").eq("slug", slug).maybeSingle();
    // Page de précommande (avant la construction) : seulement la liste d'attente et la précommande
    const enValidation = !!(app as any)?.validation?.actif && !(app?.spec as any)?.ecrans?.length;
    if (!app || (!(app.spec as any)?.ecrans?.length && !enValidation)) throw new Err(404, "Application introuvable");
    const b = JSON.parse((await req.text()).slice(0, 60000) || "{}");
    const variante = b.variante === "B" && (app.ab as any)?.actif ? "B" : "A";

    // Visite de la page d'accueil (mesure du test de prix)
    // Visite de la page d'accueil : par source (lien de partage ?src=…) et, pendant un test de prix, par variante
    const source = String(b.source ?? "direct").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) || "direct";
    if (action === "vue") {
      await admin.rpc("saas_app_visite", { p_app: app.id, p_source: source });
      if ((app.ab as any)?.actif) await admin.rpc("saas_app_vue", { p_app: app.id, p_var: variante });
      return { status: 200, body: { ok: true } };
    }

    // ---- Pages publiques (réservation, formulaire, avis…) : ouvertes sans compte par les clients d'un utilisateur de l'app
    if (action === "public-info" || action === "public-list" || action === "public-add") {
      const page = ((app.spec as any)?.ecrans ?? []).find((e: any) => e.public && e.id === String(b.page ?? ""));
      const espace = String(b.espace ?? "");
      if (!page || !/^[0-9a-f-]{36}$/.test(espace)) throw new Err(404, "Page introuvable");
      const { data: t } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).eq("id", espace).maybeSingle();
      if (!t || (t.espace_id && t.espace_id !== t.id)) throw new Err(404, "Page introuvable");
      if (!etat(app, t).acces) throw new Err(402, "Cette page n'est pas disponible pour le moment");
      if (action === "public-info") return { status: 200, body: { nom: t.nom ?? "" } };
      const col = colOk(b.col);
      const def = ((app.spec as any)?.collections ?? []).find((c: any) => c.nom === col) ?? { champs: [] };
      if (action === "public-list") {
        if (!(page.lecture ?? []).includes(col)) throw new Err(403, "Lecture non autorisée");
        const champs = (def.champs ?? []) as any[];
        const drapeau = champs.find((c) => c.type === "booleen" && /^(publie|publiee|visible|publique|en_ligne|affiche|approuve)$/.test(c.nom))?.nom;
        let q = admin.from("saas_app_rows").select("id, data, at, maj").eq("app_id", app.id).eq("espace_id", espace).eq("col", col);
        if (drapeau) q = q.eq(`data->>${drapeau}`, "true");
        const { data } = await q.order("at", { ascending: false }).limit(300);
        // Ce que d'autres visiteurs ont envoyé (réservations…) : seulement les champs utiles au calcul (dates, durées, statut), jamais leurs coordonnées
        const prive = new Set(champs.filter((c) => ["email", "telephone"].includes(c.type)).map((c) => c.nom));
        const recu = col === page.ecriture && !drapeau;
        const garde = (k: string) => !prive.has(k) && !/^_/.test(k) && (!recu || /date|heure|debut|fin|duree|creneau|statut|type|jour|_id$/.test(k));
        return { status: 200, body: (data ?? []).map((r: any) => ({ ...Object.fromEntries(Object.entries(r.data ?? {}).filter(([k]) => garde(k))), id: r.id, created_at: r.at })) };
      }
      if (col !== page.ecriture) throw new Err(403, "Envoi non autorisé");
      const depuis = new Date(Date.now() - 3600e3).toISOString();
      const { count } = await admin.from("saas_app_rows").select("id", { count: "exact", head: true }).eq("app_id", app.id).eq("espace_id", espace).eq("data->>_public", "true").gte("at", depuis);
      if ((count ?? 0) >= 60) throw new Err(429, "Trop d'envois en ce moment, réessaie dans une heure");
      const { data: r } = await admin.from("saas_app_rows").insert({ app_id: app.id, user_id: espace, espace_id: espace, col, data: { ...propre(b.data), _public: true } }).select("id, data, at, maj").single();
      return { status: 200, body: ligne(r) };
    }

    // ---- Validation avant construction : liste d'attente et précommandes (sans compte)
    if (action === "liste" || action === "precommande") {
      if (!(app as any).validation?.actif) throw new Err(400, "Les inscriptions sont fermées");
      const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err(400, "Adresse e-mail invalide");
      const ip = await sha(`${app.id}:${(req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()}`);
      const { count } = await admin.from("saas_app_liste").select("id", { count: "exact", head: true }).eq("app_id", app.id).eq("ip", ip).gte("at", new Date(Date.now() - 3600e3).toISOString());
      if ((count ?? 0) >= 10) throw new Err(429, "Trop d'inscriptions depuis cette connexion, réessaie dans une heure");
      const ligne = { app_id: app.id, email, nom: String(b.nom ?? "").trim().slice(0, 80) || null, ip, source };
      if (action === "liste") {
        await admin.from("saas_app_liste").upsert(ligne, { onConflict: "app_id,email", ignoreDuplicates: true });
        return { status: 200, body: { ok: true } };
      }
      const f = ((app.spec as any)?.formules ?? [])[Number(b.formule)];
      if (!f || !(Number(f.prix) > 0)) throw new Err(400, "Formule introuvable");
      const key = await cleStripe(admin, app.id);
      if (!key || !(app.paiement as any)?.actif) throw new Err(400, "Les précommandes ouvrent bientôt : laisse ton e-mail pour être prévenu");
      const retour = retourOk(String(b.retour ?? ""));
      if (!retour) throw new Err(400, "Adresse de retour invalide");
      const remise = Math.max(0, Math.min(90, Number((app as any).validation?.remise ?? 30)));
      const unique = (app.paiement as any)?.modele === "unique";
      // Précommande : le premier mois (ou l'accès à vie) payé maintenant, avec la remise des premiers clients
      const prix = Math.round(Number(f.prix) * (1 - remise / 100) * 100) / 100;
      const sep = retour.includes("?") ? "&" : "?";
      const sess = await stripe(key, "checkout/sessions", {
        mode: "payment", customer_email: email, locale: "fr",
        "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": String(Math.round(prix * 100)),
        "line_items[0][price_data][product_data][name]": `${(app.spec as any)?.nom ?? "Précommande"} ${f.nom} : précommande${unique ? " (accès à vie)" : " (premier mois)"} -${remise} %`.slice(0, 120),
        "payment_intent_data[metadata][app]": slug, "payment_intent_data[metadata][precommande]": "1", "payment_intent_data[metadata][formule]": String(f.nom).slice(0, 80),
        "metadata[app]": slug, "metadata[email]": email, "metadata[formule]": String(f.nom).slice(0, 80),
        success_url: `${retour}${sep}precommande={CHECKOUT_SESSION_ID}`, cancel_url: retour,
      });
      await admin.from("saas_app_liste").upsert({ ...ligne, formule: String(f.nom).slice(0, 80), session: sess.id }, { onConflict: "app_id,email" });
      return { status: 200, body: { url: sess.url } };
    }
    if (action === "precommande-ok") {
      const id = String(b.session ?? "");
      if (!/^cs_[A-Za-z0-9_]{10,}$/.test(id)) throw new Err(400, "Paiement introuvable");
      const key = await cleStripe(admin, app.id);
      if (!key) throw new Err(400, "Paiement introuvable");
      const sess = await stripe(key, `checkout/sessions/${id}`, {}, "GET");
      if (sess?.metadata?.app !== slug) throw new Err(400, "Paiement introuvable");
      const paye = sess.payment_status === "paid";
      if (paye) await admin.from("saas_app_liste").update({ precommande: true, montant: (sess.amount_total ?? 0) / 100, paye_at: new Date().toISOString() }).eq("app_id", app.id).eq("session", id);
      return { status: 200, body: { paye } };
    }
    if (enValidation) throw new Err(400, "L'application ouvre bientôt : laisse ton e-mail pour être prévenu");

    if (action === "signup" || action === "login" || action === "demo") {
      let email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
      let pass = String(b.password ?? "");
      if (action === "demo") { email = `demo-${hex(crypto.getRandomValues(new Uint8Array(6)))}@demo.local`; pass = hex(crypto.getRandomValues(new Uint8Array(16))); }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err(400, "Adresse e-mail invalide");
      if (pass.length < 8) throw new Err(400, "Mot de passe : 8 caractères au moins");
      if (action === "login") {
        const { data: u } = await admin.from("saas_app_users").select("id, email, nom, pass").eq("app_id", app.id).eq("email", email).maybeSingle();
        const [salt, h] = String(u?.pass ?? ":").split(":");
        if (!u || !egal(await pbkdf2(pass, salt), h)) throw new Err(401, "E-mail ou mot de passe incorrect");
        return { status: 200, body: await session(admin, u) };
      }
      // Anti-abus : nombre d'inscriptions par adresse IP et par heure (l'adresse est gardée hachée)
      const ip = await sha(`${app.id}:${(req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()}`);
      const { count } = await admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", app.id).eq("ip", ip).gte("at", new Date(Date.now() - 3600e3).toISOString());
      if ((count ?? 0) >= LIM.inscriptionsParHeure) throw new Err(429, "Trop d'inscriptions depuis cette connexion, réessaie dans une heure");
      // Invitation : le nouveau compte rejoint l'espace (l'équipe) de celui qui l'a invité
      let invite: any = null;
      if (b.invite && action === "signup") {
        ({ data: invite } = await admin.from("saas_app_invites").select("code, espace_id, utilise_at, role, at").eq("app_id", app.id).eq("code", String(b.invite)).maybeSingle());
        if (!invite || invite.utilise_at || Date.now() - new Date(invite.at).getTime() > 14 * 864e5) throw new Err(400, "Cette invitation n'est plus valable : demande un nouveau lien");
        const { data: tit } = await admin.from("saas_app_users").select("abonnement").eq("id", invite.espace_id).maybeSingle();
        const max = places(app, tit ?? {});
        const { count: deja } = await admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("espace_id", invite.espace_id);
        if (max != null && (deja ?? 0) >= max) throw new Err(403, `L'équipe a déjà ses ${max} places : demande à l'administrateur de passer à une formule supérieure`);
      }
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const nom = String(b.nom ?? "").trim().slice(0, 80) || (action === "demo" ? "Invité" : email.split("@")[0]);
      const id = crypto.randomUUID();
      const { data: u, error } = await admin.from("saas_app_users").insert({
        id, app_id: app.id, email, nom, ip, variante, source: action === "demo" ? null : source, pass: `${salt}:${await pbkdf2(pass, salt)}`,
        espace_id: invite?.espace_id ?? id, role: invite ? (ROLES.includes(invite.role) ? invite.role : "membre") : "admin",
      }).select("id, email, nom").single();
      if (error) throw new Err(409, "Un compte existe déjà avec cette adresse");
      if (invite) await admin.from("saas_app_invites").update({ utilise_at: new Date().toISOString() }).eq("code", invite.code);
      else await semer(admin, app, u.id);
      // Précommande payée avant l'ouverture : l'accès est activé (un mois, ou à vie en paiement unique)
      if (action === "signup") {
        const { data: pc } = await admin.from("saas_app_liste").select("formule, montant, paye_at").eq("app_id", app.id).eq("email", email).eq("precommande", true).maybeSingle();
        if (pc?.paye_at) {
          const unique = (app.paiement as any)?.modele === "unique";
          const fin = unique ? null : new Date(Math.max(Date.now(), new Date(pc.paye_at).getTime()) + 31 * 864e5).toISOString();
          await admin.from("saas_app_users").update({ abonnement: { statut: "active", formule: pc.formule, montant: pc.montant, precommande: true, unique, fin_periode: fin, annule: false } }).eq("id", u.id);
        }
      }
      if (action === "signup") {
        const { mailBienvenue } = await import("./app-mails.ts");
        await mailBienvenue(app, slug, { ...u, at: new Date().toISOString() }, !!invite).catch((e) => console.error("bienvenue", e));
      }
      return { status: 200, body: await session(admin, u) };
    }

    // Toutes les autres actions demandent une session
    const jeton = String(req.headers.get("x-app-token") ?? "");
    if (jeton.length !== 64) throw new Err(401, "Session expirée, reconnecte-toi");
    const { data: u0 } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).eq("jeton", await sha(jeton)).maybeSingle();
    if (!u0) throw new Err(401, "Session expirée, reconnecte-toi");
    if (action === "logout") { await admin.from("saas_app_users").update({ jeton: null }).eq("id", u0.id); return { status: 200, body: { ok: true } }; }
    const espace = u0.espace_id ?? u0.id;
    // Le titulaire de l'espace porte l'essai et l'abonnement de toute l'équipe
    const t0 = espace === u0.id ? u0 : (await admin.from("saas_app_users").select(COLS).eq("id", espace).maybeSingle()).data ?? u0;
    const titulaire = await rafraichir(admin, app, t0, action === "me" && b.verifier === true);
    const user = { id: u0.id, email: u0.email, nom: u0.nom, role: u0.role ?? "admin" };
    const et = etat(app, titulaire);
    const rows = () => admin.from("saas_app_rows").select("id, data, at, maj").eq("app_id", app.id).eq("espace_id", espace);
    if (!u0.vu_at || Date.now() - new Date(u0.vu_at).getTime() > 3600e3) await admin.from("saas_app_users").update({ vu_at: new Date().toISOString() }).eq("id", u0.id);

    if (action === "me") return { status: 200, body: { user, ...et, espace, variante: titulaire.variante ?? "A" } };

    if (action === "checkout" || action === "portail") {
      if (!et.payant) throw new Err(400, "Cette application est gratuite");
      if (user.role !== "admin") throw new Err(403, "Seul l'administrateur de l'espace gère l'abonnement");
      const key = await cleStripe(admin, app.id);
      if (!key) throw new Err(400, "Le paiement n'est pas encore configuré");
      const retour = retourOk(String(b.retour ?? ""));
      if (!retour) throw new Err(400, "Adresse de retour invalide");
      let customer = titulaire.stripe_customer;
      if (!customer) {
        customer = (await stripe(key, "customers", { email: titulaire.email, name: titulaire.nom ?? "", "metadata[app]": slug, "metadata[compte]": titulaire.id })).id;
        await admin.from("saas_app_users").update({ stripe_customer: customer }).eq("id", titulaire.id);
      }
      if (action === "portail") return { status: 200, body: { url: (await stripe(key, "billing_portal/sessions", { customer, return_url: retour })).url } };
      const f = ((app.spec as any)?.formules ?? [])[Number(b.formule)];
      if (!f || !(Number(f.prix) > 0)) throw new Err(400, "Formule introuvable");
      const prix = prixVariante(Number(f.prix), titulaire.variante, app.ab);
      const sep = retour.includes("?") ? "&" : "?";
      if (app.paiement?.modele === "unique") {
        const sess = await stripe(key, "checkout/sessions", {
          mode: "payment", customer, client_reference_id: titulaire.id, locale: "fr",
          "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "eur",
          "line_items[0][price_data][unit_amount]": String(Math.round(prix * 100)),
          "line_items[0][price_data][product_data][name]": `${(app.spec as any)?.nom ?? "Accès"} ${f.nom} (accès à vie)`.slice(0, 120),
          "payment_intent_data[metadata][formule]": String(f.nom).slice(0, 80), "payment_intent_data[metadata][app]": slug, "payment_intent_data[metadata][compte]": titulaire.id,
          "invoice_creation[enabled]": "true", allow_promotion_codes: "true",
          success_url: `${retour}${sep}paiement=ok`, cancel_url: retour,
        });
        return { status: 200, body: { url: sess.url } };
      }
      const sess = await stripe(key, "checkout/sessions", {
        mode: "subscription", customer, client_reference_id: titulaire.id, locale: "fr",
        "line_items[0][quantity]": "1", "line_items[0][price_data][currency]": "eur",
        "line_items[0][price_data][unit_amount]": String(Math.round(prix * 100)),
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][price_data][product_data][name]": `${(app.spec as any)?.nom ?? "Abonnement"} ${f.nom}`.slice(0, 120),
        "subscription_data[metadata][formule]": String(f.nom).slice(0, 80), "subscription_data[metadata][app]": slug, "subscription_data[metadata][variante]": titulaire.variante ?? "A",
        allow_promotion_codes: "true",
        success_url: `${retour}${sep}paiement=ok`, cancel_url: retour,
      });
      return { status: 200, body: { url: sess.url } };
    }
    // Essai terminé sans abonnement : seuls la lecture du compte et le paiement restent possibles
    if (!et.acces) throw new Err(402, "Ton essai est terminé : choisis une formule pour continuer");

    // ---- Mon compte
    if (action === "compte") {
      const nom = String(b.nom ?? "").trim().slice(0, 80);
      if (!nom) throw new Err(400, "Indique ton nom");
      await admin.from("saas_app_users").update({ nom }).eq("id", user.id);
      return { status: 200, body: { ok: true } };
    }
    if (action === "motdepasse") {
      const { data: me } = await admin.from("saas_app_users").select("pass").eq("id", user.id).single();
      const [salt, h] = String(me?.pass ?? ":").split(":");
      if (!egal(await pbkdf2(String(b.ancien ?? ""), salt), h)) throw new Err(400, "Mot de passe actuel incorrect");
      if (String(b.nouveau ?? "").length < 8) throw new Err(400, "Nouveau mot de passe : 8 caractères au moins");
      const sel = hex(crypto.getRandomValues(new Uint8Array(16)));
      await admin.from("saas_app_users").update({ pass: `${sel}:${await pbkdf2(String(b.nouveau), sel)}` }).eq("id", user.id);
      return { status: 200, body: { ok: true } };
    }

    // ---- Équipe : invitations (lien ou e-mail), rôles (administrateur, membre, lecture seule), places de la formule
    const estAdmin = user.role === "admin";
    if (action === "equipe") {
      const [{ data }, { data: inv }] = await Promise.all([
        admin.from("saas_app_users").select("id, nom, email, role, at, vu_at").eq("app_id", app.id).eq("espace_id", espace).order("at"),
        estAdmin ? admin.from("saas_app_invites").select("code, email, role, at").eq("espace_id", espace).is("utilise_at", null).gte("at", new Date(Date.now() - 14 * 864e5).toISOString()).order("at", { ascending: false }) : Promise.resolve({ data: [] }),
      ]);
      return { status: 200, body: { membres: (data ?? []).map((m: any) => ({ ...m, moi: m.id === user.id, titulaire: m.id === espace })), invitations: inv ?? [], places: places(app, titulaire), role: user.role } };
    }
    if (action === "inviter") {
      if (!estAdmin) throw new Err(403, "Seul un administrateur peut inviter");
      const max = places(app, titulaire);
      const [{ count }, { count: attente }] = await Promise.all([
        admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("espace_id", espace),
        admin.from("saas_app_invites").select("code", { count: "exact", head: true }).eq("espace_id", espace).is("utilise_at", null).gte("at", new Date(Date.now() - 14 * 864e5).toISOString()),
      ]);
      if ((count ?? 0) >= (max ?? 50)) throw new Err(403, max != null ? `Ta formule compte ${max} place${max > 1 ? "s" : ""} : passe à une formule supérieure pour inviter plus de monde` : "50 membres au plus par espace");
      if ((attente ?? 0) >= 30) throw new Err(429, "Trop d'invitations en attente");
      const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err(400, "Adresse e-mail invalide");
      const role = ROLES.includes(b.role) ? b.role : "membre";
      const code = hex(crypto.getRandomValues(new Uint8Array(12)));
      await admin.from("saas_app_invites").insert({ code, app_id: app.id, espace_id: espace, par: user.id, email: email || null, role });
      const retour = retourOk(String(b.retour ?? ""));
      if (email && retour) {
        const lien = `${retour}${retour.includes("?") ? "&" : "?"}invite=${code}`;
        const { mailInvitation } = await import("./app-mails.ts");
        await mailInvitation(app, slug, email, user.nom ?? "Un collègue", lien, code).catch((e) => console.error("invitation", e));
      }
      return { status: 200, body: { code } };
    }
    if (action === "revoquer") {
      if (!estAdmin) throw new Err(403, "Seul un administrateur peut annuler une invitation");
      await admin.from("saas_app_invites").delete().eq("espace_id", espace).eq("code", String(b.code ?? "")).is("utilise_at", null);
      return { status: 200, body: { ok: true } };
    }
    if (action === "role") {
      if (!estAdmin) throw new Err(403, "Seul un administrateur peut changer les rôles");
      const role = ROLES.includes(b.role) ? b.role : null;
      if (!role || String(b.id) === espace) throw new Err(400, "Le titulaire de l'espace reste administrateur");
      await admin.from("saas_app_users").update({ role }).eq("app_id", app.id).eq("espace_id", espace).eq("id", String(b.id));
      return { status: 200, body: { ok: true } };
    }
    if (action === "retirer") {
      if (!estAdmin) throw new Err(403, "Seul un administrateur peut retirer un membre");
      if (String(b.id) === espace) throw new Err(400, "Le titulaire de l'espace ne peut pas être retiré");
      await admin.from("saas_app_users").delete().eq("app_id", app.id).eq("espace_id", espace).eq("id", String(b.id));
      return { status: 200, body: { ok: true } };
    }
    if (action === "quitter") {
      if (user.id === espace) throw new Err(400, "Le titulaire ne peut pas quitter son propre espace");
      await admin.from("saas_app_users").update({ espace_id: user.id, role: "admin" }).eq("id", user.id);
      return { status: 200, body: { ok: true } };
    }
    // Lecture seule : consultation des données, pas de modification
    if (["add", "update", "remove"].includes(action) && user.role === "lecture") throw new Err(403, "Ton accès est en lecture seule : demande à un administrateur de changer ton rôle");

    // ---- IA de l'application (rédiger, résumer, analyser…) : plafonnée par compte et par application chaque jour
    if (action === "ia") {
      if (!et.acces) throw new Err(402, "Ton essai est terminé : abonne-toi pour continuer");
      const consigne = String(b.consigne ?? "").trim().slice(0, 2000);
      const texte = String(b.texte ?? "").slice(0, 12000);
      if (!consigne) throw new Err(400, "Consigne vide");
      const ok = (await admin.rpc("saas_app_ia_compter", { p_app: app.id, p_user: u0.id, p_max_user: estDemo(u0.email) ? 5 : 40, p_max_app: 400 })).data;
      if (!ok) throw new Err(429, "Limite d'utilisation de l'IA atteinte pour aujourd'hui, réessaie demain");
      const { ask, askJson, setAi } = await import("./core.ts");
      setAi({ ws: app.workspace_id, feature: "app/ia" });
      const prompt = `Tu es l'assistant intégré de l'application « ${String(app.spec?.nom ?? "").slice(0, 60)} » (${String(app.spec?.pitch ?? "").slice(0, 200)}).
Réponds en français, directement, sans préambule ni commentaire sur toi-même.
Consigne : ${consigne}${texte ? `\n\nTexte ou données fournis :\n"""\n${texte}\n"""` : ""}`;
      if (b.json) return { status: 200, body: { resultat: await askJson<unknown>(prompt + "\nRéponds uniquement en JSON valide.", { fast: true, maxTokens: 2500 }) } };
      return { status: 200, body: { resultat: (await ask(prompt, { fast: true, maxTokens: 2500 })).trim() } };
    }

    // ---- Données de l'espace
    if (action === "list") {
      let q = rows().eq("col", colOk(b.col));
      for (const [k, v] of Object.entries(b.where ?? {}).slice(0, 5)) if (/^[a-z][a-z0-9_]{0,39}$/.test(k) && ["string", "number", "boolean"].includes(typeof v)) q = q.eq(`data->>${k}`, String(v));
      const { data } = await q.order("at", { ascending: false }).limit(Math.min(1000, Number(b.limit) || 500));
      return { status: 200, body: (data ?? []).map(ligne) };
    }
    if (action === "get") {
      const { data } = await rows().eq("col", colOk(b.col)).eq("id", String(b.id)).maybeSingle();
      if (!data) throw new Err(404, "Élément introuvable");
      return { status: 200, body: ligne(data) };
    }
    if (action === "add") {
      const col = colOk(b.col);
      const { count } = await admin.from("saas_app_rows").select("id", { count: "exact", head: true }).eq("app_id", app.id).eq("espace_id", espace);
      if ((count ?? 0) >= LIM.rows) throw new Err(403, "Limite de données atteinte pour cet espace");
      const { data } = await admin.from("saas_app_rows").insert({ app_id: app.id, user_id: user.id, espace_id: espace, col, data: propre(b.data) }).select("id, data, at, maj").single();
      return { status: 200, body: ligne(data) };
    }
    if (action === "update") {
      const col = colOk(b.col);
      const { data: cur } = await rows().eq("col", col).eq("id", String(b.id)).maybeSingle();
      if (!cur) throw new Err(404, "Élément introuvable");
      const { data } = await admin.from("saas_app_rows").update({ data: propre({ ...(cur.data as object), ...propre(b.data) }), maj: new Date().toISOString() }).eq("id", cur.id).select("id, data, at, maj").single();
      return { status: 200, body: ligne(data) };
    }
    if (action === "remove") {
      await admin.from("saas_app_rows").delete().eq("app_id", app.id).eq("espace_id", espace).eq("col", colOk(b.col)).eq("id", String(b.id));
      return { status: 200, body: { ok: true } };
    }
    throw new Err(404, "Action inconnue");
  } catch (e) {
    if (e instanceof Err) return { status: e.status, body: { error: e.message } };
    if (e instanceof SyntaxError) return { status: 400, body: { error: "Requête invalide" } };
    console.error("app", e);
    return { status: 500, body: { error: "Erreur du serveur, réessaie" } };
  }
}
