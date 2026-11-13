// Réponses HTTP, CORS et gestion d'erreurs communes à toutes les fonctions.
import { aiCtx } from "./ai-ctx.ts";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key, x-bingoo-key, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

type Handler = (req: Request) => Promise<Response>;
type Registry = { register: (h: Handler) => void };

/** Enveloppe une fonction : CORS, JSON d'erreur lisible, journalisation.
 *  Déployée seule, elle écoute directement ; regroupée dans « mm », elle s'enregistre. */
export function serve(handler: Handler) {
  const reg = (globalThis as unknown as { __mm?: Registry }).__mm;
  if (reg) { reg.register(wrap(handler)); return; }
  Deno.serve(wrap(handler));
}

export function wrap(handler: Handler): Handler {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    try {
      // Chaque requête a son propre contexte de coût IA (fonction appelée, puis espace dès qu'il est connu)
      const feature = new URL(req.url).pathname.split("/").filter(Boolean).slice(-2).join("/");
      return await aiCtx.run({ feature }, () => handler(req));
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : String(e);
      if (status >= 500) { console.error(e); await noteError(req, message); }
      return json({ error: message }, status);
    }
  };
}

/** Garde la trace d'une erreur serveur (contrôle quotidien de la plateforme). Ne fait jamais échouer la requête. */
async function noteError(req: Request, message: string) {
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const fonction = new URL(req.url).pathname.split("/").filter(Boolean).slice(-2).join("/").slice(0, 80);
    await fetch(`${url}/rest/v1/server_errors`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ fonction, message: message.slice(0, 500) }), signal: AbortSignal.timeout(3000) });
  } catch { /* rien */ }
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Visiteur sans compte (connexion anonyme de « Commencer ») : il explore librement,
// mais tout ce qui coûte de l'IA ou envoie un message demande d'abord un compte.
// La signature du jeton est vérifiée ensuite par requireMember ; ici on lit seulement la mention « anonyme ».
export const COMPTE_REQUIS = "Crée ton compte pour continuer : ça prend 20 secondes et tu gardes tout ce que tu as fait.";
export function refuserInvite(req: Request, nom: string, permis: string[]) {
  const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").split(".")[1];
  if (!jeton || permis.includes(nom)) return;
  try {
    const p = JSON.parse(atob(jeton.replace(/-/g, "+").replace(/_/g, "/")));
    if (p?.is_anonymous === true) throw new HttpError(403, COMPTE_REQUIS);
  } catch (e) { if (e instanceof HttpError) throw e; }
}
