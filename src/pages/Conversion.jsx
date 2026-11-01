import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Spinner } from "../components/ui";
import { Kpi, LineChart, PeriodSelect, Tabs, nf, pct, pctFr } from "../components/Charts";
import { I, Recos, SiteSetup, useGrowthData } from "./Distribution";
import { SubNav } from "../components/SubNav";

export default function Conversion() {
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("vue");
  const { site, pro } = useGrowthData(days);

  if (!site || !pro) return <Spinner />;
  const installed = !!site.last_event_at;
  const rate = pct(site.leads, site.visits), prevRate = pct(site.prev?.leads ?? 0, site.prev?.visits ?? 0);
  // Taux de conversion lissé sur 7 jours (un taux au jour le jour serait trop bruité)
  const daily = new Map((site.by_day ?? []).map((d) => [d.d, d]));
  const curve = [];
  for (let i = days >= 14 ? days - 7 : days - 1; i >= 0; i--) {
    let v = 0, l = 0;
    for (let j = i; j < Math.min(i + 7, days); j++) { const d = daily.get(new Date(Date.now() - j * 864e5).toISOString().slice(0, 10)); v += Number(d?.visits ?? 0); l += Number(d?.leads ?? 0); }
    const day = new Date(Date.now() - i * 864e5);
    curve.push({ label: day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: pct(l, v) });
  }
  const funnel = [["Visiteurs", site.visits], ["Leads", site.leads + (pro.replies ?? 0)], ["Devis", pro.quotes], ["Clients", pro.clients]];
  const fmax = Math.max(1, ...funnel.map((f) => f[1]));
  const fh = (v) => Math.max(4, Math.sqrt(v / fmax) * 100); // échelle racine : les petites étapes restent visibles
  const pages = site.pages ?? [];
  const stats = { visiteurs: site.visits, pages_vues: site.views, leads_site: site.leads, taux_conversion_site: rate, devis: pro.quotes, clients: pro.clients, pages: pages.slice(0, 10).map((p) => ({ page: p.path, titre: p.title, visiteurs: p.visits, leads: p.leads, taux: pct(p.leads, p.visits) })) };
  const tabs = [["vue", "Vue d'ensemble"], ["pages", "Pages"], ["mesure", "Mesure du site"]];

  const PagesTable = ({ limit }) => (
    !pages.length ? <p className="text-sm text-ink-soft mt-3">Aucune page mesurée sur la période.</p> : (
      <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[520px]">
        <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2 font-medium">Page</th><th className="font-medium text-right">Visiteurs</th><th className="font-medium text-right">Leads</th><th className="font-medium text-right">Taux de conversion</th><th className="font-medium text-right">Évolution des vues</th></tr></thead>
        <tbody className="divide-y divide-line">{pages.slice(0, limit).map((p) => {
          const ev = p.prev_views ? Math.round(((p.views - p.prev_views) / p.prev_views) * 100) : null;
          return <tr key={p.path}><td className="py-3"><p className="font-medium truncate max-w-[220px]">{p.title || p.path}</p><p className="text-xs text-ink-faint truncate max-w-[220px]">{p.path}</p></td><td className="text-right tabular-nums">{nf(p.visits)}</td><td className="text-right tabular-nums">{nf(p.leads)}</td><td className="text-right tabular-nums">{pctFr(pct(p.leads, p.visits))}</td><td className={`text-right tabular-nums ${ev == null ? "text-ink-faint" : ev >= 0 ? "text-good" : "text-bad"}`}>{ev == null ? "nouvelle" : `${ev >= 0 ? "↑" : "↓"} ${Math.abs(ev)} %`}</td></tr>;
        })}</tbody>
      </table></div>
    )
  );
  return (
    <div className="space-y-5">
      <SubNav section="resultats" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-accent"><I d="M9 11V6a3 3 0 0 1 6 0v5M5 11h14l-1 10H6zM12 15v2" className="h-11 w-11" /></span>
          <div><h1 className="font-serif text-4xl leading-none">Kairo Conversion</h1><p className="text-ink-soft mt-1.5">Transforme plus de visiteurs en clients.</p></div>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {!installed && tab !== "mesure" && (
        <Card className="p-4 bg-accent-soft/40 border-accent-soft flex flex-wrap items-center gap-3">
          <p className="text-sm flex-1 min-w-[240px]"><b>Ton site n'est pas encore mesuré.</b> Installe la mesure Kairo pour suivre les visites, les pages qui convertissent et les formulaires envoyés.</p>
          <Button size="sm" variant="accent" onClick={() => setTab("mesure")}>Installer la mesure</Button>
        </Card>
      )}
      {tab === "mesure" && <SiteSetup last={site.last_event_at} />}

      {tab === "vue" && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi value={nf(site.visits)} label="Visiteurs" cur={site.visits} prev={site.prev?.visits} />
          <Kpi value={nf(site.leads)} label="Leads du site" cur={site.leads} prev={site.prev?.leads} />
          <Kpi value={pctFr(rate)} label="Taux de conversion" sub={prevRate ? <span className={`text-[11px] font-medium ${rate >= prevRate ? "text-good" : "text-bad"}`}>{rate >= prevRate ? "↑" : "↓"} {String(Math.abs(Math.round((rate - prevRate) * 10) / 10)).replace(".", ",")} pt <span className="font-normal text-ink-faint">vs période préc.</span></span> : null} />
          <Kpi value={nf(pro.clients)} label="Clients signés" cur={pro.clients} prev={pro.prev?.clients} />
        </div>
        <Card className="p-5">
          <h2 className="font-semibold text-lg">Tunnel de conversion</h2>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
            {funnel.map(([l, v], i) => (
              <div key={l} className="min-w-0">
                <p className="text-[11px] sm:text-xs text-ink-soft truncate">{l}</p>
                <p className="text-lg sm:text-2xl font-semibold tabular-nums">{nf(v)}</p>
                <div className="mt-2 h-14 flex items-end"><span className="block w-full rounded-md bg-gradient-to-t from-accent to-[#FF9A5C]" style={{ height: `${fh(v)}%`, opacity: 1 - i * 0.15 }} /></div>
                <p className="text-[11px] text-ink-faint mt-1 tabular-nums">{i === 0 ? "100 %" : `${pctFr(pct(v, funnel[i - 1][1]))} de l'étape préc.`}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint mt-3">Sur la période. Les leads comprennent les formulaires du site et les réponses à la prospection ; devis et clients viennent de Kairo.</p>
        </Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Évolution du taux de conversion</h2><span className="text-xs text-ink-faint">moyenne sur 7 jours</span></div><div className="mt-4"><LineChart points={curve} fmt={(v) => pctFr(v)} /></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Pages principales</h2><button onClick={() => setTab("pages")} className="text-sm text-ink-soft hover:text-ink">Voir toutes ›</button></div><PagesTable limit={5} /></Card>
      </>)}
      {tab === "pages" && <Card className="p-5"><h2 className="font-semibold text-lg">Toutes les pages</h2><PagesTable limit={25} /></Card>}
      {tab !== "mesure" && <Recos page="conversion" stats={stats} nav={nav} onMesure={() => setTab("mesure")} />}
    </div>
  );
}
