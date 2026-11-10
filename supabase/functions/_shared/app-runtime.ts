// Moteur des SaaS construits par Bingoo! : comptes et données des applications générées.
// Appelé par la fonction publique « t » (chemin /t/app/<slug>/<action>), depuis l'application qui tourne dans un cadre isolé.
// Chaque compte ne voit que ses propres données. Mots de passe hachés (PBKDF2), jeton de session gardé haché.
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const LIM = { users: 500, rows: 5000, taille: 20000, cols: 30 };
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function pbkdf2(pass: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 }, key, 256));
}
const egal = (a: string, b: string) => a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

class Err extends Error { constructor(public status: number, msg: string) { super(msg); } }
const colOk = (c: unknown) => { const s = String(c ?? ""); if (!/^[a-z][a-z0-9_]{0,39}$/.test(s)) throw new Err(400, "Collection invalide"); return s; };
const propre = (d: unknown) => {
  if (!d || typeof d !== "object" || Array.isArray(d)) throw new Err(400, "Données invalides");
  const o = { ...(d as Record<string, unknown>) }; delete o.id; delete o.created_at; delete o.updated_at;
  if (JSON.stringify(o).length > LIM.taille) throw new Err(413, "Élément trop volumineux");
  return o;
};
const ligne = (r: any) => ({ ...(r.data ?? {}), id: r.id, created_at: r.at, updated_at: r.maj });

async function session(admin: SupabaseClient, app: any, user: any) {
  const jeton = hex(crypto.getRandomValues(new Uint8Array(32)));
  await admin.from("saas_app_users").update({ jeton: await sha(jeton) }).eq("id", user.id);
  return { token: jeton, user: { id: user.id, email: user.email, nom: user.nom } };
}

// Données d'exemple : chaque nouveau compte démarre avec une application vivante
async function semer(admin: SupabaseClient, app: any, userId: string) {
  const demo = (app.spec?.demo ?? {}) as Record<string, unknown[]>;
  const rows = Object.entries(demo).flatMap(([col, xs]) => /^[a-z][a-z0-9_]{0,39}$/.test(col) && Array.isArray(xs)
    ? xs.slice(0, 15).filter((x) => x && typeof x === "object").map((x, i) => ({ app_id: app.id, user_id: userId, col, data: x, at: new Date(Date.now() - i * 3600e3 * 7).toISOString() })) : []);
  if (rows.length) await admin.from("saas_app_rows").insert(rows);
}

export async function appApi(admin: SupabaseClient, req: Request, slug: string, action: string): Promise<{ status: number; body: unknown }> {
  try {
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) throw new Err(404, "Application introuvable");
    const { data: app } = await admin.from("saas_apps").select("id, spec, statut").eq("slug", slug).maybeSingle();
    if (!app || app.statut !== "pret") throw new Err(404, "Application introuvable");
    const b = JSON.parse((await req.text()).slice(0, 60000) || "{}");

    if (action === "signup" || action === "login" || action === "demo") {
      let email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
      let pass = String(b.password ?? "");
      if (action === "demo") { email = `demo-${hex(crypto.getRandomValues(new Uint8Array(6)))}@demo.local`; pass = hex(crypto.getRandomValues(new Uint8Array(16))); }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Err(400, "Adresse e-mail invalide");
      if (pass.length < 8) throw new Err(400, "Mot de passe : 8 caractères au moins");
      if (action === "login") {
        const { data: u } = await admin.from("saas_app_users").select("id, email, nom, pass").eq("app_id", app.id).eq("email", email).maybeSingle();
        const [salt, h] = String(u?.pass ?? ":").split(":");
        if (!u || !egal(await pbkdf2(pass, salt), h)) throw new Err(401, "E-mail ou mot de passe incorrect");
        return { status: 200, body: await session(admin, app, u) };
      }
      const { count } = await admin.from("saas_app_users").select("id", { count: "exact", head: true }).eq("app_id", app.id);
      if ((count ?? 0) >= LIM.users) throw new Err(403, "Cette application a atteint son nombre maximal de comptes");
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const nom = String(b.nom ?? "").trim().slice(0, 80) || (action === "demo" ? "Invité" : email.split("@")[0]);
      const { data: u, error } = await admin.from("saas_app_users").insert({ app_id: app.id, email, nom, pass: `${salt}:${await pbkdf2(pass, salt)}` }).select("id, email, nom").single();
      if (error) throw new Err(409, "Un compte existe déjà avec cette adresse");
      await semer(admin, app, u.id);
      return { status: 200, body: await session(admin, app, u) };
    }

    // Toutes les autres actions demandent une session
    const jeton = String(req.headers.get("x-app-token") ?? "");
    if (jeton.length !== 64) throw new Err(401, "Session expirée, reconnecte-toi");
    const { data: user } = await admin.from("saas_app_users").select("id, email, nom").eq("app_id", app.id).eq("jeton", await sha(jeton)).maybeSingle();
    if (!user) throw new Err(401, "Session expirée, reconnecte-toi");
    const mine = () => admin.from("saas_app_rows").select("id, data, at, maj").eq("app_id", app.id).eq("user_id", user.id);

    if (action === "me") return { status: 200, body: { user } };
    if (action === "logout") { await admin.from("saas_app_users").update({ jeton: null }).eq("id", user.id); return { status: 200, body: { ok: true } }; }
    if (action === "list") {
      let q = mine().eq("col", colOk(b.col));
      for (const [k, v] of Object.entries(b.where ?? {}).slice(0, 5)) if (/^[a-z][a-z0-9_]{0,39}$/.test(k) && ["string", "number", "boolean"].includes(typeof v)) q = q.eq(`data->>${k}`, String(v));
      const { data } = await q.order("at", { ascending: false }).limit(Math.min(1000, Number(b.limit) || 500));
      return { status: 200, body: (data ?? []).map(ligne) };
    }
    if (action === "get") {
      const { data } = await mine().eq("col", colOk(b.col)).eq("id", String(b.id)).maybeSingle();
      if (!data) throw new Err(404, "Élément introuvable");
      return { status: 200, body: ligne(data) };
    }
    if (action === "add") {
      const col = colOk(b.col);
      const { count } = await admin.from("saas_app_rows").select("id", { count: "exact", head: true }).eq("app_id", app.id).eq("user_id", user.id);
      if ((count ?? 0) >= LIM.rows) throw new Err(403, "Limite de données atteinte pour ce compte");
      const { data } = await admin.from("saas_app_rows").insert({ app_id: app.id, user_id: user.id, col, data: propre(b.data) }).select("id, data, at, maj").single();
      return { status: 200, body: ligne(data) };
    }
    if (action === "update") {
      const col = colOk(b.col);
      const { data: cur } = await mine().eq("col", col).eq("id", String(b.id)).maybeSingle();
      if (!cur) throw new Err(404, "Élément introuvable");
      const { data } = await admin.from("saas_app_rows").update({ data: propre({ ...(cur.data as object), ...propre(b.data) }), maj: new Date().toISOString() }).eq("id", cur.id).select("id, data, at, maj").single();
      return { status: 200, body: ligne(data) };
    }
    if (action === "remove") {
      await admin.from("saas_app_rows").delete().eq("app_id", app.id).eq("user_id", user.id).eq("col", colOk(b.col)).eq("id", String(b.id));
      return { status: 200, body: { ok: true } };
    }
    throw new Err(404, "Action inconnue");
  } catch (e) {
    if (e instanceof Err) return { status: e.status, body: { error: e.message } };
    if (e instanceof SyntaxError) return { status: 400, body: { error: "Requête invalide" } };
    console.error("app", e);
    return { status: 500, body: { error: "Erreur du serveur, réessaie" } };
  }
}
