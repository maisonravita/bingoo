// E-mails des SaaS construits par Bingoo! : bienvenue, fin d'essai, relance, paiement échoué, merci, invitation, annonces.
// Expédiés au nom de l'application, depuis le domaine du créateur s'il l'a vérifié (Resend), sinon depuis le domaine de Bingoo!.
// Chaque modèle est modifiable et désactivable par le créateur ; chaque e-mail porte un lien de désinscription (sauf invitation).
// deno-lint-ignore-file no-explicit-any
import { admin, env, PLATFORM_DOMAIN } from "./core.ts";
import { resend } from "./mail.ts";
import { HttpError } from "./http.ts";

const lien = (app: any, slug: string) => app.domaine_statut === "ok" && app.domaine ? `https://${app.domaine}/` : `https://kairo.maisonravita.fr/#/app/${slug}`;
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const T = `${Deno.env.get("SUPABASE_URL")}/functions/v1/t/app`;

/** Modèles par défaut. Variables : {prenom}, {app}, {jours}, {formule}, {de}. */
export const MODELES: Record<string, { nom: string; quand: string; sujet: string; texte: string; bouton: string; pub?: boolean }> = {
  bienvenue: { nom: "Bienvenue", quand: "à l'inscription", sujet: "Bienvenue sur {app}", texte: "Bonjour {prenom},\n\nTon compte {app} est prêt. Des exemples t'attendent déjà dans l'application pour te montrer comment tout fonctionne.\n\nUne question ? Réponds simplement à cet e-mail.", bouton: "Ouvrir {app}" },
  essai: { nom: "Fin d'essai", quand: "3 jours avant la fin de l'essai", sujet: "Ton essai {app} se termine dans 3 jours", texte: "Bonjour {prenom},\n\nTon essai gratuit de {app} se termine dans 3 jours. Pour garder l'accès à tes données, choisis une formule dans « Mon abonnement ».\n\nSans engagement : tu peux résilier quand tu veux.", bouton: "Choisir ma formule" },
  relance: { nom: "Relance", quand: "après 7 jours sans visite, une fois", sujet: "Tout est prêt sur {app}", texte: "Bonjour {prenom},\n\nÇa fait une semaine qu'on ne t'a pas vu sur {app}. Tes données sont là où tu les as laissées.", bouton: "Revenir sur {app}", pub: true },
  merci: { nom: "Merci", quand: "au premier paiement", sujet: "Merci pour ta confiance", texte: "Bonjour {prenom},\n\nTon abonnement {formule} à {app} est actif. Merci !\n\nTes factures et ta carte se gèrent dans « Mon abonnement ».", bouton: "Ouvrir {app}" },
  paiement: { nom: "Paiement échoué", quand: "quand un paiement ne passe pas", sujet: "Ton paiement {app} n'est pas passé", texte: "Bonjour {prenom},\n\nLe dernier paiement de ton abonnement {app} n'est pas passé. Mets à jour ta carte dans « Mon abonnement » pour garder l'accès.", bouton: "Mettre à jour ma carte" },
  annonce: { nom: "Annonce", quand: "envoyée par toi", sujet: "{app}", texte: "", bouton: "Ouvrir {app}", pub: true },
  invitation: { nom: "Invitation", quand: "quand un administrateur invite quelqu'un", sujet: "{de} t'invite sur {app}", texte: "Bonjour,\n\n{de} t'invite à rejoindre son équipe sur {app}.\n\nL'invitation est valable 14 jours.", bouton: "Rejoindre l'équipe" },
};
/** Modèle en vigueur (celui du créateur s'il l'a modifié) et s'il est actif. */
export function modele(app: any, type: string) {
  const base = MODELES[type], perso = (app.emails ?? {})[type] ?? {};
  return { ...base, ...Object.fromEntries(Object.entries(perso).filter(([k, v]) => ["sujet", "texte", "bouton"].includes(k) && typeof v === "string" && v.trim())), actif: perso.actif !== false };
}
const remplir = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));

async function envoyerModele(app: any, slug: string, type: string, u: { id?: string; email: string; nom?: string; desabo?: string }, vars: Record<string, string> = {}, url?: string, cle?: string, force = false) {
  if (/@demo\.local$/.test(u.email)) return false;
  const m = modele(app, type);
  if (!m.actif && !force) return false;
  const v = { prenom: String(u.nom ?? "").split(" ")[0] || "", app: app.spec?.nom ?? "", jours: String(app.paiement?.essai_jours ?? 14), ...vars };
  const desabo = type !== "invitation" && u.desabo ? `${T}/${slug}/desabonner?t=${u.desabo}` : null;
  await envoyerBrut(app, u.email, remplir(m.sujet, v), remplir(m.texte, v), remplir(m.bouton, v), url ?? lien(app, slug), `${type}-${cle ?? u.id ?? u.email}`, desabo);
  await admin.from("saas_app_mails").insert({ app_id: app.id, user_id: u.id ?? null, type });
  return true;
}

async function envoyerBrut(app: any, to: string, sujet: string, texte: string, bouton: string, url: string, cle: string, desabo: string | null, pied?: string) {
  const s = app.spec ?? {};
  const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
  const de = app.email_dom?.statut === "ok" ? `bonjour@${app.email_dom.domaine}` : `apps@${PLATFORM_DOMAIN()}`;
  const paras = texte.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0F172A">
<p style="font-weight:800;font-size:18px;margin:0 0 18px"><span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${couleur};color:#fff;text-align:center;line-height:28px;margin-right:8px">${esc(String(s.nom ?? "S")[0])}</span>${esc(s.nom)}</p>
${paras.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
${bouton ? `<p style="margin:22px 0"><a href="${url}" style="background:${couleur};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:15px">${esc(bouton)}</a></p>` : ""}
<p style="font-size:12px;color:#94A3B8;margin-top:28px">${esc(s.nom)} · ${pied ? esc(pied) : `Tu reçois cet e-mail parce que tu as un compte sur ${esc(s.nom)}.`}${desabo ? ` <a href="${desabo}" style="color:#94A3B8">Ne plus recevoir ces e-mails</a>` : ""}</p></div>`;
  const r = await resend("/emails", "POST", {
    from: `${String(s.nom ?? "App").replace(/[<>"]/g, "")} <${de}>`, to: [to], subject: sujet, html,
    text: `${texte}\n\n${bouton ? `${bouton} : ${url}` : ""}${desabo ? `\n\nNe plus recevoir ces e-mails : ${desabo}` : ""}`,
    ...(desabo ? { headers: { "List-Unsubscribe": `<${desabo}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  }, { "Idempotency-Key": `app-${cle}` });
  if (!r.ok) throw new Error(`Resend ${r.status} ${r.data?.message ?? ""}`);
}

export async function mailBienvenue(app: any, slug: string, u: any, invite: boolean) {
  const { data: full } = await admin.from("saas_app_users").select("id, email, nom, desabo").eq("id", u.id).single();
  const ok = await envoyerModele(app, slug, "bienvenue", full ?? u, { equipe: invite ? "oui" : "" });
  if (ok) await admin.from("saas_app_users").update({ mail_bienvenue_at: new Date().toISOString() }).eq("id", u.id);
}

export async function mailInvitation(app: any, slug: string, to: string, de: string, lienInvite: string, code: string) {
  await envoyerModele(app, slug, "invitation", { email: to }, { de }, lienInvite, code, true);
}

/** Désinscription (lien en bas des e-mails) : plus de relances ni d'annonces ; les e-mails de service (paiement) restent. */
export async function appDesabonner(slug: string, token: string) {
  if (!/^[a-f0-9]{24}$/.test(token)) return false;
  const { data: app } = await admin.from("saas_apps").select("id").eq("slug", slug).maybeSingle();
  if (!app) return false;
  const { data } = await admin.from("saas_app_users").update({ mail_off: true }).eq("app_id", app.id).eq("desabo", token).select("id");
  return !!data?.length;
}

const ACTIFS = ["active", "trialing", "past_due"];
/** Tâche : fin d'essai (J-3), relance (7 jours sans visite, une fois), merci (premier paiement), paiement échoué (une fois par semaine au plus). */
export async function appMailsCron(max = 200) {
  const { data: apps } = await admin.from("saas_apps").select("id, slug, spec, paiement, domaine, domaine_statut, email_dom, emails").not("spec->ecrans", "is", null);
  let n = 0;
  const COLS = "id, email, nom, desabo, abonnement, mail_off";
  for (const app of (apps ?? []) as any[]) {
    if (n >= max) break;
    const s = app.spec ?? {};
    if (!s.ecrans?.length) continue;
    const marquer = (id: string, champ: string) => admin.from("saas_app_users").update({ [champ]: new Date().toISOString() }).eq("id", id);
    if (app.paiement?.actif) {
      const j = Number(app.paiement.essai_jours ?? 14);
      if (j > 3) {
        const debut = new Date(Date.now() - (j - 3) * 864e5).toISOString(), fin = new Date(Date.now() - (j - 4) * 864e5).toISOString();
        const { data: us } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).eq("role", "admin").is("mail_essai_at", null).gte("at", debut).lt("at", fin).limit(50);
        for (const u of (us ?? []) as any[]) {
          if (ACTIFS.includes(u.abonnement?.statut)) continue;
          if (await envoyerModele(app, app.slug, "essai", u).catch((e) => { console.error("mail essai", e); return false; })) n++;
          await marquer(u.id, "mail_essai_at");
        }
      }
      const { data: payes } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).eq("abonnement->>statut", "active").is("mail_merci_at", null).limit(50);
      for (const u of (payes ?? []) as any[]) {
        if (await envoyerModele(app, app.slug, "merci", u, { formule: u.abonnement?.formule ?? "" }).catch((e) => { console.error("mail merci", e); return false; })) n++;
        await marquer(u.id, "mail_merci_at");
      }
      const { data: echecs } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).eq("abonnement->>statut", "past_due").or(`mail_paiement_at.is.null,mail_paiement_at.lt.${new Date(Date.now() - 7 * 864e5).toISOString()}`).limit(50);
      for (const u of (echecs ?? []) as any[]) {
        if (await envoyerModele(app, app.slug, "paiement", u, {}, undefined, `${u.id}-${new Date().toISOString().slice(0, 10)}`).catch((e) => { console.error("mail paiement", e); return false; })) n++;
        await marquer(u.id, "mail_paiement_at");
      }
    }
    const { data: inactifs } = await admin.from("saas_app_users").select(COLS).eq("app_id", app.id).is("mail_relance_at", null).eq("mail_off", false).not("email", "like", "demo-%@demo.local")
      .lt("vu_at", new Date(Date.now() - 7 * 864e5).toISOString()).gt("vu_at", new Date(Date.now() - 30 * 864e5).toISOString()).limit(50);
    for (const u of (inactifs ?? []) as any[]) {
      if (await envoyerModele(app, app.slug, "relance", u).catch((e) => { console.error("mail relance", e); return false; })) n++;
      await marquer(u.id, "mail_relance_at");
    }
  }
  return { envoyes: n };
}

// ---------------------------------------------------------------- Côté créateur : modèles, e-mail d'essai, annonces, chiffres
export async function appEmailsModeles(appId: string, b: any) {
  const { data: app } = await admin.from("saas_apps").select("emails").eq("id", appId).single();
  const e = { ...((app?.emails ?? {}) as any) };
  if (b.type && MODELES[b.type]) {
    const cur = { ...(e[b.type] ?? {}) };
    for (const k of ["sujet", "texte", "bouton"]) if (typeof b[k] === "string") cur[k] = b[k].slice(0, k === "texte" ? 4000 : 160);
    if (b.actif !== undefined) cur.actif = !!b.actif;
    if (b.reinitialiser) { delete cur.sujet; delete cur.texte; delete cur.bouton; }
    e[b.type] = cur;
    await admin.from("saas_apps").update({ emails: e }).eq("id", appId);
  }
  return appEmailsEtat(appId);
}
export async function appEmailsEtat(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("emails").eq("id", appId).single();
  const [{ data: logs }, { count: desabonnes }, { count: joignables }] = await Promise.all([
    admin.from("saas_app_mails").select("type").eq("app_id", appId).gte("at", new Date(Date.now() - 30 * 864e5).toISOString()).limit(10000),
    admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", appId).eq("mail_off", true),
    admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", appId).eq("mail_off", false).not("email", "like", "demo-%@demo.local"),
  ]);
  const envoyes: Record<string, number> = {};
  for (const l of (logs ?? []) as any[]) envoyes[l.type] = (envoyes[l.type] ?? 0) + 1;
  const a = { emails: app?.emails ?? {} };
  return { modeles: Object.fromEntries(Object.keys(MODELES).filter((k) => k !== "annonce").map((k) => [k, { ...modele(a, k), modifie: !!((app?.emails as any)?.[k]?.sujet || (app?.emails as any)?.[k]?.texte), envoyes_30j: envoyes[k] ?? 0 }])), annonces_30j: envoyes.annonce ?? 0, desabonnes: desabonnes ?? 0, joignables: joignables ?? 0, derniere_annonce: (app?.emails as any)?._annonce_at ?? null };
}
/** E-mail d'essai envoyé au créateur lui-même. */
export async function appEmailTest(appId: string, type: string, to: string) {
  const { data: app } = await admin.from("saas_apps").select("id, slug, spec, paiement, domaine, domaine_statut, email_dom, emails").eq("id", appId).single();
  if (!MODELES[type] && type !== "annonce") throw new HttpError(400, "Modèle inconnu");
  if (!to) throw new HttpError(400, "Adresse du créateur introuvable");
  if (type === "annonce") return { ok: true };
  await envoyerModele(app, app!.slug, type, { email: to, nom: "Prénom" }, { formule: "Pro", de: "Camille" }, undefined, `test-${Date.now()}`, true);
  return { ok: true, a: to };
}
/** Annonce à tous les comptes de l'app (nouveautés…) : une par semaine au plus, sans les désinscrits. */
export async function appAnnonce(appId: string, sujet: string, texte: string, bouton: string, test: string | null) {
  const { data: app } = await admin.from("saas_apps").select("id, slug, spec, paiement, domaine, domaine_statut, email_dom, emails").eq("id", appId).single();
  sujet = sujet.trim().slice(0, 160); texte = texte.trim().slice(0, 4000);
  if (sujet.length < 3 || texte.length < 10) throw new HttpError(400, "Écris un sujet et un message");
  const fake = { ...app, emails: { ...(app!.emails as any), annonce: { sujet, texte, bouton: bouton || "Ouvrir {app}" } } };
  if (test) { await envoyerModele(fake, app!.slug, "annonce", { email: test, nom: "Prénom" }, {}, undefined, `annonce-test-${Date.now()}`, true); return { test: true }; }
  const der = (app!.emails as any)?._annonce_at;
  if (der && Date.now() - new Date(der).getTime() < 6.5 * 864e5) throw new HttpError(429, "Une annonce par semaine au plus : tes clients te remercieront");
  const { data: us } = await admin.from("saas_app_users").select("id, email, nom, desabo").eq("app_id", appId).eq("mail_off", false).not("email", "like", "demo-%@demo.local").limit(2000);
  let n = 0;
  for (const u of us ?? []) { if (await envoyerModele(fake, app!.slug, "annonce", u, {}, undefined, `annonce-${u.id}-${new Date().toISOString().slice(0, 10)}`, true).catch(() => false)) n++; }
  await admin.from("saas_apps").update({ emails: { ...(app!.emails as any), _annonce_at: new Date().toISOString() } }).eq("id", appId);
  return { envoyes: n };
}

// ---------------------------------------------------------------- Domaine d'envoi du créateur (Resend)
export async function appEmailDomaine(appId: string, brut: unknown) {
  const { data: app } = await admin.from("saas_apps").select("email_dom").eq("id", appId).single();
  const d = String(brut ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  const ancien = (app?.email_dom ?? null) as any;
  if (ancien?.id && ancien.domaine !== d) { await resend(`/domains/${ancien.id}`, "DELETE").catch(() => null); await admin.from("saas_apps").update({ email_dom: null }).eq("id", appId); }
  if (!d) return { email_dom: null };
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d) || d.endsWith(PLATFORM_DOMAIN())) throw new HttpError(400, "Nom de domaine invalide");
  if (!env("RESEND_API_KEY")) throw new HttpError(503, "Envoi d'e-mails indisponible");
  const r = await resend("/domains", "POST", { name: d, region: "eu-west-1" });
  if (!r.ok) throw new HttpError(400, `Ajout impossible : ${r.data?.message ?? r.status}`);
  const email_dom = { id: r.data.id, domaine: d, statut: "attente", dns: (r.data.records ?? []).map((x: any) => ({ type: x.type, nom: x.name, valeur: x.value, priorite: x.priority ?? null })) };
  await admin.from("saas_apps").update({ email_dom }).eq("id", appId);
  return { email_dom };
}
export async function appEmailVerifier(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("email_dom").eq("id", appId).single();
  const e = (app?.email_dom ?? null) as any;
  if (!e?.id) return { email_dom: null };
  await resend(`/domains/${e.id}/verify`, "POST");
  const r = await resend(`/domains/${e.id}`);
  const statut = r.data?.status === "verified" ? "ok" : "attente";
  const email_dom = { ...e, statut, dns: (r.data?.records ?? []).map((x: any) => ({ type: x.type, nom: x.name, valeur: x.value, priorite: x.priority ?? null, ok: x.status === "verified" })) };
  await admin.from("saas_apps").update({ email_dom }).eq("id", appId);
  return { email_dom };
}


// ---------------------------------------------------------------- Ouverture : prévenir la liste d'attente et les précommandes (déclenché par le créateur)
export async function appOuverture(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("id, slug, spec, paiement, domaine, domaine_statut, email_dom, emails, validation").eq("id", appId).single();
  if (!(app!.spec as any)?.ecrans?.length) throw new HttpError(400, "Construis d'abord ton SaaS : l'e-mail annonce son ouverture");
  const { data: liste } = await admin.from("saas_app_liste").select("id, email, precommande, formule").eq("app_id", appId).is("prevenu_at", null).limit(2000);
  const nom = (app!.spec as any)?.nom ?? "L'application";
  const url = lien(app, app!.slug);
  let n = 0;
  for (const x of liste ?? []) {
    const texte = x.precommande
      ? `Bonne nouvelle : ${nom} est ouvert.\n\nTa précommande${x.formule ? ` (formule ${x.formule})` : ""} est déjà réglée. Crée ton compte avec cette adresse e-mail : ton accès est activé automatiquement.\n\nMerci d'avoir cru au projet avant tout le monde.`
      : `Bonne nouvelle : ${nom} est ouvert.\n\nTu t'étais inscrit pour être prévenu : tu peux créer ton compte dès maintenant.`;
    try {
      await envoyerBrut(app, x.email, `${nom} est ouvert`, texte, x.precommande ? "Créer mon compte" : `Découvrir ${nom}`, url, `ouverture-${x.id}`, null, `Tu reçois cet e-mail parce que tu t'es inscrit pour être prévenu de l'ouverture de ${nom}.`);
      await admin.from("saas_app_liste").update({ prevenu_at: new Date().toISOString() }).eq("id", x.id);
      n++;
    } catch (e) { console.error("ouverture", e); }
  }
  return { envoyes: n };
}

/** Une page publique vient de recevoir quelque chose (réservation, demande, avis…) : l'utilisateur qui l'a partagée est prévenu. */
export async function mailRecu(app: any, slug: string, titulaire: { id: string; email: string; nom?: string | null }, page: any, rowId: string, data: Record<string, unknown>) {
  if (!titulaire?.email || /@demo\.local$/.test(titulaire.email)) return;
  const champs = Object.entries(data).filter(([k, v]) => !k.startsWith("_") && !/_id$/.test(k) && v !== null && v !== "" && typeof v !== "object").slice(0, 8);
  const lignes = champs.map(([k, v]) => `${k.replace(/_/g, " ")} : ${String(v).slice(0, 200)}`).join("\n");
  await envoyerBrut(app, titulaire.email, `Nouveau : ${String(page.titre ?? "page publique").slice(0, 60)}`, `Ta page « ${page.titre} » vient de recevoir un envoi.\n\n${lignes}`, "Ouvrir mon espace", lien(app, slug), `recu-${rowId}`, null, "E-mail envoyé à chaque envoi reçu par tes pages publiques.");
}

/** E-mails des utilisateurs d'une app à leurs propres clients (confirmations, rappels, relances), immédiats ou planifiés.
 *  Au nom de l'utilisateur (réponse vers son adresse), depuis le domaine de l'app ; les répétitions se replanifient. */
export async function appEnvoisCron(max = 200, seul?: string) {
  let q = admin.from("saas_app_envois").select("id, app_id, espace_id, a, sujet, payload, quand").eq("statut", "attente").lte("quand", new Date(Date.now() + 60e3).toISOString()).order("quand").limit(max);
  if (seul) q = q.eq("id", seul);
  const { data } = await q;
  let envoyes = 0, erreurs = 0;
  const apps = new Map<string, any>();
  for (const e of (data ?? []) as any[]) {
    // Réservation de la ligne : deux passages simultanés n'envoient pas deux fois
    const { data: pris } = await admin.from("saas_app_envois").update({ statut: "envoi" }).eq("id", e.id).eq("statut", "attente").select("id");
    if (!pris?.length) continue;
    try {
      if (!apps.has(e.app_id)) apps.set(e.app_id, (await admin.from("saas_apps").select("id, slug, spec, email_dom, domaine, domaine_statut").eq("id", e.app_id).single()).data);
      const app = apps.get(e.app_id);
      const p = e.payload ?? {};
      const s = app?.spec ?? {};
      const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
      const de = app.email_dom?.statut === "ok" ? `bonjour@${app.email_dom.domaine}` : `apps@${PLATFORM_DOMAIN()}`;
      const nomExp = String(p.signature || s.nom || "").replace(/[<>"]/g, "").slice(0, 60);
      const paras = String(p.texte ?? "").split(/\n{2,}/).map((x: string) => x.trim()).filter(Boolean);
      const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0F172A">${paras.map((x: string) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${esc(x).replace(/\n/g, "<br>")}</p>`).join("")}${p.bouton && p.lien ? `<p style="margin:22px 0"><a href="${esc(p.lien)}" style="background:${couleur};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:15px">${esc(p.bouton)}</a></p>` : ""}<p style="font-size:12px;color:#94A3B8;margin-top:28px">${esc(nomExp)}${p.signature ? ` · envoyé avec ${esc(s.nom ?? "")}` : ""}</p></div>`;
      const r = await resend("/emails", "POST", {
        from: `${nomExp || "Notification"} <${de}>`, to: [e.a], subject: e.sujet, html,
        text: `${p.texte}${p.bouton && p.lien ? `\n\n${p.bouton} : ${p.lien}` : ""}\n\n${nomExp}`,
        ...(p.repondre ? { reply_to: p.repondre } : {}),
      }, { "Idempotency-Key": `envoi-${e.id}` });
      if (!r.ok) throw new Error(`Resend ${r.status} ${r.data?.message ?? ""}`);
      await admin.from("saas_app_envois").update({ statut: "envoye", envoye_at: new Date().toISOString() }).eq("id", e.id);
      envoyes++;
      if (p.repeter) {
        const d = new Date(e.quand);
        if (p.repeter === "jour") d.setUTCDate(d.getUTCDate() + 1); else if (p.repeter === "semaine") d.setUTCDate(d.getUTCDate() + 7); else d.setUTCMonth(d.getUTCMonth() + 1);
        await admin.from("saas_app_envois").insert({ app_id: e.app_id, espace_id: e.espace_id, a: e.a, sujet: e.sujet, quand: d.toISOString(), payload: p });
      }
    } catch (x) {
      erreurs++;
      await admin.from("saas_app_envois").update({ statut: "erreur", erreur: String((x as Error)?.message ?? x).slice(0, 300) }).eq("id", e.id);
    }
  }
  return { envoyes, erreurs };
}
