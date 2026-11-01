var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res)=>function() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
var __export = (target, all)=>{
  for(var name in all)__defProp(target, name, {
    get: all[name],
    enumerable: !0
  });
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
function wrap(handler) {
  return async (req)=>{
    if (req.method === "OPTIONS") return new Response("ok", {
      headers: cors
    });
    try {
      return await handler(req);
    } catch (e) {
      let status = e instanceof HttpError ? e.status : 500, message = e instanceof Error ? e.message : String(e);
      return status >= 500 && console.error(e), json({
        error: message
      }, status);
    }
  };
}
async function readJson(req) {
  try {
    return await req.json();
  } catch  {
    return {};
  }
}
var cors, HttpError, sleep, init_http = __esm({
  "_shared/http.ts" () {
    cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }, HttpError = class extends Error {
      status;
      constructor(status, message){
        super(message), this.status = status;
      }
    };
    sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
  }
});
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
function knowledgeOf(ws) {
  return (ws.knowledge ?? "").split(`
`).filter((l)=>!/\[à compléter/i.test(l)).join(`
`).trim().slice(0, 4e3);
}
function assertPlan(ws) {
  let plan = ws.plan ?? "essai";
  if (plan !== "fondateur") {
    if (plan === "essai") {
      if (ws.trial_ends && ws.trial_ends < new Date().toISOString().slice(0, 10)) throw new HttpError(402, "Ton essai gratuit est terminé : choisis une formule dans Réglages → Abonnement pour continuer.");
      return;
    }
    if ([
      "past_due",
      "unpaid"
    ].includes(ws.plan_status ?? "")) throw new HttpError(402, "Ton dernier paiement a échoué : mets à jour ta carte dans Réglages → Abonnement.");
    if ([
      "canceled",
      "incomplete_expired"
    ].includes(ws.plan_status ?? "")) throw new HttpError(402, "Ton abonnement est arrêté : choisis une formule dans Réglages → Abonnement pour reprendre.");
  }
}
function repliesTracked(ws) {
  return ws.reply_status === "verified" && !!ws.reply_domain || !!PLATFORM_DOMAIN();
}
function sendReady(ws) {
  return ws.integrations?.mailbox?.ok ? !!ws.postal_address : ws.domain_status === "verified" && !!ws.postal_address && ws.sender_email.toLowerCase().endsWith("@" + ws.domain);
}
async function requireMember(req, workspaceId) {
  let token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Connexion requise");
  let { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expirée, reconnecte-toi");
  if (typeof workspaceId != "string" || !/^[0-9a-f-]{36}$/.test(workspaceId)) throw new HttpError(400, "Espace manquant");
  let { data: m } = await admin.from("members").select("role").eq("workspace_id", workspaceId).eq("user_id", data.user.id).maybeSingle();
  if (!m) throw new HttpError(403, "Accès refusé à cet espace");
  let { data: ws } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();
  return {
    userId: data.user.id,
    ws
  };
}
async function log(workspaceId, kind, summary) {
  await admin.from("activity").insert({
    workspace_id: workspaceId,
    kind,
    summary
  });
}
async function quota(workspaceId, kind, max, wanted = 1) {
  let { data: w } = await admin.from("workspaces").select("plan, plan_status, trial_ends").eq("id", workspaceId).single();
  assertPlan(w ?? {}), max = Math.max(1, Math.round(max * (PLANS[w?.plan ?? "essai"]?.factor ?? 1)));
  let since = new Date;
  since.setUTCHours(0, 0, 0, 0);
  let { count } = await admin.from("activity").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", workspaceId).eq("kind", kind).gte("created_at", since.toISOString()), left = Math.max(0, max - (count ?? 0));
  if (left <= 0) throw new HttpError(429, "Limite du jour atteinte pour cette action, elle se réinitialise demain");
  return Math.min(left, wanted);
}
async function call(body, key) {
  let res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return {
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(()=>({}))
  };
}
async function ask(prompt, opts = {}) {
  let key = env("ANTHROPIC_API_KEY");
  if (!key) throw new HttpError(500, "Clé ANTHROPIC_API_KEY manquante dans les secrets Supabase");
  let base = {
    model: opts.fast ? FAST_MODEL() : WRITE_MODEL(),
    max_tokens: Math.max(opts.maxTokens ?? 1500, 1500),
    system: opts.system ?? "Tu es un expert en développement commercial B2B en France. Réponds en français.",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  };
  opts.tools?.length && (base.tools = opts.tools);
  let text = (d)=>(d.content ?? []).filter((b)=>b.type === "text").map((b)=>b.text ?? "").join("").trim();
  base.thinking = {
    type: "disabled"
  };
  let run = async ()=>{
    let r2 = await call(base, key);
    !r2.ok && r2.status === 400 && /thinking/i.test(r2.data?.error?.message ?? "") && (delete base.thinking, r2 = await call(base, key));
    for(let i = 0; i < 3 && r2.ok && r2.data?.stop_reason === "pause_turn"; i++)base.messages = [
      {
        role: "user",
        content: prompt
      },
      {
        role: "assistant",
        content: r2.data.content
      }
    ], r2 = await call(base, key);
    return r2;
  }, r = await run();
  if (r.ok && r.data?.stop_reason === "max_tokens" && !opts.tools?.length && Number(base.max_tokens) < 32e3 && (console.warn("max_tokens atteint", base.max_tokens, JSON.stringify(r.data?.usage ?? {})), base.max_tokens = Math.min(32e3, Number(base.max_tokens) * 2), base.messages = [
    {
      role: "user",
      content: prompt
    }
  ], r = await run()), !r.ok) {
    let msg = r.data?.error?.message ?? `erreur ${r.status}`;
    throw /credit balance/i.test(msg) ? new HttpError(402, "Crédit IA épuisé : recharge le compte Anthropic pour continuer") : new HttpError(502, "IA : " + msg);
  }
  let out = text(r.data);
  if (!out) throw new HttpError(502, `L'IA n'a renvoyé aucun texte (${r.data?.stop_reason ?? "?"})`);
  return out;
}
function repairJson(t) {
  if (!t.startsWith("{")) return null;
  let stack = [], inStr = !1, esc2 = !1, cuts = [];
  for(let i = 0; i < t.length; i++){
    let c = t[i];
    if (inStr) {
      esc2 ? esc2 = !1 : c === "\\" ? esc2 = !0 : c === '"' && (inStr = !1);
      continue;
    }
    if (c === '"') inStr = !0;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      if (stack.pop(), !stack.length) {
        cuts.push({
          at: i + 1,
          closers: ""
        });
        break;
      }
      cuts.push({
        at: i + 1,
        closers: [
          ...stack
        ].reverse().join("")
      });
    } else c === "," && cuts.push({
      at: i,
      closers: [
        ...stack
      ].reverse().join("")
    });
  }
  for(let k = cuts.length - 1; k >= 0 && k >= cuts.length - 40; k--)try {
    return JSON.parse(t.slice(0, cuts[k].at) + cuts[k].closers);
  } catch  {}
  return null;
}
async function askJson(prompt, opts = {}) {
  let text = await ask(prompt + `

Réponds uniquement avec un objet JSON valide, sans texte autour.`, opts), fenced = [
    ...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)
  ].at(-1);
  if (fenced) try {
    return JSON.parse(fenced[1]);
  } catch  {}
  let first = text.indexOf("{"), end = text.lastIndexOf("}");
  if (first >= 0 && end > first) try {
    return JSON.parse(text.slice(first, end + 1));
  } catch  {}
  if (first >= 0) {
    let repaired = repairJson(text.slice(first));
    if (repaired && typeof repaired == "object") return console.warn("JSON réparé", text.length), repaired;
  }
  for(let start = text.indexOf("{", first + 1); start >= 0 && start < end; start = text.indexOf("{", start + 1))try {
    return JSON.parse(text.slice(start, end + 1));
  } catch  {}
  throw console.error("JSON illisible", text.length, text.slice(0, 300), "…", text.slice(-300)), new HttpError(502, "Réponse de l'IA illisible, réessaie");
}
var admin, env, PLANS, PLATFORM_DOMAIN, WRITE_MODEL, FAST_MODEL, init_core = __esm({
  "_shared/core.ts" () {
    init_http();
    admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: {
        persistSession: !1,
        autoRefreshToken: !1
      }
    }), env = (name, fallback = "")=>Deno.env.get(name) || Deno.env.get(`${name}_KAIRO`) || fallback, PLANS = {
      essai: {
        label: "Essai gratuit",
        price: 0,
        factor: .5,
        seats: 1,
        credits: 30
      },
      solo: {
        label: "Solo",
        price: 79,
        factor: 1,
        seats: 1,
        credits: 300
      },
      pro: {
        label: "Pro",
        price: 149,
        factor: 2,
        seats: 3,
        credits: 1e3
      },
      equipe: {
        label: "Équipe",
        price: 299,
        factor: 4,
        seats: 10,
        credits: 3e3
      },
      fondateur: {
        label: "Fondateur",
        price: 0,
        factor: 1,
        seats: 50,
        credits: 5e3
      }
    };
    PLATFORM_DOMAIN = ()=>env("PLATFORM_REPLY_DOMAIN", "maisonravita.fr");
    WRITE_MODEL = ()=>env("ANTHROPIC_MODEL", "claude-sonnet-5-5"), FAST_MODEL = ()=>env("ANTHROPIC_FAST_MODEL", "claude-haiku-5-5");
  }
});
var search_exports = {};
__export(search_exports, {
  countTarget: ()=>countTarget,
  searchTarget: ()=>searchTarget
});
function urlFor(t, zone, page, perPage) {
  let u = new URL(API);
  return u.searchParams.set("activite_principale", t.naf.join(",")), t.tranches?.length && u.searchParams.set("tranche_effectif_salarie", t.tranches.join(",")), zone.length && u.searchParams.set("departement", zone.join(",")), u.searchParams.set("etat_administratif", "A"), u.searchParams.set("per_page", String(perPage)), u.searchParams.set("page", String(page)), u;
}
async function fetchJson(u) {
  for(let i = 0; i < 3; i++){
    let res = await fetch(u, {
      headers: {
        accept: "application/json"
      }
    });
    if (res.status === 429) {
      await sleep(1200);
      continue;
    }
    if (!res.ok) throw new HttpError(502, `Registre des entreprises indisponible (${res.status})`);
    return await res.json();
  }
  throw new HttpError(503, "Registre des entreprises saturé, réessaie dans une minute");
}
function signalsOf(r, e) {
  let out = [], months = (d)=>d ? (Date.now() - new Date(d).getTime()) / 262656e4 : 999;
  if (months(e.date_creation) < 18) {
    let d = new Date(e.date_creation);
    out.push({
      type: "ouverture",
      label: `Établissement ouvert en ${MOIS[d.getMonth()]} ${d.getFullYear()}`
    });
  } else if (months(r.date_creation) < 24) {
    let d = new Date(r.date_creation);
    out.push({
      type: "creation",
      label: `Entreprise créée en ${MOIS[d.getMonth()]} ${d.getFullYear()}`
    });
  }
  let tr = e.tranche_effectif_salarie ?? r.tranche_effectif_salarie;
  return tr && TRANCHE_LABEL[tr] && out.push({
    type: "taille",
    label: `${TRANCHE_LABEL[tr]} salariés`
  }), (r.nombre_etablissements_ouverts ?? 1) > 3 && out.push({
    type: "reseau",
    label: `Réseau de ${r.nombre_etablissements_ouverts} établissements`
  }), out;
}
async function countTarget(t, zone) {
  let d = await fetchJson(urlFor(t, zone, 1, 1));
  return Number(d.total_results ?? 0);
}
async function searchTarget(workspaceId, t, zone, pages = 2) {
  let start = Math.max(1, t.next_page ?? 1), rows = [], seen = new Set, next = start, done = !1;
  for(let page = start; page < start + Math.min(Math.max(pages, 1), 6); page++){
    let data = await fetchJson(urlFor(t, zone, page, 25)), results = data.results ?? [];
    for (let r of results){
      let nom = title(r.nom_complet ?? r.nom_raison_sociale ?? ""), boss = (r.dirigeants ?? []).find((d)=>d.type_dirigeant === "personne physique" && d.nom), etabs = (t.siege_only ? r.siege ? [
        r.siege
      ] : [] : r.matching_etablissements?.length ? r.matching_etablissements : r.siege ? [
        r.siege
      ] : []).filter((e)=>!zone.length || zone.some((z)=>(e.code_postal ?? "").startsWith(z.replace(/^2[AB]$/, "20")))).filter((e)=>!e.etat_administratif || e.etat_administratif === "A").slice(0, 5);
      for (let e of etabs){
        if (!e.siret || seen.has(e.siret)) continue;
        seen.add(e.siret);
        let enseigne = e.liste_enseignes?.[0] ?? e.nom_commercial ?? "";
        rows.push({
          workspace_id: workspaceId,
          target: t.id,
          name: enseigne ? title(enseigne) : nom,
          org: enseigne ? nom : "",
          siren: r.siren ?? null,
          siret: e.siret,
          activity: t.label,
          address: e.adresse ?? "",
          postal_code: e.code_postal ?? "",
          city: e.libelle_commune ? title(e.libelle_commune) : "",
          contact_name: boss ? title(`${boss.prenoms?.split(" ")[0] ?? ""} ${boss.nom}`.trim()) : "",
          contact_role: boss?.qualite ?? "",
          signals: signalsOf(r, e)
        });
      }
    }
    if (next = page + 1, page >= (data.total_pages ?? 1)) {
      done = !0;
      break;
    }
    await sleep(200);
  }
  let inserted = 0;
  for(let i = 0; i < rows.length; i += 200){
    let { data, error } = await admin.from("prospects").upsert(rows.slice(i, i + 200), {
      onConflict: "workspace_id,siret",
      ignoreDuplicates: !0
    }).select("id");
    if (error) throw new HttpError(500, error.message);
    inserted += data?.length ?? 0;
  }
  return {
    found: rows.length,
    inserted,
    nextPage: done ? null : next
  };
}
var API, title, MOIS, TRANCHE_LABEL, init_search = __esm({
  "_shared/search.ts" () {
    init_http();
    init_core();
    API = "https://recherche-entreprises.api.gouv.fr/search", title = (s)=>s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m)=>m.toUpperCase());
    MOIS = [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre"
    ], TRANCHE_LABEL = {
      11: "10 à 19",
      12: "20 à 49",
      21: "50 à 99",
      22: "100 à 199",
      31: "200 à 249",
      32: "250 à 499",
      41: "500 à 999",
      42: "1 000 à 1 999",
      51: "2 000 à 4 999",
      52: "5 000 à 9 999",
      53: "10 000 et plus"
    };
  }
});
var analyze_exports = {};
__export(analyze_exports, {
  analyze: ()=>analyze,
  fetchHtml: ()=>fetchHtml,
  normalizeUrl: ()=>normalizeUrl,
  readSite: ()=>readSite,
  socialLinks: ()=>socialLinks
});
function textOf(html) {
  let out = "", i = 0, lower = html.toLowerCase();
  for(; i < html.length;){
    let lt = html.indexOf("<", i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    let skipTo = -1;
    for (let tag of [
      "script",
      "style",
      "svg",
      "noscript"
    ])if (lower.startsWith(tag, lt + 1)) {
      let end = lower.indexOf(`</${tag}`, lt);
      skipTo = end < 0 ? html.length : lower.indexOf(">", end) + 1;
      break;
    }
    if (skipTo > 0) {
      i = skipTo, out += " ";
      continue;
    }
    let gt = html.indexOf(">", lt);
    if (gt < 0) break;
    let t = lower.slice(lt + 1, lt + 4);
    if (out += /^(br|p\b|\/p|h\d|\/h|li|\/li|div|\/di)/.test(t) ? `
` : " ", i = gt + 1, out.length > 4e4) break;
  }
  return out.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, `
`).trim();
}
async function fetchHtml(url) {
  return await get(url);
}
async function get(url) {
  let ctl = new AbortController, t = setTimeout(()=>ctl.abort(), 15e3);
  try {
    let res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8"
      },
      signal: ctl.signal,
      redirect: "follow"
    });
    return !res.ok || !(res.headers.get("content-type") ?? "").includes("html") ? "" : (await res.text()).slice(0, 3e5);
  } catch  {
    return "";
  } finally{
    clearTimeout(t);
  }
}
function normalizeUrl(input) {
  let s = String(input ?? "").trim();
  if (!s) throw new HttpError(400, "Indique l'adresse de ton site");
  /^https?:\/\//i.test(s) || (s = "https://" + s);
  let u;
  try {
    u = new URL(s);
  } catch  {
    throw new HttpError(400, "Adresse de site invalide");
  }
  if (!/\./.test(u.hostname) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) throw new HttpError(400, "Adresse de site invalide");
  return u.origin + (u.pathname === "/" ? "" : u.pathname);
}
async function describeFromWeb(url) {
  let host = new URL(url).hostname.replace(/^www\./, ""), out = await ask(`Recherche sur le web l'entreprise dont le site est ${host}. Décris précisément, en français et en 250 mots maximum : ce qu'elle vend, à quels clients (types d'entreprises ou d'établissements), où elle intervient, ses chiffres et références publics, ce qui la distingue. Uniquement des faits trouvés, pas de supposition.`, {
    fast: !0,
    maxTokens: 4e3,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3
      }
    ]
  });
  return `# Description de ${host} (recherche web, le site n'a pas pu être lu directement)
${out}`;
}
async function socialLinks(url) {
  let html = (await get(url)).slice(0, 3e5), out = {}, pats = [
    [
      "linkedin",
      /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/[^"'\s<>?#]+/i
    ],
    [
      "instagram",
      /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/i
    ],
    [
      "facebook",
      /https?:\/\/(?:www\.|fr-fr\.)?facebook\.com\/[^"'\s<>?#]+/i
    ],
    [
      "tiktok",
      /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i
    ],
    [
      "youtube",
      /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[^"'\s<>?#]+/i
    ],
    [
      "x",
      /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i
    ]
  ];
  for (let [k, re] of pats){
    let m = html.match(re);
    m && !/(sharer|share|intent|plugins|dialog)/i.test(m[0]) && (out[k] = m[0].replace(/\/$/, ""));
  }
  return out;
}
function metaOf(html) {
  let head = html.slice(0, 6e4), pick2 = (re)=>(head.match(re)?.[1] ?? "").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').trim(), out = [
    pick2(/<title[^>]*>([^<]{2,300})<\/title>/i),
    pick2(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{2,600})["']/i) || pick2(/<meta[^>]+content=["']([^"']{2,600})["'][^>]+name=["']description["']/i),
    pick2(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{2,600})["']/i)
  ], ld = [
    ...head.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]{2,4000}?)<\/script>/gi)
  ].map((m)=>m[1].replace(/\s+/g, " ").slice(0, 1500));
  return [
    ...new Set(out.filter(Boolean)),
    ...ld
  ].join(`
`);
}
async function readSite(url) {
  let home = await get(url);
  if (!home) {
    let u = new URL(url), alt = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    home = await get(`${u.protocol}//${alt}${u.pathname}`);
  }
  if (!home) try {
    return await describeFromWeb(url);
  } catch (e) {
    console.error("describeFromWeb", e);
  }
  if (!home) throw new HttpError(422, "Impossible de lire ce site (hors ligne ou protégé). Vérifie l'adresse, ou décris ton activité à la main.");
  let homeText = textOf(home);
  if (homeText.length < 600) {
    let web = "";
    try {
      web = await describeFromWeb(url);
    } catch (e) {
      console.error("describeFromWeb", e);
    }
    let all = [
      `# Métadonnées du site (${url})
${metaOf(home)}`,
      homeText && `# Texte visible
${homeText}`,
      web
    ].filter(Boolean).join(`

`);
    if (all.replace(/#[^\n]*\n/g, "").trim().length < 250) throw new HttpError(422, "Ce site est une application dont le contenu n'est pas lisible. Clique sur « Décris ton activité » et explique en 3 phrases ce que tu vends et à qui.");
    return all.slice(0, 18e3);
  }
  let origin = new URL(url).origin, links = [
    ...home.slice(0, 15e4).matchAll(/href=["']([^"'#]{1,200})["']/gi)
  ].map((m)=>m[1]).map((h)=>{
    try {
      return new URL(h, origin).href;
    } catch  {
      return "";
    }
  }).filter((h)=>h.startsWith(origin) && /(propos|about|qui-sommes|services|offre|prestations|solutions|nos-|metier|expertise|clients|references|contact)/i.test(h)), pages = [
    ...new Set(links)
  ].slice(0, 3), others = await Promise.all(pages.map(get)), parts = [
    `# Accueil (${url})
${metaOf(home)}
${homeText.slice(0, 7e3)}`
  ];
  return others.forEach((h, i)=>{
    h && parts.push(`# ${pages[i]}
${textOf(h).slice(0, 3500)}`);
  }), parts.join(`

`).slice(0, 18e3);
}
async function analyze(site, description) {
  let content = site || "", a = await askJson(`Voici le contenu du site d'une entreprise française${description ? " et la description qu'en donne son dirigeant" : ""}.
Ton travail : comprendre ce qu'elle vend et à QUI elle doit le vendre (clients professionnels), pour lancer une prospection B2B par e-mail.

${description ? `Description du dirigeant :
${description}

` : ""}${content ? `Contenu du site :
${content}` : ""}

Produis :
1. "profil" : nom commercial, résumé en une phrase, offre (ce qui est vendu, concrètement), clients_types (qui achète), preuves (faits vérifiables trouvés sur le site : années d'existence, références, certifications, chiffres — UNIQUEMENT s'ils figurent dans le contenu), differenciation (ce qui la distingue, d'après le site), ville (siège), ton (comment elle s'exprime : sobre, premium, chaleureux…).
2. "zone" : codes départements français (2 caractères, ex. "75", "92", "2A") où prospecter, déduits de la zone d'intervention indiquée sur le site ; à défaut, le département du siège et ses voisins. Liste vide si l'entreprise travaille dans toute la France.
3. "cibles" : 3 à 6 types d'établissements clients, du plus prometteur au moins prometteur. Pour chacun :
   - label : nom clair (ex. « EHPAD », « Cabinets d'avocats »)
   - pourquoi : pourquoi ils ont besoin de cette offre (une phrase)
   - naf : 1 à 4 codes d'activité NAF rév. 2 de l'INSEE au format "87.10A" qui correspondent EXACTEMENT à ces établissements
   - tranches : tranches d'effectif INSEE à viser (codes parmi 00,01,02,03,11,12,21,22,31,32,41,42,51,52,53 ; 01=1-2, 02=3-5, 03=6-9, 11=10-19, 12=20-49, 21=50-99, 22=100-199, 31=200-249, 32=250-499, 41=500-999…) ; liste vide = toutes tailles
   - siege_only : true s'il faut contacter le siège plutôt que chaque établissement (entreprises de bureaux), false pour des établissements autonomes (hôtels, EHPAD, écoles, restaurants…)
   - interlocuteur : la fonction à qui écrire (ex. « Directeur d'établissement », « Office manager »)
   - pour_qui : les bénéficiaires finaux, comme on en parle dans un e-mail (ex. « vos résidents », « vos collaborateurs », « vos clients »)
   - angle : l'argument principal pour cette cible, en une phrase
Ne vise pas les particuliers. Ne choisis que des cibles qui ont un vrai besoin de cette offre.
Si l'entreprise vend un logiciel, un SaaS, une application ou un service à distance : ses clients sont des entreprises (pas des établissements locaux). Choisis alors les secteurs d'activité de ses clients (codes NAF de ces secteurs, pas celui de l'éditeur), des tranches d'effectif cohérentes avec son prix et sa cible, siege_only = true, l'interlocuteur qui achète ce type d'outil (ex. « Directeur commercial », « DAF », « Responsable RH », « Gérant »), et une zone vide (toute la France) sauf si le site indique une limite géographique.

Format :
{"profil": {"nom": "", "resume": "", "offre": "", "clients_types": "", "preuves": [], "differenciation": "", "ville": "", "ton": ""},
 "zone": ["75"],
 "cibles": [{"label": "", "pourquoi": "", "naf": ["00.00X"], "tranches": [], "siege_only": false, "interlocuteur": "", "pour_qui": "", "angle": ""}]}`, {
    maxTokens: 4e3
  }), zone = (Array.isArray(a.zone) ? a.zone : []).map((d)=>String(d).toUpperCase().trim()).filter((d)=>/^(\d{2}|2A|2B|97\d)$/.test(d)).slice(0, 20), cibles = (Array.isArray(a.cibles) ? a.cibles : []).slice(0, 6).map((c, i)=>({
      id: `c${i + 1}`,
      label: String(c.label ?? "").slice(0, 80),
      pourquoi: String(c.pourquoi ?? "").slice(0, 300),
      naf: (c.naf ?? []).map((n)=>String(n).trim().toUpperCase()).filter((n)=>NAF_RE.test(n)).slice(0, 4),
      tranches: (c.tranches ?? []).map(String).filter((t)=>TRANCHES.includes(t)),
      siege_only: !!c.siege_only,
      interlocuteur: String(c.interlocuteur ?? "").slice(0, 80),
      pour_qui: String(c.pour_qui ?? "").slice(0, 80),
      angle: String(c.angle ?? "").slice(0, 300),
      actif: !0,
      next_page: 1
    })).filter((c)=>c.label && c.naf.length);
  if (!cibles.length) throw new HttpError(502, "Je n'ai pas assez d'informations sur ce que tu vends. Clique sur « Décris ton activité » et explique en 3 phrases ce que tu vends, à quel type de clients, et où.");
  for (let c of cibles)c.total = await countTarget(c, zone).catch(()=>{});
  return {
    profile: a.profil ?? {},
    zone,
    targets: cibles
  };
}
var UA, NAF_RE, TRANCHES, init_analyze = __esm({
  "_shared/analyze.ts" () {
    init_http();
    init_core();
    init_search();
    UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
    NAF_RE = /^\d{2}\.\d{2}[A-Z]$/, TRANCHES = [
      "00",
      "01",
      "02",
      "03",
      "11",
      "12",
      "21",
      "22",
      "31",
      "32",
      "41",
      "42",
      "51",
      "52",
      "53"
    ];
  }
});
import nodemailer from "npm:nodemailer@6.9.16";
function warmup(ws) {
  let limit = ws.daily_limit || 20;
  if (!ws.warmup_started) return {
    week: 1,
    day: 0,
    cap: Math.min(RAMP[0], limit),
    done: !1,
    ramp: RAMP
  };
  let days = Math.max(0, Math.floor((Date.now() - new Date(`${ws.warmup_started}T00:00:00Z`).getTime()) / 864e5)), week = Math.floor(days / 7), done = week >= RAMP.length;
  return {
    week: Math.min(week + 1, RAMP.length),
    day: days + 1,
    cap: done ? limit : Math.min(RAMP[week], limit),
    done,
    ramp: RAMP
  };
}
async function markWarmup(ws) {
  if (ws.warmup_started) return;
  let d = today();
  await admin.from("workspaces").update({
    warmup_started: d
  }).eq("id", ws.id).is("warmup_started", null), ws.warmup_started = d;
}
async function cryptoKey() {
  let { data } = await admin.from("app_secrets").select("value").eq("name", "mailbox_key").maybeSingle();
  if (!data) {
    let raw = [
      ...crypto.getRandomValues(new Uint8Array(32))
    ].map((b)=>b.toString(16).padStart(2, "0")).join("");
    await admin.from("app_secrets").upsert({
      name: "mailbox_key",
      value: raw
    }, {
      onConflict: "name",
      ignoreDuplicates: !0
    }), { data } = await admin.from("app_secrets").select("value").eq("name", "mailbox_key").single();
  }
  let bytes = new Uint8Array(data.value.match(/.{2}/g).map((h)=>parseInt(h, 16)));
  return await crypto.subtle.importKey("raw", bytes, "AES-GCM", !1, [
    "encrypt",
    "decrypt"
  ]);
}
async function seal(text) {
  let iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({
    name: "AES-GCM",
    iv
  }, await cryptoKey(), new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...iv, ...ct));
}
async function open(sealed) {
  let all = Uint8Array.from(atob(sealed), (c)=>c.charCodeAt(0)), pt = await crypto.subtle.decrypt({
    name: "AES-GCM",
    iv: all.slice(0, 12)
  }, await cryptoKey(), all.slice(12));
  return new TextDecoder().decode(pt);
}
function transport(host, port, user, pass) {
  return nodemailer.createTransport({
    host,
    port,
    secure: !0,
    auth: {
      user,
      pass
    },
    connectionTimeout: 12e3,
    greetingTimeout: 12e3,
    socketTimeout: 2e4
  });
}
function smtpError(e) {
  let m = String(e?.message ?? e);
  return /auth|535|534|credentials|password|Username/i.test(m) ? "Identifiant ou mot de passe refusé. Pour Gmail, il faut un mot de passe d'application (pas ton mot de passe habituel)." : /ENOTFOUND|getaddrinfo|resolve/i.test(m) ? "Serveur SMTP introuvable : vérifie son adresse." : /timeout|ETIMEDOUT|ECONNREFUSED|refused/i.test(m) ? "Le serveur ne répond pas sur le port 465 (SSL). Vérifie le serveur, ou contacte ton hébergeur." : "Connexion impossible : " + m.slice(0, 160);
}
async function saveMailbox(ws, b) {
  let provider = MAILBOXES[String(b.provider)] ? String(b.provider) : "autre", email = String(b.email ?? "").trim().toLowerCase(), pass = String(b.password ?? "").replace(/\s+/g, provider === "gmail" ? "" : " ").trim(), host = provider === "autre" ? String(b.host ?? "").trim().toLowerCase() : MAILBOXES[provider].host, port = 465;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
  if (pass.length < 4) throw new HttpError(400, "Mot de passe manquant");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new HttpError(400, "Serveur SMTP invalide (ex. smtp.monhebergeur.fr)");
  if (/(outlook|office365|hotmail|live)\./.test(host) || /@(outlook|hotmail|live)\./.test(email)) throw new HttpError(400, "Microsoft n'accepte plus les mots de passe pour l'envoi : la connexion Outlook arrivera avec la connexion Microsoft. En attendant, utilise ton domaine d'envoi.");
  try {
    await transport(host, port, email, pass).verify();
  } catch (e) {
    throw new HttpError(400, smtpError(e));
  }
  let smtp = {
    host,
    port,
    user: email,
    pass: await seal(pass)
  };
  await admin.from("workspace_secrets").upsert({
    workspace_id: ws.id,
    smtp,
    updated_at: new Date().toISOString()
  }, {
    onConflict: "workspace_id"
  });
  let integrations = {
    ...ws.integrations ?? {},
    mailbox: {
      ok: !0,
      email,
      provider,
      at: new Date().toISOString()
    }
  };
  return await admin.from("workspaces").update({
    integrations,
    sender_email: email
  }).eq("id", ws.id), await log(ws.id, "integration", `Boîte mail connectée : ${email}`), {
    ok: !0,
    email,
    provider
  };
}
async function removeMailbox(ws) {
  await admin.from("workspace_secrets").update({
    smtp: {}
  }).eq("workspace_id", ws.id);
  let integrations = {
    ...ws.integrations ?? {}
  };
  return delete integrations.mailbox, await admin.from("workspaces").update({
    integrations
  }).eq("id", ws.id), {
    ok: !0
  };
}
async function smtpSend(ws, m) {
  let { data } = await admin.from("workspace_secrets").select("smtp").eq("workspace_id", ws.id).maybeSingle(), s = data?.smtp;
  if (!s?.host || !s.pass) throw new HttpError(400, "Boîte mail déconnectée : reconnecte-la dans Réglages");
  try {
    let info = await transport(s.host, s.port ?? 465, s.user, await open(s.pass)).sendMail({
      from: m.from,
      to: m.to,
      replyTo: m.replyTo,
      subject: m.subject,
      text: m.text,
      html: m.html,
      headers: m.headers,
      attachments: m.attachments
    });
    return {
      id: String(info.messageId ?? "")
    };
  } catch (e) {
    if (/auth|535|534/i.test(String(e.message))) {
      let integrations = {
        ...ws.integrations ?? {},
        mailbox: {
          ...ws.integrations?.mailbox ?? {
            email: "",
            provider: "",
            at: ""
          },
          ok: !1
        }
      };
      await admin.from("workspaces").update({
        integrations
      }).eq("id", ws.id);
    }
    throw new HttpError(502, "Envoi par ta boîte : " + smtpError(e));
  }
}
async function roleOf(wsId, userId) {
  let { data } = await admin.from("members").select("role").eq("workspace_id", wsId).eq("user_id", userId).maybeSingle();
  return data?.role ?? "";
}
async function requireAdmin(wsId, userId) {
  if (![
    "owner",
    "admin"
  ].includes(await roleOf(wsId, userId))) throw new HttpError(403, "Seuls le propriétaire et les administrateurs peuvent gérer l'équipe");
}
async function invite(ws, userId, b) {
  await requireAdmin(ws.id, userId);
  let email = String(b.email ?? "").trim().toLowerCase().slice(0, 200), role = b.role === "admin" ? "admin" : "member", seats = PLANS[ws.plan ?? "essai"]?.seats ?? 1, { count: members } = await admin.from("members").select("user_id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id), { count: pending } = await admin.from("invites").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id).is("used_at", null).gt("expires_at", new Date().toISOString());
  if ((members ?? 0) + (pending ?? 0) >= seats) throw new HttpError(402, `Ta formule ${PLANS[ws.plan]?.label ?? ""} comprend ${seats} utilisateur${seats > 1 ? "s" : ""} : passe à une formule supérieure pour inviter quelqu'un.`);
  let { data, error } = await admin.from("invites").insert({
    workspace_id: ws.id,
    email,
    role,
    created_by: userId
  }).select("token").single();
  if (error) throw new HttpError(500, error.message);
  await log(ws.id, "equipe", `Invitation créée${email ? ` pour ${email}` : ""}`);
  let link = `${APP(ws)}/#/rejoindre/${data.token}`, emailed = !1;
  if (email) try {
    let { sendSystem: sendSystem2 } = await Promise.resolve().then(()=>(init_mail(), mail_exports)), { data: u } = await admin.auth.admin.getUserById(userId);
    await sendSystem2({
      to: email,
      replyTo: u?.user?.email ?? void 0,
      subject: `Invitation à rejoindre ${ws.profile?.nom || ws.name} sur Kairo`,
      text: `Bonjour,

${u?.user?.email ?? "Ton équipe"} t'invite à rejoindre l'espace « ${ws.profile?.nom || ws.name} » sur Kairo, l'outil qui trouve et contacte les prospects.

Rejoindre l'équipe (lien valable 7 jours) :
${link}

À bientôt,
Kairo`
    }), emailed = !0;
  } catch (e) {
    console.error("invitation", e);
  }
  return {
    link,
    emailed
  };
}
async function revokeInvite(ws, userId, id) {
  return await requireAdmin(ws.id, userId), await admin.from("invites").delete().eq("id", id).eq("workspace_id", ws.id).is("used_at", null), {
    ok: !0
  };
}
async function join(req, token) {
  let jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, ""), { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) throw new HttpError(401, "Connecte-toi ou crée ton compte pour rejoindre l'équipe");
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Invitation introuvable");
  let { data: inv } = await admin.from("invites").select("*").eq("token", token).maybeSingle();
  if (!inv || inv.used_at) throw new HttpError(404, "Cette invitation a déjà servi ou n'existe pas");
  if (new Date(inv.expires_at) < new Date) throw new HttpError(410, "Cette invitation a expiré : demande un nouveau lien");
  if (inv.email && u.user.email?.toLowerCase() !== inv.email) throw new HttpError(403, `Cette invitation est réservée à ${inv.email}`);
  return await admin.from("members").upsert({
    workspace_id: inv.workspace_id,
    user_id: u.user.id,
    role: inv.role,
    email: u.user.email ?? ""
  }, {
    onConflict: "workspace_id,user_id",
    ignoreDuplicates: !0
  }), await admin.from("invites").update({
    used_at: new Date().toISOString(),
    used_by: u.user.id
  }).eq("id", inv.id), await log(inv.workspace_id, "equipe", `${u.user.email} a rejoint l'équipe`), {
    workspace_id: inv.workspace_id
  };
}
async function setMember(ws, userId, target, action) {
  await requireAdmin(ws.id, userId);
  let r = await roleOf(ws.id, target);
  if (!r) throw new HttpError(404, "Membre introuvable");
  if (r === "owner") throw new HttpError(400, "Le propriétaire ne peut pas être modifié");
  if (action === "remove") await admin.from("members").delete().eq("workspace_id", ws.id).eq("user_id", target), await admin.from("prospects").update({
    owner_id: null
  }).eq("workspace_id", ws.id).eq("owner_id", target);
  else if (action === "admin" || action === "member") await admin.from("members").update({
    role: action
  }).eq("workspace_id", ws.id).eq("user_id", target);
  else throw new HttpError(400, "Action inconnue");
  return {
    ok: !0
  };
}
async function distribute(ws, userId, b) {
  await requireAdmin(ws.id, userId);
  let { data: mem } = await admin.from("members").select("user_id").eq("workspace_id", ws.id).order("created_at"), users = (Array.isArray(b.users) && b.users.length ? b.users : (mem ?? []).map((m)=>m.user_id)).filter((id)=>(mem ?? []).some((m)=>m.user_id === id));
  if (!users.length) throw new HttpError(400, "Aucun membre choisi");
  let q = admin.from("prospects").select("id").eq("workspace_id", ws.id).is("owner_id", null).not("status", "in", "(refus,ignore)");
  b.target && (q = q.eq("target", String(b.target)));
  let { data } = await q.order("score", {
    ascending: !1,
    nullsFirst: !1
  }).limit(Math.min(Number(b.count) || 200, 1e3)), ids = (data ?? []).map((x)=>x.id);
  for(let k = 0; k < users.length; k++){
    let mine = ids.filter((_, i)=>i % users.length === k);
    for(let i = 0; i < mine.length; i += 200)await admin.from("prospects").update({
      owner_id: users[k]
    }).in("id", mine.slice(i, i + 200));
  }
  return await log(ws.id, "equipe", `${ids.length} prospects répartis entre ${users.length} personne${users.length > 1 ? "s" : ""}`), {
    assigned: ids.length
  };
}
async function hub(token, path, method = "GET", body) {
  let r = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  return {
    ok: r.ok,
    status: r.status,
    data: await r.json().catch(()=>({}))
  };
}
async function pipe(token, path, method = "GET", body) {
  let sep = path.includes("?") ? "&" : "?", r = await fetch(`https://api.pipedrive.com/v1${path}${sep}api_token=${encodeURIComponent(token)}`, {
    method,
    headers: {
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  return {
    ok: r.ok,
    status: r.status,
    data: await r.json().catch(()=>({}))
  };
}
async function connectCrm(ws, b) {
  let crm = String(b.crm), token = String(b.token ?? "").trim(), integrations = {
    ...ws.integrations ?? {}
  };
  if (b.remove) return crm === "hubspot" && (delete integrations.hubspot, await admin.from("workspace_secrets").upsert({
    workspace_id: ws.id,
    hubspot_token: ""
  }, {
    onConflict: "workspace_id"
  })), crm === "pipedrive" && (delete integrations.pipedrive, await admin.from("workspace_secrets").upsert({
    workspace_id: ws.id,
    pipedrive_token: ""
  }, {
    onConflict: "workspace_id"
  })), await admin.from("workspaces").update({
    integrations
  }).eq("id", ws.id), {
    ok: !0
  };
  if (token.length < 10) throw new HttpError(400, "Colle la clé d'accès de ton CRM");
  if (crm === "hubspot") {
    let r = await hub(token, "/account-info/v3/details");
    if (!r.ok) throw new HttpError(400, r.status === 401 ? "Clé HubSpot refusée : crée une application privée avec les accès CRM (contacts, entreprises, transactions) et copie son jeton." : `HubSpot : ${r.data?.message ?? r.status}`);
    await admin.from("workspace_secrets").upsert({
      workspace_id: ws.id,
      hubspot_token: token
    }, {
      onConflict: "workspace_id"
    }), integrations.hubspot = {
      ok: !0,
      at: new Date().toISOString(),
      portal: String(r.data?.portalId ?? "")
    };
  } else if (crm === "pipedrive") {
    let r = await pipe(token, "/users/me");
    if (!r.ok || !r.data?.success) throw new HttpError(400, "Clé Pipedrive refusée : copie ton jeton API personnel (Paramètres personnels → API).");
    await admin.from("workspace_secrets").upsert({
      workspace_id: ws.id,
      pipedrive_token: token,
      pipedrive_domain: String(r.data?.data?.company_domain ?? "")
    }, {
      onConflict: "workspace_id"
    }), integrations.pipedrive = {
      ok: !0,
      at: new Date().toISOString(),
      company: String(r.data?.data?.company_name ?? "")
    };
  } else throw new HttpError(400, "CRM inconnu");
  return await admin.from("workspaces").update({
    integrations
  }).eq("id", ws.id), await log(ws.id, "integration", `${crm === "hubspot" ? "HubSpot" : "Pipedrive"} connecté`), {
    ok: !0
  };
}
async function pushHubspot(token, p) {
  let ids = {
    ...p.crm_ids
  }, { first, last } = splitName(p.contact_name || "");
  if (!ids.hs_company) {
    let r = await hub(token, "/crm/v3/objects/companies", "POST", {
      properties: {
        name: p.org || p.name,
        domain: hostOf(p.website),
        city: p.city,
        zip: p.postal_code,
        address: p.address,
        phone: p.phone
      }
    });
    r.ok && (ids.hs_company = String(r.data.id));
  }
  if (p.email) {
    let props = {
      email: p.email,
      firstname: first,
      lastname: last,
      company: p.name,
      phone: p.phone,
      website: p.website,
      city: p.city,
      jobtitle: p.contact_role,
      hs_lead_status: HS_STATUS[p.status] ?? "OPEN"
    };
    if (ids.hs_contact) await hub(token, `/crm/v3/objects/contacts/${ids.hs_contact}`, "PATCH", {
      properties: {
        hs_lead_status: props.hs_lead_status
      }
    });
    else {
      let r = await hub(token, "/crm/v3/objects/contacts", "POST", {
        properties: props
      });
      if (r.status === 409) {
        let m = String(r.data?.message ?? "").match(/Existing ID:\s*(\d+)/);
        m && (ids.hs_contact = m[1]);
      } else r.ok && (ids.hs_contact = String(r.data.id));
      ids.hs_contact && ids.hs_company && (r = await hub(token, `/crm/v4/objects/contacts/${ids.hs_contact}/associations/default/companies/${ids.hs_company}`, "PUT"));
    }
  }
  if ([
    "rdv",
    "client"
  ].includes(p.status)) {
    let props = {
      dealname: `${p.name} – Kairo`,
      pipeline: "default",
      dealstage: p.status === "client" ? "closedwon" : "appointmentscheduled",
      ...p.deal_value ? {
        amount: String(p.deal_value)
      } : {}
    };
    if (ids.hs_deal) await hub(token, `/crm/v3/objects/deals/${ids.hs_deal}`, "PATCH", {
      properties: props
    });
    else {
      let assoc = [
        ...ids.hs_contact ? [
          {
            to: {
              id: ids.hs_contact
            },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 3
              }
            ]
          }
        ] : [],
        ...ids.hs_company ? [
          {
            to: {
              id: ids.hs_company
            },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 5
              }
            ]
          }
        ] : []
      ], r = await hub(token, "/crm/v3/objects/deals", "POST", {
        properties: props,
        associations: assoc
      });
      r.ok && (ids.hs_deal = String(r.data.id));
    }
  }
  return ids;
}
async function pushPipedrive(token, p) {
  let ids = {
    ...p.crm_ids
  };
  if (!ids.pd_org) {
    let r = await pipe(token, "/organizations", "POST", {
      name: p.org || p.name,
      address: [
        p.address,
        p.postal_code,
        p.city
      ].filter(Boolean).join(" ")
    });
    r.data?.success && (ids.pd_org = String(r.data.data.id));
  }
  if (!ids.pd_person && (p.email || p.contact_name)) {
    let r = await pipe(token, "/persons", "POST", {
      name: p.contact_name || p.name,
      org_id: ids.pd_org ? Number(ids.pd_org) : void 0,
      email: p.email ? [
        {
          value: p.email,
          primary: !0
        }
      ] : void 0,
      phone: p.phone ? [
        {
          value: p.phone,
          primary: !0
        }
      ] : void 0
    });
    r.data?.success && (ids.pd_person = String(r.data.data.id));
  }
  if ([
    "rdv",
    "client"
  ].includes(p.status)) {
    let body = {
      title: `${p.name} – Kairo`,
      org_id: ids.pd_org ? Number(ids.pd_org) : void 0,
      person_id: ids.pd_person ? Number(ids.pd_person) : void 0,
      value: p.deal_value ?? void 0,
      currency: "EUR",
      status: p.status === "client" ? "won" : "open"
    };
    if (ids.pd_deal) await pipe(token, `/deals/${ids.pd_deal}`, "PUT", {
      status: body.status,
      value: body.value
    });
    else {
      let r = await pipe(token, "/deals", "POST", body);
      r.data?.success && (ids.pd_deal = String(r.data.data.id));
    }
  }
  if (p.status === "repondu" && ids.pd_person && !ids.pd_note) {
    let r = await pipe(token, "/notes", "POST", {
      content: `A répondu à la prospection Kairo (${p.activity}, ${p.city}).`,
      person_id: Number(ids.pd_person),
      org_id: ids.pd_org ? Number(ids.pd_org) : void 0
    });
    r.data?.success && (ids.pd_note = String(r.data.data.id));
  }
  return ids;
}
async function syncCrm(ws, max = 25) {
  if (!ws.integrations?.hubspot?.ok && !ws.integrations?.pipedrive?.ok) return {
    synced: 0
  };
  let { data: sec } = await admin.from("workspace_secrets").select("hubspot_token, pipedrive_token").eq("workspace_id", ws.id).maybeSingle(), { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).in("status", SYNC_STATUSES).order("updated_at", {
    ascending: !1
  }).limit(300), todo = (data ?? []).filter((p)=>(p.crm_ids?.synced_status ?? "") !== p.status).slice(0, max), n = 0, errors = [];
  for (let p of todo){
    let ids = {
      ...p.crm_ids ?? {}
    };
    try {
      ws.integrations?.hubspot?.ok && sec?.hubspot_token && (ids = await pushHubspot(sec.hubspot_token, {
        ...p,
        crm_ids: ids
      })), ws.integrations?.pipedrive?.ok && sec?.pipedrive_token && (ids = await pushPipedrive(sec.pipedrive_token, {
        ...p,
        crm_ids: ids
      })), ids.synced_status = p.status, await admin.from("prospects").update({
        crm_ids: ids
      }).eq("id", p.id), n++;
    } catch (e) {
      errors.push(String(e.message).slice(0, 120));
    }
  }
  return n && await log(ws.id, "crm", `${n} fiche${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} au CRM`), {
    synced: n,
    errors: errors.slice(0, 3)
  };
}
async function calendarFeed(token) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Agenda introuvable");
  let { data: ws } = await admin.from("workspaces").select("id, name, profile").eq("calendar_token", token).maybeSingle();
  if (!ws) throw new HttpError(404, "Agenda introuvable");
  let since = new Date(Date.now() - 60 * 864e5).toISOString(), { data: ms } = await admin.from("meetings").select("id, starts_at, ends_at, contact_name, contact_email, contact_phone, company, notes, status, updated_at:created_at").eq("workspace_id", ws.id).gte("starts_at", since).order("starts_at").limit(500), f = (d)=>new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), c = (s)=>String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"), fold = (line)=>line.length <= 74 ? line : line.match(/.{1,73}/g).join(`\r
 `), lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kairo//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${c(`Kairo · ${ws.profile?.nom || ws.name}`)}`,
    "X-WR-TIMEZONE:Europe/Paris",
    "REFRESH-INTERVAL;VALUE=DURATION:PT30M"
  ];
  for (let m of ms ?? [])lines.push("BEGIN:VEVENT", `UID:${m.id}@kairo`, `DTSTAMP:${f(m.updated_at)}`, `DTSTART:${f(m.starts_at)}`, `DTEND:${f(m.ends_at)}`, fold(`SUMMARY:${c(`RDV ${m.company} · ${m.contact_name}`)}`), fold(`DESCRIPTION:${c([
    `Contact : ${m.contact_name} <${m.contact_email}>`,
    m.contact_phone && `Téléphone : ${m.contact_phone}`,
    m.notes && `Notes : ${m.notes}`
  ].filter(Boolean).join(`
`))}`), `STATUS:${m.status === "annule" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT");
  return lines.push("END:VCALENDAR"), lines.join(`\r
`);
}
async function stripe(path, params, method = "POST") {
  let key = env("STRIPE_SECRET_KEY");
  if (!key) throw new HttpError(503, "Le paiement en ligne n'est pas encore activé : contacte le support Kairo.");
  let body = params ? new URLSearchParams(params).toString() : void 0, r = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: method === "GET" ? void 0 : body
  }), data = await r.json().catch(()=>({}));
  if (!r.ok) throw new HttpError(502, "Paiement : " + (data?.error?.message ?? r.status));
  return data;
}
function plans() {
  return Object.entries(PLANS).filter(([k])=>![
      "essai",
      "fondateur"
    ].includes(k)).map(([key, p])=>({
      key,
      ...p
    }));
}
async function checkout(ws, userId, planKey) {
  await requireAdmin(ws.id, userId);
  let p = PLANS[planKey];
  if (!p || !p.price) throw new HttpError(400, "Formule inconnue");
  let customer = ws.stripe_customer;
  if (!customer) {
    let { data: u } = await admin.auth.admin.getUserById(userId);
    customer = (await stripe("/customers", {
      email: u?.user?.email ?? "",
      name: ws.legal_name || ws.profile?.nom || ws.name,
      "metadata[workspace_id]": ws.id,
      "preferred_locales[0]": "fr"
    })).id, await admin.from("workspaces").update({
      stripe_customer: customer
    }).eq("id", ws.id);
  }
  return ws.stripe_subscription && [
    "active",
    "trialing",
    "past_due"
  ].includes(ws.plan_status) ? await portal(ws, userId) : {
    url: (await stripe("/checkout/sessions", {
      mode: "subscription",
      customer,
      locale: "fr",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(p.price * 100),
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][price_data][product_data][name]": `Kairo ${p.label}`,
      "line_items[0][price_data][tax_behavior]": "exclusive",
      "metadata[workspace_id]": ws.id,
      "metadata[plan]": planKey,
      "subscription_data[metadata][workspace_id]": ws.id,
      "subscription_data[metadata][plan]": planKey,
      allow_promotion_codes: "true",
      billing_address_collection: "required",
      "tax_id_collection[enabled]": "true",
      "customer_update[name]": "auto",
      "customer_update[address]": "auto",
      success_url: `${APP(ws)}/#/abonnement?paiement=ok`,
      cancel_url: `${APP(ws)}/#/abonnement?paiement=annule`
    })).url
  };
}
async function portal(ws, userId) {
  if (await requireAdmin(ws.id, userId), !ws.stripe_customer) throw new HttpError(400, "Aucun abonnement pour l'instant");
  return {
    url: (await stripe("/billing_portal/sessions", {
      customer: ws.stripe_customer,
      return_url: `${APP(ws)}/#/abonnement`,
      locale: "fr"
    })).url
  };
}
async function verifyStripe(raw, header) {
  let secret2 = env("STRIPE_WEBHOOK_SECRET");
  if (!secret2) throw new HttpError(503, "Secret webhook Stripe manquant");
  let parts = Object.fromEntries(header.split(",").map((kv)=>kv.split("="))), t = Number(parts.t), sigs = header.split(",").filter((kv)=>kv.startsWith("v1=")).map((kv)=>kv.slice(3));
  if (!t || !sigs.length || Math.abs(Date.now() / 1e3 - t) > 300) throw new HttpError(400, "Signature Stripe invalide");
  let key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret2), {
    name: "HMAC",
    hash: "SHA-256"
  }, !1, [
    "sign"
  ]), hex = [
    ...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)))
  ].map((b)=>b.toString(16).padStart(2, "0")).join("");
  if (!sigs.includes(hex)) throw new HttpError(400, "Signature Stripe invalide");
}
async function stripeWebhook(req) {
  let raw = await req.text();
  await verifyStripe(raw, req.headers.get("stripe-signature") ?? "");
  let ev = JSON.parse(raw), o = ev.data?.object ?? {}, id = (o.metadata?.workspace_id ?? o.subscription_details?.metadata?.workspace_id ?? "") || await (async ()=>(await admin.from("workspaces").select("id").eq("stripe_customer", String(o.customer ?? "")).maybeSingle()).data?.id ?? "")();
  if (!id) return {
    skipped: "espace inconnu"
  };
  if (ev.type === "checkout.session.completed") await admin.from("workspaces").update({
    plan: o.metadata?.plan ?? "solo",
    plan_status: "active",
    stripe_subscription: String(o.subscription ?? ""),
    stripe_customer: String(o.customer ?? ""),
    trial_ends: null
  }).eq("id", id), await log(id, "abonnement", `Abonnement ${PLANS[o.metadata?.plan]?.label ?? ""} activé`);
  else if (ev.type.startsWith("customer.subscription.")) {
    let status = ev.type === "customer.subscription.deleted" ? "canceled" : String(o.status ?? "active"), end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end;
    await admin.from("workspaces").update({
      plan_status: status,
      ...o.metadata?.plan && status !== "canceled" ? {
        plan: o.metadata.plan
      } : {},
      stripe_subscription: String(o.id ?? ""),
      period_end: end ? new Date(end * 1e3).toISOString() : null
    }).eq("id", id), status === "canceled" && await log(id, "abonnement", "Abonnement arrêté");
  } else ev.type === "invoice.payment_failed" ? (await admin.from("workspaces").update({
    plan_status: "past_due"
  }).eq("id", id), await log(id, "abonnement", "Paiement refusé : carte à mettre à jour")) : ev.type === "invoice.paid" && await admin.from("workspaces").update({
    plan_status: "active"
  }).eq("id", id).neq("plan", "fondateur");
  return {
    ok: !0
  };
}
var APP, today, RAMP, MAILBOXES, SYNC_STATUSES, HS_STATUS, splitName, hostOf, init_growth = __esm({
  "_shared/growth.ts" () {
    init_http();
    init_core();
    APP = (ws)=>(ws.app_url || env("APP_URL", "https://kairo.maisonravita.fr")).replace(/\/$/, ""), today = ()=>new Date().toISOString().slice(0, 10), RAMP = [
      10,
      20,
      35,
      50
    ];
    MAILBOXES = {
      gmail: {
        label: "Gmail / Google Workspace",
        host: "smtp.gmail.com",
        port: 465,
        help: "Active la validation en 2 étapes, puis crée un mot de passe d'application sur myaccount.google.com/apppasswords."
      },
      ovh: {
        label: "OVH (MX Plan, Email Pro)",
        host: "ssl0.ovh.net",
        port: 465,
        help: "Utilise le mot de passe de ta boîte e-mail OVH."
      },
      ionos: {
        label: "IONOS",
        host: "smtp.ionos.fr",
        port: 465,
        help: "Utilise le mot de passe de ta boîte e-mail IONOS."
      },
      zoho: {
        label: "Zoho Mail",
        host: "smtp.zoho.eu",
        port: 465,
        help: "Crée un mot de passe d'application dans Zoho (Sécurité → Mots de passe d'application)."
      },
      autre: {
        label: "Autre (SMTP SSL)",
        host: "",
        port: 465,
        help: "Indique le serveur SMTP SSL de ton hébergeur (port 465)."
      }
    };
    SYNC_STATUSES = [
      "envoye",
      "repondu",
      "rdv",
      "client"
    ], HS_STATUS = {
      envoye: "ATTEMPTED_TO_CONTACT",
      repondu: "CONNECTED",
      rdv: "OPEN_DEAL",
      client: "OPEN_DEAL"
    }, splitName = (n)=>{
      let p = n.trim().split(/\s+/);
      return {
        first: p[0] ?? "",
        last: p.slice(1).join(" ")
      };
    }, hostOf = (u)=>{
      try {
        return new URL(u).hostname.replace(/^www\./, "");
      } catch  {
        return "";
      }
    };
  }
});
var mail_exports = {};
__export(mail_exports, {
  brand: ()=>brand,
  buildIcs: ()=>buildIcs,
  canSend: ()=>canSend,
  replyAddress: ()=>replyAddress,
  resend: ()=>resend,
  sendMail: ()=>sendMail,
  sendSystem: ()=>sendSystem,
  signature: ()=>signature,
  teamAddress: ()=>teamAddress
});
async function resend(path, method = "GET", body) {
  let key = env("RESEND_API_KEY");
  if (!key) throw new HttpError(500, "Clé RESEND_API_KEY manquante dans les secrets Supabase");
  let res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  }), data = await res.json().catch(()=>({}));
  return {
    ok: res.ok,
    status: res.status,
    data
  };
}
function brand(ws) {
  return ws.profile?.nom || ws.name || "Notre entreprise";
}
function signature(ws) {
  return ws.signature?.trim() || `${ws.sender_name}
${brand(ws)}`;
}
function replyAddress(ws, token) {
  if (!token) return ws.integrations?.mailbox?.ok ? ws.integrations.mailbox.email : ws.sender_email;
  if (ws.reply_status === "verified" && ws.reply_domain) return `r-${token}@${ws.reply_domain}`;
  let platform = PLATFORM_DOMAIN();
  return platform ? `r-${token}@${platform}` : ws.integrations?.mailbox?.ok ? ws.integrations.mailbox.email : ws.sender_email;
}
async function teamAddress(ws) {
  if (ws.integrations?.mailbox?.ok) return ws.integrations.mailbox.email;
  if (ws.sender_email) return ws.sender_email;
  let { data } = await admin.from("members").select("email").eq("workspace_id", ws.id).eq("role", "owner").limit(1).maybeSingle();
  return data?.email ?? "";
}
async function sendSystem(m) {
  let from = env("SYSTEM_FROM", `notifications@${PLATFORM_DOMAIN()}`), r = await resend("/emails", "POST", {
    from: `${m.fromName ?? "Kairo"} <${from}>`,
    to: [
      m.to
    ],
    reply_to: m.replyTo,
    subject: m.subject,
    text: m.text,
    attachments: m.ics ? [
      {
        filename: "invitation.ics",
        content: b64(m.ics),
        content_type: "text/calendar; method=REQUEST"
      }
    ] : void 0
  });
  if (!r.ok) throw new HttpError(502, "Notification : " + (r.data?.message ?? r.status));
  return {
    id: String(r.data?.id ?? "")
  };
}
function canSend(ws) {
  if (ws.integrations?.mailbox?.ok) {
    if (!ws.postal_address) throw new HttpError(400, "Ajoute l'adresse postale de l'entreprise dans Réglages (obligatoire en pied de mail)");
    return;
  }
  if (ws.integrations?.mailbox && !ws.integrations.mailbox.ok) throw new HttpError(400, "Ta boîte mail a été déconnectée (mot de passe changé ?) : reconnecte-la dans Réglages");
  if (ws.domain_status !== "verified") throw new HttpError(400, "Ton domaine d'envoi n'est pas encore vérifié (Réglages → Domaine)");
  if (!ws.sender_email.toLowerCase().endsWith("@" + ws.domain)) throw new HttpError(400, `L'adresse d'expédition doit se terminer par @${ws.domain}`);
  if (!ws.postal_address) throw new HttpError(400, "Ajoute l'adresse postale de l'entreprise dans Réglages (obligatoire en pied de mail)");
}
async function sendMail(ws, m) {
  let footer = m.prospecting ? `${brand(ws)}${ws.postal_address ? ` · ${ws.postal_address}` : ""}
Pour ne plus recevoir de messages de notre part, répondez simplement « STOP ».` : "", html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a">${m.text.split(/\n{2,}/).map((x)=>`<p style="margin:0 0 14px">${esc(x).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`).join("")}${footer ? `<p style="margin:28px 0 0;font-size:12px;color:#888">${esc(footer).replace(/\n/g, "<br>")}</p>` : ""}</div>`, text = footer ? `${m.text}

--
${footer}` : m.text;
  if (ws.integrations?.mailbox?.ok) return await smtpSend(ws, {
    from: `${m.fromName ?? ws.sender_name} <${ws.integrations.mailbox.email}>`,
    to: m.to,
    replyTo: m.replyTo ?? ws.integrations.mailbox.email,
    subject: m.subject,
    text,
    html,
    headers: m.prospecting ? {
      "List-Unsubscribe": `<mailto:${m.replyTo ?? ws.integrations.mailbox.email}?subject=STOP>`
    } : void 0,
    attachments: m.ics ? [
      {
        filename: "invitation.ics",
        content: m.ics,
        contentType: "text/calendar; method=REQUEST"
      }
    ] : void 0
  });
  let r = await resend("/emails", "POST", {
    from: `${m.fromName ?? ws.sender_name} <${ws.sender_email}>`,
    to: [
      m.to
    ],
    reply_to: m.replyTo ?? ws.sender_email,
    subject: m.subject,
    text,
    html,
    headers: m.prospecting ? {
      "List-Unsubscribe": `<mailto:${m.replyTo ?? ws.sender_email}?subject=STOP>`
    } : void 0,
    attachments: m.ics ? [
      {
        filename: "invitation.ics",
        content: b64(m.ics),
        content_type: "text/calendar; method=REQUEST"
      }
    ] : void 0
  });
  if (!r.ok) throw new HttpError(502, "Envoi : " + (r.data?.message ?? r.status));
  return {
    id: String(r.data?.id ?? "")
  };
}
function buildIcs(o) {
  let f = (d)=>d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""), c = (s)=>s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kairo//FR",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${o.uid}@kairo`,
    `DTSTAMP:${f(new Date)}`,
    `DTSTART:${f(o.start)}`,
    `DTEND:${f(o.end)}`,
    `SUMMARY:${c(o.summary)}`,
    `DESCRIPTION:${c(o.description)}`,
    `LOCATION:${c(o.location)}`,
    `ORGANIZER;CN=${c(o.organizerName)}:mailto:${o.organizerEmail}`,
    `ATTENDEE;CN=${c(o.attendeeName || o.attendeeEmail)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${o.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join(`\r
`);
}
var esc, b64, init_mail = __esm({
  "_shared/mail.ts" () {
    init_http();
    init_core();
    init_growth();
    esc = (s)=>s.replace(/[&<>"]/g, (c)=>({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;"
        })[c]), b64 = (s)=>btoa(unescape(encodeURIComponent(s)));
  }
});
function learned(ws) {
  let i = ws.intelligence;
  if (!i?.real) return "";
  let obj = (i.objections ?? []).filter((o)=>o.source === "réponses").slice(0, 3).map((o)=>`« ${o.objection} » → ${o.reponse}`), faq = (i.faq ?? []).filter((f)=>f.source === "réponses" && !/\[/.test(f.reponse)).slice(0, 3).map((f)=>`${f.question} → ${f.reponse}`);
  return !obj.length && !faq.length ? "" : `

Ce que les prospects disent le plus souvent (appris des vraies réponses) :${obj.length ? `
Objections : ${obj.join(" | ")}` : ""}${faq.length ? `
Questions : ${faq.join(" | ")}` : ""}
Utilise-le pour anticiper sans le citer mot pour mot.`;
}
var init_intelligence = __esm({
  "_shared/intelligence.ts" () {
    init_http();
    init_core();
  }
});
var campaigns_exports = {};
__export(campaigns_exports, {
  analyzeCampaign: ()=>analyzeCampaign,
  autoWinners: ()=>autoWinners,
  campaignOf: ()=>campaignOf,
  campaignStats: ()=>campaignStats,
  competitorAds: ()=>competitorAds,
  createCampaign: ()=>createCampaign,
  decideWinner: ()=>decideWinner,
  goalText: ()=>goalText,
  pickVariant: ()=>pickVariant,
  suggestVariants: ()=>suggestVariants,
  trackEvent: ()=>trackEvent
});
function hashId(s) {
  let h = 0;
  for (let c of s)h = h * 31 + c.charCodeAt(0) | 0;
  return Math.abs(h);
}
function pickVariant(c, prospectId) {
  let vs = (c.variants ?? []).filter((v)=>v.angle);
  return vs.length ? vs.find((v)=>v.key === c.winner) ?? vs[hashId(prospectId) % vs.length] : null;
}
async function campaignOf(id) {
  if (!id) return null;
  let { data } = await admin.from("campaigns").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}
function goalText(goal) {
  return GOALS[goal] ?? GOALS.rdv;
}
async function suggestVariants(ws, targetId, goal) {
  let t = (ws.targets ?? []).find((x)=>x.id === targetId);
  if (!t) throw new HttpError(400, "Choisis une cible");
  let pr = ws.profile ?? {}, r = await askJson(`Prépare un test A/B pour une campagne de prospection par e-mail.
Entreprise : ${pr.nom ?? ws.name} — ${pr.offre ?? ""} — ce qui la distingue : ${pr.differenciation ?? ""} — preuves : ${(pr.preuves ?? []).join(" ; ") || "aucune"}
Cible : ${t.label} (interlocuteur : ${t.interlocuteur ?? ""}, bénéficiaires : ${t.pour_qui ?? ""}). Pourquoi ils ont besoin de l'offre : ${t.pourquoi ?? ""}
Objectif : ${goalText(goal)}.
Propose 2 versions réellement différentes (pas deux formulations du même argument) : par exemple A = gain concret / B = risque évité, ou A = preuve / B = question.
Pour chacune : nom court, angle (2 phrases qui guideront la rédaction de chaque e-mail), objet d'e-mail (3 à 7 mots, sans majuscules partout, sans point d'exclamation). N'invente aucun fait.
Format : {"variants": [{"key": "A", "nom": "", "angle": "", "objet": ""}, {"key": "B", "nom": "", "angle": "", "objet": ""}], "conseil": "une phrase sur ce que ce test va t'apprendre"}`, {
    fast: !0,
    maxTokens: 2e3
  }), variants = (r.variants ?? []).slice(0, 3).map((v, i)=>({
      key: "ABC"[i],
      nom: String(v.nom ?? "").slice(0, 60),
      angle: String(v.angle ?? "").slice(0, 500),
      objet: String(v.objet ?? "").slice(0, 120)
    })).filter((v)=>v.angle);
  if (!variants.length) throw new HttpError(502, "L'IA n'a pas proposé de versions, réessaie");
  return {
    variants,
    conseil: String(r.conseil ?? "")
  };
}
async function createCampaign(ws, b) {
  let name = String(b.name ?? "").trim().slice(0, 100), target = String(b.target_id ?? "");
  if (!name) throw new HttpError(400, "Donne un nom à la campagne");
  if (!(ws.targets ?? []).some((t)=>t.id === target)) throw new HttpError(400, "Choisis une cible");
  let variants = (Array.isArray(b.variants) ? b.variants : []).slice(0, 3).map((v, i)=>({
      key: "ABC"[i],
      nom: String(v.nom ?? "").slice(0, 60),
      angle: String(v.angle ?? "").slice(0, 500),
      objet: String(v.objet ?? "").slice(0, 120)
    })).filter((v)=>v.angle), goal = GOALS[String(b.goal)] ? String(b.goal) : "rdv", ends = /^\d{4}-\d{2}-\d{2}$/.test(String(b.ends_on ?? "")) ? String(b.ends_on) : null, { data: c, error } = await admin.from("campaigns").insert({
    workspace_id: ws.id,
    name,
    target_id: target,
    goal,
    variants,
    followups: b.followups !== !1,
    ends_on: ends
  }).select("*").single();
  if (error) throw new HttpError(500, error.message);
  let n = Math.min(Math.max(Number(b.count) || 50, 1), 500), { data: ps } = await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("target", target).is("campaign_id", null).in("status", [
    "pret",
    "nouveau",
    "sans_email"
  ]).order("score", {
    ascending: !1,
    nullsFirst: !1
  }).limit(n), ids = (ps ?? []).map((x)=>x.id);
  for(let i = 0; i < ids.length; i += 200)await admin.from("prospects").update({
    campaign_id: c.id
  }).in("id", ids.slice(i, i + 200));
  return await log(ws.id, "campagne", `Campagne « ${name} » lancée : ${ids.length} prospects, ${variants.length > 1 ? `test A/B sur ${variants.length} versions` : "une version"}`), {
    id: c.id,
    assigned: ids.length
  };
}
async function campaignStats(campaignId) {
  let { data } = await admin.from("messages").select("prospect_id, variant, status, opened_at, clicked_at, bounced, prospects(status)").eq("campaign_id", campaignId).eq("status", "envoye").limit(5e3), per = new Map;
  for (let m of data ?? []){
    let cur = per.get(m.prospect_id) ?? {
      v: m.variant || "A",
      opened: !1,
      clicked: !1,
      bounced: !1,
      st: m.prospects?.status ?? ""
    };
    cur.opened ||= !!m.opened_at, cur.clicked ||= !!m.clicked_at, cur.bounced ||= !!m.bounced, per.set(m.prospect_id, cur);
  }
  let by = {};
  for (let x of per.values()){
    let s = by[x.v] ??= {
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      replied: 0,
      rdv: 0,
      clients: 0
    };
    s.sent++, x.opened && s.opened++, x.clicked && s.clicked++, x.bounced && s.bounced++, [
      "repondu",
      "rdv",
      "client",
      "refus"
    ].includes(x.st) && s.replied++, [
      "rdv",
      "client"
    ].includes(x.st) && s.rdv++, x.st === "client" && s.clients++;
  }
  return by;
}
function decideWinner(stats, min = 25) {
  let ks = Object.keys(stats).filter((k)=>stats[k].sent >= min);
  if (ks.length < 2) return null;
  let rate = (k)=>stats[k].replied / stats[k].sent;
  ks.sort((a2, b2)=>rate(b2) - rate(a2));
  let [a, b] = ks, n1 = stats[a].sent, n2 = stats[b].sent, p1 = rate(a), p2 = rate(b), p = (p1 * n1 + p2 * n2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)) || 1;
  return (p1 - p2) / se > 1.65 ? a : null;
}
async function analyzeCampaign(ws, id) {
  let c = await campaignOf(id);
  if (!c || c.workspace_id !== ws.id) throw new HttpError(404, "Campagne introuvable");
  let stats = await campaignStats(id), winner = c.winner ?? decideWinner(stats), t = (ws.targets ?? []).find((x)=>x.id === c.target_id), total = Object.values(stats).reduce((s, v)=>s + v.sent, 0), analysis;
  return total < 5 ? analysis = {
    verdict: "Pas encore assez d'envois pour juger : il faut au moins une vingtaine d'e-mails par version.",
    ce_qui_marche: [],
    a_changer: [],
    prochaine_etape: "Laisse tourner la campagne et valide les messages en attente."
  } : analysis = await askJson(`Analyse cette campagne de prospection B2B comme un directeur commercial.
Campagne : ${c.name} — cible : ${t?.label ?? ""} — objectif : ${goalText(c.goal)}
Versions : ${JSON.stringify(c.variants)}
Résultats par version (envoyés, ouverts, cliqués, rebonds, réponses, RDV, clients) : ${JSON.stringify(stats)}
${winner ? `Version gagnante statistiquement : ${winner}.` : "Aucune version n'est encore gagnante de façon fiable."}
Repères : en prospection à froid B2B, 2 à 8 % de réponses est courant ; les ouvertures sont peu fiables (bloqueurs d'images, Apple) : fie-toi d'abord aux réponses et aux RDV.
Sois honnête sur la taille de l'échantillon. Ne conclus pas sur moins de 25 envois par version.
Format : {"verdict": "2 phrases", "ce_qui_marche": [""], "a_changer": [""], "prochaine_etape": "une action concrète", "nouvelle_version": {"nom": "", "angle": "", "objet": ""}}`, {
    fast: !0,
    maxTokens: 2e3
  }), await admin.from("campaigns").update({
    analysis,
    analyzed_at: new Date().toISOString(),
    winner
  }).eq("id", id), {
    stats,
    winner,
    analysis
  };
}
async function autoWinners(ws) {
  let { data } = await admin.from("campaigns").select("*").eq("workspace_id", ws.id).eq("status", "active").is("winner", null), n = 0;
  for (let c of data ?? []){
    if ((c.variants ?? []).length < 2) continue;
    let w = decideWinner(await campaignStats(c.id));
    w && (await admin.from("campaigns").update({
      winner: w
    }).eq("id", c.id), await log(ws.id, "campagne", `« ${c.name} » : la version ${w} gagne, elle est maintenant envoyée à tous`), n++);
  }
  return n;
}
async function trackEvent(type, d) {
  let id = String(d.email_id ?? d.id ?? "");
  if (!id) return {
    skipped: "sans id"
  };
  let { data: m } = await admin.from("messages").select("id, opens, clicks, opened_at, clicked_at, prospect_id, workspace_id").eq("provider_id", id).maybeSingle();
  if (!m) return {
    skipped: "message inconnu"
  };
  let now = new Date().toISOString();
  return type === "email.opened" && await admin.from("messages").update({
    opens: (m.opens ?? 0) + 1,
    opened_at: m.opened_at ?? now
  }).eq("id", m.id), type === "email.clicked" && await admin.from("messages").update({
    clicks: (m.clicks ?? 0) + 1,
    clicked_at: m.clicked_at ?? now,
    opened_at: m.opened_at ?? now
  }).eq("id", m.id), type === "email.bounced" && (await admin.from("messages").update({
    bounced: !0
  }).eq("id", m.id), await admin.from("prospects").update({
    email: "",
    status: "sans_email",
    channel: "",
    enrich_level: 1,
    enrich_note: "L'adresse e-mail n'existe plus (rebond) : nouvelle enquête nécessaire"
  }).eq("id", m.prospect_id), await admin.from("messages").update({
    status: "ignore",
    error: "Adresse en rebond"
  }).eq("prospect_id", m.prospect_id).eq("status", "brouillon"), await log(m.workspace_id, "envoi", "Adresse en rebond retirée, le prospect repart en enquête")), type === "email.complained" && (await admin.from("prospects").update({
    status: "refus",
    next_action_at: null,
    next_action: ""
  }).eq("id", m.prospect_id), await admin.from("messages").update({
    status: "ignore",
    error: "Signalé comme indésirable"
  }).eq("prospect_id", m.prospect_id).eq("status", "brouillon")), {
    ok: !0,
    type
  };
}
async function competitorAds(ws, id) {
  let { data: c } = await admin.from("competitors").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  let host = (()=>{
    try {
      return new URL(c.url).hostname.replace(/^www\./, "");
    } catch  {
      return c.url;
    }
  })(), nom = c.name || c.summary?.nom || host, me = ws.profile ?? {}, a = await askJson(`Tu es analyste en veille marketing. Trouve les campagnes publicitaires et marketing actuelles de ce concurrent en France, puis analyse-les pour ${me.nom ?? ws.name} (${me.offre ?? ""}).
Concurrent : ${nom} (${c.url})

Cherche (6 recherches maximum) :
1. Ses publicités actives ou récentes : Bibliothèque publicitaire Meta (Facebook / Instagram), bibliothèque d'annonces LinkedIn, Centre de transparence des annonces Google. Cite le message, l'offre, le format et depuis quand.
2. Ses autres actions marketing des 6 derniers mois : promotions et offres de lancement, salons et événements, webinaires, livres blancs, newsletters, partenariats, campagnes presse ou radio, sponsoring.
Les bibliothèques publicitaires sont souvent mal indexées par les moteurs de recherche : si tu ne trouves rien, dis-le simplement et donne le lien direct de recherche pour que l'utilisateur vérifie lui-même.

Règles : n'invente aucune publicité, aucun budget, aucun chiffre. Les budgets et résultats ne sont pas publics : ne les estime pas. Chaque élément porte sa source.
Format :
{"pubs": [{"plateforme": "meta|linkedin|google|autre", "message": "", "offre": "", "format": "image|vidéo|carrousel|texte", "cible": "ce qu'on peut déduire du message", "depuis": "", "source": ""}],
 "actions": [{"type": "promotion|salon|webinaire|contenu|newsletter|partenariat|presse|autre", "titre": "", "date": "", "source": ""}],
 "liens_verification": [{"plateforme": "", "url": ""}],
 "angles": ["les arguments qu'ils martèlent"],
 "ce_qu_ils_poussent": "l'offre ou le segment qu'ils mettent en avant en ce moment",
 "angles_libres": ["les angles que personne n'occupe et que tu peux prendre"],
 "contre_campagne": {"angle": "", "objet_email": "", "accroche": ""},
 "recommandations": [""],
 "synthese": "3 phrases"}`, {
    maxTokens: 9e3,
    tools: CWEB(6),
    system: "Tu es analyste senior en veille marketing B2B. Tu cites tes sources et tu n'inventes rien. Réponds en français."
  });
  if (!a || typeof a != "object" || !a.synthese && !a.pubs && !a.actions) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  let encoded = encodeURIComponent(nom), fallback = [
    {
      plateforme: "Meta (Facebook, Instagram)",
      url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=FR&q=${encoded}`
    },
    {
      plateforme: "LinkedIn",
      url: `https://www.linkedin.com/ad-library/search?keyword=${encoded}`
    },
    {
      plateforme: "Google",
      url: `https://adstransparency.google.com/?region=FR&domain=${encodeURIComponent(host)}`
    }
  ];
  a.liens_verification = fallback;
  let now = new Date().toISOString();
  return await admin.from("competitors").update({
    ads: a,
    ads_at: now
  }).eq("id", c.id), await log(ws.id, "veille", `${nom} : campagnes analysées`), {
    ads: a,
    at: now
  };
}
var GOALS, CWEB, init_campaigns = __esm({
  "_shared/campaigns.ts" () {
    init_http();
    init_core();
    GOALS = {
      rdv: "obtenir un rendez-vous de 15 à 20 minutes",
      devis: "obtenir une demande de devis",
      visite: "obtenir une visite sur place",
      essai: "obtenir un essai ou une démonstration"
    }, CWEB = (n)=>[
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: n,
          user_location: {
            type: "approximate",
            country: "FR",
            timezone: "Europe/Paris"
          }
        }
      ];
  }
});
var agents_exports = {};
__export(agents_exports, {
  checkDomain: ()=>checkDomain,
  draft: ()=>draft,
  enrich: ()=>enrich,
  followups: ()=>followups,
  linkedin: ()=>linkedin,
  sendOne: ()=>sendOne,
  setDomain: ()=>setDomain,
  systemFor: ()=>systemFor
});
async function enrich(p, interlocuteur) {
  let fiche = [
    `Nom : ${p.name}`,
    p.org && `Raison sociale : ${p.org}`,
    p.activity && `Activité : ${p.activity}`,
    `Adresse : ${[
      p.address,
      p.postal_code,
      p.city
    ].filter(Boolean).join(" ")}`,
    p.siret && `SIRET : ${p.siret}`,
    p.contact_name && `Dirigeant connu : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}`,
    p.website && `Site connu : ${p.website}`,
    interlocuteur && `Interlocuteur recherché : ${interlocuteur}`
  ].filter(Boolean).join(`
`), v = await askJson(`Trouve les coordonnées professionnelles publiques de cet établissement :
${fiche}

Cherche son site officiel, puis une adresse e-mail professionnelle publiée, un numéro de téléphone et, si publié, le nom de la personne qui occupe la fonction recherchée.
Format : {"site": "https://…", "email": "", "telephone": "", "contact": "Prénom Nom ou vide", "fonction": "", "source": "URL où l'e-mail est publié", "note": "une phrase"}`, {
    fast: !0,
    maxTokens: 6e3,
    system: SYSTEM_ENQ,
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 4,
        user_location: {
          type: "approximate",
          country: "FR",
          timezone: "Europe/Paris"
        }
      }
    ]
  }), email = String(v.email ?? "").trim().toLowerCase().replace(/^mailto:/, ""), ok = EMAIL_RE.test(email) && !BAD.test(email) ? email : "", site = /^https?:\/\//i.test(String(v.site ?? "")) ? String(v.site).trim().slice(0, 300) : "", phone = String(v.telephone ?? "").replace(/[^\d+ .]/g, "").trim().slice(0, 30), patch = {
    enriched_at: new Date().toISOString(),
    enrich_note: [
      ok ? `E-mail trouvé${v.source ? ` sur ${String(v.source).slice(0, 200)}` : ""}` : "Aucun e-mail public trouvé",
      v.note ? String(v.note).slice(0, 300) : ""
    ].filter(Boolean).join(" · "),
    status: ok ? "pret" : "sans_email",
    enrich_level: 1,
    channel: ok ? "email" : phone || p.phone ? "telephone" : "",
    email_source: ok ? String(v.source ?? "recherche web").slice(0, 200) : ""
  };
  ok && (patch.email = ok), site && !p.website && (patch.website = site), phone && !p.phone && (patch.phone = phone);
  let contact = String(v.contact ?? "").trim();
  return ok && contact && contact.length < 60 && /\s/.test(contact) && (patch.contact_name = contact, patch.contact_role = String(v.fonction ?? "").slice(0, 80)), await admin.from("prospects").update(patch).eq("id", p.id), {
    id: p.id,
    email: ok,
    phone,
    site
  };
}
function systemFor(ws) {
  let pr = ws.profile ?? {};
  return `Tu écris des e-mails de prospection B2B au nom de ${ws.sender_name || "l'équipe"} de ${pr.nom || ws.name}.
Entreprise : ${pr.resume ?? ""}
Offre : ${pr.offre ?? ""}
Ce qui la distingue : ${pr.differenciation ?? ""}
Faits vérifiables utilisables : ${(pr.preuves ?? []).join(" ; ") || "aucun"}
Ton de la marque : ${pr.ton || "professionnel et sobre"}${knowledgeOf(ws) ? `

Fiche de l'entreprise (informations exactes, à utiliser pour répondre aux questions précises ; rien d'autre) :
${knowledgeOf(ws)}` : ""}

Règles absolues :
- Français, vouvoiement, ton professionnel et direct, phrases courtes, aucun jargon marketing, aucun superlatif.
- 70 à 110 mots. Pas de liste à puces. Pas d'emoji.
- N'invente rien : aucun client, chiffre, label, prix, délai ou fait qui ne figure pas dans les informations fournies.
- Dans un premier e-mail, ne parle jamais de prix. Dans une réponse à une question, tu peux citer un prix ou un délai seulement s'il figure dans la fiche.
- Parle du bénéfice pour les personnes concernées chez le prospect (par exemple ses clients, salariés, résidents, patients).
- Un seul objectif : obtenir un court échange (15 à 20 minutes). Une seule question claire à la fin.
- Pas de formule creuse (« j'espère que vous allez bien », « je me permets de… » en ouverture).${learned(ws)}`;
}
async function draft(ws, p) {
  let t = (ws.targets ?? []).find((x)=>x.id === p.target), camp = await campaignOf(p.campaign_id), active = camp && camp.status === "active" ? camp : null, v = active ? pickVariant(active, p.id) : null, out = await ask(`Rédige le premier e-mail de prospection pour ce prospect.
Prospect : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${p.city}.
Interlocuteur : ${p.contact_name ? `${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}` : `inconnu (fonction visée : ${t?.interlocuteur || "dirigeant"})`}.
Pourquoi cette cible a besoin de l'offre : ${t?.pourquoi ?? ""}
Angle à utiliser : ${v ? v.angle : t?.angle ?? ""}
${v?.objet ? `Objet à utiliser tel quel ou presque : ${v.objet}
` : ""}${active ? `Objectif de l'e-mail : ${goalText(active.goal)}.
` : ""}Bénéficiaires à nommer : ${t?.pour_qui ?? ""}
${p.insight?.reseaux?.accroche ? `Première phrase possible, fondée sur une publication ou une actualité réelle du prospect (à reprendre ou adapter si elle sonne naturelle, sinon ignore-la) : ${p.insight.reseaux.accroche}
` : ""}
Commence par « Bonjour${p.contact_name ? " Madame/Monsieur <Nom>" : ""}, » (si l'interlocuteur est connu mais que le genre est incertain, écris « Bonjour <Prénom Nom>, »).
Ne mets pas de signature : elle est ajoutée automatiquement.

Format exact :
OBJET: <objet de 3 à 7 mots, sans majuscules partout, sans point d'exclamation>
---
<corps>`, {
    fast: !0,
    system: systemFor(ws),
    maxTokens: 1500
  }), m = out.match(/OBJET\s*:\s*(.+)\n-{3,}\n([\s\S]+)/), subject = (m ? m[1] : `${ws.profile?.nom || ws.name} – ${p.name}`).trim().slice(0, 140), body = (m ? m[2] : out).trim(), { data, error } = await admin.from("messages").insert({
    workspace_id: ws.id,
    prospect_id: p.id,
    step: 0,
    subject,
    body,
    status: "brouillon",
    campaign_id: active?.id ?? null,
    variant: v?.key ?? ""
  }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "Un message est déjà prêt pour ce prospect");
  if (error) throw new HttpError(500, error.message);
  return await admin.from("prospects").update({
    status: "a_valider"
  }).eq("id", p.id), {
    id: data.id,
    subject
  };
}
async function txt(name) {
  try {
    return ((await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`)).json()).Answer ?? []).map((a)=>String(a.data).replace(/^"|"$/g, "").replace(/" "/g, ""));
  } catch  {
    return [];
  }
}
async function setDomain(ws, input) {
  let domain = String(input ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) throw new HttpError(400, "Nom de domaine invalide (ex. monentreprise.fr)");
  if (/(gmail|outlook|hotmail|yahoo|icloud|orange|free|sfr|laposte|wanadoo)\./.test(domain)) throw new HttpError(400, "Il faut un domaine qui t'appartient (pas une messagerie gratuite)");
  let { data: taken } = await admin.from("workspaces").select("id").eq("domain", domain).neq("id", ws.id).limit(1);
  if (taken?.length) throw new HttpError(409, "Ce domaine est déjà utilisé par un autre espace");
  let r = await resend("/domains", "POST", {
    name: domain,
    region: "eu-west-1"
  }), preexisting = !1;
  if (!r.ok) {
    let found = ((await resend("/domains")).data?.data ?? []).find((d)=>d.name === domain);
    if (!found) throw new HttpError(502, "Service d'envoi : " + (r.data?.message ?? "erreur"));
    r = await resend(`/domains/${found.id}`), preexisting = !0;
  }
  let records = (r.data?.records ?? []).map((x)=>({
      record: x.record,
      name: x.name,
      type: x.type,
      value: x.value,
      priority: x.priority,
      status: x.status
    }));
  return preexisting && records.unshift({
    record: "Propriété",
    name: `_machine.${domain}`,
    type: "TXT",
    value: `machine-verif=${ws.id}`,
    status: "not_started"
  }), await admin.from("workspaces").update({
    domain,
    domain_id: r.data.id,
    domain_status: "pending",
    domain_records: records
  }).eq("id", ws.id), {
    domain,
    records,
    status: "pending"
  };
}
async function checkDomain(ws) {
  if (!ws.domain_id) throw new HttpError(400, "Aucun domaine configuré");
  let records = ws.domain_records ?? [], proof = records.find((x)=>x.record === "Propriété"), proofOk = !0;
  proof && (proofOk = (await txt(proof.name)).includes(proof.value), proof.status = proofOk ? "verified" : "pending"), await resend(`/domains/${ws.domain_id}/verify`, "POST");
  let r = await resend(`/domains/${ws.domain_id}`), fresh = (r.data?.records ?? []).map((x)=>({
      record: x.record,
      name: x.name,
      type: x.type,
      value: x.value,
      priority: x.priority,
      status: x.status
    }));
  fresh.length && (records = proof ? [
    proof,
    ...fresh
  ] : fresh);
  let sending = r.data?.capabilities?.sending ?? r.data?.status, status = proofOk && r.data?.status === "verified" ? "verified" : r.data?.status === "failed" ? "failed" : "pending";
  return await admin.from("workspaces").update({
    domain_status: status,
    domain_records: records
  }).eq("id", ws.id), status === "verified" && ws.domain_status !== "verified" && await resend(`/domains/${ws.domain_id}`, "PATCH", {
    open_tracking: !0,
    click_tracking: !0
  }).catch(()=>null), {
    status,
    records
  };
}
async function sendOne(ws, messageId) {
  let { data: msg } = await admin.from("messages").select("*, prospects(*)").eq("id", messageId).eq("workspace_id", ws.id).single();
  if (!msg) throw new HttpError(404, "Message introuvable");
  if (msg.status !== "brouillon") return {
    id: messageId,
    skipped: msg.status === "envoi" ? "envoi déjà en cours" : "déjà traité"
  };
  if (msg.campaign_id) {
    let c = await campaignOf(msg.campaign_id);
    if (c && c.status !== "active") return {
      id: messageId,
      skipped: "campagne en pause"
    };
  }
  let p = msg.prospects;
  if (!p?.email) throw new HttpError(400, "Ce prospect n'a pas d'e-mail");
  if ([
    "repondu",
    "rdv",
    "client",
    "refus",
    "ignore"
  ].includes(p.status) && msg.step > 0) return await admin.from("messages").update({
    status: "ignore",
    error: "Le prospect a déjà répondu"
  }).eq("id", messageId), {
    id: messageId,
    skipped: "il a déjà répondu"
  };
  if ((await admin.from("prospects").select("id").eq("workspace_id", ws.id).eq("email", p.email).eq("status", "refus").limit(1)).data?.length) return await admin.from("messages").update({
    status: "ignore",
    error: "Contact désinscrit"
  }).eq("id", messageId), {
    id: messageId,
    skipped: "désinscrit"
  };
  let { data: claimed } = await admin.from("messages").update({
    status: "envoi",
    claimed_at: new Date().toISOString()
  }).eq("id", messageId).eq("status", "brouillon").select("id");
  if (!claimed?.length) return {
    id: messageId,
    skipped: "envoi déjà en cours"
  };
  try {
    let link = ws.app_url && ws.booking_slug && msg.step < 2 ? `${ws.app_url.replace(/\/$/, "")}/#/rdv/${ws.booking_slug}?t=${p.public_token}` : "", body = `${msg.body.trim()}${link ? `

Si c'est plus simple, vous pouvez choisir directement un créneau ici : ${link}` : ""}

${signature(ws)}`, r = await sendMail(ws, {
      to: p.email,
      subject: msg.subject,
      text: body,
      replyTo: replyAddress(ws, p.public_token),
      prospecting: !0
    });
    return await admin.from("messages").update({
      status: "envoye",
      sent_at: new Date().toISOString(),
      provider_id: r.id,
      sent_via: ws.integrations?.mailbox?.ok ? ws.integrations.mailbox.email : "domaine"
    }).eq("id", messageId), await markWarmup(ws), [
      "pret",
      "a_valider",
      "envoye",
      "nouveau",
      "sans_email"
    ].includes(p.status) && await admin.from("prospects").update({
      status: "envoye"
    }).eq("id", p.id), {
      id: messageId,
      sent: !0
    };
  } catch (e) {
    return await admin.from("messages").update({
      status: "echec",
      error: String(e.message).slice(0, 300)
    }).eq("id", messageId), {
      id: messageId,
      error: e.message
    };
  }
}
async function linkedin(ws, p) {
  let t = (ws.targets ?? []).find((x)=>x.id === p.target), v = await askJson(`Trouve sur le web le profil LinkedIn public du décideur à contacter dans cet établissement, puis prépare une invitation et un message.
Établissement : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${[
    p.postal_code,
    p.city
  ].filter(Boolean).join(" ")}.
${p.contact_name ? `Dirigeant connu : ${p.contact_name}${p.contact_role ? ` (${p.contact_role})` : ""}.` : ""}
Fonction visée : ${t?.interlocuteur || "dirigeant"}.
Notre offre : ${ws.profile?.offre ?? ""}
Angle : ${t?.angle ?? ""} (bénéficiaires : ${t?.pour_qui ?? ""})

Règles : ne donne une URL que si tu l'as trouvée dans les résultats (format linkedin.com/in/…) et si la personne travaille bien dans cet établissement ou son organisme. Sinon laisse "url" vide.
- "note" : note d'invitation, 250 caractères maximum, sans vendre, qui donne une raison crédible de se connecter.
- "message" : message après acceptation, 60 à 90 mots, vouvoiement, une seule question à la fin pour proposer un échange de 15 minutes. N'invente aucun fait.
Format : {"url": "", "personne": "", "fonction": "", "note": "", "message": ""}`, {
    fast: !0,
    maxTokens: 6e3,
    system: systemFor(ws),
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
        user_location: {
          type: "approximate",
          country: "FR",
          timezone: "Europe/Paris"
        }
      }
    ]
  }), url = String(v.url ?? "").trim(), ok = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/?#]+/i.test(url), patch = {
    linkedin_url: ok ? url.replace(/[?#].*$/, "").slice(0, 200) : "",
    linkedin_person: ok ? `${String(v.personne ?? "").slice(0, 60)}${v.fonction ? ` · ${String(v.fonction).slice(0, 60)}` : ""}` : "",
    linkedin_note: String(v.note ?? "").slice(0, 300),
    linkedin_msg: String(v.message ?? "").slice(0, 1200),
    linkedin_status: ok ? "a_envoyer" : "introuvable"
  };
  return await admin.from("prospects").update(patch).eq("id", p.id), {
    id: p.id,
    ...patch
  };
}
async function followups(ws) {
  let { data: sent } = await admin.from("messages").select("id, prospect_id, step, subject, body, sent_at, campaign_id, variant, prospects!inner(status)").eq("workspace_id", ws.id).eq("status", "envoye").eq("prospects.status", "envoye").order("sent_at", {
    ascending: !1
  }).limit(500), last = new Map;
  for (let m of sent ?? []){
    let cur = last.get(m.prospect_id);
    (!cur || m.step > cur.step) && last.set(m.prospect_id, {
      step: m.step,
      subject: m.subject,
      body: m.body,
      sent_at: m.sent_at,
      first: cur?.first ?? m.subject,
      campaign_id: m.campaign_id ?? null,
      variant: m.variant ?? ""
    });
  }
  let { data: noFollow } = await admin.from("campaigns").select("id").eq("workspace_id", ws.id).or("followups.eq.false,status.neq.active"), skipCamp = new Set((noFollow ?? []).map((x)=>x.id)), { data: pending } = await admin.from("messages").select("prospect_id").eq("workspace_id", ws.id).eq("status", "brouillon"), busy = new Set((pending ?? []).map((x)=>x.prospect_id)), rows = [], firstSent = new Map;
  for (let m of sent ?? [])m.step === 0 && firstSent.set(m.prospect_id, m.sent_at);
  for (let [pid, m] of last){
    if (busy.has(pid) || m.step >= FOLLOW.length || m.campaign_id && skipCamp.has(m.campaign_id)) continue;
    let f = FOLLOW[m.step], start = new Date(firstSent.get(pid) ?? m.sent_at).getTime();
    if (Date.now() - start < f.after * 864e5) continue;
    let hello = (m.body.split(`
`)[0] || "Bonjour,").slice(0, 80);
    rows.push({
      workspace_id: ws.id,
      prospect_id: pid,
      step: m.step + 1,
      subject: f.subject(m.subject),
      body: f.body(hello),
      status: "brouillon",
      campaign_id: m.campaign_id,
      variant: m.variant
    });
  }
  let created = 0;
  for (let row of rows){
    let { error } = await admin.from("messages").insert(row);
    error || created++;
  }
  return rows.length = created, {
    created: rows.length
  };
}
var SYSTEM_ENQ, EMAIL_RE, BAD, FOLLOW, init_agents = __esm({
  "_shared/agents.ts" () {
    init_intelligence();
    init_http();
    init_core();
    init_mail();
    init_growth();
    init_campaigns();
    SYSTEM_ENQ = `Tu es un assistant de recherche commerciale B2B en France. Tu cherches sur le web les coordonnées professionnelles publiques d'un établissement.
Règles strictes :
- Ne donne une adresse e-mail que si tu l'as vue publiée (site officiel de l'établissement ou de son gestionnaire, annuaire officiel, page de contact). Ne construis jamais une adresse à partir d'un nom.
- Préfère l'adresse d'un responsable publiée pour sa fonction, sinon une adresse générique de l'établissement (contact@, accueil@, direction@…).
- Si tu n'es pas sûr qu'une coordonnée appartient bien à cet établissement, laisse le champ vide.`, EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, BAD = /(example\.|sentry\.|wixpress|domain\.com|email\.com|votre|yourdomain|^(rgpd|dpo|privacy|noreply|no-reply|webmaster|recrutement|jobs|rh)@)/i;
    FOLLOW = [
      {
        after: 4,
        subject: (s)=>`Re : ${s.replace(/^re\s*:\s*/i, "")}`,
        body: (hello)=>`${hello}

Je reviens vers vous au sujet de mon message de la semaine dernière. Auriez-vous 15 minutes dans les prochains jours pour en parler ? Je m'adapte à votre agenda.`
      },
      {
        after: 9,
        subject: (s)=>`Re : ${s.replace(/^re\s*:\s*/i, "")}`,
        body: (hello)=>`${hello}

Je ne voudrais pas encombrer votre boîte : c'est mon dernier message sur ce sujet. Si ce n'est pas vous qui gérez cette question, pourriez-vous m'indiquer la bonne personne ? Merci d'avance.`
      }
    ];
  }
});
var deep_exports = {};
__export(deep_exports, {
  assertKind: ()=>assertKind,
  chooseChannel: ()=>chooseChannel,
  credits: ()=>credits,
  deepEnrich: ()=>deepEnrich,
  dropcontactPending: ()=>dropcontactPending,
  letter: ()=>letter,
  siteContacts: ()=>siteContacts
});
function decode(html) {
  return html.replace(/\s*(?:&#64;|&#x40;|\[at\]|\(at\)|arobase)\s*/gi, "@").replace(/&#46;|\[dot\]|\(dot\)/gi, ".").replace(/%40/g, "@");
}
async function siteContacts(site) {
  let origin = (()=>{
    try {
      return new URL(site).origin;
    } catch  {
      return "";
    }
  })();
  if (!origin) return {
    emails: [],
    phones: [],
    form: ""
  };
  let home = await fetchHtml(origin), links = [
    ...home.slice(0, 2e5).matchAll(/href=["']([^"'#]{1,200})["']/gi)
  ].map((m)=>m[1]).map((h)=>{
    try {
      return new URL(h, origin).href;
    } catch  {
      return "";
    }
  }).filter((h)=>h.startsWith(origin) && /(contact|mentions|legal|cgv|cgu|a-propos|qui-sommes|equipe|direction|informations)/i.test(h)), guesses = [
    "/contact",
    "/nous-contacter",
    "/contactez-nous",
    "/mentions-legales"
  ].map((p)=>origin + p), pages = [
    ...new Set([
      ...links,
      ...guesses
    ])
  ].slice(0, 5), htmls = await Promise.all(pages.map((u)=>fetchHtml(u))), all = [
    home,
    ...htmls
  ], emails = new Set, phones = new Set, form = "";
  return all.forEach((h, i)=>{
    let d = decode(h);
    for (let m of d.match(EMAIL_IN) ?? []){
      let e = m.toLowerCase().replace(/^mailto:/, "");
      EMAIL_RE2.test(e) && !BAD2.test(e) && emails.add(e);
    }
    for (let m of d.replace(/<[^>]{0,500}>/g, " ").match(PHONE_RE) ?? [])phones.add(m.replace(/[\s.-]/g, " ").trim());
    !form && i > 0 && /<form[\s\S]{0,6000}?<textarea/i.test(h) && (form = pages[i - 1]);
  }), {
    emails: [
      ...emails
    ],
    phones: [
      ...phones
    ].slice(0, 3),
    form
  };
}
async function mxOk(domain) {
  try {
    return ((await (await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`)).json()).Answer ?? []).length > 0;
  } catch  {
    return !1;
  }
}
async function sourceHas(url, email) {
  return /^https?:\/\//.test(url) ? decode((await fetchHtml(url)).toLowerCase()).includes(email.toLowerCase()) : !1;
}
function pick(emails, siteHost) {
  let score = (e)=>(siteHost && domOf(e).endsWith(siteHost) ? 10 : 0) + (/^(direction|directeur|dir|contact|accueil|secretariat|info|bonjour|hello|commercial|achats?)[.@]/i.test(e) ? 3 : 0) + (/^[a-z]+\.[a-z]+@/i.test(e) ? 2 : 0);
  return [
    ...emails
  ].sort((a, b)=>score(b) - score(a))[0] ?? "";
}
async function credits(ws) {
  let since = new Date;
  since.setUTCDate(1), since.setUTCHours(0, 0, 0, 0);
  let { count } = await admin.from("activity").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id).eq("kind", "credit_email").gte("created_at", since.toISOString()), total = PLANS[ws.plan ?? "essai"]?.credits ?? 300;
  return {
    used: count ?? 0,
    total,
    left: Math.max(0, total - (count ?? 0)),
    dropcontact: !!env("DROPCONTACT_API_KEY")
  };
}
function dcHeaders(key) {
  return {
    "X-Access-Token": key,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}
async function dcSubmit(p, person) {
  let key = env("DROPCONTACT_API_KEY"), parts = person.trim().split(/\s+/);
  if (!key || parts.length < 2) return null;
  let row = {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
    company: p.org || p.name,
    custom_fields: p.id
  };
  p.website && (row.website = p.website);
  let r = await fetch(DC, {
    method: "POST",
    headers: dcHeaders(key),
    body: JSON.stringify({
      data: [
        row
      ],
      siren: !0,
      language: "fr"
    })
  }), d = await r.json().catch(()=>({}));
  return !r.ok || d.error || !d.request_id ? (console.error("dropcontact submit", r.status, JSON.stringify(d).slice(0, 300)), null) : String(d.request_id);
}
async function dcResult(reqId) {
  let key = env("DROPCONTACT_API_KEY"), d = await (await fetch(`${DC}/${encodeURIComponent(reqId)}`, {
    headers: dcHeaders(key)
  })).json().catch(()=>({}));
  if (!d.success) return {
    ready: !1,
    email: "",
    phone: ""
  };
  let row = (d.data ?? [])[0] ?? {}, list = Array.isArray(row.email) ? row.email : [];
  return {
    ready: !0,
    email: (list.find((x)=>/nominative@pro/i.test(x.qualification ?? "")) ?? list.find((x)=>/@pro/i.test(x.qualification ?? "")))?.email?.toLowerCase() ?? "",
    phone: String(row.phone ?? row.mobile_phone ?? "")
  };
}
async function applyDropcontact(ws, p, res) {
  let patch = {
    dropcontact_req: null
  };
  return res.email && EMAIL_RE2.test(res.email) && !BAD2.test(res.email) ? (Object.assign(patch, {
    email: res.email,
    status: p.status === "sans_email" ? "pret" : p.status,
    channel: "email",
    email_source: "Dropcontact (adresse vérifiée)"
  }), await log(ws.id, "credit_email", `${p.name} : e-mail trouvé par Dropcontact`)) : patch.channel = chooseChannel({
    ...p,
    ...patch
  }), res.phone && !p.phone && (patch.phone = res.phone.slice(0, 30)), await admin.from("prospects").update(patch).eq("id", p.id), patch;
}
async function dropcontactPending(ws) {
  if (!env("DROPCONTACT_API_KEY")) return 0;
  let { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).not("dropcontact_req", "is", null).limit(10), n = 0;
  for (let p of data ?? []){
    let r = await dcResult(p.dropcontact_req).catch(()=>({
        ready: !1,
        email: "",
        phone: ""
      }));
    r.ready && (await applyDropcontact(ws, p, r), n++);
  }
  return n;
}
function chooseChannel(p) {
  return p.email ? "email" : p.phone ? "telephone" : p.linkedin_url ? "linkedin" : p.contact_form ? "formulaire" : p.address || p.postal_code ? "courrier" : "";
}
async function deepEnrich(ws, p, interlocuteur, wait = !0) {
  let steps = [], email = "", source = "", phone = p.phone || "", form = p.contact_form || "", site = p.website || "", person = p.contact_name || "", role = p.contact_role || "";
  if (site) {
    let sc = await siteContacts(site).catch(()=>({
        emails: [],
        phones: [],
        form: ""
      }));
    email = pick(sc.emails, hostOf2(site)), email && (source = `site ${hostOf2(site)}`), !phone && sc.phones[0] && (phone = sc.phones[0]), !form && sc.form && (form = sc.form), steps.push(email ? "e-mail trouvé sur son site" : "site lu, pas d'e-mail");
  }
  if (!email) {
    let v = await askJson(`Enquête approfondie : l'enquête rapide n'a trouvé aucun e-mail pour cet établissement. Creuse davantage.
Établissement : ${p.name}${p.org ? ` (raison sociale ${p.org})` : ""}, ${p.activity}
Adresse : ${[
      p.address,
      p.postal_code,
      p.city
    ].filter(Boolean).join(" ")}${p.siret ? ` · SIRET ${p.siret}` : ""}
${site ? `Site : ${site}` : "Site inconnu : trouve-le."}
${person ? `Dirigeant connu : ${person}${role ? ` (${role})` : ""}` : ""}
Interlocuteur recherché : ${interlocuteur || "dirigeant ou responsable"}

Cherche dans cet ordre (6 recherches maximum) :
1. Les annuaires officiels du secteur (ex. FINESS / sanitaire-social.com pour EHPAD, cliniques, crèches ; annuaire de l'Éducation nationale ; ordres professionnels ; CCI ; annuaire des mairies ; Pages Jaunes).
2. Le site du groupe ou du gestionnaire si l'établissement appartient à un réseau (contact régional, achats).
3. Les documents publics : PDF, rapports, appels d'offres, comptes rendus, presse locale, page Facebook ou fiche Google.
4. Le nom et la fonction du décideur sur place, et son profil LinkedIn public.
Règles : ne donne un e-mail que s'il est publié tel quel sur la page "source" (URL exacte). Jamais d'adresse reconstruite. Si rien n'est publié, laisse vide.
Format : {"email": "", "source": "URL exacte où l'e-mail apparaît", "site": "", "telephone": "", "formulaire": "URL du formulaire de contact", "decideur": "Prénom Nom", "fonction": "", "linkedin": "", "groupe": "", "note": "une phrase"}`, {
      fast: !0,
      maxTokens: 8e3,
      tools: WEB(6),
      system: "Tu es un enquêteur commercial B2B en France, rigoureux. Tu ne donnes que des coordonnées publiées et vérifiables, avec l'URL exacte."
    }), cand = String(v.email ?? "").trim().toLowerCase().replace(/^mailto:/, "");
    !site && /^https?:\/\//.test(v.site ?? "") && (site = String(v.site).slice(0, 300)), EMAIL_RE2.test(cand) && !BAD2.test(cand) && await mxOk(domOf(cand)) && (!!site && domOf(cand).endsWith(hostOf2(site)) || await sourceHas(String(v.source ?? ""), cand) ? (email = cand, source = String(v.source ?? "").slice(0, 200) || "recherche web") : steps.push("adresse proposée mais introuvable sur la page citée, écartée")), !phone && v.telephone && (phone = String(v.telephone).replace(/[^\d+ .]/g, "").trim().slice(0, 30)), !form && /^https?:\/\//.test(v.formulaire ?? "") && (form = String(v.formulaire).slice(0, 300));
    let dec = String(v.decideur ?? "").trim();
    dec && dec.length < 60 && /\s/.test(dec) && (person = dec, role = String(v.fonction ?? "").slice(0, 80) || role), /linkedin\.com\/in\//i.test(v.linkedin ?? "") && !p.linkedin_url && (p.linkedin_url = String(v.linkedin).replace(/[?#].*$/, "").slice(0, 200)), steps.push(email ? "e-mail trouvé par l'enquête web" : "enquête web : aucun e-mail publié"), v.groupe && steps.push(`groupe : ${String(v.groupe).slice(0, 80)}`);
  }
  let dcReq = null;
  if (!email && person && env("DROPCONTACT_API_KEY")) if ((await credits(ws)).left > 0) {
    if (dcReq = await dcSubmit({
      ...p,
      website: site
    }, person), dcReq) {
      steps.push(`Dropcontact interrogé pour ${person}`);
      for(let i = 0; wait && i < 3 && dcReq; i++){
        await new Promise((r2)=>setTimeout(r2, 12e3));
        let r = await dcResult(dcReq).catch(()=>({
            ready: !1,
            email: "",
            phone: ""
          }));
        r.ready && (dcReq = null, r.email && (email = r.email, source = "Dropcontact (adresse vérifiée)", await log(ws.id, "credit_email", `${p.name} : e-mail trouvé par Dropcontact`)), !phone && r.phone && (phone = r.phone.slice(0, 30)));
      }
      dcReq && steps.push("résultat Dropcontact en attente");
    }
  } else steps.push("crédits Dropcontact du mois épuisés");
  let patch = {
    enrich_level: 2,
    enriched_at: new Date().toISOString(),
    dropcontact_req: dcReq,
    enrich_note: steps.join(" · ").slice(0, 600),
    contact_form: form
  };
  return site && !p.website && (patch.website = site), phone && !p.phone && (patch.phone = phone), person && person !== p.contact_name && (patch.contact_name = person, patch.contact_role = role), p.linkedin_url && !(await admin.from("prospects").select("linkedin_url").eq("id", p.id).single()).data?.linkedin_url && (patch.linkedin_url = p.linkedin_url), email && Object.assign(patch, {
    email,
    email_source: source,
    status: [
      "sans_email",
      "nouveau"
    ].includes(p.status) ? "pret" : p.status
  }), patch.channel = chooseChannel({
    ...p,
    ...patch
  }), await admin.from("prospects").update(patch).eq("id", p.id), {
    id: p.id,
    email,
    channel: patch.channel,
    pending: !!dcReq,
    steps
  };
}
async function letter(ws, p, kind) {
  let t = (ws.targets ?? []).find((x)=>x.id === p.target), pr = ws.profile ?? {}, out = await ask(kind === "courrier" ? `Rédige une lettre de prospection postale de ${ws.sender_name || "la direction"} (${pr.nom || ws.name}) à ${p.contact_name ? `${p.contact_name}${p.contact_role ? `, ${p.contact_role}` : ""}` : `la direction (${t?.interlocuteur || "responsable"})`} de ${p.name}, ${p.city}.
Offre : ${pr.offre ?? ""}. Argument : ${t?.angle ?? ""}. Bénéficiaires : ${t?.pour_qui ?? ""}. Faits utilisables : ${(pr.preuves ?? []).join(" ; ") || "aucun"}.
Lettre de 140 à 190 mots, vouvoiement, formule d'appel adaptée, un paragraphe d'accroche lié à leur activité, un paragraphe de valeur, une proposition d'échange de 20 minutes avec les coordonnées (${ws.sender_email}${ws.postal_address ? `, ${ws.postal_address}` : ""}), formule de politesse sobre, signature « ${ws.sender_name} ». N'invente aucun fait. Pas de prix. Texte seul, sans en-tête d'adresse.` : `Rédige le message à coller dans le formulaire de contact du site de ${p.name} (${p.activity}, ${p.city}), de la part de ${ws.sender_name} (${pr.nom || ws.name}).
Offre : ${pr.offre ?? ""}. Argument : ${t?.angle ?? ""}. Demande de transmettre à : ${t?.interlocuteur || "la direction"}.
60 à 90 mots, vouvoiement, une question finale pour un échange de 15 minutes, termine par le nom, l'e-mail ${ws.sender_email} et la fonction. N'invente rien. Pas de prix. Texte seul.`, {
    fast: !0,
    maxTokens: 1500
  });
  return await admin.from("prospects").update({
    letter: out.slice(0, 4e3)
  }).eq("id", p.id), {
    text: out
  };
}
function assertKind(k) {
  if (k === "courrier" || k === "formulaire") return k;
  throw new HttpError(400, "Type de message inconnu");
}
var EMAIL_IN, EMAIL_RE2, BAD2, PHONE_RE, WEB, hostOf2, domOf, DC, init_deep = __esm({
  "_shared/deep.ts" () {
    init_http();
    init_core();
    init_analyze();
    EMAIL_IN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, EMAIL_RE2 = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, BAD2 = /(example\.|sentry|wixpress|domain\.com|email\.com|votre|yourdomain|\.(png|jpe?g|gif|svg|webp)$|^(rgpd|dpo|privacy|noreply|no-reply|donotreply|webmaster|recrutement|jobs|rh|candidature|careers)@)/i, PHONE_RE = /(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g, WEB = (n)=>[
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: n,
          user_location: {
            type: "approximate",
            country: "FR",
            timezone: "Europe/Paris"
          }
        }
      ], hostOf2 = (u)=>{
      try {
        return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
      } catch  {
        return "";
      }
    }, domOf = (e)=>e.split("@")[1]?.toLowerCase() ?? "";
    DC = "https://api.dropcontact.com/v1/enrich/all";
  }
});
init_http();
init_core();
init_analyze();
init_search();
init_mail();
init_agents();
init_http();
init_core();
init_growth();
init_mail();
init_agents();
init_core();
var TZ = "Europe/Paris";
function parisParts(date) {
  let f = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short"
  }), p = Object.fromEntries(f.formatToParts(date).map((x)=>[
      x.type,
      x.value
    ])), wdMap = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7
  };
  return {
    y: +p.year,
    m: +p.month,
    d: +p.day,
    h: +p.hour,
    min: +p.minute,
    wd: wdMap[p.weekday]
  };
}
function offsetMinutes(date) {
  let p = parisParts(date), asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - Math.floor(date.getTime() / 6e4) * 6e4) / 6e4);
}
function parisToUtc(y, m, d, h, min) {
  let guess = Date.UTC(y, m - 1, d, h, min), t = guess - offsetMinutes(new Date(guess)) * 6e4;
  return t = guess - offsetMinutes(new Date(t)) * 6e4, new Date(t);
}
function addParisDays(date, days, h, min) {
  let p = parisParts(date), base = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
  return parisToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, min);
}
var DAYS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi"
], MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre"
];
function frSlot(date) {
  let p = parisParts(date);
  return `${DAYS[p.wd % 7]} ${p.d} ${MONTHS[p.m - 1]} à ${p.h}h${p.min ? String(p.min).padStart(2, "0") : ""}`;
}
async function freeSlots(ws, days = 14) {
  let now = new Date, earliest = now.getTime() + 18 * 36e5, horizon = addParisDays(now, days + 1, 0, 0), { data: busy } = await admin.from("meetings").select("starts_at, ends_at").eq("workspace_id", ws.id).eq("status", "confirme").gte("ends_at", now.toISOString()).lte("starts_at", horizon.toISOString()), taken = (busy ?? []).map((b)=>[
      new Date(b.starts_at).getTime(),
      new Date(b.ends_at).getTime()
    ]), dur = Math.max(15, ws.meeting_minutes || 30) * 6e4, out = [];
  for(let i = 0; i <= days; i++){
    let dayStart = addParisDays(now, i, 12, 0), p = parisParts(dayStart), windows = ws.availability?.[String(p.wd)] ?? [];
    for (let [from, to] of windows){
      let [fh, fm] = from.split(":").map(Number), [th, tm] = to.split(":").map(Number), t = parisToUtc(p.y, p.m, p.d, fh, fm).getTime(), end = parisToUtc(p.y, p.m, p.d, th, tm).getTime();
      for(; t + dur <= end; t += dur)t < earliest || taken.some(([a, b])=>t < b && t + dur > a) || out.push(new Date(t));
    }
  }
  return out;
}
function pickThree(slots) {
  let byDay = new Map;
  for (let s of slots){
    let p = parisParts(s), k = `${p.y}-${p.m}-${p.d}`;
    byDay.has(k) || byDay.set(k, []), byDay.get(k).push(s);
  }
  let picks = [], days = [
    ...byDay.values()
  ];
  for (let list of days){
    if (picks.length >= 3) break;
    picks.push(list[Math.min(1, list.length - 1)]);
  }
  for (let s of slots){
    if (picks.length >= 3) break;
    picks.includes(s) || picks.push(s);
  }
  return picks.sort((a, b)=>a.getTime() - b.getTime());
}
var WEB2 = (n)=>[
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: n,
      user_location: {
        type: "approximate",
        country: "FR",
        timezone: "Europe/Paris"
      }
    }
  ];
function baseOf(ws) {
  return ws.app_url ? `${ws.app_url.replace(/\/$/, "")}/#` : "";
}
function bookingUrl(ws, base, token) {
  return base ? `${base}/rdv/${ws.booking_slug}${token ? `?t=${token}` : ""}` : "";
}
var CLASSES = {
  interesse: "Intéressé",
  question: "Question",
  prix: "Demande de prix",
  rappel: "Demande de rappel",
  plus_tard: "Plus tard",
  objection: "Objection",
  mauvais_contact: "Mauvais interlocuteur",
  pas_interesse: "Pas intéressé",
  stop: "Opposition",
  absence: "Absence",
  autre: "Autre"
};
function stripQuoted(text) {
  let out = [];
  for (let l of (text || "").replace(/\r/g, "").split(`
`)){
    if (/^\s*>/.test(l) || /^\s*(Le|On) .{5,200}(a écrit|wrote)\s*:?\s*$/i.test(l) || /^-{2,}\s*(Original|Message d'origine)/i.test(l) || /^\s*_{8,}\s*$/.test(l) || /^\s*(De|From)\s*:\s*.+@/i.test(l)) break;
    /^\s*(Envoyé (à partir|de mon)|Sent from|Obtenir Outlook)/i.test(l) || out.push(l);
  }
  return out.join(`
`).trim().slice(0, 6e3);
}
async function handleReply(ws, p, input, base = "") {
  let text = stripQuoted(input.text), optOut = /^\s*(stop|d[ée]sinscri|unsubscribe|ne (plus )?me (plus )?contacter|retirez[- ]moi)/i, v = optOut.test(text.slice(0, 80)) || optOut.test(String(input.subject ?? "").replace(/^(re|tr|fwd?)\s*:\s*/i, "")) ? {
    classe: "stop",
    resume: "Demande à ne plus être contacté",
    besoin_humain: !1
  } : await askJson(`Classe la réponse d'un prospect à un e-mail de prospection de ${brand(ws)} (${ws.profile?.offre ?? ""}).
Classes : ${Object.keys(CLASSES).join(", ")}.
- interesse : accepte un échange ou veut en savoir plus ; question : question précise ; prix : demande un tarif ou un devis ; rappel : demande à être appelé ;
- plus_tard : pas maintenant ; objection : objection sans refus net ; mauvais_contact : indique une autre personne (mets-la dans nouveau_contact) ;
- pas_interesse : refus ; stop : demande à ne plus être contacté ; absence : message automatique.
besoin_humain = true si prix, engagement, plainte, marché public, ou au moindre doute.
rappel_date : date AAAA-MM-JJ si le prospect indique quand revenir vers lui, sinon "".

Objet : ${input.subject ?? ""}
Message :
${text}

Format : {"classe": "", "resume": "une phrase", "besoin_humain": true, "nouveau_contact": "", "rappel_date": ""}`, {
    fast: !0,
    maxTokens: 500
  }), classe = CLASSES[v.classe] ? v.classe : "autre", needsHuman = !!v.besoin_humain || [
    "prix",
    "autre",
    "mauvais_contact",
    "objection",
    "rappel"
  ].includes(classe), reply = {
    subject: "",
    body: ""
  };
  if (p && [
    "interesse",
    "question",
    "prix",
    "rappel",
    "objection",
    "mauvais_contact"
  ].includes(classe)) {
    let slots = pickThree(await freeSlots(ws, 10)).map(frSlot), link = bookingUrl(ws, base, p.public_token), out = await ask(`Un prospect (${p.name}, ${p.activity}) a répondu à notre e-mail. Rédige la réponse.
Message reçu :
${text}

Consignes :
- Réponds précisément à ce qu'il dit, en 90 mots maximum.
- Si la réponse figure dans la fiche de l'entreprise, réponds précisément avec ces informations. Sinon (prix, délais, détails techniques absents de la fiche), dis que nous en parlerons lors d'un court échange, sans inventer.
- Propose ces créneaux : ${slots.join(" ; ") || "à convenir"}${link ? `, ou le lien pour choisir : ${link}` : ""}.
- Ne mets pas de signature.
Format :
OBJET: Re : ${(input.subject ?? "").replace(/^(re|tr|fwd?)\s*:\s*/i, "")}
---
<corps>`, {
      fast: !0,
      system: systemFor(ws)
    }), m = out.match(/OBJET\s*:\s*(.+)\n-{3,}\n([\s\S]+)/);
    reply = m ? {
      subject: m[1].trim(),
      body: m[2].trim()
    } : {
      subject: `Re : ${input.subject ?? ""}`,
      body: out.trim()
    };
  }
  let { data: row } = await admin.from("replies").insert({
    workspace_id: ws.id,
    prospect_id: p?.id ?? null,
    from_email: input.fromEmail,
    from_name: input.fromName ?? "",
    subject: input.subject ?? "",
    body: text,
    class: classe,
    summary: v.resume ?? "",
    needs_human: needsHuman,
    reply_subject: reply.subject,
    reply_body: reply.body,
    handled: [
      "absence",
      "stop"
    ].includes(classe)
  }).select("id").single();
  if (p) {
    let patch = {};
    classe !== "absence" && (await admin.from("messages").update({
      status: "ignore",
      error: "Le prospect a répondu"
    }).eq("prospect_id", p.id).eq("status", "brouillon").gt("step", 0), [
      "rdv",
      "client"
    ].includes(p.status) || (patch.status = "repondu")), classe === "pas_interesse" && (patch.status = "refus", patch.next_action_at = addDays(120), patch.next_action = "Reprendre contact (refus il y a 4 mois)"), classe === "stop" && (patch.status = "refus", patch.next_action_at = null, patch.next_action = "", patch.notes = `${p.notes ? p.notes + `
` : ""}Opposition à toute sollicitation le ${new Date().toLocaleDateString("fr-FR")}`), classe === "plus_tard" && (patch.next_action_at = /^\d{4}-\d{2}-\d{2}$/.test(v.rappel_date ?? "") ? v.rappel_date : addDays(30), patch.next_action = "Relancer (a répondu « plus tard »)"), [
      "interesse",
      "question",
      "prix",
      "rappel",
      "objection"
    ].includes(classe) && (patch.next_action_at = addDays(0), patch.next_action = classe === "rappel" ? "Rappeler le prospect" : "Répondre au message reçu"), classe === "mauvais_contact" && v.nouveau_contact && (patch.notes = `${p.notes ? p.notes + `
` : ""}Contact indiqué : ${v.nouveau_contact}`), Object.keys(patch).length && await admin.from("prospects").update(patch).eq("id", p.id);
  }
  return await log(ws.id, "reponse", `${p?.name ?? input.fromEmail} : ${CLASSES[classe]}`), {
    id: row?.id,
    classe,
    label: CLASSES[classe],
    needs_human: needsHuman,
    summary: v.resume
  };
}
var addDays = (n)=>new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
async function inbound(body) {
  if (/^email\.(opened|clicked|bounced|complained)$/.test(String(body.type)) && body.data) {
    let { trackEvent: trackEvent2 } = await Promise.resolve().then(()=>(init_campaigns(), campaigns_exports));
    return await trackEvent2(String(body.type), body.data);
  }
  if (body.type !== "email.received" || !body.data) return {
    skipped: "type"
  };
  let d = body.data, m = [].concat(d.to ?? []).map(String).join(" ").match(/r-([0-9a-f-]{36})@([a-z0-9.-]+)/i);
  if (!m) return {
    skipped: "adresse non suivie"
  };
  let { data: p } = await admin.from("prospects").select("*").eq("public_token", m[1]).maybeSingle();
  if (!p) return {
    skipped: "prospect inconnu"
  };
  let { data: ws } = await admin.from("workspaces").select("*").eq("id", p.workspace_id).single(), dom = m[2].toLowerCase();
  if (!ws || dom !== (ws.reply_domain ?? "").toLowerCase() && dom !== PLATFORM_DOMAIN().toLowerCase()) return {
    skipped: "domaine"
  };
  let from = String(d.from ?? ""), fm = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/), fromEmail = (fm ? fm[2] : from).trim().toLowerCase(), fromName = fm ? fm[1].trim() : "", text = String(d.text ?? "");
  if (!text && d.email_id) {
    let r = await resend(`/emails/receiving/${d.email_id}`);
    text = String(r.data?.text ?? "") || String(r.data?.html ?? "").replace(/<[^>]+>/g, " ");
  }
  if (text.trim() || (text = String(d.subject ?? "")), !text.trim()) return {
    skipped: "vide"
  };
  let res = await handleReply(ws, p, {
    fromEmail,
    fromName,
    subject: String(d.subject ?? ""),
    text
  }, baseOf(ws));
  try {
    let to2 = await teamAddress(ws);
    to2 && await sendSystem({
      to: to2,
      fromName: `Kairo · ${p.name}`,
      replyTo: fromEmail,
      subject: `[${res.label}] ${String(d.subject ?? "")}`,
      text: `${fromName || fromEmail} (${p.name}) a répondu — ${res.summary}

Répondre directement à cet e-mail lui écrit.

---
${stripQuoted(text)}`
    });
  } catch (e) {
    console.error("copie réponse", e);
  }
  return res;
}
async function setReplyDomain(ws) {
  if (ws.domain_status !== "verified") throw new HttpError(400, "Vérifie d'abord ton domaine d'envoi");
  let name = `r.${ws.domain}`, r = await resend("/domains", "POST", {
    name,
    region: "eu-west-1",
    capabilities: {
      sending: "disabled",
      receiving: "enabled"
    }
  });
  if (!r.ok) {
    let found = ((await resend("/domains")).data?.data ?? []).find((x)=>x.name === name);
    if (!found) throw new HttpError(502, "Service d'envoi : " + (r.data?.message ?? "erreur"));
    r = await resend(`/domains/${found.id}`);
  }
  let records = (r.data?.records ?? []).map((x)=>({
      record: x.record,
      name: x.name,
      type: x.type,
      value: x.value,
      priority: x.priority,
      status: x.status
    }));
  return await admin.from("workspaces").update({
    reply_domain: name,
    reply_domain_id: r.data.id,
    reply_status: "pending",
    reply_records: records
  }).eq("id", ws.id), {
    records
  };
}
async function checkReplyDomain(ws) {
  if (!ws.reply_domain_id) throw new HttpError(400, "Aucun domaine de réponse");
  await resend(`/domains/${ws.reply_domain_id}/verify`, "POST");
  let r = await resend(`/domains/${ws.reply_domain_id}`), records = (r.data?.records ?? []).map((x)=>({
      record: x.record,
      name: x.name,
      type: x.type,
      value: x.value,
      priority: x.priority,
      status: x.status
    })), recv = r.data?.capabilities?.receiving, status = records.length > 0 && records.every((x)=>x.status === "verified") || r.data?.status === "verified" && recv === "enabled" ? "verified" : "pending";
  return await admin.from("workspaces").update({
    reply_status: status,
    reply_records: records
  }).eq("id", ws.id), {
    status,
    records
  };
}
async function sendReply(ws, replyId, subject, body) {
  canSend(ws);
  let { data: r } = await admin.from("replies").select("*, prospects(*)").eq("id", replyId).eq("workspace_id", ws.id).single();
  if (!r) throw new HttpError(404, "Réponse introuvable");
  let p = r.prospects;
  await sendMail(ws, {
    to: r.from_email,
    subject,
    text: `${body.trim()}

${signature(ws)}`,
    replyTo: replyAddress(ws, p?.public_token)
  }), await admin.from("replies").update({
    handled: !0,
    reply_subject: subject,
    reply_body: body
  }).eq("id", r.id), p && await admin.from("prospects").update({
    next_action_at: addDays(3),
    next_action: "Vérifier qu'il a répondu"
  }).eq("id", p.id), await log(ws.id, "envoi", `Réponse envoyée à ${p?.name ?? r.from_email}`);
}
async function bookingInfo(slug, token) {
  let { data: ws } = await admin.from("workspaces").select("*").eq("booking_slug", slug).maybeSingle();
  if (!ws) throw new HttpError(404, "Ce lien de réservation n'existe pas");
  let p = null;
  if (token && /^[0-9a-f-]{36}$/i.test(token)) {
    let { data } = await admin.from("prospects").select("*").eq("public_token", token).eq("workspace_id", ws.id).maybeSingle();
    p = data;
  }
  return {
    ws,
    p
  };
}
async function book(slug, b) {
  let { ws, p } = await bookingInfo(slug, b.t), name = (b.name ?? "").trim().slice(0, 120), email = (b.email ?? "").trim().toLowerCase().slice(0, 200), company = (b.company ?? "").trim().slice(0, 200), phone = (b.phone ?? "").trim().slice(0, 40), notes = (b.notes ?? "").trim().slice(0, 1e3);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !company) throw new HttpError(400, "Nom, e-mail et entreprise sont obligatoires");
  let start = new Date(b.start);
  if (!(await freeSlots(ws, 21)).some((s)=>s.getTime() === start.getTime())) throw new HttpError(409, "Ce créneau vient d'être pris, choisis-en un autre.");
  let end = new Date(start.getTime() + ws.meeting_minutes * 6e4), prospect = p;
  if (!prospect) {
    let { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).ilike("email", email).limit(1);
    prospect = data?.[0] ?? null;
  }
  if (!prospect) {
    let { data } = await admin.from("prospects").insert({
      workspace_id: ws.id,
      name: company,
      contact_name: name,
      email,
      phone,
      status: "rdv",
      source: "réservation en ligne",
      activity: "Réservation directe"
    }).select("*").single();
    prospect = data;
  }
  let { data: mt, error } = await admin.from("meetings").insert({
    workspace_id: ws.id,
    prospect_id: prospect.id,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    contact_name: name,
    contact_email: email,
    contact_phone: phone,
    company,
    notes
  }).select("id").single();
  if (error) throw new HttpError(error.code === "23P01" ? 409 : 500, error.code === "23P01" ? "Ce créneau vient d'être pris, choisis-en un autre." : error.message);
  await admin.from("prospects").update({
    status: prospect.status === "client" ? "client" : "rdv",
    contact_name: prospect.contact_name || name,
    email: prospect.email || email,
    phone: prospect.phone || phone,
    next_action_at: start.toISOString().slice(0, 10),
    next_action: "Rendez-vous"
  }).eq("id", prospect.id), await admin.from("messages").update({
    status: "ignore",
    error: "Rendez-vous pris"
  }).eq("prospect_id", prospect.id).eq("status", "brouillon");
  let when = frSlot(start);
  await log(ws.id, "rdv", `${company} a réservé ${when}`);
  {
    let team = await teamAddress(ws), organizer = team || ws.sender_email, ics = buildIcs({
      uid: mt.id,
      start,
      end,
      summary: `${brand(ws)} · ${company}`,
      description: `Échange de ${ws.meeting_minutes} minutes avec ${ws.sender_name} (${brand(ws)}).${notes ? `
Notes : ${notes}` : ""}`,
      location: ws.meeting_location,
      organizerName: ws.sender_name || brand(ws),
      organizerEmail: organizer,
      attendeeName: name,
      attendeeEmail: email
    }), confirm = {
      to: email,
      subject: `Rendez-vous confirmé : ${when}`,
      text: `Bonjour ${name},

C'est noté pour ${when}, pendant ${ws.meeting_minutes} minutes.
Lieu : ${ws.meeting_location}.

L'invitation est jointe pour l'ajouter à votre agenda. Si l'horaire ne vous convient plus, répondez simplement à cet e-mail.

${signature(ws)}`,
      ics
    };
    try {
      sendReady(ws) ? await sendMail(ws, confirm) : await sendSystem({
        ...confirm,
        fromName: brand(ws),
        replyTo: organizer || void 0
      });
    } catch (e) {
      console.error("confirmation rdv", e);
    }
    try {
      team && await sendSystem({
        to: team,
        subject: `Nouveau RDV : ${company}, ${when}`,
        text: `${name} (${company}) a réservé ${when}.
E-mail : ${email}
Téléphone : ${phone || "non renseigné"}${notes ? `
Notes : ${notes}` : ""}

La fiche de préparation est disponible dans l'agenda.`,
        replyTo: email,
        ics
      });
    } catch (e) {
      console.error("alerte rdv", e);
    }
  }
  return {
    ok: !0,
    label: when
  };
}
async function brief(ws, meetingId) {
  let { data: m } = await admin.from("meetings").select("*, prospects(*)").eq("id", meetingId).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  let p = m.prospects, { data: rep } = p ? await admin.from("replies").select("body, summary").eq("prospect_id", p.id).order("created_at") : {
    data: []
  }, t = (ws.targets ?? []).find((x)=>x.id === p?.target), out = await ask(`Prépare une fiche de rendez-vous commercial pour ${ws.sender_name} (${brand(ws)} : ${ws.profile?.offre ?? ""}).
Rendez-vous avec ${m.contact_name}, ${m.company}${p ? ` (${p.activity}, ${p.city})` : ""}${p?.website ? `, site ${p.website}` : ""}.
${m.notes ? `Notes du prospect : ${m.notes}` : ""}
${(rep ?? []).length ? `Ses messages : ${(rep ?? []).map((r)=>r.body).join(" / ").slice(0, 2e3)}` : ""}
${t ? `Argument principal pour ce type de client : ${t.angle}` : ""}

Cherche sur le web des informations récentes et vérifiables sur cette structure. Puis rédige, en texte simple avec des titres en MAJUSCULES :
CE QU'ON SAIT (faits sourcés, avec l'URL entre parenthèses)
HYPOTHÈSES (ce qui est probable mais non vérifié)
CE QU'IL FAUT DÉCOUVRIR (5 questions à poser)
OBJECTIONS PROBABLES ET RÉPONSES
OBJECTIF DU RENDEZ-VOUS ET PROCHAINE ÉTAPE À OBTENIR
Sois concret et court. N'invente rien.`, {
    fast: !0,
    maxTokens: 6e3,
    tools: WEB2(3),
    system: "Tu es un directeur commercial B2B français expérimenté. Tu distingues toujours les faits, les hypothèses et les inconnues."
  });
  return await admin.from("meetings").update({
    brief: out.slice(0, 8e3)
  }).eq("id", m.id), {
    brief: out
  };
}
async function insight(ws, p) {
  let t = (ws.targets ?? []).find((x)=>x.id === p.target), v = await askJson(`Évalue si ${brand(ws)} (${ws.profile?.offre ?? ""}) doit contacter maintenant ce prospect, et pourquoi.
Prospect : ${p.name}${p.org ? ` (${p.org})` : ""}, ${p.activity}, ${[
    p.address,
    p.postal_code,
    p.city
  ].join(" ")}.
Signaux du registre : ${(p.signals ?? []).map((s)=>s.label).join(" ; ") || "aucun"}.
Cible visée : ${t?.label ?? ""} — ${t?.pourquoi ?? ""}

${p.website ? `Site : ${p.website}
` : ""}${p.contact_name ? `Dirigeant : ${p.contact_name}
` : ""}
Cherche sur le web : actualités, ouverture, travaux, recrutements, nomination d'un nouveau dirigeant, avis clients mentionnant un problème lié à notre offre, appels d'offres.
Cherche aussi ses réseaux sociaux publics (page LinkedIn de l'entreprise ou du dirigeant, Instagram, Facebook) et ses publications récentes : elles servent à personnaliser la première phrase d'un e-mail.
Un événement est un indice, pas une preuve d'intention d'achat.
score : 0 à 100 (pertinence × moment). contacter : false si les informations sont insuffisantes ou si ce n'est pas le bon moment.
reseaux.accroche : une première phrase d'e-mail naturelle qui fait référence à une publication ou une actualité RÉELLE trouvée (avec sa source), sans flatterie ; vide si rien de pertinent.
Format : {"score": 0, "resume": "une phrase", "faits": [{"texte": "", "source": "URL"}], "hypotheses": [""], "inconnues": [""], "recommandation": "quoi dire / quel angle", "contacter": true,
 "reseaux": {"liens": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": ""}], "publications": [{"date": "AAAA-MM", "sujet": "", "source": "URL"}], "accroche": ""}}`, {
    fast: !0,
    maxTokens: 7e3,
    tools: WEB2(4),
    system: "Tu es analyste commercial B2B en France. Tu ne présentes jamais une hypothèse comme un fait et tu cites tes sources."
  });
  if (!v || typeof v != "object" || v.score === void 0 && !v.resume) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  let score = Math.max(0, Math.min(100, Math.round(Number(v.score) || 0)));
  return await admin.from("prospects").update({
    insight: v,
    insight_at: new Date().toISOString(),
    score
  }).eq("id", p.id), {
    ...v,
    score
  };
}
async function callScript(ws, p) {
  let t = (ws.targets ?? []).find((x)=>x.id === p.target);
  return {
    script: await ask(`Écris un script d'appel téléphonique court pour ${ws.sender_name} (${brand(ws)}) qui appelle ${p.name} (${p.activity}, ${p.city})${p.contact_name ? `, en demandant ${p.contact_name}` : `, en demandant : ${t?.interlocuteur ?? "le responsable"}`}.
Angle : ${t?.angle ?? ""}. Bénéficiaires : ${t?.pour_qui ?? ""}.
${p.insight ? `Ce qu'on sait : ${JSON.stringify(p.insight).slice(0, 800)}` : ""}
Structure en texte simple, titres en MAJUSCULES : ACCUEIL / STANDARD (passer le barrage), ACCROCHE (15 secondes), QUESTIONS DE QUALIFICATION (besoin, rôle dans la décision, échéance, prestataire actuel), OBJECTIONS (3 avec réponses), CONCLUSION (obtenir un rendez-vous de ${ws.meeting_minutes} minutes), MESSAGE VOCAL (20 secondes).
Ton naturel et poli, vouvoiement, aucune promesse ni prix.`, {
      fast: !0,
      system: systemFor(ws)
    })
  };
}
function quoteTotals(q) {
  let ht = (q.lines ?? []).reduce((s, l)=>s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0), tva = ht * (Number(q.vat_rate) || 0) / 100;
  return {
    ht: Math.round(ht * 100) / 100,
    tva: Math.round(tva * 100) / 100,
    ttc: Math.round((ht + tva) * 100) / 100
  };
}
async function sendQuote(ws, quoteId, base) {
  if (canSend(ws), !base) throw new HttpError(400, "Adresse de l'application inconnue");
  let { data: q } = await admin.from("quotes").select("*, prospects(*)").eq("id", quoteId).eq("workspace_id", ws.id).single();
  if (!q) throw new HttpError(404, "Devis introuvable");
  let p = q.prospects;
  if (!p?.email) throw new HttpError(400, "Ce prospect n'a pas d'e-mail");
  let t = quoteTotals(q), link = `${base}/devis/${q.token}`;
  await sendMail(ws, {
    to: p.email,
    replyTo: replyAddress(ws, p.public_token),
    subject: `Proposition ${brand(ws)} – ${q.title || p.name}`,
    text: `${p.contact_name ? `Bonjour ${p.contact_name},` : "Bonjour,"}

Comme convenu, voici notre proposition${q.title ? ` : ${q.title}` : ""}, pour un montant de ${t.ht.toLocaleString("fr-FR")} € HT${q.recurring ? " par mois" : ""}.

Vous pouvez la consulter et la signer en ligne ici :
${link}

Je reste disponible pour en parler.

${signature(ws)}`
  }), await admin.from("quotes").update({
    status: "envoye",
    sent_at: new Date().toISOString(),
    total_ht: t.ht
  }).eq("id", q.id), await admin.from("prospects").update({
    next_action_at: addDays(4),
    next_action: "Relancer le devis"
  }).eq("id", p.id), await log(ws.id, "devis", `Devis envoyé à ${p.name} (${t.ht.toLocaleString("fr-FR")} € HT)`);
}
async function publicQuote(token) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) throw new HttpError(404, "Devis introuvable");
  let { data: q } = await admin.from("quotes").select("*, prospects(name, contact_name, address, postal_code, city), workspaces(name, profile, legal_name, siret, postal_address, sender_name, sender_email, signature)").eq("token", token).maybeSingle();
  if (!q || q.status === "brouillon") throw new HttpError(404, "Devis introuvable");
  q.status === "envoye" && await admin.from("quotes").update({
    status: "vu",
    viewed_at: new Date().toISOString()
  }).eq("id", q.id);
  let w = q.workspaces;
  return {
    number: q.number,
    title: q.title,
    lines: q.lines,
    recurring: q.recurring,
    notes: q.notes,
    vat_rate: q.vat_rate,
    totals: quoteTotals(q),
    status: q.status === "envoye" ? "vu" : q.status,
    valid_until: q.valid_until,
    created_at: q.created_at,
    signed_name: q.signed_name,
    signed_at: q.signed_at,
    client: q.prospects,
    seller: {
      name: w.profile?.nom || w.name,
      legal_name: w.legal_name,
      siret: w.siret,
      address: w.postal_address,
      contact: w.sender_name,
      email: w.sender_email
    }
  };
}
async function signQuote(token, name, accept, ip) {
  let { data: q } = await admin.from("quotes").select("*").eq("token", token).maybeSingle();
  if (!q || ![
    "envoye",
    "vu"
  ].includes(q.status)) throw new HttpError(400, "Ce devis ne peut plus être signé");
  if (q.valid_until && new Date(q.valid_until) < new Date(new Date().toISOString().slice(0, 10))) throw new HttpError(400, "Ce devis a expiré, demandez-en une nouvelle version");
  let nm = String(name ?? "").trim().slice(0, 120);
  if (accept && nm.length < 3) throw new HttpError(400, "Indique ton nom complet pour signer");
  let now = new Date().toISOString();
  await admin.from("quotes").update(accept ? {
    status: "signe",
    signed_at: now,
    signed_name: nm,
    signed_ip: ip.slice(0, 60)
  } : {
    status: "refuse"
  }).eq("id", q.id);
  let { data: ws } = await admin.from("workspaces").select("*").eq("id", q.workspace_id).single();
  if (q.prospect_id) {
    let t = quoteTotals(q);
    await admin.from("prospects").update(accept ? {
      status: "client",
      won_at: now,
      deal_value: q.recurring ? t.ht : (q.lines ?? []).filter((l)=>/mois|mensuel/i.test(l.unit ?? "")).reduce((s, l)=>s + (Number(l.qty) || 0) * (Number(l.price) || 0), 0) || null,
      next_action_at: addDays(1),
      next_action: "Lancer la prestation"
    } : {
      next_action_at: addDays(2),
      next_action: "Comprendre le refus du devis"
    }).eq("id", q.prospect_id);
  }
  if (await log(q.workspace_id, "devis", accept ? `Devis ${q.number} signé par ${nm}` : `Devis ${q.number} refusé`), ws) try {
    let team = await teamAddress(ws);
    team && await sendSystem({
      to: team,
      subject: accept ? `✅ Devis ${q.number} signé` : `Devis ${q.number} refusé`,
      text: accept ? `${nm} a signé le devis ${q.number} (${quoteTotals(q).ht.toLocaleString("fr-FR")} € HT) le ${new Date(now).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris"
      })}.` : `Le devis ${q.number} a été refusé en ligne.`
    });
  } catch (e) {
    console.error(e);
  }
  return {
    ok: !0
  };
}
async function siteText(url) {
  let { readSite: readSite2 } = await Promise.resolve().then(()=>(init_analyze(), analyze_exports));
  return await readSite2(url);
}
async function sha(s) {
  let d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.replace(/\s+/g, " ").replace(/\d{1,2}[:/]\d{2}/g, "")));
  return [
    ...new Uint8Array(d)
  ].map((b)=>b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
async function registryCard(name) {
  if (!name) return [];
  try {
    let u = new URL("https://recherche-entreprises.api.gouv.fr/search");
    u.searchParams.set("q", name), u.searchParams.set("per_page", "3");
    let r = await fetch(u, {
      headers: {
        accept: "application/json"
      }
    });
    return r.ok ? ((await r.json()).results ?? []).map((x)=>({
        nom: x.nom_complet,
        siren: x.siren,
        creation: x.date_creation,
        effectif: x.tranche_effectif_salarie,
        etablissements: x.nombre_etablissements_ouverts,
        ville: x.siege?.libelle_commune,
        activite: x.activite_principale,
        finances: x.finances ?? {},
        dirigeants: (x.dirigeants ?? []).slice(0, 4).map((g)=>`${g.prenoms ?? ""} ${g.nom ?? g.denomination ?? ""} (${g.qualite ?? ""})`.trim())
      })) : [];
  } catch  {
    return [];
  }
}
async function checkCompetitor(ws, id, force = !1) {
  let { data: c } = await admin.from("competitors").select("*").eq("id", id).eq("workspace_id", ws.id).single();
  if (!c) throw new HttpError(404, "Concurrent introuvable");
  let host = new URL(c.url).hostname.replace(/^www\./, ""), guess = c.name || c.summary?.nom || host.split(".")[0], [text, registry] = await Promise.all([
    siteText(c.url).catch(()=>""),
    registryCard(guess)
  ]), hash = await sha(text), now = new Date().toISOString(), fresh = c.checked_at && Date.now() - new Date(c.checked_at).getTime() < 7 * 864e5;
  if (!force && hash === c.text_hash && c.summary?.battlecard && fresh) return await admin.from("competitors").update({
    checked_at: now
  }).eq("id", c.id), {
    changed: !1
  };
  let me = ws.profile ?? {}, s = await askJson(`Tu es analyste en intelligence concurrentielle B2B en France. Produis une veille concurrentielle de niveau expert sur ce concurrent, pour ${brand(ws)}.

NOTRE ENTREPRISE : ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ce qui nous distingue : ${me.differenciation ?? ""} — Preuves : ${(me.preuves ?? []).join(" ; ") || "aucune"}
Nos cibles : ${(ws.targets ?? []).map((t)=>t.label).join(", ")}

CONCURRENT : ${c.url}
Registre officiel des entreprises (candidats possibles, choisis celui qui correspond vraiment, sinon ignore) : ${JSON.stringify(registry).slice(0, 2500)}
${c.summary ? `Analyse précédente (pour repérer les changements) : ${JSON.stringify(c.summary).slice(0, 2e3)}` : ""}

Contenu actuel de son site :
${text.slice(0, 9e3) || "(site illisible)"}

Fais des recherches web ciblées (5 au maximum) : actualités des 12 derniers mois (acquisitions, levées, nominations, nouveaux contrats, difficultés), marchés publics remportés (BOAMP, avis d'attribution, montants), avis clients et salariés (Google, Glassdoor, Indeed), recrutements en cours (zones, métiers = où ils se développent), indices de prix publics, et leurs réseaux sociaux (LinkedIn, Instagram, Facebook, TikTok, YouTube : abonnés visibles, rythme de publication, sujets et formats qui génèrent le plus de réactions).

Règles d'expert :
- Chaque fait important porte sa source (URL). Sépare toujours FAIT et HYPOTHÈSE.
- N'invente aucun chiffre, client, prix ou marge. Si une information n'est pas trouvée, dis « non trouvé ».
- Sois concret et actionnable pour un commercial qui affronte ce concurrent demain en rendez-vous.

Format :
{"nom": "",
 "fiche": {"raison_sociale": "", "siren": "", "creation": "", "effectif": "", "chiffre_affaires": "montant + année + source, ou non trouvé", "resultat": "", "dirigeants": [""], "implantations": ""},
 "resume": "3 phrases : qui ils sont, comment ils gagnent, en quoi ils nous menacent",
 "menace": {"niveau": 1, "pourquoi": ""},
 "offre": "", "positionnement": "", "cibles": "",
 "prix": {"affiches": "prix affichés ou « non affichés »", "indices": [{"texte": "", "source": ""}]},
 "forces": [{"texte": "", "source": ""}],
 "faiblesses": [{"texte": "", "type": "fait|hypothese", "source": ""}],
 "actualites": [{"date": "AAAA-MM", "titre": "", "impact": "ce que ça change pour nous", "source": ""}],
 "marches_publics": [{"date": "", "acheteur": "", "objet": "", "montant": "", "source": ""}],
 "avis": {"clients": "synthèse + note si trouvée", "salaries": "synthèse + note si trouvée", "sources": [""]},
 "recrutements": "",
 "reseaux": {"presence": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": "", "abonnes": "nombre ou non trouvé", "rythme": "ex. 3 posts/semaine", "sujets": ""}], "ce_qui_marche": ["formats ou sujets qui génèrent des réactions, avec exemple"], "angles_a_reprendre": ["ce qu'on peut faire mieux qu'eux sur les réseaux"], "a_eviter": [""], "synthese": "2 phrases"},
 "comparatif": [{"critere": "", "eux": "", "nous": "", "avantage": "eux|nous|egal|inconnu"}],
 "battlecard": {"pitch": "notre différence en 2 phrases face à eux", "quand_on_gagne": [""], "quand_on_perd": [""], "objections": [{"objection": "ex. « On travaille déjà avec eux »", "reponse": ""}], "questions_pieges": ["questions à poser au prospect qui mettent en lumière leurs faiblesses, sans les dénigrer"], "a_ne_pas_dire": [""]},
 "opportunites": ["comptes ou segments où on peut les déloger, et pourquoi"],
 "actions": ["3 à 5 actions concrètes pour nous cette semaine"],
 "changements": "${c.summary ? "ce qui a changé depuis l'analyse précédente, ou « rien de significatif »" : "première analyse"}"}`, {
    maxTokens: 14e3,
    tools: WEB2(5),
    system: "Tu es un analyste senior en intelligence concurrentielle. Tu cites tes sources, tu distingues faits et hypothèses, tu ne dénigres jamais et tu n'inventes rien. Réponds en français."
  });
  if (!s || typeof s != "object" || !s.resume && !s.battlecard) throw new HttpError(502, "L'analyse est revenue incomplète, relance-la");
  let history = [
    {
      at: now,
      changes: s.changements ?? ""
    },
    ...c.history ?? []
  ].slice(0, 20);
  return await admin.from("competitors").update({
    name: c.name || s.nom || "",
    summary: s,
    text_hash: hash,
    history,
    checked_at: now,
    changed_at: c.text_hash && c.text_hash !== hash ? now : c.changed_at ?? now
  }).eq("id", c.id), await log(ws.id, "veille", `${c.name || s.nom} : ${c.summary ? s.changements : "analyse complète"}`), {
    changed: !0,
    summary: s
  };
}
async function suggestCompetitors(ws) {
  let me = ws.profile ?? {}, { data: existing } = await admin.from("competitors").select("url").eq("workspace_id", ws.id);
  return ((await askJson(`Trouve sur le web les 6 concurrents les plus directs de cette entreprise française.
Entreprise : ${me.nom ?? ws.name} — ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ville : ${me.ville ?? ""} — Zone : ${(ws.zone ?? []).join(", ") || "France"}
Cibles : ${(ws.targets ?? []).map((t)=>t.label).join(", ")}
Déjà suivis : ${(existing ?? []).map((x)=>x.url).join(", ") || "aucun"}
Mélange : 2 leaders nationaux, 3 acteurs de taille comparable dans la même zone, 1 alternative (autre façon de répondre au même besoin).
Ne donne que des entreprises réelles avec leur site officiel vérifié.
Format : {"concurrents": [{"nom": "", "site": "https://…", "pourquoi": "une phrase", "type": "leader|local|alternative"}]}`, {
    fast: !0,
    maxTokens: 6e3,
    tools: WEB2(4)
  })).concurrents ?? []).filter((x)=>/^https?:\/\//.test(x.site ?? "")).slice(0, 6);
}
var NETWORKS = [
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "x"
];
async function socialAudit(ws, given) {
  let { socialLinks: socialLinks2 } = await Promise.resolve().then(()=>(init_analyze(), analyze_exports)), found = ws.website ? await socialLinks2(ws.website).catch(()=>({})) : {}, socials = {};
  for (let n of NETWORKS){
    let v = String(given?.[n] ?? "").trim() || found[n] || "";
    v && (socials[n] = v.slice(0, 300));
  }
  let me = ws.profile ?? {}, { data: comp } = await admin.from("competitors").select("name, url, summary").eq("workspace_id", ws.id).limit(6), compNets = (comp ?? []).map((c)=>({
      nom: c.name || c.url,
      reseaux: c.summary?.reseaux ?? null
    })).filter((c)=>c.reseaux), a = await askJson(`Tu es consultant senior en social selling B2B en France. Fais l'audit des réseaux sociaux de cette entreprise et prépare un plan d'action concret.

ENTREPRISE : ${me.nom ?? ws.name} — ${me.resume ?? ""} — Offre : ${me.offre ?? ""} — Ce qui la distingue : ${me.differenciation ?? ""} — Ton : ${me.ton ?? ""}
Site : ${ws.website || "inconnu"}
Dirigeant / commercial : ${ws.sender_name || "inconnu"}
Clients visés : ${(ws.targets ?? []).map((t)=>`${t.label} (interlocuteur : ${t.interlocuteur ?? ""})`).join(" ; ")}
Profils connus : ${Object.keys(socials).length ? Object.entries(socials).map(([k, v])=>`${k} : ${v}`).join(" ; ") : "aucun fourni, cherche-les"}
${compNets.length ? `Réseaux des concurrents (veille) : ${JSON.stringify(compNets).slice(0, 2500)}` : ""}

Cherche sur le web (5 recherches maximum) les profils publics de l'entreprise et de son dirigeant, leurs publications récentes, le nombre d'abonnés visible et le rythme de publication. Pense à ce que voit un prospect qui vérifie l'entreprise avant de répondre à un e-mail.

Règles :
- N'invente aucun chiffre (abonnés, vues, engagement). Si ce n'est pas visible publiquement, écris « non visible ».
- Distingue ce que tu as constaté (avec l'URL) de tes recommandations.
- Les posts proposés doivent viser les clients cibles (pas les particuliers ni les candidats) et ne rien affirmer qui ne figure pas dans les informations fournies (pas de faux chiffres ni de faux clients).

Format :
{"score": 0,
 "verdict": "2 phrases : ce qu'un prospect pense en voyant tes réseaux aujourd'hui",
 "profils": [{"reseau": "linkedin|instagram|facebook|tiktok|youtube|x", "url": "", "trouve": true, "type": "entreprise|dirigeant", "abonnes": "nombre ou non visible", "rythme": "ex. 1 post/mois, ou inactif depuis…", "dernier_post": "date + sujet ou non visible", "note": 0, "constat": "une phrase"}],
 "manquants": [{"reseau": "", "pourquoi": "pourquoi ce réseau compte pour tes cibles, ou pourquoi tu peux t'en passer"}],
 "forces": [""],
 "problemes": [{"texte": "", "priorite": "haute|moyenne|basse"}],
 "actions": [{"action": "", "reseau": "", "impact": "fort|moyen", "temps": "ex. 20 min"}],
 "bios": {"linkedin_titre": "titre de profil LinkedIn du dirigeant, 220 caractères max", "linkedin_info": "section Infos LinkedIn, 100 à 150 mots", "page_entreprise": "description de la page entreprise, 2 phrases", "instagram": "bio Instagram, 150 caractères max"},
 "concurrents": "ce que les concurrents font mieux ou moins bien sur les réseaux, ou vide",
 "piliers": ["3 ou 4 thèmes de contenu récurrents"],
 "plan": [{"semaine": 1, "jour": "lundi", "reseau": "linkedin", "format": "texte|carrousel|photo|vidéo courte|sondage", "sujet": "", "accroche": "première ligne du post", "texte": "post complet prêt à publier, 80 à 180 mots", "cible": "quel client il vise"}]}
Le plan contient 8 posts sur 2 semaines, majoritairement sur le réseau le plus utile pour les cibles. note et score vont de 0 à 100.`, {
    maxTokens: 14e3,
    tools: WEB2(5),
    system: "Tu es consultant senior en social selling B2B. Tu cites ce que tu as vu, tu n'inventes aucun chiffre et tu proposes des actions concrètes. Réponds en français."
  });
  if (!a || typeof a != "object" || !a.verdict && !a.plan) throw new HttpError(502, "L'audit est revenu incomplet, relance-le");
  let now = new Date().toISOString();
  return await admin.from("workspaces").update({
    socials,
    social_audit: a,
    social_audit_at: now
  }).eq("id", ws.id), await log(ws.id, "social", `Audit des réseaux : ${Number(a.score) || 0}/100`), {
    socials,
    audit: a,
    at: now
  };
}
async function autopilot(ws, base) {
  let { draft: draft2, enrich: enrich2, sendOne: sendOne2, followups: followups2 } = await Promise.resolve().then(()=>(init_agents(), agents_exports)), report = {}, hourParis = Number(new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "numeric",
    hourCycle: "h23"
  }).format(new Date)), dow = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short"
  }).format(new Date);
  if ([
    "Sat",
    "Sun"
  ].includes(dow) || hourParis < 8 || hourParis >= 18) return {
    skipped: "hors horaires"
  };
  if (repliesTracked(ws) && (report.relances = (await followups2(ws)).created), sendReady(ws)) {
    let since = new Date;
    since.setHours(0, 0, 0, 0);
    let { count } = await admin.from("messages").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString()), left = Math.min(3, warmup(ws).cap - (count ?? 0));
    if (left > 0) {
      let q = admin.from("messages").select("id, step").eq("workspace_id", ws.id).eq("status", "brouillon");
      repliesTracked(ws) || (q = q.eq("step", 0));
      let { data: todo } = await q.order("step", {
        ascending: !1
      }).order("created_at").limit(left);
      for (let m of todo ?? [])(await sendOne2(ws, m.id)).sent && (report.envoyes = (report.envoyes ?? 0) + 1, await log(ws.id, "envoi", "E-mail envoyé (pilote automatique)")), left--;
    }
  }
  try {
    let { autoWinners: autoWinners2 } = await Promise.resolve().then(()=>(init_campaigns(), campaigns_exports));
    report.gagnantes = await autoWinners2(ws);
  } catch (e) {
    console.error("a/b", e);
  }
  let { count: drafts } = await admin.from("messages").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0);
  if ((drafts ?? 0) < 10 && ws.sender_name) {
    let { data: ready2 } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "pret").neq("email", "").order("campaign_id", {
      ascending: !0,
      nullsFirst: !1
    }).limit(3);
    for (let p of ready2 ?? [])try {
      await draft2(ws, p), report.rediges = (report.rediges ?? 0) + 1, await log(ws.id, "redaction", "E-mail rédigé (pilote automatique)");
    } catch (e) {
      console.error(e);
    }
  }
  let { count: ready } = await admin.from("prospects").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id).eq("status", "pret");
  if ((ready ?? 0) < 15) {
    let since = new Date;
    since.setUTCHours(0, 0, 0, 0);
    let { count: done } = await admin.from("activity").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("kind", "enquete").gte("created_at", since.toISOString());
    if ((done ?? 0) < 30) {
      let { data: todo } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "nouveau").is("enriched_at", null).order("score", {
        ascending: !1,
        nullsFirst: !1
      }).limit(3);
      for (let p of todo ?? []){
        let t = (ws.targets ?? []).find((x)=>x.id === p.target);
        try {
          let r = await enrich2(p, t?.interlocuteur ?? "");
          report.enquetes = (report.enquetes ?? 0) + 1, await log(ws.id, "enquete", `${p.name} : ${r.email ? "e-mail trouvé" : "rien trouvé"} (pilote automatique)`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
  try {
    let { dropcontactPending: dropcontactPending2, deepEnrich: deepEnrich2 } = await Promise.resolve().then(()=>(init_deep(), deep_exports));
    report.dropcontact = await dropcontactPending2(ws);
    let since = new Date;
    since.setUTCHours(0, 0, 0, 0);
    let { count: deep } = await admin.from("activity").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("kind", "enquete_plus").gte("created_at", since.toISOString());
    if ((deep ?? 0) < 20) {
      let { data: hard } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "sans_email").lt("enrich_level", 2).order("score", {
        ascending: !1,
        nullsFirst: !1
      }).limit(1);
      for (let p of hard ?? []){
        let t = (ws.targets ?? []).find((x)=>x.id === p.target), r = await deepEnrich2(ws, p, t?.interlocuteur ?? "", !1);
        report.approfondies = (report.approfondies ?? 0) + 1, await log(ws.id, "enquete_plus", `${p.name} : ${r.email ? "e-mail trouvé" : `canal ${r.channel || "aucun"}`} (pilote automatique)`);
      }
    }
  } catch (e) {
    console.error("détective", e);
  }
  let { count: stock } = await admin.from("prospects").select("id", {
    count: "exact",
    head: !0
  }).eq("workspace_id", ws.id).eq("status", "nouveau");
  if ((stock ?? 0) < 30 && hourParis === 8) {
    let { searchTarget: searchTarget2 } = await Promise.resolve().then(()=>(init_search(), search_exports)), targets = ws.targets ?? [];
    for (let t of targets.filter((x)=>x.actif !== !1 && x.next_page !== null).slice(0, 2)){
      let r = await searchTarget2(ws.id, t, ws.zone ?? [], 1);
      t.next_page = r.nextPage, report.trouves = (report.trouves ?? 0) + r.inserted;
    }
    await admin.from("workspaces").update({
      targets
    }).eq("id", ws.id);
  }
  return report;
}
init_deep();
init_campaigns();
init_http();
init_core();
init_mail();
async function meetingReminders(ws) {
  let from = new Date(Date.now() + 648e5).toISOString(), to = new Date(Date.now() + 30 * 36e5).toISOString(), { data } = await admin.from("meetings").select("*, prospects(public_token)").eq("workspace_id", ws.id).eq("status", "confirme").is("reminded_at", null).gte("starts_at", from).lte("starts_at", to).limit(20), n = 0;
  for (let m of data ?? []){
    if (!m.contact_email) continue;
    let { data: claimed } = await admin.from("meetings").update({
      reminded_at: new Date().toISOString()
    }).eq("id", m.id).is("reminded_at", null).select("id");
    if (!claimed?.length) continue;
    let when = frSlot(new Date(m.starts_at)), mail = {
      to: m.contact_email,
      subject: `Rappel : notre échange ${when}`,
      text: `Bonjour ${m.contact_name || ""},

Petit rappel de notre échange prévu ${when} (${ws.meeting_minutes} minutes).
Lieu : ${ws.meeting_location}.

Si l'horaire ne vous convient plus, répondez simplement à cet e-mail et nous trouverons un autre moment.

${signature(ws)}`
    };
    try {
      sendReady(ws) ? await sendMail(ws, {
        ...mail,
        replyTo: replyAddress(ws, m.prospects?.public_token)
      }) : await sendSystem({
        ...mail,
        fromName: brand(ws),
        replyTo: await teamAddress(ws) || void 0
      }), n++;
    } catch (e) {
      console.error("rappel rdv", e), await admin.from("meetings").update({
        reminded_at: null
      }).eq("id", m.id);
    }
  }
  return n && await log(ws.id, "rdv", `${n} rappel${n > 1 ? "s" : ""} de rendez-vous envoyé${n > 1 ? "s" : ""}`), n;
}
async function meetingFollowup(ws, id, notes) {
  let { data: m } = await admin.from("meetings").select("*, prospects(*)").eq("id", id).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  let clean = notes.trim().slice(0, 6e3);
  if (clean.length < 15) throw new HttpError(400, "Note en quelques lignes ce qui s'est dit pendant le rendez-vous");
  let p = m.prospects, f = await askJson(`Tu aides ${ws.sender_name || "un commercial"} (${brand(ws)} : ${ws.profile?.offre ?? ""}) après un rendez-vous commercial avec ${m.contact_name}, ${m.company}${p ? ` (${p.activity}, ${p.city})` : ""}.
Notes prises pendant le rendez-vous :
${clean}

Catalogue de prix de l'entreprise (utilise-le pour chiffrer, n'invente aucun prix absent) : ${JSON.stringify(ws.catalog ?? []).slice(0, 2e3) || "vide"}
TVA : ${ws.vat_rate ?? 20} %.${knowledgeOf(ws) ? `
Fiche de l'entreprise (informations exactes utilisables dans l'e-mail) :
${knowledgeOf(ws)}` : ""}

Produis :
- un compte rendu factuel (besoin, décideurs, budget, délai, objections) à partir des notes uniquement ; « non abordé » si l'information manque ;
- la prochaine étape concrète à obtenir ;
- l'e-mail de suite à envoyer au prospect : remerciement bref, reformulation de son besoin avec ses mots, ce qu'on propose, la prochaine étape avec une date. 90 à 150 mots, vouvoiement, sans signature, sans rien promettre qui ne figure pas dans les notes ;
- une proposition chiffrée si les notes et le catalogue le permettent (sinon devis = null) ;
- chance : probabilité de signature de 0 à 100, honnête.
Format : {"resume": "", "besoin": "", "decideurs": "", "budget": "", "delai": "", "objections": [""], "prochaine_etape": "", "email": {"objet": "", "corps": ""}, "devis": {"titre": "", "recurrent": false, "lignes": [{"label": "", "qty": 1, "unit": "", "price": 0}]}, "chance": 50}`, {
    maxTokens: 4e3,
    system: "Tu es un directeur commercial B2B français. Tu es factuel, tu n'inventes rien et tu écris simplement."
  });
  if (!f?.email?.corps) throw new HttpError(502, "La suite n'a pas pu être préparée, réessaie");
  let followup = {
    ...f,
    notes: clean,
    at: new Date().toISOString(),
    sent: !1
  };
  await admin.from("meetings").update({
    followup,
    status: m.status === "confirme" ? "tenu" : m.status,
    notes: m.notes
  }).eq("id", id);
  let quoteId = null, lines = (f.devis?.lignes ?? []).filter((l)=>l.label && Number(l.price) > 0).slice(0, 20).map((l)=>({
      label: String(l.label).slice(0, 200),
      qty: Number(l.qty) || 1,
      unit: String(l.unit ?? "").slice(0, 30),
      price: Math.round(Number(l.price) * 100) / 100
    }));
  if (lines.length && m.prospect_id) {
    let { count } = await admin.from("quotes").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id), { data: q } = await admin.from("quotes").insert({
      workspace_id: ws.id,
      prospect_id: m.prospect_id,
      number: `D-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, "0")}`,
      title: String(f.devis?.titre ?? "").slice(0, 160),
      lines,
      recurring: lines.every((l)=>/mois|mensuel/i.test(l.unit)),
      vat_rate: ws.vat_rate ?? 20,
      total_ht: Math.round(lines.reduce((s, l)=>s + l.qty * l.price, 0) * 100) / 100,
      notes: "",
      valid_until: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
    }).select("id").single();
    quoteId = q?.id ?? null;
  }
  return m.prospect_id && await admin.from("prospects").update({
    next_action: f.prochaine_etape?.slice(0, 200) || "Envoyer la suite du rendez-vous",
    next_action_at: new Date().toISOString().slice(0, 10),
    notes: `${p?.notes ? p.notes + `
` : ""}RDV ${new Date(m.starts_at).toLocaleDateString("fr-FR")} : ${f.resume}`.slice(0, 4e3)
  }).eq("id", m.prospect_id), await log(ws.id, "rdv", `Compte rendu et suite préparés pour ${m.company}${quoteId ? " (proposition en brouillon)" : ""}`), {
    followup,
    quote_id: quoteId
  };
}
async function sendMeetingFollowup(ws, id, subject, body) {
  let { data: m } = await admin.from("meetings").select("*, prospects(public_token)").eq("id", id).eq("workspace_id", ws.id).single();
  if (!m) throw new HttpError(404, "Rendez-vous introuvable");
  if (!m.contact_email) throw new HttpError(400, "Pas d'e-mail pour ce contact");
  if (m.followup?.sent) throw new HttpError(409, "Cette suite a déjà été envoyée");
  let mail = {
    to: m.contact_email,
    subject: subject.slice(0, 160),
    text: `${body.trim()}

${signature(ws)}`
  };
  return sendReady(ws) ? await sendMail(ws, {
    ...mail,
    replyTo: replyAddress(ws, m.prospects?.public_token)
  }) : await sendSystem({
    ...mail,
    fromName: ws.sender_name || brand(ws),
    replyTo: await teamAddress(ws) || void 0
  }), await admin.from("meetings").update({
    followup: {
      ...m.followup ?? {},
      sent: !0,
      sent_at: new Date().toISOString(),
      email: {
        objet: subject,
        corps: body
      }
    }
  }).eq("id", id), await log(ws.id, "envoi", `Suite du rendez-vous envoyée à ${m.company}`), {
    ok: !0
  };
}
async function quoteReminders(ws, base) {
  if (!sendReady(ws)) return 0;
  let before = new Date(Date.now() - 4 * 864e5).toISOString(), { data } = await admin.from("quotes").select("*, prospects(*)").eq("workspace_id", ws.id).in("status", [
    "envoye",
    "vu"
  ]).is("reminded_at", null).lte("sent_at", before).limit(5), n = 0;
  for (let q of data ?? []){
    let p = q.prospects;
    if (!p?.email || [
      "refus",
      "client"
    ].includes(p.status)) continue;
    let { data: claimed } = await admin.from("quotes").update({
      reminded_at: new Date().toISOString()
    }).eq("id", q.id).is("reminded_at", null).select("id");
    if (claimed?.length) try {
      await sendMail(ws, {
        to: p.email,
        replyTo: replyAddress(ws, p.public_token),
        subject: `Re : Proposition ${brand(ws)} – ${q.title || p.name}`,
        text: `${p.contact_name ? `Bonjour ${p.contact_name},` : "Bonjour,"}

${q.status === "vu" ? "Je vois que vous avez pu consulter notre proposition." : "Je me permets de revenir vers vous au sujet de notre proposition."} Avez-vous des questions, ou des points à ajuster avant de valider ?

Le lien reste disponible ici : ${base}/devis/${q.token}

${signature(ws)}`
      }), n++;
    } catch (e) {
      console.error("relance devis", e);
    }
  }
  return n && await log(ws.id, "devis", `${n} devis relancé${n > 1 ? "s" : ""} (pilote automatique)`), n;
}
init_growth();
var LIMITS = {
  analyse: 6,
  recherche: 60,
  enquete: 40,
  redaction: 80,
  linkedin: 30,
  analyse_prospect: 40,
  brief: 20,
  script: 40,
  veille: 20,
  reponse: 60,
  social: 6,
  enquete_plus: 30,
  lettre: 40,
  campagne: 40
};
async function secret(name) {
  let { data } = await admin.from("app_secrets").select("value").eq("name", name).single();
  return data?.value ?? "";
}
var prospectOf = async (wsId, id)=>{
  let { data } = await admin.from("prospects").select("*").eq("id", String(id)).eq("workspace_id", wsId).single();
  if (!data) throw new HttpError(404, "Prospect introuvable");
  return data;
}, routes = {
  async analyze (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "analyse", LIMITS.analyse);
    let description = String(b.description ?? "").slice(0, 3e3), website = "", content = "";
    if (b.website && (website = normalizeUrl(String(b.website)), content = await readSite(website).catch((e)=>{
      if (!description) throw e;
      return "";
    })), !content && !description) throw new HttpError(400, "Donne l'adresse de ton site ou décris ton activité");
    let r = await analyze(content, description);
    return await admin.from("workspaces").update({
      website,
      profile: r.profile,
      targets: r.targets,
      zone: r.zone,
      name: ws.name || r.profile.nom || ""
    }).eq("id", ws.id), await log(ws.id, "analyse", `Analyse de ${website || "la description"} : ${r.targets.length} cibles définies`), r;
  },
  async count (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), targets = ws.targets ?? [];
    for (let t of targets)t.total = await countTarget(t, ws.zone ?? []).catch(()=>t.total);
    return await admin.from("workspaces").update({
      targets
    }).eq("id", ws.id), {
      targets
    };
  },
  async search (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), targets = ws.targets ?? [], chosen = targets.filter((t)=>t.actif !== !1 && (!b.target_id || t.id === b.target_id));
    if (!chosen.length) throw new HttpError(400, "Aucune cible active");
    let pages = Math.min(Math.max(Number(b.pages) || 2, 1), 4), inserted = 0, found = 0;
    for (let t of chosen){
      if (t.next_page === null) continue;
      await quota(ws.id, "recherche", LIMITS.recherche);
      let r = await searchTarget(ws.id, t, ws.zone ?? [], pages);
      t.next_page = r.nextPage, inserted += r.inserted, found += r.found, await log(ws.id, "recherche", `${t.label} : ${r.inserted} nouveaux établissements`);
    }
    return await admin.from("workspaces").update({
      targets
    }).eq("id", ws.id), {
      inserted,
      found
    };
  },
  async enrich (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), n = await quota(ws.id, "enquete", LIMITS.enquete, Math.min(Math.max(Number(b.count) || 3, 1), 4)), q = admin.from("prospects").select("*").eq("workspace_id", ws.id).is("enriched_at", null).in("status", [
      "nouveau"
    ]);
    Array.isArray(b.ids) && b.ids.length && (q = q.in("id", b.ids.slice(0, 4)));
    let { data } = await q.order("created_at", {
      ascending: !0
    }).limit(60), order = new Map((ws.targets ?? []).map((t, i)=>[
        t.id,
        i
      ])), batch = (data ?? []).sort((a, c)=>(order.get(a.target) ?? 9) - (order.get(c.target) ?? 9)).slice(0, n);
    if (!batch.length) return {
      done: 0,
      found: 0,
      remaining: 0
    };
    let res = await Promise.allSettled(batch.map((p)=>{
      let t = (ws.targets ?? []).find((x)=>x.id === p.target);
      return enrich(p, t?.interlocuteur ?? "");
    })), okN = res.filter((r)=>r.status === "fulfilled" && r.value.email).length, failed = res.filter((r)=>r.status === "rejected");
    for(let i = 0; i < batch.length; i++)await log(ws.id, "enquete", `${batch[i].name} : ${res[i].status === "fulfilled" && res[i].value.email ? "e-mail trouvé" : "rien trouvé"}`);
    if (failed.length === batch.length) throw failed[0].reason;
    let { count } = await admin.from("prospects").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).is("enriched_at", null);
    return {
      done: batch.length,
      found: okN,
      remaining: count ?? 0
    };
  },
  async draft (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    if (!ws.sender_name) throw new HttpError(400, "Indique d'abord le nom de l'expéditeur dans Réglages");
    let n = await quota(ws.id, "redaction", LIMITS.redaction, Math.min(Math.max(Number(b.count) || 5, 1), 6)), { data } = await admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("status", "pret").neq("email", "").order("created_at").limit(n), batch = data ?? [];
    if (!batch.length) return {
      done: 0,
      remaining: 0
    };
    let res = await Promise.allSettled(batch.map((p)=>draft(ws, p))), ok = res.filter((r)=>r.status === "fulfilled").length;
    if (!ok) throw res[0].reason;
    for(let i = 0; i < ok; i++)await log(ws.id, "redaction", "E-mail rédigé");
    let { count } = await admin.from("prospects").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("status", "pret");
    return {
      done: ok,
      remaining: count ?? 0
    };
  },
  async redraft (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "redaction", LIMITS.redaction);
    let { data: m } = await admin.from("messages").select("id, prospect_id, status").eq("id", String(b.message_id)).eq("workspace_id", ws.id).single();
    if (!m || m.status !== "brouillon") throw new HttpError(400, "Brouillon introuvable");
    let { data: p } = await admin.from("prospects").select("*").eq("id", m.prospect_id).single();
    await admin.from("messages").delete().eq("id", m.id);
    let r = await draft(ws, p);
    await log(ws.id, "redaction", "E-mail réécrit");
    let { data: fresh } = await admin.from("messages").select("*").eq("id", r.id).single();
    return fresh;
  },
  async linkedin (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), n = await quota(ws.id, "linkedin", LIMITS.linkedin, Math.min(Math.max(Number(b.count) || 3, 1), 4)), q = admin.from("prospects").select("*").eq("workspace_id", ws.id).eq("linkedin_status", "").not("status", "in", "(refus,ignore,client)");
    Array.isArray(b.ids) && b.ids.length ? q = q.in("id", b.ids.slice(0, 4)) : q = q.in("status", [
      "sans_email",
      "envoye",
      "pret",
      "a_valider"
    ]);
    let { data } = await q.order("updated_at", {
      ascending: !1
    }).limit(n), batch = data ?? [];
    if (!batch.length) return {
      done: 0,
      found: 0
    };
    let res = await Promise.allSettled(batch.map((p)=>linkedin(ws, p))), ok = res.filter((r)=>r.status === "fulfilled");
    if (!ok.length) throw res[0].reason;
    for (let _ of ok)await log(ws.id, "linkedin", "Profil LinkedIn recherché");
    return {
      done: ok.length,
      found: ok.filter((r)=>r.value.linkedin_status === "a_envoyer").length
    };
  },
  async followups (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await followups(ws);
  },
  async "reply-paste" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "reponse", LIMITS.reponse);
    let text = String(b.text ?? "").slice(0, 8e3);
    if (text.trim().length < 2) throw new HttpError(400, "Colle le texte de la réponse");
    let p = b.prospect_id ? await prospectOf(ws.id, b.prospect_id) : null;
    return await handleReply(ws, p, {
      fromEmail: String(b.from_email ?? p?.email ?? ""),
      subject: String(b.subject ?? ""),
      text
    }, baseOf(ws));
  },
  async "reply-send" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await sendReply(ws, String(b.reply_id), String(b.subject ?? ""), String(b.body ?? "")), {
      ok: !0
    };
  },
  async "reply-domain" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await setReplyDomain(ws);
  },
  async "reply-domain-check" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await checkReplyDomain(ws);
  },
  async slots (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return {
      slots: (await freeSlots(ws, 14)).slice(0, 60).map((d)=>d.toISOString())
    };
  },
  async brief (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "brief", LIMITS.brief), await log(ws.id, "brief", "Fiche de rendez-vous préparée"), await brief(ws, String(b.meeting_id));
  },
  async insight (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), ids = (Array.isArray(b.ids) ? b.ids : [
      b.prospect_id
    ]).filter(Boolean).slice(0, 3), n = await quota(ws.id, "analyse_prospect", LIMITS.analyse_prospect, ids.length || 1), out = [];
    for (let id of ids.slice(0, n))out.push(await insight(ws, await prospectOf(ws.id, id))), await log(ws.id, "analyse_prospect", "Prospect analysé");
    return {
      results: out
    };
  },
  async "call-script" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "script", LIMITS.script), await log(ws.id, "script", "Script d'appel préparé"), await callScript(ws, await prospectOf(ws.id, b.prospect_id));
  },
  async "quote-send" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await sendQuote(ws, String(b.quote_id), baseOf(ws)), {
      ok: !0
    };
  },
  async "quote-totals" (_req, b) {
    return quoteTotals({
      lines: b.lines ?? [],
      vat_rate: Number(b.vat_rate ?? 20)
    });
  },
  async "competitor-check" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "veille", LIMITS.veille), await checkCompetitor(ws, String(b.competitor_id), !!b.force);
  },
  async "campaign-suggest" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "campagne", LIMITS.campagne), await suggestVariants(ws, String(b.target_id ?? ""), String(b.goal ?? "rdv"));
  },
  async "campaign-create" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await createCampaign(ws, b);
  },
  async "campaign-analyze" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "campagne", LIMITS.campagne), await log(ws.id, "campagne", "Campagne analysée"), await analyzeCampaign(ws, String(b.campaign_id ?? ""));
  },
  async "competitor-ads" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "veille", LIMITS.veille), await competitorAds(ws, String(b.competitor_id ?? ""));
  },
  async "enrich-deep" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    await dropcontactPending(ws).catch((e)=>console.error(e));
    let n = await quota(ws.id, "enquete_plus", LIMITS.enquete_plus, 1), q = admin.from("prospects").select("*").eq("workspace_id", ws.id).lt("enrich_level", 2).in("status", [
      "sans_email",
      "nouveau"
    ]);
    Array.isArray(b.ids) && b.ids.length ? q = admin.from("prospects").select("*").eq("workspace_id", ws.id).in("id", b.ids.slice(0, 1)) : q = q.eq("status", "sans_email").order("score", {
      ascending: !1,
      nullsFirst: !1
    });
    let { data } = await q.limit(n), out = [];
    for (let p of data ?? []){
      let t = (ws.targets ?? []).find((x)=>x.id === p.target), r = await deepEnrich(ws, p, t?.interlocuteur ?? "");
      await log(ws.id, "enquete_plus", `${p.name} : ${r.email ? "e-mail trouvé" : `canal ${r.channel || "aucun"}`}`), out.push(r);
    }
    let { count } = await admin.from("prospects").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("status", "sans_email").lt("enrich_level", 2);
    return {
      results: out,
      found: out.filter((r)=>r.email).length,
      remaining: count ?? 0
    };
  },
  async letter (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "lettre", LIMITS.lettre), await log(ws.id, "lettre", b.kind === "courrier" ? "Lettre préparée" : "Message de formulaire préparé"), await letter(ws, await prospectOf(ws.id, b.prospect_id), assertKind(b.kind));
  },
  async credits (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await credits(ws);
  },
  async "social-audit" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    await quota(ws.id, "social", LIMITS.social);
    let given = b.socials && typeof b.socials == "object" ? b.socials : {};
    return await socialAudit(ws, given);
  },
  async "competitor-suggest" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "veille", LIMITS.veille), await log(ws.id, "veille", "Recherche de concurrents"), {
      suggestions: await suggestCompetitors(ws)
    };
  },
  async "public-booking" (_req, b) {
    let { ws, p } = await bookingInfo(String(b.slug ?? ""), b.t ? String(b.t) : null), slots = await freeSlots(ws, 21);
    return {
      company: ws.profile?.nom || ws.name,
      person: ws.sender_name,
      duration: ws.meeting_minutes,
      location: ws.meeting_location,
      slots: slots.slice(0, 150).map((d)=>d.toISOString()),
      prefill: p ? {
        name: p.contact_name,
        email: p.email,
        company: p.name,
        phone: p.phone
      } : null
    };
  },
  async "public-book" (_req, b) {
    return await book(String(b.slug ?? ""), b);
  },
  async "public-quote" (_req, b) {
    return await publicQuote(String(b.token ?? ""));
  },
  async "public-sign" (req, b) {
    let ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    return await signQuote(String(b.token ?? ""), String(b.name ?? ""), b.accept !== !1, ip);
  },
  async inbound (req, b) {
    let key = new URL(req.url).searchParams.get("key") ?? "";
    if (!key || key !== await secret("inbound_key")) throw new HttpError(401, "Clé invalide");
    return await inbound(b);
  },
  async autopilot (req) {
    if ((req.headers.get("x-cron-key") ?? "") !== await secret("cron_key")) throw new HttpError(401, "Clé invalide");
    let { data: list } = await admin.from("workspaces").select("*").eq("autonomy", "auto").eq("onboarded", !0), out = {};
    for (let ws of list ?? [])try {
      out[ws.id] = await autopilot(ws, baseOf(ws));
    } catch (e) {
      out[ws.id] = {
        error: e.message
      };
    }
    let { data: every } = await admin.from("workspaces").select("*").eq("onboarded", !0);
    for (let ws of every ?? [])try {
      let r = await meetingReminders(ws), d = ws.autonomy === "auto" ? await quoteReminders(ws, baseOf(ws)) : 0;
      (r || d) && (out[`suivi_${ws.id}`] = {
        rappels: r,
        devis: d
      });
    } catch (e) {
      out[`suivi_${ws.id}`] = {
        error: e.message
      };
    }
    let { data: crm } = await admin.from("workspaces").select("*").or("integrations->hubspot->>ok.eq.true,integrations->pipedrive->>ok.eq.true");
    for (let ws of crm ?? [])try {
      out[`crm_${ws.id}`] = await syncCrm(ws);
    } catch (e) {
      out[`crm_${ws.id}`] = {
        error: e.message
      };
    }
    return out;
  },
  async domain (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await setDomain(ws, String(b.domain ?? ""));
  },
  async "domain-check" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await checkDomain(ws);
  },
  async send (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    canSend(ws);
    let since = new Date;
    since.setHours(0, 0, 0, 0);
    let { count } = await admin.from("messages").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString()), cap = warmup(ws).cap;
    if ((count ?? 0) >= cap) throw new HttpError(429, cap < ws.daily_limit ? `Préchauffage en cours : ${cap} envois maximum aujourd'hui. La limite monte chaque semaine pour protéger ta réputation d'expéditeur.` : `Limite de ${cap} envois par jour atteinte : la suite partira demain (ça protège ton domaine)`);
    let r = await sendOne(ws, String(b.message_id));
    return r.sent && await log(ws.id, "envoi", "E-mail envoyé"), {
      ...r,
      sent_today: (count ?? 0) + (r.sent ? 1 : 0),
      limit: cap
    };
  },
  async warmup (req, b) {
    let { ws } = await requireMember(req, b.workspace_id), since = new Date;
    since.setHours(0, 0, 0, 0);
    let { count } = await admin.from("messages").select("id", {
      count: "exact",
      head: !0
    }).eq("workspace_id", ws.id).eq("status", "envoye").gte("sent_at", since.toISOString());
    return {
      ...warmup(ws),
      sent_today: count ?? 0,
      limit: ws.daily_limit,
      started: ws.warmup_started
    };
  },
  async "mailbox-options" () {
    return {
      providers: Object.entries(MAILBOXES).map(([key, v])=>({
          key,
          ...v
        }))
    };
  },
  async "mailbox-save" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "integration", 20), await saveMailbox(ws, b);
  },
  async "mailbox-remove" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await removeMailbox(ws);
  },
  async "team-invite" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await invite(ws, userId, b);
  },
  async "team-revoke" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await revokeInvite(ws, userId, String(b.invite_id ?? ""));
  },
  async "team-member" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await setMember(ws, userId, String(b.user_id ?? ""), String(b.action ?? ""));
  },
  async "team-distribute" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await distribute(ws, userId, b);
  },
  async "team-join" (req, b) {
    return await join(req, String(b.token ?? ""));
  },
  async "crm-connect" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "integration", 20), await connectCrm(ws, b);
  },
  async "crm-sync" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await syncCrm(ws, 40);
  },
  async "meeting-followup" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await quota(ws.id, "brief", LIMITS.brief), await meetingFollowup(ws, String(b.meeting_id ?? ""), String(b.notes ?? ""));
  },
  async "meeting-followup-send" (req, b) {
    let { ws } = await requireMember(req, b.workspace_id);
    return await sendMeetingFollowup(ws, String(b.meeting_id ?? ""), String(b.subject ?? ""), String(b.body ?? ""));
  },
  async plans () {
    return {
      plans: plans()
    };
  },
  async "billing-checkout" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await checkout(ws, userId, String(b.plan ?? ""));
  },
  async "billing-portal" (req, b) {
    let { ws, userId } = await requireMember(req, b.workspace_id);
    return await portal(ws, userId);
  }
};
Deno.serve(wrap(async (req)=>{
  let parts = new URL(req.url).pathname.split("/").filter(Boolean), name = parts[parts.indexOf("k") + 1] ?? "";
  if (name === "calendar" && req.method === "GET") {
    let ics = await calendarFeed(new URL(req.url).searchParams.get("t") ?? "");
    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "max-age=900",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  if (name === "stripe-webhook" && req.method === "POST") return json(await stripeWebhook(req));
  let h = routes[name];
  if (!h) throw new HttpError(404, "Action inconnue");
  if (req.method !== "POST") throw new HttpError(405, "POST attendu");
  return json(await h(req, await readJson(req)));
}));
