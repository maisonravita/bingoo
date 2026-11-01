// Réponses HTTP, CORS et gestion d'erreurs communes à toutes les fonctions.

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
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
      return await handler(req);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : String(e);
      if (status >= 500) console.error(e);
      return json({ error: message }, status);
    }
  };
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
