// Bingoo! Espion : mesures réelles sur la présence d'un concurrent.
// YouTube : page publique de la chaîne + flux RSS officiel (vues, dates, miniatures).
// TikTok : page publique du profil quand elle est lisible. Instagram et autres : chiffres trouvés sur le web (sourcés).
// Site : mesures techniques SEO lues directement sur le site. Aucun chiffre n'est estimé.
import { HttpError } from "./http.ts";
import { admin, aiRoom, askJson, log, planOk, setAi, type Workspace } from "./core.ts";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function get(url: string, ms = 12000) {
  try {
    const t0 = Date.now();
    const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "fr-FR,fr;q=0.9,en;q=0.6" }, redirect: "follow", signal: AbortSignal.timeout(ms) });
    const body = r.ok ? (await r.text()).slice(0, 1_500_000) : "";
    return { ok: r.ok, status: r.status, body, ms: Date.now() - t0, url: r.url };
  } catch { return { ok: false, status: 0, body: "", ms: 0, url }; }
}
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
/** « 1,2 M », « 670 k », « 12 345 » → nombre */
function num(s: string) {
  const m = s.replace(/ | /g, " ").match(/([\d.,\s]+)\s*(k|K|M|Md|B|mille|million)?/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  if (!isFinite(n)) return null;
  const mult = /^M|million/.test(m[2] ?? "") ? 1e6 : /^(k|K|mille)/.test(m[2] ?? "") ? 1e3 : /^(B|Md)/.test(m[2] ?? "") ? 1e9 : 1;
  return Math.round(n * mult);
}

type Video = { title: string; url: string; date: string; thumb: string; views: number | null; likes: number | null };
async function youtube(url: string) {
  const watch = /\/(watch|shorts)\b|youtu\.be\//.test(url);
  const page = await get(watch || url.includes("/videos") ? url : url.replace(/\/$/, "") + "/videos");
  const id = page.body.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ?? page.body.match(/channel\/(UC[\w-]{22})/)?.[1] ?? url.match(/channel\/(UC[\w-]{22})/)?.[1];
  if (!id) return null;
  const subsTxt = page.body.match(/"subscriberCountText":\{[^}]*?"simpleText":"([^"]+)"/)?.[1] ?? page.body.match(/"content":"([\d.,\s  ]+\s?[kKM]?[^"]{0,6}(abonnés|subscribers))"/)?.[1] ?? "";
  const rss = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  const videos: Video[] = [...rss.body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    title: dec(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
    url: e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "",
    date: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? "",
    thumb: e.match(/<media:thumbnail url="([^"]+)"/)?.[1] ?? "",
    views: Number(e.match(/<media:statistics views="(\d+)"/)?.[1] ?? NaN) || null,
    likes: Number(e.match(/<media:starRating count="(\d+)"/)?.[1] ?? NaN) || null,
  })).filter((v) => v.title && v.url);
  const name = dec(rss.body.match(/<author>\s*<name>([^<]+)<\/name>/)?.[1] ?? "");
  return { channel_id: id, name, url, subscribers: subsTxt ? num(subsTxt) : null, subscribers_text: subsTxt, videos };
}

/** TikTok : abonnés lus sur la page publique, dernières vidéos lues dans le widget officiel « creator embed » (tiktok.com/embed/@compte). */
async function tiktok(url: string) {
  const handle = url.match(/tiktok\.com\/@([\w.-]+)/)?.[1] ?? "";
  const [p, e] = await Promise.all([get(url), handle ? get(`https://www.tiktok.com/embed/@${handle}`) : Promise.resolve({ body: "" })]);
  const followers = Number(p.body.match(/"followerCount":(\d+)/)?.[1] ?? e.body.match(/"followerCount":(\d+)/)?.[1] ?? NaN);
  // deno-lint-ignore no-explicit-any
  let state: any = null;
  const raw = e.body.match(/<script[^>]+id="__FRONTITY_CONNECT_STATE__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  try { state = raw ? JSON.parse(raw) : null; } catch { state = null; }
  const found = new Map<string, Video>();
  // deno-lint-ignore no-explicit-any
  const walk = (o: any, depth = 0) => {
    if (!o || typeof o !== "object" || depth > 12) return;
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    if (typeof o.id === "string" && /^\d{17,20}$/.test(o.id) && "playCount" in o && !found.has(o.id)) {
      // L'identifiant d'une vidéo TikTok contient sa date de publication (secondes dans les 32 bits de poids fort)
      const ts = Number(BigInt(o.id) >> 32n) * 1000;
      found.set(o.id, { title: String(o.desc ?? "").slice(0, 300), url: `https://www.tiktok.com/@${handle}/video/${o.id}`, date: ts > 1.4e12 && ts < Date.now() + 864e5 ? new Date(ts).toISOString() : "", thumb: String(o.coverUrl ?? o.cover ?? ""), views: Number(o.playCount) || null, likes: Number(o.diggCount ?? NaN) || null });
    }
    for (const k of Object.keys(o)) walk(o[k], depth + 1);
  };
  walk(state);
  const videos = [...found.values()].sort((a, b) => b.date.localeCompare(a.date));
  return { url, followers: isFinite(followers) ? followers : null, likes: Number(p.body.match(/"heartCount":(\d+)/)?.[1] ?? 0) || null, video_count: Number(p.body.match(/"videoCount":(\d+)/)?.[1] ?? 0) || null, readable: isFinite(followers) || videos.length > 0, videos };
}

async function seo(site: string) {
  const home = await get(site, 15000);
  if (!home.ok) return { ok: false, status: home.status };
  const h = home.body;
  const pick = (re: RegExp) => dec(h.match(re)?.[1]?.trim() ?? "");
  const origin = new URL(home.url || site).origin;
  const internal = new Set([...h.matchAll(/href=["']([^"'#]+)["']/gi)].map((m) => { try { return new URL(m[1], origin).href; } catch { return ""; } }).filter((u) => u.startsWith(origin)));
  const text = h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  let sitemap = 0;
  for (const s of ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"]) {
    const r = await get(origin + s, 8000);
    if (!r.ok) continue;
    const locs = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const subs = locs.filter((l) => /sitemap.*\.xml/i.test(l)).slice(0, 6);
    if (subs.length) { for (const u of subs) { const x = await get(u, 8000); sitemap += (x.body.match(/<loc>/g) ?? []).length; } }
    else sitemap = locs.length;
    break;
  }
  const blog = [...internal].find((u) => /\/(blog|actualites|actus|news|ressources|articles|magazine)(\/|$)/i.test(u)) ?? "";
  return {
    ok: true, url: home.url, load_ms: home.ms, weight_kb: Math.round(h.length / 1024),
    title: pick(/<title[^>]*>([\s\S]*?)<\/title>/i), description: pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    h1: [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => dec(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())).filter(Boolean).slice(0, 3),
    lang: pick(/<html[^>]+lang=["']([^"']+)["']/i), canonical: !!h.match(/rel=["']canonical["']/i), noindex: /<meta[^>]+robots[^>]+noindex/i.test(h),
    schema: (h.match(/application\/ld\+json/gi) ?? []).length, og: /property=["']og:title["']/i.test(h), words: text.split(" ").length,
    internal_links: internal.size, sitemap_pages: sitemap, blog,
  };
}

const STOP = new Set("le la les un une des de du d l et ou à a au aux en dans pour par sur avec sans votre vos notre nos mon ma mes ton ta tes son sa ses ce cette ces qui que quoi comment pourquoi est sont être plus moins tout tous très the of and to in for on with your you how what why is are a an my our this that it from by at as be we i vs".split(" "));
function keywords(titles: string[]) {
  const c = new Map<string, number>();
  for (const t of titles) for (const w of new Set(t.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\s-]/gu, " ").split(/\s+/))) {
    if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) continue;
    c.set(w, (c.get(w) ?? 0) + 1);
  }
  return [...c.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([word, n]) => ({ word, n }));
}

/** Analyse réelle des réseaux et du site d'un concurrent. Les URLs des réseaux viennent de l'analyse complète (sourcées). */
export async function spySocial(ws: Workspace, id: string) {
  const { data: c } = await admin.from("competitors").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  const presence = (c.summary?.reseaux?.presence ?? []) as { reseau: string; url: string; abonnes: string; rythme: string; sujets: string }[];
  const urlOf = (net: string, re: RegExp) => presence.find((p) => p.reseau === net && re.test(p.url ?? ""))?.url ?? "";
  // Les liens officiels affichés sur leur propre site passent avant ceux trouvés par la recherche
  const home = await get(c.url, 15000);
  const link = (re: RegExp) => home.body.match(re)?.[0]?.replace(/["'<>\s].*$/, "") ?? "";
  const ytUrl = link(/https?:\/\/(www\.)?youtube\.com\/(@[\w.-]+|channel\/UC[\w-]{22}|c\/[\w.-]+|user\/[\w.-]+)/) || urlOf("youtube", /youtube\.com\/|youtu\.be\//);
  const ttUrl = link(/https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+/) || urlOf("tiktok", /tiktok\.com\/@/);
  const siteLinks = {
    instagram: link(/https?:\/\/(www\.)?instagram\.com\/(?!p\/|reel\/)[\w.-]+/), linkedin: link(/https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/company\/[\w.-]+/),
    facebook: link(/https?:\/\/(www\.)?facebook\.com\/(?!sharer|share|dialog|tr\b)[\w.-]+/), x: link(/https?:\/\/(www\.)?(twitter|x)\.com\/(?!intent|share|home)[\w.-]+/),
  };
  const [yt, tt, site] = await Promise.all([ytUrl ? youtube(ytUrl) : null, ttUrl ? tiktok(ttUrl) : null, seo(c.url)]);
  const vids = yt?.videos ?? [];
  const ttv = tt?.videos ?? [];
  // Toutes les publications lues, tous réseaux confondus, les plus récentes d'abord
  const posts = [...vids.map((v) => ({ ...v, net: "youtube" })), ...ttv.map((v) => ({ ...v, net: "tiktok" }))].filter((v) => v.date).sort((a, b) => b.date.localeCompare(a.date));
  const since90 = Date.now() - 90 * 864e5;
  const months: { m: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    months.push({ m: key, n: posts.filter((v) => v.date.startsWith(key)).length });
  }
  const withStats = vids.filter((v) => v.views && v.likes != null);
  // Thématiques : l'IA classe les titres réels, on compte nous-mêmes les pourcentages.
  let themes: { theme: string; pct: number }[] = [];
  if (posts.length >= 4) {
    const r = await askJson<{ themes: string[]; classement: number[] }>(`Voici les textes des ${posts.length} dernières publications d'une entreprise (YouTube et TikTok). Donne 3 à 5 thématiques courtes (2 ou 3 mots, en français) qui couvrent ces publications, puis pour chaque publication l'index de sa thématique.
${posts.map((v, i) => `${i}. ${v.title.slice(0, 160)}`).join("\n")}
Format : {"themes": ["", ""], "classement": [0, 1]}`, { fast: true, maxTokens: 800 }).catch(() => null);
    if (r?.themes?.length && r.classement?.length) {
      const counts = r.themes.map((_, i) => r.classement.filter((x) => x === i).length);
      const tot = counts.reduce((a, b) => a + b, 0) || 1;
      themes = r.themes.map((t, i) => ({ theme: String(t).slice(0, 40), pct: Math.round((counts[i] / tot) * 100) })).filter((t) => t.pct > 0).sort((a, b) => b.pct - a.pct);
    }
  }
  const social = {
    at: new Date().toISOString(),
    youtube: yt ? { url: yt.url, name: yt.name, subscribers: yt.subscribers, subscribers_text: yt.subscribers_text, per_month: Math.round((vids.filter((v) => new Date(v.date).getTime() > since90).length / 3) * 10) / 10, engagement: withStats.length ? Math.round((withStats.reduce((s, v) => s + (v.likes ?? 0) / (v.views ?? 1), 0) / withStats.length) * 1000) / 10 : null, videos: vids.slice(0, 15) } : null,
    youtube_url_found: !!ytUrl,
    tiktok: tt ? { ...tt, per_month: Math.round((ttv.filter((v) => v.date && new Date(v.date).getTime() > since90).length / 3) * 10) / 10, videos: ttv.slice(0, 15) } : null,
    posts: posts.slice(0, 30),
    web: presence.map((p) => ({ reseau: p.reseau, url: /^https?:/.test(p.url ?? "") ? p.url : (siteLinks as Record<string, string>)[p.reseau] || (p.reseau === "youtube" ? ytUrl : p.reseau === "tiktok" ? ttUrl : ""), abonnes: p.abonnes, rythme: p.rythme, sujets: p.sujets })),
    site_links: { ...siteLinks, youtube: ytUrl, tiktok: ttUrl },
    months, themes, keywords: keywords(posts.map((v) => v.title.replace(/#[\p{L}\p{N}_]+/gu, " "))), hashtags: keywords(posts.map((v) => (v.title.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ").replace(/#/g, ""))),
    site,
  };
  await admin.from("competitors").update({ social, social_at: social.at }).eq("id", c.id);
  await log(ws.id, "espion", `${c.name || c.url} : réseaux et site mesurés`);
  return social;
}

/** Retrouve le site officiel d'un concurrent à partir de son nom. */
export async function resolveCompetitor(ws: Workspace, q: string) {
  const s = q.trim();
  if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(s)) return { url: /^https?:/.test(s) ? s : `https://${s}`, name: "" };
  const r = await askJson<{ nom: string; site: string }>(`Trouve le site officiel de l'entreprise « ${s} » (contexte : concurrent de ${ws.profile?.nom ?? ws.name}, ${ws.profile?.offre ?? ""}, en France). Ne donne qu'un site vérifié par ta recherche.
Format : {"nom": "", "site": "https://…"}`, { fast: true, maxTokens: 1500, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] });
  if (!/^https?:\/\//.test(r.site ?? "")) throw new HttpError(404, `Site officiel de « ${s} » introuvable : colle directement son adresse`);
  return { url: r.site, name: r.nom ?? s };
}

// ================================================================ Pilote automatique d'Espion (chaque nuit)
// 1. Contrôle léger et gratuit : le site de chaque concurrent suivi est relu une fois par jour (empreinte du texte).
// 2. Un seul travail lourd par passage, et au plus 2 par espace et par nuit : rapport complet (site changé, au plus tous les 5 jours ;
//    sinon toutes les 2 semaines), puis publicités (toutes les 2 semaines), découverte (chaque semaine), besoins (toutes les 2 semaines).
//    Mode économe : un espace qui a utilisé 60 % de son budget IA du mois n'a plus de travaux lourds de nuit.
export async function spyCron() {
  if (await (await import("./core.ts")).backgroundPaused()) return { pause: "IA automatique en pause" };
  const t0 = Date.now();
  const { checkCompetitor, siteText, sha } = await import("./pro.ts");
  const { competitorAds } = await import("./campaigns.ts");
  const bgm = await (await import("./core.ts")).bgMode();
  const wss = ((await admin.from("workspaces").select("*").eq("onboarded", true)).data ?? []).filter((w) => planOk(w) && !(bgm === "clients" && w.plan === "fondateur"));
  const byId = new Map((wss ?? []).map((w) => [w.id, w as Workspace & { spy_at?: string | null }]));
  const all = [...byId.keys()];
  if (!all.length) return { skipped: "aucun espace" };
  const ids = all;
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  // Espaces qui peuvent encore recevoir un travail lourd cette nuit (budget + 2 travaux maximum)
  const { data: tonight } = await admin.from("activity").select("workspace_id").in("workspace_id", all).in("kind", ["veille", "espion_lourd"]).gte("created_at", day.toISOString());
  const done = new Map<string, number>(); for (const a of tonight ?? []) done.set(a.workspace_id, (done.get(a.workspace_id) ?? 0) + 1);
  const heavy: string[] = [];
  for (const id of all) if ((done.get(id) ?? 0) < 2 && (await aiRoom(id, 0.6))) heavy.push(id);
  const out: Record<string, unknown> = { controles: 0 };

  // 1. Contrôle léger
  const { data: due } = await admin.from("competitors").select("id, workspace_id, url, text_hash, checked_at, summary").in("workspace_id", ids).eq("status", "suivi")
    .or(`watched_at.is.null,watched_at.lt.${day.toISOString()}`).order("watched_at", { ascending: true, nullsFirst: true }).limit(8);
  for (const c of due ?? []) {
    if (Date.now() - t0 > 30000) break;
    let changed = false;
    try { const text = await siteText(c.url); changed = text.length > 200 && !!c.text_hash && (await sha(text)) !== c.text_hash; } catch { /* site illisible : on réessaiera */ }
    const age = c.checked_at ? Date.now() - new Date(c.checked_at).getTime() : Infinity;
    const needs = !c.summary || age > 14 * 864e5 || (changed && age > 5 * 864e5);
    await admin.from("competitors").update({ watched_at: new Date().toISOString(), ...(needs ? { spy_due: true } : {}) }).eq("id", c.id);
    out.controles = Number(out.controles) + 1;
    if (changed) await log(c.workspace_id, "espion", `${c.summary?.nom ?? new URL(c.url).hostname} : son site a changé${needs ? ", rapport complet programmé" : ""}`);
  }
  if (Date.now() - t0 > 45000 || !heavy.length) return { ...out, ...(heavy.length ? {} : { econome: true }) };

  // 2a. Rapport complet
  const { data: full } = await admin.from("competitors").select("id, workspace_id, name").in("workspace_id", heavy).eq("status", "suivi").eq("spy_due", true).order("checked_at", { ascending: true, nullsFirst: true }).limit(1);
  if (full?.[0]) {
    const c = full[0];
    await admin.from("competitors").update({ spy_due: false }).eq("id", c.id);
    setAi({ ws: c.workspace_id, feature: "espion/rapport" });
    try { await checkCompetitor(byId.get(c.workspace_id)!, c.id, true); out.rapport = c.name || c.id; }
    catch (e) { out.rapport_erreur = (e as Error).message; await admin.from("competitors").update({ spy_due: true }).eq("id", c.id); }
    return out;
  }
  // 2b. Publicités
  const week = new Date(Date.now() - 7 * 864e5).toISOString(), twoWeeks = new Date(Date.now() - 14 * 864e5).toISOString();
  const { data: ads } = await admin.from("competitors").select("id, workspace_id, name").in("workspace_id", heavy).eq("status", "suivi").not("summary", "is", null)
    .or(`ads_at.is.null,ads_at.lt.${twoWeeks}`).order("ads_at", { ascending: true, nullsFirst: true }).limit(1);
  // Publicités et besoins publics : seulement à la demande, sauf si SPY_AUTO_EXTRA=1 (les plus chers, utilité faible la nuit)
  const extra = Deno.env.get("SPY_AUTO_EXTRA") === "1";
  if (extra && ads?.[0]) {
    setAi({ ws: ads[0].workspace_id, feature: "espion/publicites" });
    await log(ads[0].workspace_id, "espion_lourd", `Publicités de ${ads[0].name || "un concurrent"} analysées`);
    try { await competitorAds(byId.get(ads[0].workspace_id)!, ads[0].id); out.publicites = ads[0].name || ads[0].id; } catch (e) { out.publicites_erreur = (e as Error).message; }
    return out;
  }
  // 2c. Découverte de nouveaux concurrents (proposés, jamais suivis sans accord)
  const ws = (wss ?? []).find((w) => heavy.includes(w.id) && (!w.spy_at || w.spy_at < week)) as (Workspace & { spy_at?: string | null }) | undefined;
  if (ws) { setAi({ ws: ws.id, feature: "espion/decouverte" }); await log(ws.id, "espion_lourd", "Recherche de nouveaux concurrents"); try { out.decouverte = (await spyDiscover(ws)).found; } catch (e) { out.decouverte_erreur = (e as Error).message; } return out; }
  // 2d. Besoins publics (une fois par semaine et par espace)
  const wn = (wss ?? []).find((w) => heavy.includes(w.id) && (!(w as { spy_needs_at?: string }).spy_needs_at || (w as { spy_needs_at?: string }).spy_needs_at! < twoWeeks)) as Workspace | undefined;
  if (extra && wn) { setAi({ ws: wn.id, feature: "espion/besoins" }); await log(wn.id, "espion_lourd", "Recherche de besoins publics"); try { out.besoins = (await spyNeeds(wn)).found; } catch (e) { out.besoins_erreur = (e as Error).message; } }
  return out;
}

/** Le client suit ou écarte un concurrent proposé par l'espion. */
export async function spyFollow(ws: Workspace, id: string, follow: boolean) {
  const { data: c } = await admin.from("competitors").select("id, name").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  await admin.from("competitors").update(follow ? { status: "suivi", spy_due: true } : { status: "ecarte" }).eq("id", c.id);
  await log(ws.id, "espion", `${c.name} ${follow ? "ajouté à la veille : rapport complet la nuit prochaine" : "écarté"}`);
  return { ok: true };
}

/** Recherche de nouveaux concurrents : ils sont proposés au client, jamais suivis sans son accord. */
export async function spyDiscover(ws: Workspace) {
  const { suggestCompetitors } = await import("./pro.ts");
  await admin.from("workspaces").update({ spy_at: new Date().toISOString() }).eq("id", ws.id);
  const { data: have } = await admin.from("competitors").select("url").eq("workspace_id", ws.id);
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  const known = new Set((have ?? []).map((x) => host(x.url)));
  const found = (await suggestCompetitors(ws)).filter((x) => !known.has(host(x.site)));
  if (found.length) {
    await admin.from("competitors").insert(found.map((x) => ({ workspace_id: ws.id, name: x.nom, url: x.site, status: "propose", proposal: { pourquoi: x.pourquoi, type: x.type, at: new Date().toISOString() } })));
    await log(ws.id, "espion", `${found.length} nouveau${found.length > 1 ? "x" : ""} concurrent${found.length > 1 ? "s" : ""} repéré${found.length > 1 ? "s" : ""}, à valider`);
  } else await log(ws.id, "espion", "Recherche de nouveaux concurrents : aucun nouveau trouvé");
  return { found: found.length };
}

/** Demandes publiques (chaque jour) : des entreprises ou des professionnels qui demandent, en ce moment et en public,
 *  un outil ou un prestataire comme celui du client (« quelqu'un connaît un outil pour… », « alternative à… »),
 *  sur Reddit, X, LinkedIn, les forums et communautés (Indie Hackers, Product Hunt…), les sites de demandes de devis.
 *  Pour chacune : une réponse proposée, utile d'abord et transparente, que le client publie LUI-MÊME (jamais de publication
 *  automatique : c'est le meilleur moyen de faire bannir ses comptes). Rien d'inventé : chaque demande a son lien exact.
 *  RGPD : aucun nom de personne conservé, seulement sa fonction si elle est publique. */
export async function spyNeeds(ws: Workspace) {
  await admin.from("workspaces").update({ spy_needs_at: new Date().toISOString() }).eq("id", ws.id);
  const me = ws.profile ?? {};
  const [{ data: comps }, { data: deja }] = await Promise.all([
    admin.from("competitors").select("name, url").eq("workspace_id", ws.id).in("status", ["suivi", "propose"]).limit(10),
    admin.from("radar_opps").select("url").eq("workspace_id", ws.id).eq("kind", "besoin").order("created_at", { ascending: false }).limit(40),
  ]);
  const rivals = (comps ?? []).map((c) => String(c.name || "").replace(/\s*[—(].*$/, "")).filter(Boolean).slice(0, 6);
  const vus = (deja ?? []).map((x: { url: string }) => x.url).filter(Boolean).slice(0, 25);
  const logiciel = /(saas|logiciel|plateforme|application|appli|outil|software|api|crm|erp)/i.test(`${me.offre ?? ""} ${me.resume ?? ""} ${(me as { type?: string }).type ?? ""}`);
  type N = { besoin: string; entreprise: string; auteur_fonction: string; plateforme: string; source: string; url: string; date: string; langue: string; ville: string; departement: string; intention: string; pertinence: number; fiabilite: string; statut: string; recommandation: string; reponse: string };
  const r = await askJson<{ besoins: N[] }>(`Trouve sur le web des entreprises, des fondateurs ou des professionnels qui demandent PUBLIQUEMENT, depuis moins de 45 jours, un outil, un service ou un prestataire que cette offre peut leur apporter.
Notre offre : ${me.offre ?? ""} (${me.nom ?? ws.name})${me.resume ? ` — ${me.resume}` : ""}
Ce qui la distingue : ${me.differenciation ?? "non renseigné"}
Nos clients : ${(ws.targets ?? []).map((t) => t.label).join(", ") || "entreprises B2B"} — Zone : ${(ws.zone ?? []).join(", ") || "France"}
Nos concurrents : ${rivals.join(", ") || "non renseignés"}
${vus.length ? `Déjà trouvées (ne les redonne pas) :\n${vus.map((u) => `- ${u}`).join("\n")}` : ""}

Cherche (5 recherches maximum, varie-les vraiment), en français${logiciel ? " ET en anglais (un logiciel se vend aussi hors de France)" : ""} :
- demandes de recommandation : « quelqu'un connaît un outil / un logiciel / une agence pour… », « vous utilisez quoi pour… », « any tool for… », « what do you use for… », « recommend a tool for… », « looking for a tool to… » ;
- envies de changer : « alternative à ${rivals[0] ?? "<concurrent>"} »${rivals[1] ? `, « ${rivals[1]} alternative »` : ""}, « je cherche à remplacer… », « switching from… », plaintes publiques contre un concurrent ;
- projets annoncés qui nécessitent cette offre.
Exemples de requêtes efficaces (adapte les mots à NOTRE offre, ne les copie pas telles quelles) :
- site:reddit.com "${(me.offre ?? "").split(/[,.]/)[0].trim().slice(0, 50) || "ce que fait l'offre"}" recommend OR tool OR alternative
- "vous utilisez quoi" OU "quel outil" + le problème que notre offre résout
- "${rivals[0] ?? "<concurrent>"} alternative" reddit
Sources à privilégier : Reddit (r/SaaS, r/startups, r/Entrepreneur, r/smallbusiness, r/indiehackers, subreddits du métier), X, publications LinkedIn publiques, Indie Hackers, Product Hunt (launch comments), Hacker News (Ask HN), forums et communautés professionnelles (Slack/Discord publics indexés, growthhackingfr…), sites de demandes de devis.
Une demande encore ouverte d'il y a 3 à 6 semaines vaut mieux qu'une liste vide : si les demandes toutes fraîches manquent, remonte dans le temps plutôt que de ne rien renvoyer.
Règles strictes :
- Analyse le SENS : la personne doit chercher une solution, pas en vendre une. Écarte les articles « top 10 », les publicités et les posts d'éditeurs.
- N'invente rien : chaque demande a son URL exacte, qui mène à la publication elle-même.
- RGPD : jamais le nom d'une personne ; seulement sa fonction si elle est publique (ex. « fondateur d'un SaaS RH »).
- pertinence de 0 à 100 = à quel point notre offre répond exactement à la demande ; fiabilite = haute|moyenne|faible ; intention = recherche|remplacement|recommandation|projet ; statut = ouvert|satisfait|ancien|inconnu.
- recommandation : comment l'aborder, en une phrase.
- reponse : la réponse à publier sous la demande, dans SA langue et au ton de la plateforme. 2 à 4 phrases : d'abord une aide concrète et honnête (un conseil, une méthode, ce qu'il faut regarder), ensuite seulement une phrase transparente sur notre outil (« je suis le fondateur de ${me.nom ?? ws.name}, ça fait exactement ça si ça peut aider »). Pas de lien, pas d'emoji, pas de superlatif, pas de « Bonjour, je me permets ». Sur Reddit, plus discret encore.
- Si tu ne trouves rien de solide, renvoie une liste vide.
Format : {"besoins": [{"besoin": "", "entreprise": "", "auteur_fonction": "", "plateforme": "Reddit|X|LinkedIn|Forum|Indie Hackers|Product Hunt|Devis|Autre", "source": "nom du site ou de la communauté", "url": "", "date": "AAAA-MM-JJ", "langue": "fr|en", "ville": "", "departement": "", "intention": "", "pertinence": 0, "fiabilite": "", "statut": "", "recommandation": "", "reponse": ""}]}`,
    { maxTokens: 9000, tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } }] });
  const deja30 = new Set(vus);
  const rows = (r.besoins ?? []).filter((b) => /^https?:\/\//.test(b.url ?? "") && !deja30.has(b.url) && b.besoin && Number(b.pertinence) >= 40 && b.statut !== "satisfait" && b.statut !== "ancien").slice(0, 10).map((b) => ({
    workspace_id: ws.id, key: `need:${b.url}`.slice(0, 300), kind: "besoin", title: String(b.besoin).slice(0, 300), company: String(b.entreprise || b.source || "Demande publique").slice(0, 160),
    summary: String(b.besoin).slice(0, 500), why: String(b.recommandation ?? "").slice(0, 500), city: String(b.ville ?? ""), dept: String(b.departement ?? "").slice(0, 3), url: b.url, source: String(b.source ?? ""),
    published: /^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "") ? b.date : null, status: "nouveau", score: Math.max(40, Math.min(95, Number(b.pertinence) || 0)),
    raw: { auteur: b.auteur_fonction ?? "", plateforme: b.plateforme ?? "", langue: b.langue ?? "fr", intention: b.intention ?? "", pertinence: Number(b.pertinence) || 0, fiabilite: b.fiabilite ?? "", statut: b.statut ?? "", reponse: String(b.reponse ?? "").slice(0, 1200), origine: "demandes" },
  }));
  let found = 0;
  if (rows.length) { const { data } = await admin.from("radar_opps").upsert(rows, { onConflict: "workspace_id,key", ignoreDuplicates: true }).select("id"); found = data?.length ?? 0; }
  await log(ws.id, "espion", found ? `${found} demande${found > 1 ? "s" : ""} publique${found > 1 ? "s" : ""} repérée${found > 1 ? "s" : ""}, réponse prête` : "Demandes publiques : rien de nouveau aujourd'hui");
  if (found) await log(ws.id, "radar_alerte", `${found} personne${found > 1 ? "s cherchent" : " cherche"} publiquement une solution comme la tienne : ta réponse est prête`);
  return { found };
}

/** E-mail d'alerte : chaque matin s'il s'est passé quelque chose d'important, et un résumé chaque lundi. */
export async function spyDigest() {
  const { teamAddress, sendSystem } = await import("./mail.ts");
  const bgm = await (await import("./core.ts")).bgMode();
  const wss = ((await admin.from("workspaces").select("*").eq("onboarded", true)).data ?? []).filter((w) => planOk(w) && !(bgm === "clients" && w.plan === "fondateur"));
  const monday = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(new Date()) === "Mon";
  const out: Record<string, unknown> = {};
  for (const w of (wss ?? []) as (Workspace & { spy_alert_at?: string | null; app_url?: string })[]) {
    try {
      const since = w.spy_alert_at ?? new Date(Date.now() - 7 * 864e5).toISOString();
      const [{ data: alerts }, { count: comps }, { data: week }] = await Promise.all([
        admin.from("activity").select("kind, summary, created_at").eq("workspace_id", w.id).in("kind", ["espion_alerte", "radar_alerte"]).gt("created_at", since).order("created_at", { ascending: false }).limit(15),
        admin.from("competitors").select("id", { count: "exact", head: true }).eq("workspace_id", w.id).eq("status", "suivi"),
        monday ? admin.from("activity").select("kind, summary").eq("workspace_id", w.id).in("kind", ["veille", "espion", "espion_alerte"]).gt("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(200) : Promise.resolve({ data: [] as { kind: string; summary: string }[] }),
      ]);
      const all = (alerts ?? []) as { kind: string; summary: string }[];
      const list = all.filter((a) => a.kind === "espion_alerte"), hot = all.filter((a) => a.kind === "radar_alerte");
      if (!list.length && !hot.length && !(monday && comps)) {
        const t = new Date().toISOString().slice(0, 10);
        const { count: c3 } = await admin.from("radar_opps").select("id", { count: "exact", head: true }).eq("workspace_id", w.id).eq("raw->>top_day", t);
        if (!c3) continue;
      }
      const to = await teamAddress(w);
      if (!to) continue;
      const base = String(w.app_url || Deno.env.get("APP_URL") || "https://kairo.maisonravita.fr").replace(/\/$/, "");
      const link = `${base}/#/espion`;
      const reports = (week ?? []).filter((a) => a.kind === "veille").length;
      // Tes 3 entreprises à contacter aujourd'hui (choisies par le Radar ce matin)
      const today = new Date().toISOString().slice(0, 10);
      const { data: top } = await admin.from("radar_opps").select("company, summary, score, score_why").eq("workspace_id", w.id).eq("raw->>top_day", today).order("score", { ascending: false }).limit(3);
      const top3 = (top ?? []) as { company: string; summary: string; score: number; score_why: string[] | null }[];
      const text = [
        top3.length ? `Tes ${top3.length} entreprise${top3.length > 1 ? "s" : ""} à contacter aujourd'hui :\n\n${top3.map((o, i) => `${i + 1}. ${o.company} (score ${o.score}) : ${o.summary}`).join("\n")}\n\nLes messages sont prêts dans « À valider » : ${base}/#/valider\n` : "",
        hot.length ? `Radar : à traiter en priorité\n\n${hot.map((a) => `• ${a.summary}`).join("\n")}\n\nVoir les opportunités : ${base}/#/radar\n` : "",
        list.length ? `Ce qui a bougé chez tes concurrents :\n\n${list.map((a) => `• ${a.summary}`).join("\n")}` : hot.length && !monday ? "" : "Rien d'important cette semaine chez tes concurrents.",
        monday ? `\nLa semaine de ton espionne : ${comps} concurrent${(comps ?? 0) > 1 ? "s" : ""} surveillé${(comps ?? 0) > 1 ? "s" : ""}, ${reports} rapport${reports > 1 ? "s" : ""} complet${reports > 1 ? "s" : ""}.` : "",
        `\nTout le détail, sources à l'appui : ${link}`,
      ].join("\n");
      await sendSystem({ to, fromName: list.length ? "Espion · Bingoo!" : "Radar · Bingoo!", subject: top3.length && !hot.length && !list.length ? `Tes ${top3.length} entreprises à contacter aujourd'hui` : hot.length ? `${hot.length} opportunité${hot.length > 1 ? "s" : ""} urgente${hot.length > 1 ? "s" : ""}${list.length ? ` et ${list.length} mouvement${list.length > 1 ? "s" : ""} chez tes concurrents` : ""}` : list.length ? `Espion : ${list.length} chose${list.length > 1 ? "s ont" : " a"} bougé chez tes concurrents` : "Espion : le résumé de ta semaine", text: text.replace(/^\n+/, "") });
      await admin.from("workspaces").update({ spy_alert_at: new Date().toISOString() }).eq("id", w.id);
      out[w.id] = list.length + hot.length;
    } catch (e) { out[w.id] = { error: (e as Error).message }; }
  }
  return out;
}
