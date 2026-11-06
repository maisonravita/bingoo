// « Bingoo! écrit comme toi » : chaque correction d'un brouillon (avant / après) est gardée ; toutes les 3 corrections,
// le modèle rapide en tire au plus 6 règles de style courtes, visibles et modifiables dans Réglages, puis réinjectées
// dans la rédaction. Une seule petite requête IA toutes les 3 corrections.
import { admin, askJson, type Workspace } from "./core.ts";

const clean = (s: unknown) => String(s ?? "").replace(/\r/g, "").trim().slice(0, 3000);

export async function styleLearn(ws: Workspace, before: unknown, after: unknown) {
  const b = clean(before), a = clean(after);
  if (!b || !a || b === a) return { appris: false };
  await admin.from("style_edits").insert({ workspace_id: ws.id, before: b, after: a });
  const { count } = await admin.from("style_edits").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
  if (!count || (count > 1 && count % 3 !== 0)) return { appris: false, corrections: count ?? 0 };
  const { data } = await admin.from("style_edits").select("before, after").eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(8);
  const pairs = (data ?? []).map((x, i) => `#${i + 1}\nAVANT :\n${x.before}\nAPRÈS (corrigé par le dirigeant) :\n${x.after}`).join("\n\n");
  const actuelles = (ws.profile as { style?: string[] })?.style ?? [];
  const r = await askJson<{ regles: string[] }>(`Un dirigeant corrige les e-mails de prospection rédigés pour lui. Compare chaque version AVANT et APRÈS et déduis comment il aime écrire.
Règles actuelles (garde-les si les corrections les confirment) : ${actuelles.length ? actuelles.join(" | ") : "aucune"}
${pairs}

Donne au plus 6 règles de style, chacune en une phrase courte et concrète (ex. « Tutoie toujours », « Signe avec ton seul prénom », « Pas plus de 3 phrases », « Commence par le prénom du contact »).
Seulement ce que les corrections montrent clairement. Aucune règle sur le fond de l'offre ni sur des faits.
Format : {"regles": [""]}`, { fast: true, maxTokens: 500 });
  const regles = (r.regles ?? []).map((x) => String(x).trim().slice(0, 140)).filter(Boolean).slice(0, 6);
  if (!regles.length) return { appris: false, corrections: count };
  await admin.from("workspaces").update({ profile: { ...(ws.profile ?? {}), style: regles } }).eq("id", ws.id);
  return { appris: true, corrections: count, regles };
}

/** Le client corrige ou supprime lui-même les règles. */
export async function styleSet(ws: Workspace, regles: unknown) {
  const list = (Array.isArray(regles) ? regles : []).map((x) => String(x).trim().slice(0, 140)).filter(Boolean).slice(0, 8);
  await admin.from("workspaces").update({ profile: { ...(ws.profile ?? {}), style: list } }).eq("id", ws.id);
  return { regles: list };
}

/** Bloc ajouté aux consignes de rédaction. Le style du dirigeant passe avant le ton par défaut (tutoiement compris). */
export function styleOf(ws: Workspace) {
  const s = ((ws.profile as { style?: string[] })?.style ?? []).filter(Boolean);
  return s.length ? `\n\nStyle du dirigeant, appris de ses corrections (prioritaire sur les règles de ton ci-dessus, jamais sur l'interdiction d'inventer) :\n- ${s.join("\n- ")}` : "";
}
