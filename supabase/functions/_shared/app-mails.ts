// E-mails des SaaS construits par Bingoo! : bienvenue, fin d'essai, relance d'inactivité.
// Expédiés au nom de l'application, depuis le domaine du créateur s'il l'a vérifié (Resend), sinon depuis le domaine de Bingoo!.
// deno-lint-ignore-file no-explicit-any
import { admin, env, PLATFORM_DOMAIN } from "./core.ts";
import { resend } from "./mail.ts";
import { HttpError } from "./http.ts";

const lien = (app: any, slug: string) => app.domaine_statut === "ok" && app.domaine ? `https://${app.domaine}/` : `https://kairo.maisonravita.fr/#/app/${slug}`;
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

async function envoyer(app: any, slug: string, to: string, sujet: string, paragraphes: string[], bouton: string, cle: string) {
  return envoyerLien(app, slug, to, sujet, paragraphes, bouton, lien(app, slug), cle);
}
async function envoyerLien(app: any, slug: string, to: string, sujet: string, paragraphes: string[], bouton: string, url: string, cle: string) {
  if (/@demo\.local$/.test(to)) return;
  const s = app.spec ?? {};
  const couleur = /^#[0-9a-f]{6}$/i.test(s.couleur ?? "") ? s.couleur : "#4F46E5";
  const de = app.email_dom?.statut === "ok" ? `bonjour@${app.email_dom.domaine}` : `apps@${PLATFORM_DOMAIN()}`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0F172A">
<p style="font-weight:800;font-size:18px;margin:0 0 18px"><span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:${couleur};color:#fff;text-align:center;line-height:28px;margin-right:8px">${esc(String(s.nom ?? "S")[0])}</span>${esc(s.nom)}</p>
${paragraphes.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${esc(p)}</p>`).join("")}
<p style="margin:22px 0"><a href="${url}" style="background:${couleur};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:15px">${esc(bouton)}</a></p>
<p style="font-size:12px;color:#94A3B8;margin-top:28px">${esc(s.nom)} · Tu reçois cet e-mail parce que tu as un compte sur ${esc(s.nom)}.</p></div>`;
  const r = await resend("/emails", "POST", {
    from: `${String(s.nom ?? "App").replace(/[<>"]/g, "")} <${de}>`, to: [to], subject: sujet, html,
    text: `${paragraphes.join("\n\n")}\n\n${bouton} : ${url}`,
  }, { "Idempotency-Key": `app-${cle}` });
  if (!r.ok) throw new Error(`Resend ${r.status} ${r.data?.message ?? ""}`);
}

export async function mailBienvenue(app: any, slug: string, u: any, invite: boolean) {
  const s = app.spec ?? {};
  const essai = app.paiement?.actif && !invite ? ` Ton essai gratuit de ${app.paiement.essai_jours ?? 14} jours commence aujourd'hui, sans carte bancaire.` : "";
  await envoyer(app, slug, u.email, `Bienvenue sur ${s.nom}`, [
    `Bonjour ${u.nom ?? ""},`,
    invite ? `Tu as rejoint ton équipe sur ${s.nom}.` : `Ton compte ${s.nom} est prêt.${essai}`,
    `${s.pitch ?? ""} Des exemples t'attendent déjà dans l'application pour te montrer comment tout fonctionne.`,
  ], `Ouvrir ${s.nom}`, `bienvenue-${u.id}`);
  await admin.from("saas_app_users").update({ mail_bienvenue_at: new Date().toISOString() }).eq("id", u.id);
}

export async function mailInvitation(app: any, slug: string, to: string, de: string, lien: string, code: string) {
  const s = app.spec ?? {};
  // Le bouton mène au lien d'invitation (et non à l'accueil de l'app)
  await envoyerLien(app, slug, to, `${de} t'invite sur ${s.nom}`, [
    `Bonjour,`,
    `${de} t'invite à rejoindre son équipe sur ${s.nom}. ${s.pitch ?? ""}`,
    `L'invitation est valable 14 jours.`,
  ], `Rejoindre l'équipe`, lien, `invite-${code}`);
}

/** Tâche quotidienne : fin d'essai dans 3 jours, et relance des comptes inactifs depuis 7 jours (une seule fois). */
export async function appMailsCron(max = 200) {
  const { data: apps } = await admin.from("saas_apps").select("id, slug, spec, paiement, domaine, domaine_statut, email_dom").not("spec->ecrans", "is", null);
  let n = 0;
  for (const app of (apps ?? []) as any[]) {
    if (n >= max) break;
    const s = app.spec ?? {};
    if (!s.ecrans?.length) continue;
    if (app.paiement?.actif) {
      const j = Number(app.paiement.essai_jours ?? 14);
      if (j > 3) {
        const debut = new Date(Date.now() - (j - 3) * 864e5).toISOString(), fin = new Date(Date.now() - (j - 4) * 864e5).toISOString();
        const { data: us } = await admin.from("saas_app_users").select("id, email, nom, abonnement").eq("app_id", app.id).eq("role", "admin").is("mail_essai_at", null).gte("at", debut).lt("at", fin).limit(50);
        for (const u of (us ?? []) as any[]) {
          if (["active", "trialing", "past_due"].includes(u.abonnement?.statut)) continue;
          await envoyer(app, app.slug, u.email, `Ton essai ${s.nom} se termine dans 3 jours`, [
            `Bonjour ${u.nom ?? ""},`,
            `Ton essai gratuit de ${s.nom} se termine dans 3 jours. Pour garder l'accès à tes données, choisis une formule dans « Mon abonnement ».`,
            `Sans engagement : tu peux résilier quand tu veux.`,
          ], "Choisir ma formule", `essai-${u.id}`).catch((e) => console.error("mail essai", e));
          await admin.from("saas_app_users").update({ mail_essai_at: new Date().toISOString() }).eq("id", u.id);
          n++;
        }
      }
    }
    const { data: inactifs } = await admin.from("saas_app_users").select("id, email, nom").eq("app_id", app.id).is("mail_relance_at", null).not("email", "like", "demo-%@demo.local")
      .lt("vu_at", new Date(Date.now() - 7 * 864e5).toISOString()).gt("vu_at", new Date(Date.now() - 30 * 864e5).toISOString()).limit(50);
    for (const u of (inactifs ?? []) as any[]) {
      await envoyer(app, app.slug, u.email, `Tout est prêt sur ${s.nom}`, [
        `Bonjour ${u.nom ?? ""},`,
        `Ça fait une semaine qu'on ne t'a pas vu sur ${s.nom}. Tes données sont là où tu les as laissées.`,
        `${s.pitch ?? ""}`,
      ], `Revenir sur ${s.nom}`, `relance-${u.id}`).catch((e) => console.error("mail relance", e));
      await admin.from("saas_app_users").update({ mail_relance_at: new Date().toISOString() }).eq("id", u.id);
      n++;
    }
  }
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
