// Fonction « n » : notifications et suivis (alerte prospect chaud, rapport du lundi, rappels RDV, relances devis, CRM)
import { HttpError, json, readJson, wrap } from "../_shared/http.ts";
import { admin } from "../_shared/core.ts";
import { meetingReminders, quoteReminders } from "../_shared/convert.ts";
import { syncCrm } from "../_shared/growth.ts";
import { hotAlert, weeklyReport } from "../_shared/notify.ts";
import { handleReply, inbound } from "../_shared/pro.ts";
import { pollInbox } from "../_shared/inbox.ts";

async function checkKey(req: Request) {
  const { data } = await admin.from("app_secrets").select("value").eq("name", "cron_key").single();
  if ((req.headers.get("x-cron-key") ?? "") !== (data?.value ?? "")) throw new HttpError(401, "Clé invalide");
}
const baseOf = (ws: { app_url?: string }) => (ws.app_url ? `${ws.app_url.replace(/\/$/, "")}/#` : "");

const routes: Record<string, (b: Record<string, unknown>) => Promise<unknown>> = {
  hot: (b) => hotAlert(String(b.reply_id ?? ""), b.dry === true),
  async weekly(b) {
    let q = admin.from("workspaces").select("*").eq("onboarded", true).neq("weekly_report", false);
    if (b.workspace_id) q = q.eq("id", String(b.workspace_id));
    const { data: list } = await q;
    const out: Record<string, unknown> = {};
    for (const ws of list ?? []) { try { out[ws.name] = await weeklyReport(ws, b.dry === true); } catch (e) { out[ws.name] = { error: (e as Error).message }; } }
    return out;
  },
  // Rappels de RDV pour tous, relance des devis pour les espaces en pilote automatique, synchronisation CRM
  async suivi() {
    const out: Record<string, unknown> = {};
    // Rebonds et réponses arrivés directement dans la boîte des clients (Gmail, OVH, IONOS, Zoho)
    const { data: boxes } = await admin.from("workspaces").select("*").eq("onboarded", true).filter("integrations->mailbox->>ok", "eq", "true");
    for (const ws of boxes ?? []) {
      const base = ws.app_url ? `${String(ws.app_url).replace(/\/$/, "")}/#` : "";
      try { out[`boite_${ws.id}`] = await pollInbox(ws, (w, p, input) => handleReply(w, p, input, base)); } catch (e) { out[`boite_${ws.id}`] = { error: (e as Error).message }; }
    }
    const { data: every } = await admin.from("workspaces").select("*").eq("onboarded", true);
    for (const ws of every ?? []) {
      try {
        const r = await meetingReminders(ws);
        const d = ws.autonomy === "auto" ? await quoteReminders(ws, baseOf(ws)) : 0;
        if (r || d) out[`suivi_${ws.id}`] = { rappels: r, devis: d };
      } catch (e) { out[`suivi_${ws.id}`] = { error: (e as Error).message }; }
    }
    const { data: crm } = await admin.from("workspaces").select("*").or("integrations->hubspot->>ok.eq.true,integrations->pipedrive->>ok.eq.true");
    for (const ws of crm ?? []) { try { out[`crm_${ws.id}`] = await syncCrm(ws); } catch (e) { out[`crm_${ws.id}`] = { error: (e as Error).message }; } }
    return out;
  },
};

Deno.serve(wrap(async (req) => {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const fn = routes[parts[parts.indexOf("n") + 1] ?? ""];
  if (!fn && parts[parts.indexOf("n") + 1] !== "inbound") throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  if (parts[parts.indexOf("n") + 1] === "inbound") {
    // Webhook Resend (réponses reçues, rebonds, plaintes) : clé dans l'URL
    const { data } = await admin.from("app_secrets").select("value").eq("name", "inbound_key").single();
    if (!data?.value || new URL(req.url).searchParams.get("key") !== data.value) throw new HttpError(401, "Clé invalide");
    return json(await inbound(await readJson(req)));
  }
  await checkKey(req);
  return json(await fn(await readJson(req)));
}));
