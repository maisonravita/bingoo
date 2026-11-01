// Fonction « o » : connexion officielle des boîtes (OAuth). Démarrage (session Bingoo requise) et retour du fournisseur.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { requireMember } from "../_shared/core.ts";
import { googleCallback, googleUrl } from "../_shared/oauth.ts";

const page = (msg: string) => new Response(`<!doctype html><meta charset="utf-8"><title>Bingoo</title><body style="font-family:system-ui;padding:40px;background:#faf6ee"><p>${msg}</p></body>`, { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });

Deno.serve(wrap(async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts.slice(parts.indexOf("o") + 1).join("/");
  if (action === "google/callback" && req.method === "GET") {
    try { return Response.redirect(await googleCallback(url.searchParams), 302); }
    catch (e) { return page(`Connexion Gmail impossible : ${e instanceof Error ? e.message : String(e)}. Ferme cette page et recommence depuis Bingoo.`); }
  }
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  // deno-lint-ignore no-explicit-any
  const b = await readJson<any>(req);
  if (action === "google-url") {
    const { ws, userId } = await requireMember(req, b.workspace_id);
    return json(await googleUrl(ws, userId));
  }
  throw new HttpError(404, "Action inconnue");
}));
