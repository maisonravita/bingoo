// Kairo Espion : mesures réelles sur la présence d'un concurrent.
// YouTube : page publique de la chaîne + flux RSS officiel (vues, dates, miniatures).
// TikTok : page publique du profil quand elle est lisible. Instagram et autres : chiffres trouvés sur le web (sourcés).
// Site : mesures techniques SEO lues directement sur le site. Aucun chiffre n'est estimé.
import { HttpError } from "./http.ts";
import { admin, askJson, log, type Workspace } from "./core.ts";

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
