// Réglages d'un SaaS construit par Bingoo!, côté créateur : encaissement (Stripe), nom de domaine (Vercel), chiffres.
// deno-lint-ignore-file no-explicit-any
import { admin } from "./core.ts";
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
  return { domaine: d, statut: "attente", dns: consignes(d, r.d?.verification) };
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
  return { domaine: d, statut: ok ? "ok" : "attente", dns: consignes(d, p.d?.verification) };
}

// ---------------------------------------------------------------- Chiffres
export async function appChiffres(appId: string) {
  const { data: app } = await admin.from("saas_apps").select("spec, paiement").eq("id", appId).single();
  const { data: us } = await admin.from("saas_app_users").select("email, at, abonnement").eq("app_id", appId).not("email", "like", "demo-%@demo.local").limit(10000);
  const prix = Object.fromEntries((((app?.spec as any)?.formules ?? []) as any[]).map((f) => [f.nom, Number(f.prix) || 0]));
  const abonnes = (us ?? []).filter((u: any) => ["active", "past_due"].includes(u.abonnement?.statut));
  return {
    comptes: (us ?? []).length,
    nouveaux_7j: (us ?? []).filter((u: any) => Date.now() - new Date(u.at).getTime() < 7 * 864e5).length,
    abonnes: abonnes.length,
    mrr: Math.round(abonnes.reduce((a: number, u: any) => a + (prix[u.abonnement?.formule] ?? 0), 0) * 100) / 100,
  };
}
