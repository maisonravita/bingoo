// Clés d'accès personnelles : extension Chrome et assistants IA (Claude, ChatGPT) branchés sur Bingoo!.
// La clé n'est montrée qu'une fois ; seule son empreinte (SHA-256) est gardée.
import { HttpError } from "./http.ts";
import { admin, setAi, type Workspace } from "./core.ts";

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function keyCreate(wsId: string, userId: string, name: string) {
  const raw = `bgo_${[...crypto.getRandomValues(new Uint8Array(20))].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  const { count } = await admin.from("api_keys").select("id", { count: "exact", head: true }).eq("workspace_id", wsId).is("revoked_at", null);
  if ((count ?? 0) >= 10) throw new HttpError(400, "10 clés actives au maximum : supprime une ancienne clé");
  await admin.from("api_keys").insert({ workspace_id: wsId, user_id: userId, name: String(name || "Clé").slice(0, 60), prefix: raw.slice(0, 10), key_hash: await sha(raw) });
  return { key: raw };
}
export async function keyList(wsId: string) {
  const { data } = await admin.from("api_keys").select("id, name, prefix, created_at, last_used_at").eq("workspace_id", wsId).is("revoked_at", null).order("created_at", { ascending: false });
  return { keys: data ?? [] };
}
export async function keyRevoke(wsId: string, id: string) {
  await admin.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("workspace_id", wsId).eq("id", id);
  return { ok: true };
}

/** Espace correspondant à la clé présentée (en-tête x-bingoo-key ou Authorization: Bearer bgo_…). */
export async function requireKey(req: Request): Promise<Workspace> {
  // En-tête x-bingoo-key, Authorization: Bearer, ou lien privé ?k= (assistants qui n'acceptent qu'une adresse)
  const raw = (req.headers.get("x-bingoo-key") ?? ((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "") || new URL(req.url).searchParams.get("k") || "")).trim();
  if (!/^bgo_[a-f0-9]{40}$/.test(raw)) throw new HttpError(401, "Clé d'accès Bingoo! manquante ou invalide (Réglages → Extension et assistants IA)");
  const { data: k } = await admin.from("api_keys").select("id, workspace_id, last_used_at").eq("key_hash", await sha(raw)).is("revoked_at", null).maybeSingle();
  if (!k) throw new HttpError(401, "Clé d'accès inconnue ou supprimée");
  if (!k.last_used_at || Date.now() - new Date(k.last_used_at).getTime() > 3600_000) await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
  const { data: ws } = await admin.from("workspaces").select("*").eq("id", k.workspace_id).single();
  if (!ws) throw new HttpError(401, "Espace introuvable");
  setAi({ ws: ws.id, feature: "acces-externe" });
  return ws as Workspace;
}
