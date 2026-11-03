// Fonction « t » : mesure d'audience du site du client (Kairo Distribution / Conversion).
// Sans cookie ni donnée personnelle : un identifiant de session aléatoire, la page, la source de la visite.
// Les contenus des formulaires ne sont jamais lus : seul le fait qu'un formulaire a été envoyé est compté.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

const SCRIPT = `(function(){var s=document.currentScript,k=s&&s.getAttribute("data-k");if(!k||window.__kairo)return;window.__kairo=1;var E=s.src.replace(/kairo\\.js.*$/,"e"),st=null;try{st=window.sessionStorage}catch(e){}
function g(n){try{return st&&st.getItem(n)}catch(e){return null}}function p(n,v){try{st&&st.setItem(n,v)}catch(e){}}
var sid=g("_ks");if(!sid){sid=Math.random().toString(36).slice(2)+Date.now().toString(36);p("_ks",sid)}
var f=g("_kr");if(!f){f=JSON.stringify({r:document.referrer,q:location.search});p("_kr",f)}f=JSON.parse(f);
function send(t){var b=JSON.stringify({k:k,s:sid,t:t,p:location.pathname,ti:(document.title||"").slice(0,150),r:f.r,q:f.q,w:window.innerWidth});try{if(navigator.sendBeacon&&navigator.sendBeacon(E,b))return}catch(e){}try{fetch(E,{method:"POST",body:b,keepalive:true,mode:"no-cors"})}catch(e){}}
send("view");document.addEventListener("submit",function(){send("lead")},true);window.kairoLead=function(){send("lead")};
window.bingooTrial=function(m){try{var d=String(m||"").split("@").pop().toLowerCase().trim();if(!d||d.indexOf(".")<0)return;var B=JSON.stringify({k:k,d:d}),U=s.src.replace(/kairo\\.js.*$/,"essai");if(navigator.sendBeacon&&navigator.sendBeacon(U,B))return;fetch(U,{method:"POST",body:B,keepalive:true,mode:"no-cors"})}catch(x){}};
var last=location.pathname;setInterval(function(){if(location.pathname!==last){last=location.pathname;send("view")}},1000)})();`;

const ws = new Map<string, { id: string; at: number } | null>();
async function workspaceOf(key: string) {
  const hit = ws.get(key);
  if (hit !== undefined && (!hit || Date.now() - hit.at < 600000)) return hit?.id ?? null;
  const { data } = await admin.from("workspaces").select("id").eq("track_key", key).maybeSingle();
  ws.set(key, data ? { id: data.id, at: Date.now() } : null);
  return data?.id ?? null;
}

// ---------------------------------------------------------------- Entreprise du visiteur
// Le propriétaire d'une adresse IP est public (registres RIPE, ARIN…). Si c'est une entreprise (et pas un opérateur ou un hébergeur),
// on garde son NOM, jamais l'adresse IP. Les plages déjà connues sont mises en cache (données publiques des registres).
const ISP = /orange|france ?telecom|free ?sas|proxad|iliad|\bsfr\b|societe francaise du radiotelephone|bouygues|numericable|completel|\bovh|amazon|\baws\b|google|microsoft|azure|cloudflare|akamai|fastly|apple|icloud|private relay|vodafone|telefonica|telekom|comcast|verizon|at&t|liberty global|scaleway|online s\.?a\.?s|hetzner|digitalocean|linode|akamai|oracle|zscaler|netskope|m247|leaseweb|\bcolt\b|level ?3|lumen|cogent|zayo|\bgtt\b|hurricane|telia|swisscom|proximus|belgacom|\bbell\b|rogers|videotron|mobile|wireless|broadband|cable|telecom|internet service|hosting|datacenter|data center|\bcloud|\bvpn|proxy|\blte\b|\bdsl|fibre|fiber|ripe ncc|iana|reseau|network services|nordvpn|surfshark|tor exit|starlink|spacex|t-mobile|o2 |three |kpn|ziggo|wind|tim |fastweb|eir|virgin|sky |bt |talktalk|init7|ielo|kosc|nerim|coriolis|adista|axione|covage|sewan|alsatis|nordnet|eutelsat/i;
const ipCache = new Map<string, { org: string | null; at: number }>();

function clientIp(req: Request) {
  const raw = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  const ip = String(raw ?? "").trim();
  return /^[0-9a-f:.]{3,45}$/i.test(ip) && !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc|fd|fe80)/i.test(ip) ? ip : null;
}

// deno-lint-ignore no-explicit-any
function orgOf(d: any): { org: string; start: string; end: string; big: boolean } | null {
  if (!d) return null;
  // deno-lint-ignore no-explicit-any
  const fnOf = (e: any) => { const v = (e?.vcardArray?.[1] ?? []).find((x: unknown[]) => x[0] === "fn"); return v ? String(v[3] ?? "") : ""; };
  // deno-lint-ignore no-explicit-any
  const walk = (es: any[], role: string): string => { for (const e of es ?? []) { if ((e.roles ?? []).includes(role) && fnOf(e)) return fnOf(e); const x = walk(e.entities, role); if (x) return x; } return ""; };
  const org = walk(d.entities, "registrant") || walk(d.entities, "administrative") || "";
  const remarks = (d.remarks ?? []).flatMap((r: { description?: string[] }) => r.description ?? []).join(" ");
  const label = `${org} ${d.name ?? ""} ${remarks}`;
  if (!org || ISP.test(label)) return { org: "", start: d.startAddress, end: d.endAddress, big: true };
  // Une très grande plage d'adresses appartient presque toujours à un opérateur
  let big = false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(d.startAddress ?? "") && /^\d+\.\d+\.\d+\.\d+$/.test(d.endAddress ?? "")) {
    const n = (x: string) => x.split(".").reduce((a, b) => a * 256 + Number(b), 0);
    big = n(d.endAddress) - n(d.startAddress) > 65535;
  }
  return { org: big ? "" : org.replace(/\s+/g, " ").trim().slice(0, 120), start: d.startAddress, end: d.endAddress, big };
}

async function companyOfIp(ip: string): Promise<string | null> {
  const hit = ipCache.get(ip);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.org;
  const { data: c } = await admin.from("ip_orgs").select("org").lte("start_ip", ip).gte("end_ip", ip).order("start_ip", { ascending: false }).limit(1);
  if (c?.length) { ipCache.set(ip, { org: c[0].org || null, at: Date.now() }); return c[0].org || null; }
  const d = await fetch(`https://rdap.org/ip/${ip}`, { headers: { accept: "application/rdap+json" }, redirect: "follow", signal: AbortSignal.timeout(5000) }).then((r) => r.ok ? r.json() : null).catch(() => null);
  const o = orgOf(d);
  if (o?.start && o?.end) await admin.from("ip_orgs").upsert({ start_ip: o.start, end_ip: o.end, org: o.org || null, isp: !o.org, checked_at: new Date().toISOString() }, { onConflict: "start_ip,end_ip" }).then(() => null, () => null);
  ipCache.set(ip, { org: o?.org || null, at: Date.now() });
  return o?.org || null;
}

function sourceOf(referrer: string, query: string) {
  const q = new URLSearchParams(query || "");
  const us = (q.get("utm_source") ?? "").toLowerCase(), um = (q.get("utm_medium") ?? "").toLowerCase();
  let host = ""; try { host = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* sans référent */ }
  const paid = /cpc|ppc|paid|ads?$|display/.test(um);
  if (q.get("gclid") || q.get("gbraid") || q.get("wbraid") || (/google/.test(us) && paid)) return { source: "google_ads", host };
  if (q.get("li_fat_id") || /linkedin/.test(us)) return { source: "linkedin", host };
  if (q.get("ttclid") || /tiktok/.test(us)) return { source: "tiktok", host };
  if (/instagram|^ig$/.test(us)) return { source: "instagram", host };
  if (q.get("fbclid") || /facebook|^fb$|meta/.test(us)) return { source: /instagram/.test(host) ? "instagram" : "facebook", host };
  if (/youtube|^yt$/.test(us)) return { source: "youtube", host };
  if (/mail|newsletter|kairo/.test(us) || um === "email") return { source: "email", host };
  if (us) return { source: us.slice(0, 30), host };
  if (!host) return { source: "direct", host };
  if (/(^|\.)google\./.test(host)) return { source: "google", host };
  if (/bing\.|duckduckgo\.|qwant\.|ecosia\.|yahoo\.|brave\./.test(host)) return { source: "autres_moteurs", host };
  if (/linkedin\.|lnkd\.in/.test(host)) return { source: "linkedin", host };
  if (/instagram\./.test(host)) return { source: "instagram", host };
  if (/facebook\.|fb\.me|fb\.com/.test(host)) return { source: "facebook", host };
  if (/youtube\.|youtu\.be/.test(host)) return { source: "youtube", host };
  if (/tiktok\./.test(host)) return { source: "tiktok", host };
  if (/(^|\.)t\.co$|twitter\.|(^|\.)x\.com$/.test(host)) return { source: "x", host };
  if (/mail\.|outlook\.|proton/.test(host)) return { source: "email", host };
  if (/chatgpt|openai|perplexity|claude\.ai|gemini/.test(host)) return { source: "ia", host };
  return { source: "sites", host };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const path = new URL(req.url).pathname;
  if (req.method === "GET" && path.endsWith("/kairo.js")) {
    return new Response(SCRIPT, { headers: { ...cors, "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  // Essai gratuit : seul le domaine de l'adresse est reçu et gardé (jamais l'adresse complète)
  if (req.method === "POST" && path.endsWith("/essai")) {
    try {
      const b = JSON.parse((await req.text()).slice(0, 1000));
      const id = typeof b.k === "string" && /^[a-f0-9]{24}$/.test(b.k) ? await workspaceOf(b.k) : null;
      const d = String(b.d ?? b.email ?? "").split("@").pop()!.toLowerCase().trim().replace(/[^a-z0-9.-]/g, "").slice(0, 120);
      const FREE = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|gmx|protonmail|proton|orange|wanadoo|free|sfr|neuf|laposte|bbox|numericable|club-internet|aliceadsl|tutanota|zoho|mail|yandex)\./i;
      if (id && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && !FREE.test(d)) await admin.rpc("trial_hit", { p_ws: id, p_domain: d });
    } catch { /* ignoré */ }
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method === "POST" && path.endsWith("/e")) {
    try {
      const b = JSON.parse((await req.text()).slice(0, 4000));
      const id = typeof b.k === "string" && /^[a-f0-9]{24}$/.test(b.k) ? await workspaceOf(b.k) : null;
      const type = b.t === "lead" ? "lead" : b.t === "view" ? "view" : null;
      const sid = String(b.s ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 40);
      if (!id || !type || sid.length < 6) return new Response(null, { status: 204, headers: cors });
      const pathName = String(b.p ?? "/").slice(0, 300) || "/";
      if (type === "lead") {
        // Un même envoi de formulaire n'est compté qu'une fois
        const { count } = await admin.from("site_events").select("id", { count: "exact", head: true }).eq("workspace_id", id).eq("session_id", sid).eq("type", "lead").eq("path", pathName).gte("created_at", new Date(Date.now() - 60000).toISOString());
        if (count) return new Response(null, { status: 204, headers: cors });
      }
      const q = new URLSearchParams(String(b.q ?? ""));
      const { source, host } = sourceOf(String(b.r ?? ""), String(b.q ?? ""));
      const ip = clientIp(req);
      const org = ip ? await companyOfIp(ip).catch(() => null) : null;
      await admin.from("site_events").insert({
        workspace_id: id, session_id: sid, type, path: pathName, title: String(b.ti ?? "").slice(0, 150),
        source, referrer_host: host.slice(0, 120), utm_campaign: (q.get("utm_campaign") ?? "").slice(0, 80), utm_medium: (q.get("utm_medium") ?? "").slice(0, 40),
        device: Number(b.w) && Number(b.w) < 768 ? "mobile" : "ordinateur", org,
      });
    } catch (e) { console.error("track", e); }
    return new Response(null, { status: 204, headers: cors });
  }
  return new Response("Not found", { status: 404, headers: cors });
});
