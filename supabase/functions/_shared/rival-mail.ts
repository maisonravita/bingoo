// Espion : bibliothèque des e-mails des concurrents. Le client inscrit son adresse de veille (veille-<clé>@domaine de la plateforme)
// aux newsletters de ses concurrents ; chaque e-mail reçu est rangé par concurrent (domaine de l'expéditeur) et résumé.
import { admin, aiRoom, askJson, PLATFORM_DOMAIN, setAi, type Workspace } from "./core.ts";

export const watchAddress = (ws: { track_key?: string | null }) => ws.track_key ? `veille-${ws.track_key}@${PLATFORM_DOMAIN()}` : "";
const base = (h: string) => h.toLowerCase().replace(/^www\./, "").split(".").slice(-2).join(".");
const hostOf = (u: string) => { try { return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname; } catch { return ""; } };

export async function rivalMail(key: string, d: Record<string, unknown>, fetchText: () => Promise<{ text: string; html: string }>) {
  const { data: ws } = await admin.from("workspaces").select("*").eq("track_key", key).maybeSingle();
  if (!ws) return { skipped: "espace inconnu" };
  setAi({ ws: ws.id, feature: "espion/emails" });
  const from = String(d.from ?? "");
  const fm = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  const fromEmail = (fm ? fm[2] : from).trim().toLowerCase();
  const fromName = fm ? fm[1].trim() : "";
  const { text, html } = await fetchText();
  const body = (text || html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 20000);
  const dom = base(fromEmail.split("@")[1] ?? "");
  const { data: comps } = await admin.from("competitors").select("id, name, url").eq("workspace_id", ws.id).neq("status", "ecarte");
  const comp = ((comps ?? []) as { id: string; name: string; url: string }[]).find((c) => base(hostOf(c.url)) === dom) ?? ((comps ?? []) as { id: string; name: string; url: string }[]).find((c) => fromName && fromName.toLowerCase().includes(String(c.name).toLowerCase().split(/\s/)[0]));
  // Lien de confirmation d'inscription : signalé pour que le client clique (jamais cliqué automatiquement)
  const confirm = /(confirm|valid|v[ée]rifi|activate|double opt)/i.test(`${d.subject ?? ""}`) ? (html.match(/href=["'](https?:\/\/[^"']*(confirm|valid|verif|activate|subscribe)[^"']*)["']/i)?.[1] ?? null) : null;
  let kind = "autre", offre = "", resume = "";
  if (!confirm && body.length > 40 && await aiRoom(ws.id, 0.9)) {
    const v = await askJson<{ type: string; offre: string; resume: string }>(`E-mail marketing reçu d'un concurrent (${fromName || fromEmail}). Objet : ${d.subject ?? ""}
Texte : ${body.slice(0, 5000)}
Classe-le et résume-le pour une veille concurrentielle.
Format : {"type": "promotion|lancement|contenu|evenement|temoignage|autre", "offre": "l'offre ou le prix mis en avant, sinon vide", "resume": "une phrase"}`, { fast: true, maxTokens: 250 }).catch(() => null);
    if (v) { kind = String(v.type ?? "autre").slice(0, 20); offre = String(v.offre ?? "").slice(0, 200); resume = String(v.resume ?? "").slice(0, 300); }
  }
  await admin.from("competitor_emails").insert({
    workspace_id: ws.id, competitor_id: comp?.id ?? null, from_email: fromEmail.slice(0, 200), from_name: fromName.slice(0, 120), subject: String(d.subject ?? "").slice(0, 300),
    body, kind: confirm ? "confirmation" : kind, offer: offre, summary: confirm ? "Confirme ton inscription à cette newsletter en cliquant sur le lien." : resume, confirm_url: confirm,
  });
  return { ok: true, concurrent: comp?.name ?? null };
}
