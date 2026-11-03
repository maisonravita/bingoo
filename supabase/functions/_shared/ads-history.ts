// Espion : historique complet des publicités des concurrents, même arrêtées, et classement par performance.
// Sources : bibliothèque publicitaire officielle de Meta (si la clé META_ADS_TOKEN est configurée : dates exactes de début et de fin,
// portée dans l'UE), sinon les publicités relevées chaque semaine par l'analyse Espion (première et dernière fois vues).
// Une pub qui tourne longtemps et qui est déclinée en plusieurs versions est presque toujours une pub qui marche.
import { admin, env } from "./core.ts";

type AdIn = { platform: string; ext_id?: string; body: string; title?: string; offer?: string; format?: string; link?: string; snapshot?: string; started?: string | null; stopped?: string | null; reach?: number | null; source?: string };
const norm = (s: string) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const day = (v?: string | null) => (v && !isNaN(new Date(v).getTime()) ? new Date(v).toISOString().slice(0, 10) : null);

/** Publicités de la bibliothèque officielle Meta (diffusées en France), si une clé est configurée. */
async function metaAds(name: string): Promise<AdIn[]> {
  const token = env("META_ADS_TOKEN");
  if (!token || !name) return [];
  const u = new URL("https://graph.facebook.com/v21.0/ads_archive");
  for (const [k, v] of Object.entries({
    access_token: token, search_terms: name, ad_reached_countries: '["FR"]', ad_active_status: "ALL", ad_type: "ALL", limit: "60",
    fields: "id,page_name,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,publisher_platforms,eu_total_reach",
  })) u.searchParams.set(k, v);
  const d = await fetch(u, { signal: AbortSignal.timeout(20000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const first = norm(name).split(" ")[0];
  // deno-lint-ignore no-explicit-any
  return ((d?.data ?? []) as any[]).filter((a) => norm(a.page_name ?? "").includes(first)).map((a) => ({
    platform: (a.publisher_platforms ?? ["facebook"]).includes("instagram") && !(a.publisher_platforms ?? []).includes("facebook") ? "instagram" : "meta",
    ext_id: String(a.id), body: String(a.ad_creative_bodies?.[0] ?? a.ad_creative_link_titles?.[0] ?? "").slice(0, 1000), title: String(a.ad_creative_link_titles?.[0] ?? "").slice(0, 200),
    snapshot: a.ad_snapshot_url ?? "", started: day(a.ad_delivery_start_time), stopped: day(a.ad_delivery_stop_time), reach: Number(a.eu_total_reach) || null, source: "Bibliothèque publicitaire Meta",
  })).filter((a) => a.body);
}

/** Enregistre les pubs vues aujourd'hui et met à jour leur historique (première / dernière fois vues, arrêt). */
export async function recordAds(wsId: string, competitorId: string, name: string, fromAnalysis: Record<string, unknown>[] = []) {
  const today = new Date().toISOString().slice(0, 10);
  const seen: AdIn[] = [
    ...(await metaAds(name).catch(() => [])),
    ...fromAnalysis.map((p) => ({
      platform: String(p.plateforme ?? "autre").toLowerCase().slice(0, 20), body: String(p.message ?? p.texte ?? p.titre ?? "").slice(0, 1000), offer: String(p.offre ?? "").slice(0, 300),
      format: String(p.format ?? "").slice(0, 30), link: String(p.source ?? "").slice(0, 400), started: /^\d{4}-\d{2}/.test(String(p.depuis ?? "")) ? day(String(p.depuis)) : null, source: "Analyse Espion (recherche web)",
    })).filter((a) => a.body.length > 8),
  ];
  const keyOf = (a: AdIn) => a.ext_id ? `${a.platform}:${a.ext_id}` : `${a.platform}:${norm(a.body).slice(0, 90)}`;
  const { data: old } = await admin.from("competitor_ads").select("key, first_seen").eq("competitor_id", competitorId);
  const firsts = new Map(((old ?? []) as { key: string; first_seen: string }[]).map((o) => [o.key, o.first_seen]));
  const rows = [...new Map(seen.map((a) => [keyOf(a), a])).values()].map((a) => ({
    workspace_id: wsId, competitor_id: competitorId, key: keyOf(a).slice(0, 200), platform: a.platform, ext_id: a.ext_id ?? null, body: a.body, title: a.title ?? null, offer: a.offer ?? null,
    format: a.format ?? null, link: a.link ?? null, snapshot_url: a.snapshot ?? null, started: a.started ?? null, stopped: a.stopped ?? null, reach: a.reach ?? null, source: a.source ?? null,
    first_seen: firsts.get(keyOf(a).slice(0, 200)) ?? today, last_seen: today,
  }));
  if (rows.length) await admin.from("competitor_ads").upsert(rows, { onConflict: "competitor_id,key" });
  return { vues: rows.length, meta: !!env("META_ADS_TOKEN") };
}

export type AdRow = { key: string; platform: string; body: string; title: string | null; offer: string | null; format: string | null; link: string | null; snapshot_url: string | null; started: string | null; stopped: string | null; reach: number | null; source: string | null; first_seen: string; last_seen: string };

/** Classement : durée de diffusion, nombre de versions du même message, encore active. */
export function rankAds(rows: AdRow[]) {
  const now = Date.now();
  const fam = new Map<string, number>();
  for (const r of rows) { const k = norm(r.body).slice(0, 60); fam.set(k, (fam.get(k) ?? 0) + 1); }
  return rows.map((r) => {
    const start = new Date(r.started ?? r.first_seen).getTime();
    // Arrêtée : date d'arrêt officielle, ou (relevé web) plus vue depuis 45 jours
    const stoppedAt = r.stopped ? new Date(r.stopped).getTime() : (r.source?.startsWith("Analyse") && now - new Date(r.last_seen).getTime() > 45 * 864e5 ? new Date(r.last_seen).getTime() : null);
    const active = !stoppedAt;
    const days = Math.max(0, Math.round(((stoppedAt ?? now) - start) / 864e5));
    const versions = fam.get(norm(r.body).slice(0, 60)) ?? 1;
    const score = Math.min(100, Math.round(Math.min(days, 180) / 180 * 65 + Math.min(versions, 5) * 5 + (active ? 10 : 0)));
    return { ...r, active, days, versions, score, works: days >= 30 || versions >= 3 };
  }).sort((a, b) => b.score - a.score);
}
