import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { useToast } from "../components/ui";
import { cx } from "../lib/utils";
import CompanyLogo from "../components/CompanyLogo";

/** Page « Alternative à [concurrent] » : rédigée depuis le dossier, à publier sur le site ; ses lecteurs sont repérés par le Radar. */
function AltPage({ c, ws, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [readers, setReaders] = useState(null);
  const p = c.alt_page;
  const rival = (c.name || "").replace(/\s*[—(].*$/, "").trim();
  useEffect(() => {
    if (!p?.slug) return;
    supabase.from("site_events").select("org, created_at").eq("workspace_id", ws.id).ilike("path", `%${p.slug}%`).gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString()).limit(2000)
      .then(({ data }) => { const m = {}; for (const e of data ?? []) { const k = e.org || "—"; m[k] = m[k] ? { n: m[k].n + 1, at: m[k].at > e.created_at ? m[k].at : e.created_at } : { n: 1, at: e.created_at }; } setReaders({ total: (data ?? []).length, orgs: Object.entries(m).filter(([k]) => k !== "—").sort((a, b) => b[1].n - a[1].n) }); });
  }, [p?.slug, ws.id]);
  const make = async (force) => { setBusy(true); try { await fn("r/alt-page", { workspace_id: ws.id, competitor_id: c.id, force }); await onSaved(); toast("Page rédigée : relis-la avant de la publier", "good"); } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); } };
  const copy = async () => { await navigator.clipboard.writeText(p.html); toast("Code de la page copié", "good"); };
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.titre}</title><meta name="description" content="${p.meta.replace(/"/g, "&quot;")}"></head><body>${p.html}</body></html>`], { type: "text/html" })); a.download = `${p.slug}.html`; a.click(); };
  return (
    <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
      <h2 className="font-black text-[22px]" style={NUNITO}>Attire ceux qui cherchent une alternative à {rival}</h2>
      <p className="text-[14px] text-ink-soft mt-1 max-w-3xl">Quand une entreprise tape « alternative à {rival} » ou « {rival} avis » sur Google, elle tombe sur cette page de ton site. Le Radar te dit ensuite quelle entreprise l'a lue, pour la contacter au bon moment. La page n'utilise que les faits sourcés du dossier et respecte les règles de la publicité comparative.</p>
      {!p ? (
        <button onClick={() => make(false)} disabled={busy} className="mt-5 rounded-full bg-accent text-white px-5 py-2.5 font-semibold hover:bg-accent-dark disabled:opacity-60">{busy ? "Rédaction… (environ 1 minute)" : "Rédiger ma page « Alternative à " + rival + " »"}</button>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-2.5 text-[13px]">
            <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Adresse conseillée</p><p className="mt-1 font-mono break-all">/{p.slug}</p></div>
            <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Titre Google</p><p className="mt-1">{p.titre}</p></div>
            <div className="rounded-xl bg-paper/70 border border-line p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Description Google</p><p className="mt-1">{p.meta}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="rounded-full bg-ink text-white px-4 py-2 text-[14px] font-semibold">Copier le code de la page</button>
            <button onClick={download} className="rounded-full border border-line px-4 py-2 text-[14px] font-semibold hover:bg-paper">Télécharger la page</button>
            <button onClick={() => make(true)} disabled={busy} className="rounded-full border border-line px-4 py-2 text-[14px] font-semibold text-ink-soft hover:bg-paper disabled:opacity-60">{busy ? "Rédaction…" : "Réécrire avec le dernier dossier"}</button>
          </div>
          <p className="text-[12.5px] text-ink-faint">À publier sur ton site à l'adresse conseillée. Relis-la avant : tu es responsable de ce qui est publié. Le code inclut le suivi des visiteurs.</p>
          {readers && <div className="rounded-xl bg-paper/70 border border-line p-3 text-[13px]"><p className="font-semibold">{readers.total ? `${readers.total} lecture${readers.total > 1 ? "s" : ""} ces 60 derniers jours` : "Pas encore de lecture repérée (page pas encore publiée, ou visiteurs non identifiables)"}</p>{readers.orgs.map(([o, v]) => <p key={o}>{o} <span className="text-ink-faint">· {v.n} vue{v.n > 1 ? "s" : ""}, le {new Date(v.at).toLocaleDateString("fr-FR")}</span></p>)}</div>}
          <iframe title="Aperçu" sandbox="" srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">${p.html.replace(/<script[\s\S]*?<\/script>/g, "")}</body>`} className="w-full h-[640px] rounded-2xl border border-line bg-white" />
        </div>
      )}
    </section>
  );
}

// Dossier complet d'un concurrent, rempli par l'espionne. Tout est sourcé ; l'inconnu est dit, jamais inventé.
const ACC = "#E0531F";
const NUNITO = { fontFamily: "var(--font-titre)" };
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u ?? ""; } };
const txt = (x) => String(typeof x === "string" ? x : x?.texte ?? x?.text ?? "").replace(/<\/?cite[^>]*>/g, "").replace(/\s+/g, " ").trim();
const unknown = (v) => !v || /^non trouv|^inconnu|^non pr[ée]cis/i.test(v);
/** Première phrase utile, pour les tuiles (le texte complet reste au survol). */
const first = (x, max = 90) => { const t = txt(x).replace(/\s*\(?https?:\/\/\S+\)?/g, ""); if (unknown(t)) return ""; const s = t.split(/(?<=[.;])\s/)[0]; return s.length > max ? `${s.slice(0, max - 1)}…` : s; };
const srcs = (x) => String(typeof x === "object" ? x?.source ?? "" : "").split(/\s*;\s*/).filter((u) => /^https?:\/\//.test(u));
const nameOf = (c) => (c.name || c.summary?.nom || host(c.url)).replace(/\s*[—(].*$/, "").trim();
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dateFr = (d) => { const m = String(d ?? "").match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? `${m[3] ? `${Number(m[3])} ` : ""}${MOIS[Number(m[2]) - 1]} ${m[1]}` : txt(d); };
const fmtN = (n) => n == null ? "" : n >= 1e6 ? `${(n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M` : n >= 1e4 ? `${Math.round(n / 1e3)} k` : Number(n).toLocaleString("fr-FR");

const I = {
  back: <path d="M15 6l-6 6 6 6" />, ext: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></>, check: <path d="m5 12 4 4 10-10" />, x: <path d="M6 6l12 12M18 6L6 18" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />, target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  play: <path d="M8 5v14l11-7z" />, heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />, eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12" /><circle cx="12" cy="12" r="3" /></>,
};
const Ico = ({ n, className = "w-5 h-5", fill }) => <svg viewBox="0 0 24 24" className={cx(className, "shrink-0")} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[n]}</svg>;

function Card({ title, sub, children, className }) {
  return (
    <section className={cx("rounded-2xl bg-white border border-line p-5 sm:p-6 min-w-0", className)}>
      {title && <div className="mb-4"><h3 className="font-black text-[19px] leading-tight" style={NUNITO}>{title}</h3>{sub && <p className="text-[13px] text-ink-faint mt-0.5">{sub}</p>}</div>}
      {children}
    </section>
  );
}
const Src = ({ x }) => { const l = srcs(x); return l.length ? <span className="inline-flex flex-wrap gap-x-2">{l.slice(0, 2).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[11.5px] text-accent-dark hover:underline">{host(u)}<Ico n="ext" className="w-3 h-3" /></a>)}</span> : null; };
const Nothing = ({ children = "Non trouvé pour l'instant : l'espionne réessaiera au prochain rapport." }) => <p className="text-[13.5px] text-ink-faint">{children}</p>;
const Tag = ({ fact }) => <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", fact ? "bg-good-soft text-good" : "bg-[#FDF3E1] text-[#B45309]")}>{fact ? "Fait" : "Hypothèse"}</span>;
const POS = { devant: ["Devant toi", "bg-bad-soft text-bad"], derriere: ["Derrière toi", "bg-good-soft text-good"], egal: ["À égalité", "bg-paper text-ink-soft border border-line"], inconnu: ["Position à établir", "bg-paper text-ink-soft border border-line"] };

function Threat({ n }) {
  const v = Number(n) || 0;
  return <span className="inline-flex items-center gap-2 rounded-full bg-paper border border-line px-3 py-1 text-[12.5px] font-semibold"><span className="inline-flex gap-0.5">{[1, 2, 3, 4, 5].map((k) => <span key={k} className="h-2 w-3.5 rounded-full" style={{ background: k <= v ? (v >= 4 ? "#DC2626" : v >= 3 ? "#D97706" : "#1F7A4D") : "#E7E5DF" }} />)}</span>Menace {v}/5</span>;
}

/* ---------- Onglets ---------- */
function Synthese({ s }) {
  const p = s.position ?? {};
  return (
    <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-4">
      <div className="space-y-4 min-w-0">
        <Card title="Leur position face à toi">
          {p.verdict && POS[p.verdict] && <span className={cx("inline-flex rounded-full px-3 py-1 text-[13px] font-bold", POS[p.verdict][1])}>{POS[p.verdict][0]}</span>}
          {p.pourquoi?.length ? <ul className="mt-4 space-y-3">{p.pourquoi.map((x, i) => <li key={i} className="flex gap-3 text-[14px] leading-relaxed"><span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: ACC }} /><span>{txt(x)}</span></li>)}</ul> : <Nothing>La comparaison détaillée arrive au prochain rapport.</Nothing>}
        </Card>
        {s.menace?.pourquoi && <Card title="Pourquoi cette menace"><p className="text-[14px] leading-relaxed text-ink-soft">{txt(s.menace.pourquoi)}</p></Card>}
      </div>
      <div className="space-y-4 min-w-0">
        <Card title="À faire cette semaine" sub="Recommandations de l'espionne">
          {s.actions?.length ? <ol className="space-y-3">{s.actions.map((a, i) => <li key={i} className="flex gap-3 text-[14px] leading-snug"><span className="grid place-items-center h-6 w-6 rounded-full text-white text-[12px] font-bold shrink-0" style={{ background: ACC }}>{i + 1}</span><span>{txt(a)}</span></li>)}</ol> : <Nothing />}
        </Card>
        <Card title="Dernières actualités">
          {s.actualites?.length ? <ol className="space-y-3.5">{s.actualites.slice(0, 4).map((a, i) => (
            <li key={i} className="border-l-2 pl-3" style={{ borderColor: ACC }}><p className="text-[11.5px] font-semibold text-ink-faint uppercase tracking-wide">{dateFr(a.date)}</p><p className="text-[14px] font-semibold mt-0.5">{txt(a.titre)}</p>{a.impact && <p className="text-[13px] text-ink-soft mt-0.5">{txt(a.impact)}</p>}<Src x={a} /></li>
          ))}</ol> : <Nothing />}
        </Card>
      </div>
    </div>
  );
}

function OffrePrix({ s }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4 min-w-0">
        <Card title="Ce qu'ils vendent">{s.offre ? <p className="text-[14px] leading-relaxed">{txt(s.offre)}</p> : <Nothing />}</Card>
        <Card title="Leur positionnement">{s.positionnement ? <p className="text-[14px] leading-relaxed text-ink-soft">{txt(s.positionnement)}</p> : <Nothing />}</Card>
      </div>
      <div className="space-y-4 min-w-0">
        <Card title="Leurs tarifs">
          {s.prix?.affiches && !unknown(txt(s.prix.affiches)) ? <p className="rounded-xl bg-accent-soft/50 border border-accent/15 p-4 text-[14.5px] leading-relaxed">{txt(s.prix.affiches)}</p> : <Nothing>Tarifs non publiés.</Nothing>}
          {s.prix?.indices?.length > 0 && <ul className="mt-4 space-y-3">{s.prix.indices.map((x, i) => <li key={i} className="text-[13.5px] text-ink-soft leading-snug"><span>{txt(x)}</span> <Src x={x} /></li>)}</ul>}
        </Card>
        <Card title="Qui ils ciblent">{s.cibles ? <p className="text-[14px] leading-relaxed text-ink-soft">{txt(s.cibles)}</p> : <Nothing />}</Card>
      </div>
    </div>
  );
}

function ClientsAcq({ s }) {
  const a = s.acquisition ?? {}, c = s.clients ?? {};
  return (
    <div className="space-y-4">
      <Card title="Comment ils trouvent leurs clients">
        {a.methode ? <p className="text-[15px] leading-relaxed">{txt(a.methode)}</p> : <Nothing>Méthode d'acquisition analysée au prochain rapport.</Nothing>}
        {a.canaux?.length > 0 && <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">{a.canaux.map((k, i) => (
          <div key={i} className="rounded-xl border border-line bg-paper/60 p-4"><p className="font-bold text-[14px]">{txt(k.canal)}</p><p className="text-[13px] text-ink-soft mt-1 leading-snug">{txt(k.preuve)}</p><div className="mt-1.5"><Src x={k} /></div></div>
        ))}</div>}
      </Card>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Leurs clients">
          {c.types ? <p className="text-[14px] leading-relaxed">{txt(c.types)}</p> : <Nothing />}
          {c.references?.length > 0 && <><p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint mt-4 mb-2">Références publiques</p><div className="flex flex-wrap gap-2">{c.references.map((r, i) => <span key={i} className="rounded-full bg-paper border border-line px-3 py-1 text-[13px]">{txt(r.nom ?? r)}</span>)}</div></>}
        </Card>
        <Card title="Leur audience">{c.audience && !unknown(txt(c.audience)) ? <p className="text-[14px] leading-relaxed text-ink-soft">{txt(c.audience)}</p> : <Nothing />}</Card>
      </div>
    </div>
  );
}

function Thumb({ v }) {
  const [err, setErr] = useState(false);
  return (
    <a href={v.url} target="_blank" rel="noreferrer" className="group rounded-xl overflow-hidden border border-line bg-white hover:shadow-md transition min-w-0">
      <div className="relative aspect-video bg-paper">
        {v.thumb && !err ? <img src={v.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-ink-faint"><Ico n="play" fill className="w-8 h-8" /></div>}
        <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition bg-black/25"><span className="h-10 w-10 rounded-full bg-white/90 grid place-items-center"><Ico n="play" fill className="w-4 h-4 text-ink ml-0.5" /></span></span>
      </div>
      <div className="p-2.5"><p className="text-[12.5px] font-semibold leading-snug line-clamp-2">{v.title || "Sans titre"}</p><p className="text-[11px] text-ink-faint mt-1">{v.date ? new Date(v.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""}{v.views != null ? ` · ${fmtN(v.views)} vues` : ""}</p></div>
    </a>
  );
}

function PubsReseaux({ c, s }) {
  const ads = c.ads ?? {}, so = c.social ?? {}, r = s.reseaux ?? {};
  const NET = { linkedin: ["LinkedIn", "#0A66C2"], youtube: ["YouTube", "#FF0000"], instagram: ["Instagram", "#E1306C"], tiktok: ["TikTok", "#111111"], facebook: ["Facebook", "#1877F2"], x: ["X", "#111111"] };
  const pres = (so.web ?? r.presence ?? []).filter((p) => NET[p.reseau]);
  const measured = { youtube: so.youtube?.subscribers, tiktok: so.tiktok?.followers };
  const nets = Object.keys(NET).map((k) => ({ k, p: pres.find((x) => x.reseau === k), m: measured[k] })).filter((x) => x.m != null || (x.p && !unknown(txt(x.p.url))));
  const posts = (so.posts?.length ? so.posts : (so.youtube?.videos ?? []).map((v) => ({ ...v, net: "youtube" }))).slice(0, 8);
  const pubs = ads.pubs ?? [];
  return (
    <div className="space-y-4">
      <Card title="Leurs réseaux" sub="Chiffres mesurés par Bingoo! quand c'est possible, sinon tels que publiés">
        {nets.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{nets.map(({ k, p, m }) => {
          const big = m != null ? fmtN(m) : first(p?.abonnes, 30).replace(/\s*abonn\S*/i, "").replace(/[.\s]+$/, "");
          return (
            <a key={k} href={p?.url && /^http/.test(p.url) ? p.url : undefined} target="_blank" rel="noreferrer" className="rounded-xl border border-line p-4 flex gap-3 hover:border-ink/20 transition min-w-0">
              <span className="h-10 w-10 rounded-xl grid place-items-center text-white font-bold shrink-0" style={{ background: NET[k][1] }}>{NET[k][0][0]}</span>
              <span className="min-w-0"><span className="block text-[12px] text-ink-faint">{NET[k][0]}</span><span className="block font-black text-[22px] leading-tight" style={NUNITO}>{big || "—"}</span><span className="block text-[11.5px] text-ink-faint">{m != null ? "abonnés · mesuré" : big ? "abonnés · publié" : "abonnés non publiés"}</span>{p?.rythme && !unknown(txt(p.rythme)) && <span className="block text-[12px] text-ink-soft mt-1 line-clamp-2">{first(p.rythme, 80)}</span>}</span>
            </a>
          );
        })}</div> : <Nothing>Aucun compte confirmé pour l'instant.</Nothing>}
        {r.synthese && <p className="mt-4 text-[14px] text-ink-soft leading-relaxed">{txt(r.synthese)}</p>}
      </Card>
      {posts.length > 0 && <Card title="Leurs dernières publications" sub="Lues directement sur les plateformes">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{posts.map((v) => <Thumb key={v.url} v={v} />)}</div>
        {so.themes?.length > 0 && <div className="mt-5 grid md:grid-cols-2 gap-x-8 gap-y-2.5">{so.themes.slice(0, 6).map((t) => (
          <div key={t.theme} className="text-[13px]"><div className="flex justify-between gap-2"><span className="truncate">{t.theme}</span><span className="tnum text-ink-faint">{t.pct} %</span></div><span className="mt-1 block h-1.5 rounded-full bg-paper overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${t.pct}%`, background: ACC }} /></span></div>
        ))}</div>}
      </Card>}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Leurs publicités" sub={c.ads_at ? `Relevé du ${new Date(c.ads_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "Relevé chaque semaine"}>
          <AdsHistory c={c} fallback={pubs} />
          {ads.angles?.length > 0 && <><p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint mt-5 mb-2">Leurs arguments marketing</p><ul className="space-y-2">{ads.angles.map((x, i) => <li key={i} className="text-[13.5px] leading-snug flex gap-2"><span style={{ color: ACC }}>•</span>{txt(x)}</li>)}</ul></>}
        </Card>
        <Card title="Leurs actions marketing">
          {ads.actions?.length ? <ol className="space-y-3">{ads.actions.slice(0, 6).map((a, i) => <li key={i} className="border-l-2 border-line pl-3"><p className="text-[11.5px] font-semibold text-ink-faint uppercase tracking-wide">{txt(a.type)}{a.date ? ` · ${first(a.date, 40)}` : ""}</p><p className="text-[13.5px] mt-0.5 leading-snug">{txt(a.titre)}</p><Src x={a} /></li>)}</ol> : <Nothing>Aucune action relevée pour l'instant.</Nothing>}
          {r.ce_qui_marche?.length > 0 && <><p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint mt-5 mb-2">Ce qui marche pour eux</p><ul className="space-y-2">{r.ce_qui_marche.map((x, i) => <li key={i} className="text-[13.5px] leading-snug flex gap-2"><span className="text-good">✓</span>{txt(x)}</li>)}</ul></>}
        </Card>
      </div>
    </div>
  );
}

/** Historique des pubs : toutes celles vues (même arrêtées), classées par performance (durée, versions, encore active). */
function AdsHistory({ c, fallback }) {
  const { ws } = useWs();
  const [d, setD] = useState(null);
  const [view, setView] = useState("marche");
  useEffect(() => { fn("r/ads-history", { workspace_id: ws.id, competitor_id: c.id }).then(setD).catch(() => setD({ ads: [] })); }, [ws.id, c.id, c.ads_at]);
  if (!d) return <p className="text-[13px] text-ink-faint">Chargement…</p>;
  const all = d.ads ?? [];
  if (!all.length) return fallback?.length ? <ul className="space-y-3">{fallback.map((p, i) => <li key={i} className="rounded-xl border border-line p-3.5"><p className="text-[14px] font-semibold">{txt(p.message || p.titre || p.texte || p.offre)}</p><p className="text-[12px] text-ink-faint mt-1">{[p.plateforme, p.format, p.depuis || p.date].map(txt).filter(Boolean).join(" · ")}</p><Src x={p} /></li>)}</ul>
    : <Nothing>{c.ads ? "Aucune publicité trouvée pour l'instant." : "Relevé des publicités au prochain passage."}</Nothing>;
  const lists = { marche: all.filter((a) => a.works), actives: all.filter((a) => a.active), arretees: all.filter((a) => !a.active), toutes: all };
  const shown = (lists[view].length || view !== "marche" ? lists[view] : all).slice(0, 12);
  const dfr = (x) => x ? new Date(x).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">{[["marche", "Celles qui marchent"], ["actives", "En cours"], ["arretees", "Arrêtées"], ["toutes", "Toutes"]].map(([k, l]) => <button key={k} onClick={() => setView(k)} className={cx("rounded-full px-3 py-1 text-[12.5px] font-semibold", view === k ? "bg-ink text-white" : "bg-paper text-ink-soft hover:text-ink")}>{l} ({lists[k].length})</button>)}</div>
      {view === "arretees" && lists.arretees.length > 0 && <p className="text-[12.5px] text-ink-soft mb-2">Des messages qu'il a abandonnés : ils n'ont sans doute pas marché. Évite-les, ou prends l'angle qu'il a lâché.</p>}
      <ul className="space-y-2.5">{shown.map((a) => (
        <li key={a.key} className="rounded-xl border border-line p-3.5">
          <div className="flex items-start gap-2">
            <p className="text-[14px] font-semibold flex-1 line-clamp-3">{a.body}</p>
            {a.works && <span className="shrink-0 rounded-full bg-good-soft text-good px-2 py-0.5 text-[11px] font-bold">Elle marche</span>}
          </div>
          <p className="text-[12px] text-ink-faint mt-1">{[a.platform, a.format, a.active ? `en cours depuis ${a.days} j` : `a tourné ${a.days} j, arrêtée`, a.versions > 1 ? `${a.versions} versions` : "", a.reach ? `${Number(a.reach).toLocaleString("fr-FR")} personnes touchées` : "", `vue du ${dfr(a.started || a.first_seen)}`].filter(Boolean).join(" · ")}</p>
          {(a.snapshot_url || a.link) && <a href={a.snapshot_url || a.link} target="_blank" rel="noreferrer" className="text-[12px] text-accent hover:underline">Voir la pub</a>}
        </li>
      ))}</ul>
      <p className="text-[11.5px] text-ink-faint mt-3">{d.meta ? "Source : bibliothèque publicitaire officielle de Meta (dates exactes)." : "Historique construit à partir des relevés hebdomadaires d'Espion. Pour les dates exactes, branche la bibliothèque publicitaire Meta."} « Elle marche » = diffusée 30 jours ou plus, ou déclinée en 3 versions.</p>
    </div>
  );
}

function ForcesFaiblesses({ s }) {
  const Col = ({ title, items, tone, icon }) => (
    <Card title={title}>
      {items?.length ? <ul className="space-y-3.5">{items.map((x, i) => (
        <li key={i} className="flex gap-3"><span className={cx("mt-0.5 h-6 w-6 rounded-full grid place-items-center shrink-0", tone)}><Ico n={icon} className="w-3.5 h-3.5" /></span>
          <div className="min-w-0"><div className="flex items-start gap-2"><p className="text-[14px] leading-snug flex-1">{txt(x)}</p>{x?.type && <Tag fact={x.type !== "hypothese"} />}</div><Src x={x} /></div></li>
      ))}</ul> : <Nothing />}
    </Card>
  );
  return <div className="grid lg:grid-cols-2 gap-4"><Col title="Leurs forces" items={s.forces} tone="bg-good-soft text-good" icon="check" /><Col title="Leurs faiblesses, à exploiter" items={s.faiblesses} tone="bg-accent-soft text-accent-dark" icon="bolt" /></div>;
}

function Battle({ s }) {
  const b = s.battlecard ?? {};
  const L = ({ t, items, tone, mark }) => items?.length ? <Card title={t}><ul className="space-y-2.5">{items.map((x, i) => <li key={i} className="text-[14px] leading-snug flex gap-2.5"><span className="font-bold" style={{ color: tone }}>{mark}</span><span>{txt(x)}</span></li>)}</ul></Card> : null;
  return (
    <div className="space-y-4">
      {b.pitch && <section className="rounded-2xl bg-ink text-white p-6"><p className="text-[12px] font-bold uppercase tracking-[.15em] text-white/60">Ta différence, en rendez-vous</p><p className="mt-2 text-[17px] leading-relaxed">{txt(b.pitch)}</p></section>}
      {b.objections?.length > 0 && <Card title="Objections et réponses">
        <div className="space-y-2.5">{b.objections.map((o, i) => (
          <details key={i} className="group rounded-xl border border-line bg-paper/50 p-4" open={i === 0}>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold text-[14.5px]">« {txt(o.objection).replace(/^«\s*|\s*»$/g, "")} »<span className="text-ink-faint group-open:rotate-90 transition">›</span></summary>
            <p className="mt-2.5 text-[14px] text-ink-soft leading-relaxed">{txt(o.reponse)}</p>
          </details>
        ))}</div>
      </Card>}
      <div className="grid lg:grid-cols-2 gap-4">
        <L t="Quand on gagne" items={b.quand_on_gagne} tone="#1F7A4D" mark="✓" />
        <L t="Quand on perd" items={b.quand_on_perd} tone="#DC2626" mark="✕" />
        <L t="Questions à poser au prospect" items={b.questions_pieges} tone={ACC} mark="?" />
        <L t="À ne pas dire" items={b.a_ne_pas_dire} tone="#B45309" mark="!" />
      </div>
    </div>
  );
}

function Historique({ c, s }) {
  const mp = (s.marches_publics ?? []).filter((m) => !unknown(txt(m.objet)) && !/aucun march/i.test(txt(m.objet)));
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Ce qui a changé, rapport après rapport">
        {(c.history ?? []).length ? <ol className="space-y-4">{c.history.map((h, i) => <li key={i} className="border-l-2 pl-3" style={{ borderColor: i ? "#E7E5DF" : ACC }}><p className="text-[12px] font-semibold text-ink-faint">{new Date(h.at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p><p className="text-[14px] leading-relaxed mt-0.5">{txt(h.changes)}</p></li>)}</ol> : <Nothing />}
      </Card>
      <div className="space-y-4 min-w-0">
        <Card title="Toutes leurs actualités">{s.actualites?.length ? <ol className="space-y-3">{s.actualites.map((a, i) => <li key={i}><p className="text-[12px] font-semibold text-ink-faint">{dateFr(a.date)}</p><p className="text-[14px]">{txt(a.titre)}</p><Src x={a} /></li>)}</ol> : <Nothing />}</Card>
        <Card title="Marchés publics remportés">{mp.length ? <ul className="space-y-3">{mp.map((m, i) => <li key={i} className="text-[13.5px]"><p className="font-semibold">{txt(m.objet)}</p><p className="text-ink-faint text-[12px]">{[txt(m.acheteur), txt(m.montant), txt(m.date)].filter((v) => v && !unknown(v)).join(" · ")}</p><Src x={m} /></li>)}</ul> : <Nothing>Aucun marché public trouvé.</Nothing>}</Card>
      </div>
    </div>
  );
}

const TABS = [["synthese", "Synthèse"], ["offre", "Offre et prix"], ["clients", "Clients et acquisition"], ["pubs", "Publicités et réseaux"], ["ff", "Forces et faiblesses"], ["battle", "Battlecard"], ["page", "Page « Alternative à »"], ["histo", "Historique"]];

/** Le dossier, en pleine page. */
export default function CompetitorDossier({ id, onClose, onChanged }) {
  const { ws } = useWs();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [tab, setTab] = useState("synthese");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { data } = await supabase.from("competitors").select("*").eq("id", id).single(); setC(data); }, [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); document.body.style.overflow = "hidden"; return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [onClose]);

  const refresh = async () => {
    setBusy(true);
    try {
      await fn("competitor-check", { workspace_id: ws.id, competitor_id: id, force: true });
      await fn("r/spy-social", { workspace_id: ws.id, competitor_id: id }).catch(() => null);
      await load(); onChanged?.(); toast("Rapport mis à jour", "good");
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const remove = async () => { await supabase.from("competitors").update({ status: "ecarte" }).eq("id", id); onChanged?.(true); onClose(); };

  const s = c?.summary ?? {};
  const f = s.fiche ?? {};
  const tiles = c ? [
    ["Chiffre d'affaires", first(f.chiffre_affaires, 70)], ["Effectif", first(f.effectif, 60)], ["Création", first(f.creation, 60)],
    ["Prix d'entrée", first(s.prix?.affiches, 70)], ["Avis clients", first(s.avis?.clients, 80)], ["Siège", first(f.implantations, 60)],
  ] : [];

  return (
    <div className="fixed inset-0 z-50 bg-paper overflow-y-auto" role="dialog" aria-modal>
      <div className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-line">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft hover:text-ink"><Ico n="back" className="w-4 h-4" />Espion</button>
          <p className="text-[12px] font-bold uppercase tracking-[.18em] text-accent-dark">Dossier concurrent</p>
          <button onClick={onClose} aria-label="Fermer" className="h-9 w-9 grid place-items-center rounded-full hover:bg-white"><Ico n="x" className="w-5 h-5" /></button>
        </div>
      </div>
      {!c ? <p className="py-24 text-center text-ink-faint">Ouverture du dossier…</p> : (
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 space-y-5">
          {/* En-tête */}
          <section className="rounded-3xl bg-white border border-line p-6 sm:p-7">
            <div className="flex flex-col md:flex-row gap-5 md:items-start">
              <CompanyLogo name={nameOf(c)} url={c.url} className="h-[72px] w-[72px] text-3xl" pad="p-2.5" />
              <div className="min-w-0 flex-1">
                <h1 className="font-black text-[34px] leading-none tracking-tight" style={NUNITO}>{nameOf(c)}</h1>
                <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] text-ink-faint hover:text-ink mt-1.5">{host(c.url)}<Ico n="ext" className="w-3.5 h-3.5" /></a>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.menace?.niveau && <Threat n={s.menace.niveau} />}
                  {s.position?.verdict && POS[s.position.verdict] && <span className={cx("rounded-full px-3 py-1 text-[12.5px] font-bold", POS[s.position.verdict][1])}>{POS[s.position.verdict][0]}</span>}
                </div>
                {s.resume ? <p className="mt-4 text-[15.5px] leading-relaxed max-w-3xl">{txt(s.resume)}</p> : <p className="mt-4 text-ink-soft">Pas encore de rapport : l'espionne le fera cette nuit, ou lance-le maintenant.</p>}
              </div>
              <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0">
                <button onClick={refresh} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent text-white px-5 py-2.5 font-semibold hover:bg-accent-dark disabled:opacity-60"><Ico n="refresh" className={cx("w-4 h-4", busy && "animate-spin")} />{busy ? "Enquête en cours… (1 à 2 min)" : s.resume ? "Actualiser le rapport" : "Analyser maintenant"}</button>
                <p className="text-[12px] text-ink-faint">{c.checked_at ? `Rapport du ${new Date(c.checked_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "Jamais analysé"} · <button onClick={remove} className="underline hover:text-ink">ne plus suivre</button></p>
              </div>
            </div>
            {s.resume && (
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5">
                {tiles.map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-paper/70 border border-line p-3 min-w-0" title={v || undefined}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{l}</p>
                    <p className={cx("text-[13px] mt-1 leading-snug line-clamp-3", v ? "text-ink" : "text-ink-faint")}>{v || "Non publié"}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {s.resume && <>
            <nav className="flex gap-1.5 overflow-x-auto pb-1">
              {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition", tab === k ? "bg-ink text-white" : "bg-white border border-line text-ink-soft hover:text-ink")}>{l}</button>)}
            </nav>
            {tab === "synthese" && <Synthese s={s} />}
            {tab === "offre" && <OffrePrix s={s} />}
            {tab === "clients" && <ClientsAcq s={s} />}
            {tab === "pubs" && <PubsReseaux c={c} s={s} />}
            {tab === "ff" && <ForcesFaiblesses s={s} />}
            {tab === "battle" && <Battle s={s} />}
            {tab === "page" && <AltPage c={c} ws={ws} onSaved={load} />}
            {tab === "histo" && <Historique c={c} s={s} />}
            <p className="text-[12px] text-ink-faint text-center pb-6">Chaque fait est sourcé ; les hypothèses sont signalées comme telles. Rien n'est inventé.</p>
          </>}
        </div>
      )}
    </div>
  );
}
