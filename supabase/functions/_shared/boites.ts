// Plusieurs boîtes d'envoi par espace : la boîte principale (workspaces.integrations.mailbox + workspace_secrets)
// et des boîtes en plus (table mailboxes). Pour ajouter une boîte, on « range » la principale dans mailboxes, puis le
// client en connecte une autre par le parcours habituel. Les envois de premiers messages tournent entre les boîtes
// (la moins utilisée du jour d'abord, chacune dans sa propre limite) ; une relance part toujours de la boîte du premier
// message, pour rester dans le même fil.
import { admin, type Workspace } from "./core.ts";
import { HttpError } from "./http.ts";

type Box = { ok: boolean; email: string; provider: string; via?: string; at?: string; imap_at?: string };
export type Row = { id: string; workspace_id: string; email: string; integration: Box; secrets: { smtp?: unknown; oauth?: Record<string, unknown> }; actif: boolean };
type W = Workspace & { __secrets?: Row["secrets"]; __boxId?: string };

/** Identifiants de la boîte : ceux de la boîte en plus si l'espace est « vu depuis » elle, sinon ceux de la principale. */
export async function secretsOf(ws: Workspace): Promise<{ smtp?: any; oauth?: any }> {
  const w = ws as W;
  if (w.__secrets) return w.__secrets as { smtp?: any; oauth?: any };
  const { data } = await admin.from("workspace_secrets").select("smtp, oauth").eq("workspace_id", ws.id).maybeSingle();
  return (data ?? {}) as { smtp?: any; oauth?: any };
}

/** Met à jour l'état de la boîte (déconnectée, dernière relève, jeton renouvelé) là où elle est rangée. */
export async function saveBox(ws: Workspace, patch: { integration?: Partial<Box>; oauth?: Record<string, unknown> }) {
  const w = ws as W;
  if (w.__boxId) {
    const { data } = await admin.from("mailboxes").select("integration, secrets").eq("id", w.__boxId).single();
    if (!data) return;
    await admin.from("mailboxes").update({
      integration: { ...(data.integration as Box), ...(patch.integration ?? {}) },
      ...(patch.oauth ? { secrets: { ...(data.secrets as Row["secrets"]), oauth: patch.oauth } } : {}),
    }).eq("id", w.__boxId);
    return;
  }
  if (patch.integration) {
    const { data } = await admin.from("workspaces").select("integrations").eq("id", ws.id).single();
    const integrations = { ...(data?.integrations ?? {}), mailbox: { ...((data?.integrations as { mailbox?: Box })?.mailbox ?? {}), ...patch.integration } };
    await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  }
  if (patch.oauth) await admin.from("workspace_secrets").update({ oauth: patch.oauth }).eq("workspace_id", ws.id);
}

/** L'espace « vu depuis » une boîte en plus : même espace, boîte et identifiants remplacés. */
export function depuis(ws: Workspace, r: Row): Workspace {
  return { ...ws, integrations: { ...(ws.integrations ?? {}), mailbox: r.integration }, __secrets: r.secrets, __boxId: r.id } as W;
}

export async function extras(ws: Workspace): Promise<Row[]> {
  const { data } = await admin.from("mailboxes").select("*").eq("workspace_id", ws.id).order("created_at");
  return (data ?? []) as Row[];
}

/** Toutes les boîtes qui peuvent envoyer, principale d'abord. */
export async function boites(ws: Workspace): Promise<Workspace[]> {
  const out: Workspace[] = [];
  if (ws.integrations?.mailbox?.ok) out.push(ws);
  for (const r of await extras(ws)) if (r.actif && r.integration?.ok && !out.some((x) => x.integrations?.mailbox?.email === r.email)) out.push(depuis(ws, r));
  return out;
}

/** Nombre de boîtes d'envoi (au moins 1 : le domaine vérifié compte pour une). */
export async function nbBoites(ws: Workspace) { return Math.max(1, (await boites(ws)).length); }

/** La boîte qui envoie ce message. Relance : celle du premier message (même fil). Sinon : la moins utilisée aujourd'hui sous sa limite. */
export async function choisir(ws: Workspace, capParBoite: number, parentVia?: string | null): Promise<{ ws: Workspace; fil: boolean } | null> {
  const list = await boites(ws);
  if (!list.length) return { ws, fil: false }; // domaine vérifié, sans boîte connectée
  if (parentVia) {
    const same = list.find((b) => b.integrations?.mailbox?.email === parentVia);
    if (same) return { ws: same, fil: true };
  }
  const day0 = new Date(); day0.setHours(0, 0, 0, 0);
  const { data } = await admin.from("messages").select("sent_via").eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", day0.toISOString()).limit(5000);
  const used = new Map<string, number>();
  for (const m of data ?? []) used.set(String(m.sent_via ?? ""), (used.get(String(m.sent_via ?? "")) ?? 0) + 1);
  const libres = list.map((b) => ({ b, n: used.get(b.integrations!.mailbox!.email) ?? 0 })).filter((x) => x.n < capParBoite).sort((a, c) => a.n - c.n);
  return libres[0] ? { ws: libres[0].b, fil: false } : null;
}

/** « Ajouter une autre boîte » : la boîte principale est rangée parmi les boîtes en plus (sans couper son accès),
 *  la place principale est libérée pour en connecter une autre. */
export async function ranger(ws: Workspace) {
  const box = ws.integrations?.mailbox as Box | undefined;
  if (!box?.ok) throw new HttpError(400, "Connecte d'abord une boîte qui fonctionne");
  const n = (await extras(ws)).length;
  if (n >= 9) throw new HttpError(400, "10 boîtes au maximum par espace");
  const sec = await secretsOf(ws);
  const provider = box.via === "oauth" ? (box.provider === "microsoft" ? "microsoft" : "google") : "";
  const secrets = provider ? { oauth: { [provider]: sec.oauth?.[provider] } } : { smtp: sec.smtp };
  const { error } = await admin.from("mailboxes").insert({ workspace_id: ws.id, email: box.email, integration: box, secrets, actif: true });
  if (error) throw new HttpError(400, /duplicate/i.test(error.message) ? "Cette boîte est déjà enregistrée" : error.message);
  // Place principale libérée (sans révoquer l'accès : il sert maintenant à la boîte rangée)
  const oauth = { ...(sec.oauth ?? {}) }; if (provider) delete oauth[provider];
  await admin.from("workspace_secrets").update({ ...(provider ? { oauth } : { smtp: {} }) }).eq("workspace_id", ws.id);
  const integrations = { ...(ws.integrations ?? {}) }; delete integrations.mailbox;
  await admin.from("workspaces").update({ integrations }).eq("id", ws.id);
  return { ok: true, rangee: box.email };
}

export async function retirer(ws: Workspace, id: string) {
  const { data } = await admin.from("mailboxes").select("*").eq("id", id).eq("workspace_id", ws.id).maybeSingle();
  if (!data) throw new HttpError(404, "Boîte introuvable");
  const r = data as Row;
  const g = r.secrets?.oauth?.google as { refresh?: string } | undefined;
  if (g?.refresh) { const { open } = await import("./growth.ts"); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await open(g.refresh))}`, { method: "POST" }).catch(() => null); }
  await admin.from("mailboxes").delete().eq("id", id);
  return { ok: true };
}

export async function liste(ws: Workspace) {
  return (await extras(ws)).map((r) => ({ id: r.id, email: r.email, ok: !!r.integration?.ok, actif: r.actif, provider: r.integration?.provider, via: r.integration?.via }));
}

/** Peut-on envoyer ? La boîte principale (ou le domaine) d'abord ; sinon une boîte en plus suffit. */
export async function peutEnvoyer(ws: Workspace) {
  const { canSend } = await import("./mail.ts");
  try { canSend(ws); return; } catch (e) {
    if (!ws.postal_address) throw e;
    if ((await boites(ws)).length) return;
    throw e;
  }
}
