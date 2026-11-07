// E-mail du matin : le client n'a pas à ouvrir l'app. Les 3 opportunités du jour (pourquoi maintenant, à qui, le message),
// chacune avec un bouton qui mène à une page de confirmation : rien ne part sans un clic sur « Envoyer » dans cette page
// (un lien ouvert par un antivirus ou un aperçu de messagerie n'envoie jamais rien).
import { admin, planOk, type Prospect, type Workspace } from "./core.ts";
import { sendSystem, teamAddress } from "./mail.ts";
import { declencheur, emailGenerique } from "./agents.ts";

const H48 = 48 * 36e5;
const sha = async (v: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const origine = (ws: Workspace) => { try { const u = new URL(ws.app_url); return `${u.origin}${u.pathname.replace(/\/$/, "")}`; } catch { return ""; } };

export async function lienEnvoi(ws: Workspace, messageId: string) {
  const t = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
  await admin.from("liens_envoi").insert({ token_hash: await sha(t), message_id: messageId, workspace_id: ws.id, expires_at: new Date(Date.now() + H48).toISOString() });
  return `${origine(ws)}/#/envoyer?t=${t}`;
}

/** Retrouve un lien valide (non utilisé, non expiré) et son message encore en attente. */
export async function lireLien(t: string) {
  if (!/^[0-9a-f]{48}$/.test(t)) return null;
  const { data: l } = await admin.from("liens_envoi").select("*").eq("token_hash", await sha(t)).maybeSingle();
  if (!l) return null;
  if (l.used_at) return { l, etat: "utilise" as const };
  if (new Date(l.expires_at).getTime() < Date.now()) return { l, etat: "expire" as const };
  const { data: m } = await admin.from("messages").select("id, subject, body, status, step, prospects(*)").eq("id", l.message_id).single();
  if (!m || m.status !== "brouillon") return { l, etat: "traite" as const };
  return { l, etat: "ok" as const, m };
}
export async function marquerUtilise(t: string) {
  await admin.from("liens_envoi").update({ used_at: new Date().toISOString() }).eq("token_hash", await sha(t)).is("used_at", null);
}

export async function emailMatin(ws: Workspace, dry = false) {
  const { data: rows } = await admin.from("messages").select("id, subject, body, prospects(*)").eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0).eq("check_note", "").order("created_at").limit(3);
  if (!rows?.length) return { skipped: "aucune opportunité prête" };
  const to = await teamAddress(ws);
  if (!to) return { skipped: "aucune adresse" };
  const prenom = (ws.sender_name || "").split(" ")[0];
  const cartes = await Promise.all(rows.map(async (m) => {
    const p = (m.prospects ?? {}) as Prospect;
    const d = declencheur(p);
    return { m, p, d, lien: dry ? "(lien)" : await lienEnvoi(ws, m.id), accueil: emailGenerique(p.email) };
  }));
  const n = cartes.length;
  const subject = `${n} entreprise${n > 1 ? "s ont" : " a"} besoin de toi aujourd'hui`;
  const text = [
    `Bonjour${prenom ? ` ${prenom}` : ""},`, "",
    `Voici ${n > 1 ? `tes ${n} opportunités` : "ton opportunité"} du jour. Un clic sur « Envoyer » ouvre le message : tu le relis, tu confirmes.`, "",
    ...cartes.flatMap(({ m, p, d, lien }) => [
      `■ ${p.name}`,
      `Pourquoi maintenant : ${d?.label ?? "repérée par le Radar"}`,
      `À qui : ${[p.contact_name, p.email].filter(Boolean).join(" · ")}`,
      `Objet : ${m.subject}`, "",
      String(m.body ?? "").trim(), "",
      `Envoyer : ${lien}`, "", "",
    ]),
    `Les liens expirent dans 48 heures. Rien ne part sans ta confirmation.`,
  ].join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#15161A">
<p style="font-size:16px">Bonjour${prenom ? ` ${esc(prenom)}` : ""},</p>
<p style="font-size:16px">Voici ${n > 1 ? `tes ${n} opportunités` : "ton opportunité"} du jour. Un clic sur « Envoyer » ouvre le message : tu le relis, tu confirmes.</p>
${cartes.map(({ m, p, d, lien, accueil }) => `<div style="border:1px solid #F1E2D2;border-radius:16px;padding:18px;margin:18px 0">
<p style="margin:0;font-size:20px;font-weight:800">${esc(p.name)}</p>
<p style="margin:12px 0 0;background:#FFF1E6;border-radius:12px;padding:10px 12px;font-size:14px"><b style="color:#C2410C">Pourquoi maintenant</b><br>${esc(d?.label ?? "Repérée par le Radar")}</p>
<p style="margin:10px 0 0;font-size:14px;color:#55575F"><b style="color:#15161A">À qui :</b> ${esc([p.contact_name, p.email].filter(Boolean).join(" · "))}${accueil ? " (adresse d'accueil : le message demande de transmettre)" : ""}</p>
<p style="margin:14px 0 4px;font-size:14px"><b>${esc(m.subject)}</b></p>
<p style="margin:0;font-size:14px;line-height:1.55;white-space:pre-line">${esc(String(m.body ?? "").trim())}</p>
<p style="margin:16px 0 0"><a href="${esc(lien)}" style="display:inline-block;background:#E8571C;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">Envoyer</a></p>
</div>`).join("")}
<p style="font-size:13px;color:#8A8C93">Les liens expirent dans 48 heures. Rien ne part sans ta confirmation.</p></div>`;
  if (dry) return { to, subject, text };
  await sendSystem({ to, subject, text, html, fromName: "Bingoo!", key: `matin-${ws.id}-${new Date().toISOString().slice(0, 10)}` });
  return { sent: true, to, n };
}

/** Chaque matin de semaine : un e-mail par espace qui a des opportunités prêtes (réglage « matin » désactivable). */
export async function matinCron(dry = false) {
  const { data: wss } = await admin.from("workspaces").select("*").eq("onboarded", true);
  const out: Record<string, unknown> = {};
  for (const ws of wss ?? []) {
    const choix = ((ws.profile ?? {}) as { matin?: boolean }).matin;
    // Espaces « fondateur » (internes) : seulement sur demande explicite ; clients : par défaut, désactivable
    if (!planOk(ws) || choix === false || (ws.plan === "fondateur" && choix !== true)) continue;
    try { out[ws.name] = await emailMatin(ws as Workspace, dry); } catch (e) { out[ws.name] = { erreur: (e as Error).message }; }
  }
  return out;
}
