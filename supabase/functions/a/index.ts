// Fonction « a » : assistant Bingoo en conversation.
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { quota, requireMember } from "../_shared/core.ts";
import { assistantTurn } from "../_shared/assistant.ts";

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const name = parts[parts.indexOf("a") + 1] ?? "";
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  if (name !== "chat") throw new HttpError(404, "Action inconnue");
  // deno-lint-ignore no-explicit-any
  const b = await readJson<any>(req);
  const { ws } = await requireMember(req, b.workspace_id);
  await quota(ws.id, "assistant", 60);
  const history = (Array.isArray(b.messages) ? b.messages : []).map((m: { role: string; text: string }) => ({ role: String(m.role), text: String(m.text ?? "") }));
  return json(await assistantTurn(ws, req.headers.get("Authorization") ?? "", history));
}));
