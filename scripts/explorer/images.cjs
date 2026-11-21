// Explorer – images : l'image de présentation de chaque SaaS (balise og:image / twitter:image de sa page d'accueil),
// pour les cartes de l'Explorer. Sans IA, sans navigateur : une simple lecture de la page, 10 sites à la fois.
// Les SaaS de TrustMRR ont déjà leur capture (reprise à part) ; un site sans image garde un logo.
const court = (e) => String(e?.message ?? e).split(/[\n{:]/)[0].slice(0, 60); // journaux publics : jamais de données ni de requête
const TOK = process.env.SUPABASE_ACCESS_TOKEN, REF = "fbsjbnnmzazylmquzryo";
const FIN = Date.now() + Number(process.env.MINUTES || 120) * 60_000;
const UA = "Mozilla/5.0 (compatible; BingooBot/1.0; +https://kairo.maisonravita.fr/#/retrait)";

async function q(sql, n = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${TOK}`, "Content-Type": "application/json", "User-Agent": "bingoo-ci" }, body: JSON.stringify({ query: sql }) });
  if ((r.status === 429 || r.status >= 500) && n < 6) { await new Promise((ok) => setTimeout(ok, 5000 * (n + 1))); return q(sql, n + 1); }
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
const lit = (v) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const meta = (h, n) => h.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']+)["']`, "i"))?.[1]
  ?? h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${n}["']`, "i"))?.[1];

async function imageDe(domaine) {
  try {
    const r = await fetch(`https://${domaine}`, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const h = (await r.text()).slice(0, 300_000);
    let u = meta(h, "og:image") ?? meta(h, "og:image:url") ?? meta(h, "twitter:image") ?? meta(h, "twitter:image:src");
    if (!u) return null;
    u = u.replace(/&amp;/g, "&").trim();
    const abs = new URL(u, r.url).href;
    if (!/^https:\/\//.test(abs) || abs.length > 600 || /\.svg(\?|$)/i.test(abs)) return null;
    return abs;
  } catch { return null; }
}

(async () => {
  const rows = await q(`select id, domaine from public.saas where statut = 'ok' and image is null and (image_at is null or image_at < now() - interval '30 days') order by score_croissance desc nulls last limit 40000`);
  console.log("SaaS sans image :", rows.length);
  let i = 0, trouvees = 0, lot = [];
  const vider = async () => {
    if (!lot.length) return;
    const l = lot; lot = [];
    await q(`update public.saas s set image = v.u, image_at = now() from (values ${l.map((x) => `(${lit(x.id)}::uuid, ${lit(x.u)})`).join(",")}) v(id, u) where s.id = v.id`).catch((e) => console.error("écriture", court(e)));
  };
  const ouvrier = async () => {
    while (i < rows.length && Date.now() < FIN) {
      const r = rows[i++];
      const u = await imageDe(r.domaine);
      if (u) trouvees++;
      lot.push({ id: r.id, u });
      if (lot.length >= 50) await vider();
    }
  };
  await Promise.all(Array.from({ length: 10 }, ouvrier));
  await vider();
  console.log("images trouvées :", trouvees, "/", i);
})().catch((e) => { console.error("arrêt :", court(e)); process.exit(1); });
