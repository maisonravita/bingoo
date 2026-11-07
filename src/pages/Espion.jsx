import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Spinner, useToast } from "../components/ui";
import { cx, fmtTime } from "../lib/utils";
import { Ads, Analysis } from "./Competitors";
import CompanyLogo from "../components/CompanyLogo";

const TABS = [["vue", "Vue d'ensemble"], ["reseaux", "Réseaux sociaux"], ["pubs", "Publicités"], ["seo", "Site web & SEO"], ["position", "Positionnement"], ["battlecard", "Battlecard"]];
const NET = { youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", linkedin: "LinkedIn", facebook: "Facebook", x: "X (Twitter)" };
const NETC = { youtube: "#FF0000", tiktok: "#111", instagram: "#E1306C", linkedin: "#0A66C2", facebook: "#1877F2", x: "#111" };
const fmtN = (n) => n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : n.toLocaleString("fr-FR");
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const txt = (x) => (typeof x === "string" ? x : x?.texte ?? "").replace(/<\/?cite[^>]*>/g, "");
// Pour l'affichage compact : sans URL entre parenthèses (les sources restent dans l'onglet Positionnement)
const clean = (x) => txt(x).replace(/\s*\(?https?:\/\/\S+\)?/g, "").replace(/\s+([.,;])/g, "$1").trim();
const found = (v) => v && /\d/.test(String(v)) && !/non trouv/i.test(String(v));
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const Dot = ({ net }) => <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ background: NETC[net] ?? "#9A9CA3" }} />;
const Check = ({ tone = "good", children }) => (
  <p className="flex items-start gap-2.5 text-sm mt-2.5">
    <span className={cx("mt-0.5 grid place-items-center h-4 w-4 rounded-full shrink-0 text-white text-[10px]", tone === "good" ? "bg-good" : tone === "warn" ? "bg-[#F5A524]" : "bg-accent")}>{tone === "good" ? "✓" : tone === "warn" ? "!" : "→"}</span>
    <span className="line-clamp-3">{children}</span>
  </p>
);

/** Indicateurs mesurés : YouTube et TikTok lus directement ; les autres réseaux tels que trouvés sur le web (avec la mention). */
function Stats({ so, s }) {
  const web = (net) => (so?.web ?? s?.reseaux?.presence ?? []).find((p) => p.reseau === net && found(p.abonnes));
  const items = [];
  if (so?.tiktok?.followers != null) items.push({ net: "tiktok", v: fmtN(so.tiktok.followers), l: "Abonnés TikTok", src: "mesuré" });
  else if (web("tiktok")) items.push({ net: "tiktok", v: web("tiktok").abonnes || "—", l: "Abonnés TikTok", src: "web" });
  if (web("instagram")) items.push({ net: "instagram", v: web("instagram").abonnes || "—", l: "Abonnés Instagram", src: "web" });
  if (so?.youtube?.subscribers != null) items.push({ net: "youtube", v: fmtN(so.youtube.subscribers), l: "Abonnés YouTube", src: "mesuré" });
  else if (web("youtube")) items.push({ net: "youtube", v: web("youtube").abonnes || "—", l: "Abonnés YouTube", src: "web" });
  if (web("linkedin") && items.length < 4) items.push({ net: "linkedin", v: web("linkedin").abonnes || "—", l: "Abonnés LinkedIn", src: "web" });
  const perMonth = (so?.youtube?.per_month ?? 0) + (so?.tiktok?.per_month ?? 0);
  if (so?.youtube || so?.tiktok?.videos?.length) items.push({ v: String(Math.round(perMonth * 10) / 10).replace(".", ","), l: "Publications / mois", src: "mesuré", icon: "bars" });
  if (so?.youtube?.engagement != null) items.push({ v: `${String(so.youtube.engagement).replace(".", ",")} %`, l: "J'aime / vues (YouTube)", src: "mesuré", icon: "heart" });
  if (!items.length) return null;
  // « 210 000 abonnés », « 8,3 k » → affichage court ; sinon le texte tel que trouvé
  const short = (v) => {
    const t = String(v ?? "").replace(/\u00a0|\u202f/g, " ");
    const m = t.match(/(\d[\d\s.,]*)\s*(k|K|M|millions?|mille)?/);
    if (!m) return t.slice(0, 10) || "—";
    let n = parseFloat(m[1].replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
    if (/^(k|K|mille)/.test(m[2] ?? "")) n *= 1e3; if (/^(M|million)/.test(m[2] ?? "")) n *= 1e6;
    return isFinite(n) ? (/[≈~]|environ|plus de/i.test(t) ? "≈ " : "") + fmtN(Math.round(n)) : t.slice(0, 10);
  };
  return (
    <Card className="grid grid-cols-2 lg:grid-cols-5 gap-y-4 p-4">
      {items.slice(0, 5).map((it, i) => (
        <div key={i} className="flex items-center gap-3 px-2">
          {it.net ? <span className="grid place-items-center h-9 w-9 rounded-xl text-white text-xs font-bold shrink-0" style={{ background: NETC[it.net] }}>{NET[it.net][0]}</span>
            : <span className="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent shrink-0">{it.icon === "heart" ? "♥" : "▮▮"}</span>}
          <div className="min-w-0"><p className="text-xl font-semibold leading-none truncate">{it.src === "mesuré" ? it.v : short(it.v)}</p><p className="text-[11px] text-ink-soft mt-1 leading-tight">{it.l}</p><p className="text-[10px] text-ink-faint">{it.src === "mesuré" ? "mesuré par Kairo" : "trouvé sur le web"}</p></div>
        </div>
      ))}
    </Card>
  );
}

function Thumb({ v }) {
  const [err, setErr] = useState(false);
  const tt = v.net === "tiktok";
  return (
    <div className={cx("relative bg-paper", tt ? "aspect-[3/4]" : "aspect-video")}>
      {v.thumb && !err ? <img src={v.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} className="absolute inset-0 h-full w-full object-cover" />
        : <div className="absolute inset-0 grid place-items-center text-white/80 text-2xl" style={{ background: tt ? "linear-gradient(135deg,#111,#2b2b2b)" : "linear-gradient(135deg,#b00,#e33)" }}>▶</div>}
      <span className="absolute left-1.5 top-1.5 rounded text-white text-[9px] font-bold px-1" style={{ background: tt ? "#111" : "#FF0000" }}>{tt ? "TikTok" : "YT"}</span>
    </div>
  );
}

function Overview({ c, so, s }) {
  const [net, setNet] = useState("all");
  const all = so?.posts?.length ? so.posts : (so?.youtube?.videos ?? []).map((v) => ({ ...v, net: "youtube" }));
  const nets = [...new Set(all.map((v) => v.net))];
  const vids = all.filter((v) => net === "all" || v.net === net);
  const months = so?.months ?? [];
  const max = Math.max(1, ...months.map((m) => m.n));
  const missing = [!so?.youtube && "YouTube", !(so?.tiktok?.videos?.length) && "TikTok"].filter(Boolean);
  return (
    <div className="space-y-5">
      <Stats so={so} s={s} />
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h3 className="font-semibold text-lg">Dernières publications</h3><p className="text-sm text-ink-soft">Leurs contenus récents, lus directement sur les plateformes.</p></div>
          <div className="flex gap-2">
            {so?.youtube?.url && <a href={so.youtube.url} target="_blank" rel="noreferrer" className="text-xs rounded-full border border-line px-3 py-1.5 hover:border-ink-faint">YouTube ↗</a>}
            {so?.tiktok?.url && <a href={so.tiktok.url} target="_blank" rel="noreferrer" className="text-xs rounded-full border border-line px-3 py-1.5 hover:border-ink-faint">TikTok ↗</a>}
          </div>
        </div>
        {nets.length > 1 && <div className="flex gap-2 mt-3">{[["all", "Tous"], ...nets.map((n) => [n, NET[n]])].map(([k, l]) => <button key={k} onClick={() => setNet(k)} className={cx("rounded-full border px-3 py-1 text-xs font-medium", net === k ? "border-accent bg-accent-soft text-accent-dark" : "border-line bg-white text-ink-soft")}>{l}{k !== "all" && <span className="ml-1 text-ink-faint">{all.filter((v) => v.net === k).length}</span>}</button>)}</div>}
        {vids.length ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
            {vids.slice(0, 15).map((v) => (
              <a key={v.url} href={v.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-line overflow-hidden bg-white hover:shadow-md transition-shadow">
                <Thumb v={v} />
                <div className="p-2.5"><p className="text-[13px] font-medium leading-snug line-clamp-2">{v.title || "Sans titre"}</p>
                  {v.date && <p className="text-[11px] text-ink-faint mt-1">{new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>}
                  <p className="text-[11px] text-ink-soft mt-1">{v.views != null && <>▷ {fmtN(v.views)}</>}{v.likes != null && <> · ♥ {fmtN(v.likes)}</>}</p></div>
              </a>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-ink-soft rounded-xl bg-paper p-4">{so ? "Aucune chaîne YouTube ni compte TikTok lisible trouvé pour ce concurrent." : "Lance la mesure pour voir leurs dernières publications."}</p>}
        {so && missing.length > 0 && all.length > 0 && <p className="text-[11px] text-ink-faint mt-3">Non trouvé ou non lisible : {missing.join(", ")}. Instagram, LinkedIn et X ne laissent pas lire les publications sans connexion officielle : leurs chiffres publics sont dans « Réseaux sociaux ».</p>}
      </Card>
      {(so?.themes?.length > 0 || all.length > 0) && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-5">
            <h3 className="font-semibold">Thématiques les plus abordées</h3>
            {so.themes?.length ? so.themes.map((t, i) => (
              <div key={t.theme} className="mt-3 text-sm"><div className="flex justify-between gap-2"><span className="truncate">{t.theme}</span><span className="tabular-nums text-ink-soft">{t.pct} %</span></div>
                <span className="mt-1 block h-2 rounded-full bg-paper overflow-hidden"><span className="block h-full rounded-full bg-accent" style={{ width: `${t.pct}%`, opacity: 1 - i * 0.15 }} /></span></div>
            )) : <p className="text-sm text-ink-soft mt-2">Pas assez de publications pour conclure.</p>}
            <p className="text-[11px] text-ink-faint mt-3">Sur leurs {all.length} dernières publications</p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Fréquence de publication</h3>
            <div className="mt-4 h-36 flex items-end gap-2">
              {months.map((m) => (
                <div key={m.m} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] text-ink-soft tabular-nums">{m.n}</span>
                  <span className="w-full rounded-t-md bg-gradient-to-t from-accent to-[#FF9A5C]" style={{ height: `${(m.n / max) * 100}%`, minHeight: m.n ? 6 : 2, opacity: m.n ? 1 : 0.25 }} />
                  <span className="text-[11px] text-ink-faint">{MOIS[Number(m.m.slice(5, 7)) - 1]}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-faint mt-3">Publications YouTube et TikTok par mois (sur les dernières publications lisibles)</p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold">Mots-clés récurrents</h3>
            {so.keywords?.length ? <div className="flex flex-wrap gap-2 mt-3">{so.keywords.map((k) => <span key={k.word} className="rounded-lg border border-line px-2.5 py-1 text-sm">{k.word} <span className="text-ink-faint text-xs">{k.n}</span></span>)}</div> : <p className="text-sm text-ink-soft mt-2">Aucun mot ne revient assez souvent.</p>}
            {so.hashtags?.length > 0 && <p className="text-sm mt-3 text-ink-soft">{so.hashtags.slice(0, 8).map((h) => `#${h.word}`).join(" ")}</p>}
            <p className="text-[11px] text-ink-faint mt-3">Comptés dans les textes de leurs publications</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Socials({ so, s }) {
  const all = so?.web?.length ? so.web : s?.reseaux?.presence ?? [];
  const list = all.filter((x) => /^https?:/.test(x.url ?? "") || found(x.abonnes));
  const missing = all.filter((x) => !list.includes(x)).map((x) => NET[x.reseau] ?? x.reseau);
  const r = s?.reseaux;
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-semibold text-lg">Présence sur les réseaux</h3>
        <p className="text-sm text-ink-soft">Comptes trouvés par la recherche, avec les chiffres publics visibles au moment de l'analyse.</p>
        {!list.length ? <p className="text-sm text-ink-soft mt-4">Aucun compte trouvé.</p> : (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {list.map((x, i) => {
              const measured = x.reseau === "youtube" && so?.youtube?.subscribers != null ? fmtN(so.youtube.subscribers) : x.reseau === "tiktok" && so?.tiktok?.followers != null ? fmtN(so.tiktok.followers) : null;
              return (
                <div key={i} className="rounded-xl border border-line p-4">
                  <div className="flex items-center gap-2"><Dot net={x.reseau} /><p className="font-semibold">{NET[x.reseau] ?? x.reseau}</p>{/^https?:/.test(x.url ?? "") && <a href={x.url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-ink-faint underline">voir ↗</a>}</div>
                  <p className="text-sm mt-2"><b>{measured ?? (found(x.abonnes) ? x.abonnes : "—")}</b> <span className="text-ink-soft">abonnés</span> <span className="text-[11px] text-ink-faint">({measured ? "mesuré par Kairo" : "trouvé sur le web"})</span></p>
                  {x.rythme && !/^non trouv/i.test(x.rythme) && <p className="text-sm text-ink-soft">Rythme : {clean(x.rythme)}</p>}
                  {x.sujets && !/^non trouv/i.test(x.sujets) && <p className="text-sm mt-1">{clean(x.sujets)}</p>}
                </div>
              );
            })}
          </div>
        )}
        {missing.length > 0 && <p className="text-xs text-ink-faint mt-3">Aucun compte trouvé sur : {missing.join(", ")}.</p>}
      </Card>
      {r && (
        <Card className="p-5 text-sm">
          {r.synthese && <p className="text-[15px]">{r.synthese}</p>}
          {r.a_eviter?.length > 0 && <><p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mt-5 mb-1">À éviter</p>{r.a_eviter.map((x, i) => <p key={i} className="mt-1">✕ {txt(x)}</p>)}</>}
        </Card>
      )}
    </div>
  );
}

function Seo({ so }) {
  const st = so?.site;
  if (!st) return <p className="text-sm text-ink-soft">Lance la mesure pour analyser leur site.</p>;
  if (!st.ok) return <p className="text-sm text-ink-soft">Leur site n'a pas pu être lu (code {st.status || "inconnu"}).</p>;
  const rows = [
    ["Titre de la page d'accueil", st.title || "Absent", st.title && st.title.length <= 65 ? "good" : "warn", st.title ? `${st.title.length} caractères` : ""],
    ["Méta-description", st.description || "Absente", st.description ? "good" : "warn", st.description ? `${st.description.length} caractères` : "Google en fabrique une lui-même"],
    ["Titre principal (H1)", st.h1?.join(" · ") || "Absent", st.h1?.length === 1 ? "good" : "warn", st.h1?.length > 1 ? `${st.h1.length} titres H1` : ""],
    ["Pages déclarées (sitemap)", st.sitemap_pages ? st.sitemap_pages.toLocaleString("fr-FR") : "Pas de sitemap trouvé", st.sitemap_pages ? "good" : "warn", ""],
    ["Blog ou ressources", st.blog ? host(st.blog) + new URL(st.blog).pathname : "Non trouvé", st.blog ? "good" : "warn", st.blog ? "Ils publient du contenu" : ""],
    ["Données structurées", st.schema ? `${st.schema} bloc${st.schema > 1 ? "s" : ""}` : "Aucune", st.schema ? "good" : "warn", ""],
    ["Partage réseaux (Open Graph)", st.og ? "Présent" : "Absent", st.og ? "good" : "warn", ""],
    ["Indexation", st.noindex ? "Bloquée (noindex)" : "Autorisée", st.noindex ? "warn" : "good", ""],
    ["Temps de réponse", `${(st.load_ms / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} s`, st.load_ms < 1500 ? "good" : "warn", `${st.weight_kb} Ko de HTML`],
    ["Texte sur l'accueil", `${st.words.toLocaleString("fr-FR")} mots`, st.words > 300 ? "good" : "warn", `${st.internal_links} liens internes`],
  ];
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-lg">Leur site, mesuré</h3>
      <p className="text-sm text-ink-soft">Lu directement sur <a className="underline" href={st.url} target="_blank" rel="noreferrer">{host(st.url)}</a>, le {fmtTime(so.at)}.</p>
      <div className="mt-4 divide-y divide-line">
        {rows.map(([k, v, tone, note]) => (
          <div key={k} className="py-3 grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 text-sm">
            <p className="text-ink-soft flex items-center gap-2"><span className={cx("h-2 w-2 rounded-full", tone === "good" ? "bg-good" : "bg-[#F5A524]")} />{k}</p>
            <p>{v}{note && <span className="text-ink-faint"> · {note}</span>}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AiPanel({ s, onPlan }) {
  const works = (s?.reseaux?.ce_qui_marche ?? []).map(clean).filter((x) => !/^non mesurable|non trouv/i.test(x)).concat((s?.forces ?? []).map(clean)).filter(Boolean).slice(0, 4);
  const weak = (s?.faiblesses ?? []).map(clean).filter(Boolean).slice(0, 3);
  const opps = (s?.reseaux?.angles_a_reprendre ?? []).map(clean).concat((s?.opportunites ?? []).map(clean)).filter(Boolean).slice(0, 4);
  return (
    <Card className="p-5 lg:sticky lg:top-6">
      <div className="flex items-center gap-2"><span className="text-accent text-lg">✦</span><h3 className="font-semibold text-lg">Analyse IA</h3></div>
      {!s ? <p className="text-sm text-ink-soft mt-3">L'analyse apparaît une fois la veille lancée.</p> : <>
        <p className="font-semibold mt-5">Ce qui fonctionne</p>{works.map((x, i) => <Check key={i}>{x}</Check>)}
        <p className="font-semibold mt-6">Axes d'amélioration possibles</p>{weak.length ? weak.map((x, i) => <Check key={i} tone="warn">{x}</Check>) : <p className="text-sm text-ink-soft mt-2">Rien de solide trouvé.</p>}
        <p className="font-semibold mt-6">Opportunités pour vous</p>{opps.map((x, i) => <Check key={i} tone="accent">{x}</Check>)}
        <Button variant="accent" className="w-full mt-6" onClick={onPlan}>Voir le plan d'action →</Button>
        <p className="text-[11px] text-ink-faint mt-2">Chaque fait est sourcé dans l'onglet Positionnement. Les hypothèses sont signalées comme telles.</p>
      </>}
    </Card>
  );
}

/** Bureau d'analyse d'un concurrent (fiche complète). Utilisé seul ou ouvert depuis le centre Espion. */
export function CompetitorDesk({ embedded = false, focusId = null, onChanged }) {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState("vue");
  const [plan, setPlan] = useState(false);

  const load = useCallback(async (keep) => {
    const { data } = await supabase.from("competitors").select("*").eq("workspace_id", ws.id).order("created_at");
    setRows(data ?? []);
    setSel((cur) => (data ?? []).find((c) => c.id === (keep ?? cur?.id ?? focusId)) ?? (data ?? [])[0] ?? null);
    return data ?? [];
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);

  const measure = async (c, full) => {
    try {
      if (full || !c.summary) { setBusy("analyse"); await fn("competitor-check", { workspace_id: ws.id, competitor_id: c.id, force: !!c.summary }); }
      setBusy("mesure"); await fn("r/spy-social", { workspace_id: ws.id, competitor_id: c.id });
      await load(c.id); onChanged?.(); toast("Analyse terminée", "good");
    } catch (e) { toast(e.message, "bad"); await load(c.id); } finally { setBusy(null); }
  };
  const analyse = async (e) => {
    e?.preventDefault(); if (!q.trim()) return;
    setBusy("resolve");
    try {
      const r = await fn("r/spy-resolve", { workspace_id: ws.id, query: q });
      const known = (rows ?? []).find((c) => host(c.url) === host(r.url));
      let c = known;
      if (!c) { const { data, error } = await supabase.from("competitors").insert({ workspace_id: ws.id, url: r.url, name: r.name }).select("*").single(); if (error) throw new Error(error.message); c = data; }
      setQ(""); setSel(c); setTab("vue"); await measure(c, !c.summary);
    } catch (e2) { toast(e2.message, "bad"); setBusy(null); }
  };
  const remove = async (c) => { await supabase.from("competitors").delete().eq("id", c.id); setSel(null); load(); onChanged?.(true); };

  const c = sel; const s = c?.summary; const so = c?.social;
  const running = busy && { resolve: "Recherche de leur site officiel…", analyse: "Lecture du site, du registre, de l'actualité, des avis et des réseaux… (1 à 2 minutes)", mesure: "Mesure des réseaux et du site…" }[busy];

  return (
    <div className="space-y-5">
      {!embedded && <div className="grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div>
          <h1 className="font-black text-[40px] leading-none tracking-tight" style={{ fontFamily: "Nunito, Geist, system-ui, sans-serif" }}>Espion</h1>
          <p className="text-ink-soft mt-2">Analyse tes concurrents et découvre ce qui marche pour eux, chiffres et sources à l'appui.</p>
          <form onSubmit={analyse} className="mt-5 flex flex-col sm:flex-row gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du concurrent ou site web…" className="flex-1 rounded-xl border border-line bg-white px-4 py-3 text-[15px] outline-none focus:border-accent" />
            <Button type="submit" variant="accent" loading={busy === "resolve"} disabled={!!busy && busy !== "resolve"} className="px-6">Analyser →</Button>
          </form>
        </div>
        <Card className="p-4 bg-accent-soft/50 border-accent-soft flex gap-3"><span className="text-2xl">💡</span><div><p className="font-semibold text-accent text-sm">Astuce</p><p className="text-sm text-ink-soft">Suis plusieurs concurrents pour comparer leurs stratégies et repérer les angles que personne n'occupe.</p></div></Card>
      </div>}

      {!embedded && rows?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rows.map((x) => <button key={x.id} onClick={() => { setSel(x); setTab("vue"); }} className={cx("rounded-full border px-3 py-1.5 text-sm", x.id === c?.id ? "border-accent bg-accent-soft text-accent-dark font-medium" : "border-line bg-white hover:border-ink-faint")}>{x.name || x.summary?.nom || host(x.url)}</button>)}
        </div>
      )}

      {!rows ? <Spinner /> : !c ? (
        <Card className="p-10 text-center"><p className="font-serif text-2xl">Quel concurrent veux-tu analyser ?</p><p className="text-ink-soft mt-2 text-sm">Écris son nom ou colle son site : Kairo lit son site, ses réseaux, ses publicités et son positionnement.</p></Card>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <Card className="p-5 flex flex-wrap items-center gap-4">
              <CompanyLogo name={c.name || s?.nom} url={c.url} className="h-14 w-14 text-2xl" pad="p-2" />
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-2xl font-semibold">{c.name || s?.nom || host(c.url)}</h2>
                <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-ink-soft hover:underline">{c.url.replace(/^https?:\/\//, "")}</a>
                {s?.offre && <p className="text-sm mt-1 line-clamp-2">{s.offre}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button quota="espion" variant="accent" loading={!!busy && busy !== "resolve"} onClick={() => measure(c, true)}>{s ? "Actualiser l'analyse" : "Lancer l'analyse"}</Button>
                <span className="text-[11px] text-ink-faint">{c.social_at ? `Mesuré ${fmtTime(c.social_at)}` : c.checked_at ? `Analysé ${fmtTime(c.checked_at)}` : "Jamais analysé"} · <button className="underline" onClick={() => remove(c)}>retirer</button></span>
              </div>
            </Card>
            {running && <Card className="p-4 flex items-center gap-3 text-sm"><Spinner />{running}</Card>}

            <div className="flex gap-1 overflow-x-auto">
              {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full px-4 py-2 text-sm font-medium", tab === k ? "bg-accent-soft text-accent-dark" : "text-ink-soft hover:text-ink")}>{l}</button>)}
            </div>

            {tab === "vue" && <Overview c={c} so={so} s={s} />}
            {tab === "reseaux" && <Socials so={so} s={s} />}
            {tab === "pubs" && <Card className="p-5"><Ads c={c} onChange={() => load(c.id)} /></Card>}
            {tab === "seo" && <Seo so={so} />}
            {tab === "position" && (s ? <Card className="p-5"><Analysis s={s} tab="synthese" /><div className="mt-6 pt-5 border-t border-line"><Analysis s={s} tab="comparatif" /></div></Card> : <p className="text-sm text-ink-soft">Lance l'analyse pour voir leur positionnement.</p>)}
            {tab === "battlecard" && (s ? <Card className="p-5"><Analysis s={s} tab="battlecard" /></Card> : <p className="text-sm text-ink-soft">Lance l'analyse pour obtenir la battlecard.</p>)}
          </div>
          <AiPanel s={s} onPlan={() => setPlan(true)} />
        </div>
      )}

      {plan && s && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-ink/30" onClick={() => setPlan(false)} aria-label="Fermer" />
          <Card className="relative max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Plan d'action face à {c.name || s.nom}</p>
            <h3 className="font-serif text-3xl mt-1">Cette semaine</h3>
            <ol className="mt-4 space-y-3 text-sm">{(s.actions ?? []).map((x, i) => <li key={i} className="flex gap-3"><span className="grid place-items-center h-6 w-6 rounded-full bg-accent text-white text-xs shrink-0">{i + 1}</span><span>{x}</span></li>)}</ol>
            {s.battlecard?.pitch && <div className="mt-5 rounded-xl bg-ink text-white p-4 text-sm"><p className="text-xs uppercase tracking-wider text-white/60 mb-1">Ta différence en rendez-vous</p>{s.battlecard.pitch}</div>}
            <Button variant="ghost" className="w-full mt-5" onClick={() => setPlan(false)}>Fermer</Button>
          </Card>
        </div>
      )}
    </div>
  );
}

export default CompetitorDesk;
