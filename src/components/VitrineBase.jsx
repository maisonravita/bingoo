import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { cx } from "../lib/utils";
import CompanyLogo from "./CompanyLogo";

// Vitrine de la page d'accueil : la base de SaaS (5 vrais SaaS en croissance, revenus vérifiés)
// et « Bingoo! dans ton IA » (questions qui se tapent toutes seules, avec de vraies réponses).
const JK = { fontFamily: "'Plus Jakarta Sans', Geist, system-ui, sans-serif" };
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dollars = (n) => `${Math.round(Number(n) || 0).toLocaleString("fr-FR").replace(/\s/g, " ")} $`;
const pct = (n) => `${Number(n) > 0 ? "+" : ""}${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
// Les mois de la courbe : le dernier est le mois complet précédent
const moisDe = (k) => { const d = new Date(); return Array.from({ length: k }, (_, i) => { const m = (d.getMonth() - (k - i) + 24) % 12; return MOIS[m]; }); };

// Un seul appel partagé par les deux sections (données mises en cache côté base toutes les 3 heures)
let promesse = null;
function useVitrine() {
  const [v, setV] = useState(null);
  useEffect(() => {
    promesse ??= supabase.rpc("saas_accueil_vitrine").then(({ data }) => data ?? null, () => null);
    let ok = true; promesse.then((d) => ok && setV(d)); return () => { ok = false; };
  }, []);
  return v;
}

export function Badge({ children, sombre = false }) {
  return (
    <div className="flex items-center justify-center gap-4" style={JK}>
      <span className={cx("h-px w-10 sm:w-16", sombre ? "bg-white/25" : "bg-ink/15")} aria-hidden />
      <span className={cx("rounded-full border px-4 py-1.5 text-[13px] font-semibold", sombre ? "border-white/15 bg-white/[.06] text-white/85" : "border-black/[.08] bg-white text-ink-soft shadow-[0_2px_10px_-6px_rgba(0,0,0,.25)]")}>{children}</span>
      <span className={cx("h-px w-10 sm:w-16", sombre ? "bg-white/25" : "bg-ink/15")} aria-hidden />
    </div>
  );
}

// Courbe de revenu en SVG, avec aire dégradée
function Courbe({ valeurs, hauteur = 220, id = "c", etiquettes = true }) {
  const w = 600, h = hauteur, pb = etiquettes ? 26 : 4, pt = 10;
  const max = Math.max(...valeurs, 1);
  const pts = valeurs.map((v, i) => [valeurs.length === 1 ? w / 2 : (i / (valeurs.length - 1)) * w, pt + (1 - v / max) * (h - pb - pt)]);
  const ligne = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const mois = moisDe(valeurs.length);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="none" style={{ height: hauteur }} aria-hidden>
      <defs><linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#E0531F" stopOpacity=".28" /><stop offset="1" stopColor="#E0531F" stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((y) => <line key={y} x1="0" x2={w} y1={pt + y * (h - pb - pt)} y2={pt + y * (h - pb - pt)} stroke="#000" strokeOpacity=".06" strokeDasharray="4 6" />)}
      <path d={`${ligne} L${w},${h - pb} L0,${h - pb} Z`} fill={`url(#g-${id})`} />
      <path d={ligne} fill="none" stroke="#E0531F" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {etiquettes && mois.map((m, i) => (i % Math.ceil(mois.length / 6) === 0 || i === mois.length - 1) && <text key={i} x={pts[i][0]} y={h - 6} fontSize="13" fill="#8A8FA3" textAnchor={i === 0 ? "start" : i === mois.length - 1 ? "end" : "middle"}>{m}</text>)}
    </svg>
  );
}

const Mini = ({ valeurs }) => {
  const v = valeurs?.filter((x) => x != null) ?? [];
  if (v.length < 2) return null;
  const max = Math.max(...v, 1);
  const d = v.map((x, i) => `${i ? "L" : "M"}${(i / (v.length - 1)) * 100},${28 - (x / max) * 26}`).join(" ");
  return <svg viewBox="0 0 100 30" className="h-8 w-24 shrink-0" preserveAspectRatio="none" aria-hidden><path d={d} fill="none" stroke="#2BB673" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg>;
};

/* ---------- La base : 5 vrais SaaS en croissance ---------- */
export function BaseSaaS({ go, nb }) {
  const data = useVitrine();
  const liste = useMemo(() => (data?.saas ?? []).filter((s) => Array.isArray(s.courbe) && s.courbe.length >= 2), [data]);
  const [i, setI] = useState(0);
  const [main, setMain] = useState(false);
  useEffect(() => {
    if (main || liste.length < 2) return;
    const t = setInterval(() => setI((k) => (k + 1) % liste.length), 6000);
    return () => clearInterval(t);
  }, [main, liste.length]);
  const s = liste[i] ?? null;
  const six = s ? s.courbe.slice(-6) : [];
  const maxSix = Math.max(...six, 1);
  const dif = Math.min(10, Math.max(1, Number(s?.difficulte) || 5));

  return (
    <section id="base" className="reveal scroll-mt-28 px-5 sm:px-10 lg:px-20 py-16 sm:py-24 border-t border-black/[.07] bg-[#F4F3F0]">
      <div className="mx-auto max-w-[1180px]" style={JK}>
        <Badge>La base de SaaS</Badge>
        <h2 className="mx-auto mt-6 max-w-[900px] text-center text-[36px] sm:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-.035em] text-ink" style={{ fontWeight: 800 }}>Ne pars plus d'une idée.<br /><span className="text-ink/45">Pars de ce qui encaisse déjà.</span></h2>
        <p className="mx-auto mt-5 max-w-[640px] text-center text-[17px] leading-[1.5] text-ink-soft">{nb ? <><b className="text-ink">{nb.toLocaleString("fr-FR")}</b> SaaS et applis suivis</> : "Des dizaines de milliers de SaaS et d'applis suivis"}. Revenus vérifiés chez leur outil de paiement, mois par mois. Voici 5 d'entre eux qui grandissent en ce moment.</p>

        {/* Les onglets : 5 vrais SaaS */}
        <div className="mt-10 -mx-5 sm:mx-0 overflow-x-auto px-5 sm:px-0 [scrollbar-width:none]">
          <div className="mx-auto flex w-max gap-2 rounded-full bg-white p-1.5 shadow-[0_10px_30px_-20px_rgba(0,0,0,.35)] border border-black/[.05]">
            {(liste.length ? liste : Array.from({ length: 5 }, () => null)).map((x, k) => (
              <button key={x?.domaine ?? k} onClick={() => { setI(k); setMain(true); }} disabled={!x}
                className={cx("flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-left transition", k === i && x ? "bg-[#15171F] text-white" : "hover:bg-black/[.04] text-ink")}>
                {x ? <CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="h-8 w-8" pad="p-1" /> : <span className="h-8 w-8 rounded-xl bg-line animate-pulse" />}
                <span className="leading-tight whitespace-nowrap"><span className="block text-[14px] font-bold">{x?.nom ?? "…"}</span><span className={cx("block text-[12px]", k === i && x ? "text-white/60" : "text-ink-faint")}>{x ? `${dollars(x.mrr)} / mois` : "…"}</span></span>
              </button>
            ))}
          </div>
        </div>

        {/* La carte du SaaS choisi */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div key={`c-${s?.domaine}`} className="land-in min-w-0 rounded-[28px] bg-white p-5 sm:p-7 border border-black/[.05] shadow-[0_30px_60px_-45px_rgba(21,23,42,.45)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">{s?.categorie ?? "Revenu mensuel"}</p>
                <p className="mt-1 text-[34px] sm:text-[44px] leading-none font-extrabold tracking-[-.03em] text-ink tnum">{s ? dollars(s.mrr) : "…"}<span className="ml-1.5 text-[16px] font-semibold text-ink-faint tracking-normal">/ mois</span></p>
              </div>
              {s && <span className="rounded-full bg-[#E7F7EE] px-3 py-1.5 text-[14px] font-bold text-[#1A8F55] tnum">{pct(s.crois)} sur 30 jours</span>}
            </div>
            <div className="mt-6">{s ? <Courbe valeurs={s.courbe} id={s.domaine.replace(/\W/g, "")} /> : <div className="h-[220px] rounded-2xl bg-line/50 animate-pulse" />}</div>
            <p className="mt-2 text-[12.5px] text-ink-faint">Revenu vérifié chez son outil de paiement, mois complets. Source : TrustMRR.</p>
          </div>

          <div key={`d-${s?.domaine}`} className="land-in min-w-0 flex flex-col rounded-[28px] bg-[#15171F] p-5 sm:p-7 text-white">
            <div className="flex items-center gap-3">
              {s && <CompanyLogo name={s.nom} url={`https://${s.domaine}`} className="h-11 w-11" />}
              <div className="min-w-0"><p className="truncate text-[20px] font-bold">{s?.nom ?? "…"}</p><p className="truncate text-[13px] text-white/55">{s?.domaine}</p></div>
            </div>
            <div className="mt-5 flex-1 overflow-hidden rounded-2xl bg-white/[.06] border border-white/10">
              {s?.image ? <img src={s.image} alt={`Le site de ${s.nom}`} loading="lazy" className="block h-full max-h-[230px] w-full object-cover object-top" /> : <div className="h-[200px]" />}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 text-[13px]">
              <span className="rounded-xl bg-white/[.07] px-3 py-2.5"><span className="block text-white/55">Vend aux</span><b className="text-[15px]">{s?.audience === "B2C" ? "particuliers" : "professionnels"}</b></span>
              <span className="rounded-xl bg-white/[.07] px-3 py-2.5"><span className="block text-white/55">Sur 6 mois</span><b className="text-[15px] tnum">{six.length >= 2 && six[0] > 0 ? `× ${(six[six.length - 1] / six[0]).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}` : "—"}</b></span>
            </div>
          </div>
        </div>

        {/* Les 3 tuiles */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="min-w-0 rounded-[24px] bg-white p-5 sm:p-6 border border-black/[.05]">
            <p className="text-[15px] font-bold text-ink">Son revenu, mois par mois</p>
            <div className="mt-5 flex h-[120px] items-end gap-2" aria-hidden>
              {six.map((v, k) => <span key={k} className={cx("flex-1 rounded-t-lg transition-all duration-500", k === six.length - 1 ? "bg-accent" : "bg-[#F3D6C8]")} style={{ height: `${Math.max(6, (v / maxSix) * 100)}%` }} />)}
            </div>
            <div className="mt-2 flex gap-2 text-[11.5px] text-ink-faint">{moisDe(six.length).map((m, k) => <span key={k} className="flex-1 text-center">{m}</span>)}</div>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white p-5 sm:p-6 border border-black/[.05]">
            <p className="text-[15px] font-bold text-ink">Pourquoi celui-là</p>
            <ul className="mt-4 space-y-3 text-[14.5px] text-ink-soft">
              <li className="flex justify-between gap-3"><span>Revenu vérifié</span><b className="text-ink">oui</b></li>
              <li className="flex justify-between gap-3"><span>Tendance sur 30 jours</span><b className="text-[#1A8F55] tnum">{s ? pct(s.crois) : "…"}</b></li>
              <li className="flex justify-between gap-3"><span>Clients</span><b className="text-ink">{s?.audience === "B2C" ? "particuliers" : "professionnels"}</b></li>
              <li className="flex justify-between gap-3"><span>Difficulté à construire</span><b className="text-ink tnum">{dif} / 10</b></li>
            </ul>
            <div className="mt-3 flex gap-1" aria-hidden>{Array.from({ length: 10 }, (_, k) => <span key={k} className={cx("h-1.5 flex-1 rounded-full", k < dif ? "bg-ink" : "bg-line")} />)}</div>
          </div>
          <div className="min-w-0 rounded-[24px] bg-white p-5 sm:p-6 border border-black/[.05]">
            <p className="text-[15px] font-bold text-ink">Pour lancer ta version</p>
            <ol className="relative mt-4 space-y-4 pl-6">
              <span className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-line" aria-hidden />
              {[["Tu choisis", "ce SaaS ou un autre de la base"], ["Bingoo! construit", "ta version à ton nom, souvent en une journée"], ["En ligne", "branchée à ton Stripe, avec tes premiers contacts"]].map(([h, d], k) => (
                <li key={h} className="relative"><span className={cx("absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-[3px] border-white", k === 2 ? "bg-accent" : "bg-ink")} /><p className="text-[14.5px] font-bold text-ink">{h}</p><p className="text-[13.5px] text-ink-soft">{d}</p></li>
              ))}
            </ol>
            <button onClick={go} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[14.5px] font-semibold text-white hover:bg-black transition">Trouver mon SaaS</button>
          </div>
        </div>
        <p className="mt-4 text-center text-[12.5px] text-ink-faint">Les revenus d'un autre SaaS ne garantissent pas les tiens : ils montrent qu'un marché paie déjà.</p>
      </div>
    </section>
  );
}

/* ---------- Bingoo! dans ton IA ---------- */
export function BingooIA({ go }) {
  const data = useVitrine();
  const qs = useMemo(() => (data?.questions ?? []).filter((q) => q?.saas?.length), [data]);
  const [qi, setQi] = useState(0);
  const [tape, setTape] = useState("");
  const [fini, setFini] = useState(false);
  const ref = useRef(null);
  const [vu, setVu] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setVu(true); return; }
    const io = new IntersectionObserver(([e]) => setVu(e.isIntersecting), { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!vu || !qs.length) return;
    const q = qs[qi % qs.length].q;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setTape(q); setFini(true); return; }
    setTape(""); setFini(false);
    let k = 0, t2;
    const t = setInterval(() => { k++; setTape(q.slice(0, k)); if (k >= q.length) { clearInterval(t); t2 = setTimeout(() => setFini(true), 450); } }, 38);
    return () => { clearInterval(t); clearTimeout(t2); };
  }, [qi, vu, qs]);
  useEffect(() => {
    if (!fini || qs.length < 2) return;
    const t = setTimeout(() => setQi((k) => (k + 1) % qs.length), 5200);
    return () => clearTimeout(t);
  }, [fini, qs.length]);
  const q = qs[qi % (qs.length || 1)];

  return (
    <section id="ia" ref={ref} className="reveal scroll-mt-28 px-3 sm:px-8 py-10 sm:py-14">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[36px] bg-[#15171F] px-5 sm:px-12 lg:px-16 py-14 sm:py-20 text-white" style={JK}>
        <span className="fx-aurore h-[340px] w-[340px] bg-[#E0531F] -left-20 -top-24 opacity-40" aria-hidden />
        <span className="fx-aurore h-[300px] w-[300px] bg-[#9B6BFF] -right-16 bottom-0 opacity-30" style={{ animationDelay: "-5s" }} aria-hidden />
        <div className="relative z-[1] grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div>
            <div className="flex lg:justify-start"><Badge sombre>Bingoo! dans ton IA</Badge></div>
            <h2 className="mt-6 text-[36px] sm:text-[52px] leading-[1.03] tracking-[-.035em]" style={{ fontWeight: 800 }}>Demande à ton IA.<br /><span className="fx-texte">Elle fouille dans Bingoo!</span></h2>
            <p className="mt-5 max-w-[480px] text-[17px] leading-[1.55] text-white/70">Branche Bingoo! à Claude ou ChatGPT. Pose ta question comme tu la penses : ton IA cherche dans les SaaS suivis et te répond avec leurs vrais chiffres.</p>
            <button onClick={go} className="fx-brille mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[16px] font-bold text-[#15171F] hover:bg-white/90 transition">Brancher Bingoo! à mon IA</button>
            <p className="mt-3 text-[13px] text-white/50">Essai gratuit, sans carte. Les chiffres complets sont inclus dans les offres Trouver et Lancer.</p>
          </div>

          <div className="min-w-0 rounded-[26px] border border-white/10 bg-white/[.05] p-4 sm:p-5 backdrop-blur">
            <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 text-[#15171F]">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#15171F] text-[12px] font-bold text-white">Toi</span>
              <p className="min-h-[48px] text-[16px] sm:text-[17px] font-semibold leading-snug">{tape}<span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent animate-pulse" aria-hidden /></p>
            </div>
            <div className="mt-4 space-y-2.5 min-h-[246px]">
              {fini && q?.saas.map((x, k) => (
                <div key={`${qi}-${x.domaine}`} className="land-in flex items-center gap-3 rounded-2xl bg-white/[.08] border border-white/10 px-3.5 py-3" style={{ animationDelay: `${k * 0.12}s` }}>
                  <CompanyLogo name={x.nom} url={`https://${x.domaine}`} className="h-10 w-10" />
                  <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold">{x.nom}</p><p className="text-[13px] text-white/60 tnum">{dollars(x.mrr)} / mois · <span className="text-[#5BD69A]">{pct(x.crois)}</span></p></div>
                  <Mini valeurs={x.courbe} />
                </div>
              ))}
              {!fini && <p className="px-1 pt-2 text-[13.5px] text-white/45">{tape ? "Ton IA cherche dans Bingoo!…" : ""}</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">{qs.map((x, k) => <button key={x.q} onClick={() => setQi(k)} className={cx("rounded-full px-3 py-1.5 text-[12.5px] transition", k === qi % qs.length ? "bg-white text-[#15171F] font-semibold" : "bg-white/[.08] text-white/70 hover:bg-white/15")}>{x.q}</button>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
