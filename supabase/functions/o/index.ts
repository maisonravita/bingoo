// Fonction « o » : connexion officielle des boîtes (OAuth). Démarrage (session Bingoo requise) et retour du fournisseur.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { requireMember } from "../_shared/core.ts";
import { googleCallback, googleUrl, microsoftCallback, microsoftUrl } from "../_shared/oauth.ts";

const page = (msg: string) => new Response(`<!doctype html><meta charset="utf-8"><title>Bingoo</title><body style="font-family:system-ui;padding:40px;background:#faf6ee"><p>${msg}</p></body>`, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });

Deno.serve(wrap(async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts.slice(parts.indexOf("o") + 1).join("/");
  if (action === "google/callback" && req.method === "GET") {
    try { return Response.redirect(await googleCallback(url.searchParams), 302); }
    catch (e) { return page(`Connexion Gmail impossible : ${e instanceof Error ? e.message : String(e)}. Ferme cette page et recommence depuis Bingoo.`); }
  }
  if (action === "microsoft/callback" && req.method === "GET") {
    try { return Response.redirect(await microsoftCallback(url.searchParams), 302); }
    catch (e) { return page(`Connexion Outlook impossible : ${e instanceof Error ? e.message : String(e)}. Ferme cette page et recommence depuis Bingoo.`); }
  }
  for (const crm of ["hubspot", "pipedrive"] as const) if (action === `${crm}/callback` && req.method === "GET") {
    const { crmCallback } = await import("../_shared/crm-oauth.ts");
    try { return Response.redirect(await crmCallback(crm, url.searchParams), 302); }
    catch (e) { return page(`Connexion ${crm === "hubspot" ? "HubSpot" : "Pipedrive"} impossible : ${e instanceof Error ? e.message : String(e)}. Ferme cette page et recommence depuis Bingoo.`); }
  }
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  // deno-lint-ignore no-explicit-any
  const b = await readJson<any>(req);
  if (action === "google-url") {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return json(await googleUrl(ws, userId));
  }
  if (action === "microsoft-url") {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return json(await microsoftUrl(ws, userId));
  }
  if (action === "hubspot-url" || action === "pipedrive-url") {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return json(await (await import("../_shared/crm-oauth.ts")).crmUrl(action === "hubspot-url" ? "hubspot" : "pipedrive", ws, userId));
  }
  if (action === "status") return json({ ...(await import("../_shared/crm-oauth.ts")).crmOauthOn(), google: !!(Deno.env.get("GOOGLE_CLIENT_ID") || Deno.env.get("GOOGLE_CLIENT_ID_KAIRO")), microsoft: !!(Deno.env.get("MICROSOFT_CLIENT_ID") || Deno.env.get("MICROSOFT_CLIENT_ID_KAIRO")) });
  throw new HttpError(404, "Action inconnue");
}));
