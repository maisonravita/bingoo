// Connexion des CRM en un clic (OAuth) : HubSpot et Pipedrive. Le client clique, accepte chez son CRM, revient.
// Le jeton de renouvellement est chiffré en base ; le navigateur ne voit jamais aucun jeton. Le jeton collé à la main
// (ancienne méthode) reste accepté.
import { HttpError } from "./http.ts";
import { admin, env, log, type Workspace } from "./core.ts";
import { open, seal } from "./growth.ts";
import { readState, signState } from "./oauth.ts";

type Crm = "hubspot" | "pipedrive";
const CALLBACK = (p: Crm) => `${env("SUPABASE_URL")}/functions/v1/o/${p}/callback`;
const HS_SCOPES = ["oauth", "crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.companies.read", "crm.objects.companies.write", "crm.objects.deals.read", "crm.objects.deals.write"];

export const crmOauthOn = () => ({ hubspot: !!(env("HUBSPOT_CLIENT_ID") && env("HUBSPOT_CLIENT_SECRET")), pipedrive: !!(env("PIPEDRIVE_CLIENT_ID") && env("PIPEDRIVE_CLIENT_SECRET")) });

export async function crmUrl(crm: Crm, ws: Workspace, userId: string) {
  const state = await signState(ws.id, userId);
  if (crm === "hubspot") {
    if (!crmOauthOn().hubspot) throw new HttpError(503, "Connexion HubSpot en un clic pas encore configurée");
    const u = new URL("https://app.hubspot.com/oauth/authorize");
    u.searchParams.set("client_id", env("HUBSPOT_CLIENT_ID")); u.searchParams.set("redirect_uri", CALLBACK("hubspot"));
    u.searchParams.set("scope", HS_SCOPES.join(" ")); u.searchParams.set("state", state);
    return { url: u.toString() };
  }
  if (!crmOauthOn().pipedrive) throw new HttpError(503, "Connexion Pipedrive en un clic pas encore configurée");
  const u = new URL("https://oauth.pipedrive.com/oauth/authorize");
  u.searchParams.set("client_id", env("PIPEDRIVE_CLIENT_ID")); u.searchParams.set("redirect_uri", CALLBACK("pipedrive")); u.searchParams.set("state", state);
  return { url: u.toString() };
}

async function token(crm: Crm, body: Record<string, string>) {
  const r = crm === "hubspot"
    ? await fetch("https://api.hubapi.com/oauth/v1/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...body, client_id: env("HUBSPOT_CLIENT_ID"), client_secret: env("HUBSPOT_CLIENT_SECRET") }) })
    : await fetch("https://oauth.pipedrive.com/oauth/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${env("PIPEDRIVE_CLIENT_ID")}:${env("PIPEDRIVE_CLIENT_SECRET")}`)}` }, body: new URLSearchParams(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new HttpError(502, `${crm === "hubspot" ? "HubSpot" : "Pipedrive"} : ${d.message ?? d.error_description ?? d.error ?? r.status}`);
  return d as { access_token: string; refresh_token?: string; expires_in?: number; api_domain?: string };
}

/** Retour du CRM : échange du code, enregistrement chiffré, adresse de retour dans l'app. */
export async function crmCallback(crm: Crm, params: URLSearchParams) {
  const s = await readState(params.get("state") ?? "");
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", s.w).single();
  const back = (ok: string) => `${String(ws?.app_url ?? "").replace(/\/$/, "")}/#/connexions?crm=${crm}-${ok}`;
  if (params.get("error")) return back("annule");
  const { data: member } = await admin.from("members").select("role").eq("workspace_id", s.w).eq("user_id", s.u).maybeSingle();
  if (!ws || !member) throw new HttpError(403, "Accès refusé à cet espace");
  const t = await token(crm, { grant_type: "authorization_code", code: params.get("code") ?? "", redirect_uri: CALLBACK(crm) });
  if (!t.refresh_token) return back("refresh");
  let info: Record<string, string> = {};
  if (crm === "hubspot") {
    const d = await (await fetch(`https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(t.access_token)}`)).json().catch(() => ({}));
    info = { portal: String(d.hub_id ?? ""), company: String(d.hub_domain ?? "") };
  } else {
    const base = String(t.api_domain ?? "https://api.pipedrive.com").replace(/\/$/, "");
    const d = await (await fetch(`${base}/api/v1/users/me`, { headers: { Authorization: `Bearer ${t.access_token}` } })).json().catch(() => ({}));
    info = { company: String(d.data?.company_name ?? ""), base };
  }
  const { data: sec } = await admin.from("workspace_secrets").select("oauth").eq("workspace_id", ws.id).maybeSingle();
  const oauth = { ...(sec?.oauth ?? {}), [crm]: { refresh: await seal(t.refresh_token), ...info, at: new Date().toISOString() } };
  await admin.from("workspace_secrets").upsert({ workspace_id: ws.id, oauth, ...(crm === "hubspot" ? { hubspot_token: "" } : { pipedrive_token: "" }), updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
  const integrations = { ...(ws.integrations ?? {}), [crm]: { ok: true, via: "oauth", at: new Date().toISOString(), ...(info.portal ? { portal: info.portal } : {}), ...(info.company ? { company: info.company } : {}) } };
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  await log(ws.id, "integration", `${crm === "hubspot" ? "HubSpot" : "Pipedrive"} connecté en un clic`);
  return back("ok");
}

/** Accès au CRM pour la synchronisation : jeton OAuth renouvelé, ou jeton collé à la main. */
export type CrmAuth = { token: string; base?: string; bearer: boolean };
export async function crmAuth(ws: Workspace): Promise<{ hubspot?: CrmAuth; pipedrive?: CrmAuth }> {
  const { data: sec } = await admin.from("workspace_secrets").select("oauth, hubspot_token, pipedrive_token").eq("workspace_id", ws.id).maybeSingle();
  const out: { hubspot?: CrmAuth; pipedrive?: CrmAuth } = {};
  for (const crm of ["hubspot", "pipedrive"] as Crm[]) {
    if (!ws.integrations?.[crm]?.ok) continue;
    const o = sec?.oauth?.[crm] as { refresh?: string; base?: string } | undefined;
    if (o?.refresh) {
      try {
        const t = await token(crm, { grant_type: "refresh_token", refresh_token: await open(o.refresh) });
        if (t.refresh_token && crm === "pipedrive") {
          const oauth = { ...(sec?.oauth ?? {}), pipedrive: { ...o, refresh: await seal(t.refresh_token), base: String(t.api_domain ?? o.base ?? "").replace(/\/$/, "") || o.base } };
          await admin.from("workspace_secrets").update({ oauth }).eq("workspace_id", ws.id);
        }
        out[crm] = { token: t.access_token, base: crm === "pipedrive" ? String(t.api_domain ?? o.base ?? "https://api.pipedrive.com").replace(/\/$/, "") : undefined, bearer: true };
      } catch (e) {
        if (/invalid|revoked|expired|unauthorized/i.test((e as Error).message)) {
          const integrations = { ...(ws.integrations ?? {}), [crm]: { ...(ws.integrations?.[crm] ?? {}), ok: false } };
          await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
        }
        console.error(crm, (e as Error).message);
      }
    } else {
      const k = crm === "hubspot" ? sec?.hubspot_token : sec?.pipedrive_token;
      if (k) out[crm] = { token: k, bearer: crm === "hubspot" };
    }
  }
  return out;
}
