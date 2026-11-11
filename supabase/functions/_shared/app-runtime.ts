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
  variante === "B" && ab?.actif ? Math.round(prix * (1 + Number(ab.ecart ?? 20) / 100)) : Number(prix);

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
  const essaiFin = new Date(new Date(titulaire.at).getTime() + Number(pay.essai_jours ?? 14) * 864e5).toISOString();
  const ab = titulaire.abonnement ?? null;
  const demo = estDemo(titulaire.email);
  const acces = !pay.actif || demo || ACTIF.includes(ab?.statut) || Date.now() < new Date(essaiFin).getTime();
  return { acces, payant: !!pay.actif && !demo, essai_fin: essaiFin, abonnement: ab };
}

/** Relit l'abonnement chez Stripe (au retour du paiement, puis toutes les 10 minutes au plus). */
async function rafraichir(admin: SupabaseClient, app: any, u: any, force = false) {
  if (!app.paiement?.actif || !u.stripe_customer) return u;
  if (!force && u.verifie_at && Date.now() - new Date(u.verifie_at).getTime() < 10 * 60e3) return u;
  const key = await cleStripe(admin, app.id);
  if (!key) return u;
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

// ---------------------------------------------------------------- Application installable (manifeste et icône)
const echap = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export async function appFichier(admin: SupabaseClient, slug: string, quoi: string): Promise<{ status: number; type: string; body: string }> {
  const { data: app } = await admin.from("saas_apps").select("slug, spec, domaine, domaine_statut").eq("slug", slug).maybeSingle();
  const s = (app?.spec ?? {}) as any;
  if (!app || !s.ecrans?.length) return { status: 404, type: "text/plain", body: "introuvable" };
  const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/t/app/${slug}`;
  if (quoi === "icone.svg") {
    return { status: 200, type: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${couleur}"/><text x="256" y="340" font-family="Inter,Arial,sans-serif" font-size="280" font-weight="800" fill="#fff" text-anchor="middle">${echap(String(s.nom ?? "S").slice(0, 1).toUpperCase())}</text></svg>` };
  }
  if (quoi === "manifest") {
    const propre = app.domaine_statut === "ok" && app.domaine;
    const debut = propre ? "/" : `/?app=${slug}#/app/${slug}`;
    return { status: 200, type: "application/manifest+json", body: JSON.stringify({
      id: propre ? "/" : `/?app=${slug}`, name: s.nom, short_name: String(s.nom ?? "").slice(0, 12), description: s.pitch ?? "",
      start_url: debut, scope: "/", display: "standalone", background_color: "#F8FAFC", theme_color: couleur, lang: "fr",
      icons: [{ src: `${base}/icone.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: `${base}/icone.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" }],
    }) };
  }
  return { status: 404, type: "text/plain", body: "introuvable" };
}

// ---------------------------------------------------------------- API
export async function appApi(admin: SupabaseClient, req: Request, slug: string, action: string): Promise<{ status: number; body: unknown }> {
  try {
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) throw new Err(404, "Application introuvable");
    const { data: app } = await admin.from("saas_apps").select("id, workspace_id, spec, statut, paiement, domaine, domaine_statut, ab, email_dom").eq("slug", slug).maybeSingle();
    if (!app || !(app.spec as any)?.ecrans?.length) throw new Err(404, "Application introuvable");
    const b = JSON.parse((await req.text()).slice(0, 60000) || "{}");
    const variante = b.variante === "B" && (app.ab as any)?.actif ? "B" : "A";

    // Visite de la page d'accueil (mesure du test de prix)
    if (action === "vue") { if ((app.ab as any)?.actif) await admin.rpc("saas_app_vue", { p_app: app.id, p_var: variante }); return { status: 200, body: { ok: true } }; }

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
        ({ data: invite } = await admin.from("saas_app_invites").select("code, espace_id, utilise_at").eq("app_id", app.id).eq("code", String(b.invite)).maybeSingle());
        if (!invite || invite.utilise_at) throw new Err(400, "Cette invitation n'est plus valable : demande un nouveau lien");
      }
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const nom = String(b.nom ?? "").trim().slice(0, 80) || (action === "demo" ? "Invité" : email.split("@")[0]);
      const id = crypto.randomUUID();
      const { data: u, error } = await admin.from("saas_app_users").insert({
        id, app_id: app.id, email, nom, ip, variante, pass: `${salt}:${await pbkdf2(pass, salt)}`,
        espace_id: invite?.espace_id ?? id, role: invite ? "membre" : "admin",
      }).select("id, email, nom").single();
      if (error) throw new Err(409, "Un compte existe déjà avec cette adresse");
      if (invite) await admin.from("saas_app_invites").update({ utilise_at: new Date().toISOString() }).eq("code", invite.code);
      else await semer(admin, app, u.id);
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

    if (action === "me") return { status: 200, body: { user, ...et, variante: titulaire.variante ?? "A" } };

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

    // ---- Équipe
    if (action === "equipe") {
      const { data } = await admin.from("saas_app_users").select("id, nom, email, role, at, vu_at").eq("app_id", app.id).eq("espace_id", espace).order("at");
      return { status: 200, body: (data ?? []).map((m: any) => ({ ...m, moi: m.id === user.id })) };
    }
    if (action === "inviter") {
      if (user.role !== "admin") throw new Err(403, "Seul l'administrateur peut inviter");
      const { count } = await admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("espace_id", espace);
      if ((count ?? 0) >= 50) throw new Err(403, "50 membres au plus par espace");
      const code = hex(crypto.getRandomValues(new Uint8Array(12)));
      await admin.from("saas_app_invites").insert({ code, app_id: app.id, espace_id: espace, par: user.id });
      return { status: 200, body: { code } };
    }
    if (action === "retirer") {
      if (user.role !== "admin") throw new Err(403, "Seul l'administrateur peut retirer un membre");
      if (String(b.id) === espace) throw new Err(400, "Le titulaire de l'espace ne peut pas être retiré");
      await admin.from("saas_app_users").delete().eq("app_id", app.id).eq("espace_id", espace).eq("id", String(b.id));
      return { status: 200, body: { ok: true } };
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
