import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Spinner, useToast } from "../components/ui";
import { Donut, Kpi, LineChart, PeriodSelect, Tabs, fillDays, nf, pct, pctFr, srcColor, srcLabel } from "../components/Charts";
import { cx, fmtTime } from "../lib/utils";
import { SubNav } from "../components/SubNav";

export const I = ({ d, className = "h-5 w-5" }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>;
const LINK = { intelligence: ["/intelligence", "Voir l'analyse"], espion: ["/espion", "Voir les concurrents"], radar: ["/radar", "Ouvrir le Radar"], prospection: ["/prospection", "Ouvrir la prospection"], mesure: ["#mesure", "Installer la mesure"] };

/** Données du site (pixel Kairo) + prospection, sur la période choisie. */
export function useGrowthData(days) {
  const { ws } = useWs();
  const [site, setSite] = useState(null);
  const [pro, setPro] = useState(null);
  useEffect(() => {
    let alive = true;
    setSite(null);
    Promise.all([supabase.rpc("site_stats", { p_ws: ws.id, p_days: days }), supabase.rpc("pro_stats", { p_ws: ws.id, p_days: days })])
      .then(([a, b]) => { if (alive) { setSite(a.data ?? {}); setPro(b.data ?? {}); } });
    return () => { alive = false; };
  }, [ws.id, days]);
  return { site, pro };
}

/** Recommandations calculées par l'IA à partir des chiffres réels, gardées 12 h dans le navigateur. */
export function Recos({ page, stats, nav, onMesure }) {
  const { ws } = useWs();
  const toast = useToast();
  const key = `kairo-reco-${page}-${ws.id}`;
  const [r, setR] = useState(() => { try { const v = JSON.parse(localStorage.getItem(key) ?? "null"); return v && Date.now() - v.at < 12 * 36e5 ? v : null; } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { const x = await fn("r/growth-reco", { workspace_id: ws.id, page, stats }); const v = { ...x, at: Date.now() }; setR(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* stockage indisponible */ } }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-lg flex items-center gap-2"><span className="text-accent">✦</span>Recommandations de Kairo</h2>
        <Button quota="reco" size="sm" loading={busy} onClick={run}>{r ? "Actualiser" : "Analyser mes chiffres"}</Button></div>
      {!r ? <p className="text-sm text-ink-soft mt-2">Kairo lit tes chiffres réels de la période et propose les 3 actions les plus rentables. Aucune estimation inventée.</p> : (
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {r.recos.map((x, i) => {
            const [to, label] = LINK[x.lien] ?? LINK.prospection;
            return (
              <Card key={i} className="p-4 flex flex-col">
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent text-sm font-semibold">{i + 1}</span>
                <p className="font-semibold mt-3">{x.titre}</p>
                <p className="text-sm text-ink-soft mt-1">{x.pourquoi}</p>
                <p className="text-sm mt-2">{x.action}</p>
                <button onClick={() => (to === "#mesure" ? onMesure?.() : nav(to))} className="mt-auto pt-4 self-start text-sm font-semibold text-accent hover:underline">{label} →</button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Installation du pixel Kairo. */
export function SiteSetup({ last }) {
  const { ws } = useWs();
  const toast = useToast();
  const code = `<script defer src="${import.meta.env.VITE_SUPABASE_URL}/functions/v1/t/kairo.js" data-k="${ws.track_key ?? ""}"></script>`;
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"));
  return (
    <div className="max-w-2xl" id="mesure">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-lg">Mesurer ton site</h3>
          {last ? <Badge tone="good">Actif · dernière visite {fmtTime(last)}</Badge> : <Badge tone="warn">Pas encore installé</Badge>}</div>
        <p className="text-sm text-ink-soft mt-2">Colle cette ligne dans le <code>&lt;head&gt;</code> de ton site (ou dans « Code personnalisé » sur Wix, Webflow, WordPress, Shopify). Kairo comptera les visites, leur provenance, les pages vues et les formulaires envoyés.</p>
        <pre className="mt-3 rounded-xl bg-ink text-white/90 text-xs p-3 whitespace-pre-wrap break-all">{code}</pre>
        <Button size="sm" variant="accent" className="mt-3" onClick={() => copy(code)}>Copier le code</Button>
        <ul className="text-xs text-ink-soft mt-4 space-y-1">
          <li>• Sans cookie et sans donnée personnelle : aucun bandeau de consentement n'est ajouté par Kairo.</li>
          <li>• Le contenu des formulaires n'est jamais lu : seul l'envoi est compté comme « lead ».</li>
          <li>• Un rendez-vous pris autrement (bouton, appel) se compte en appelant <code>kairoLead()</code>.</li>
        </ul>
      </Card>
    </div>
  );
}

export default function Distribution() {
  const { ws } = useWs();
  const nav = useNavigate();
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState("vue");
  const { site, pro } = useGrowthData(days);

  if (!site || !pro) return <Spinner />;
  const installed = !!site.last_event_at;
  const leads = site.leads + (pro.replies ?? 0);
  const sources = (site.by_source ?? []).map((x) => ({ key: x.source, value: x.visits, leads: x.leads }));
  const traffic = fillDays(site.by_day, days, "visits");
  const stats = { visiteurs: site.visits, pages_vues: site.views, leads_site: site.leads, reponses_prospection: pro.replies, rdv: pro.rdv, clients: pro.clients, sources: sources.map((s) => ({ canal: srcLabel(s.key), visites: s.value, leads: s.leads })) };
  const tabs = [["vue", "Vue d'ensemble"], ["canaux", "Canaux"], ["mesure", "Mesure du site"]];


  return (
    <div className="space-y-5">
      <SubNav section="resultats" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-accent"><I d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12" className="h-11 w-11" /></span>
          <div><h1 className="font-serif text-4xl leading-none">Kairo Distribution</h1><p className="text-ink-soft mt-1.5">Attire plus de clients grâce aux bons canaux d'acquisition.</p></div>
        </div>
        <PeriodSelect value={days} onChange={setDays} />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {!installed && tab !== "mesure" && (
        <Card className="p-4 bg-accent-soft/40 border-accent-soft flex flex-wrap items-center gap-3">
          <p className="text-sm flex-1 min-w-[240px]"><b>Ton site n'est pas encore mesuré.</b> Les chiffres de prospection sont réels ; pour voir aussi les visites et leur provenance, installe la mesure Kairo (une ligne à coller).</p>
          <Button size="sm" variant="accent" onClick={() => setTab("mesure")}>Installer la mesure</Button>
        </Card>
      )}

      {tab === "mesure" && <SiteSetup last={site.last_event_at} />}

      {tab === "vue" && (<>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Kpi icon={<I d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />} value={nf(site.visits)} label="Visiteurs du site" cur={site.visits} prev={site.prev?.visits} />
          <Kpi icon={<I d="M16 20a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />} value={nf(leads)} label="Leads générés (site + prospection)" sub={<span className="text-[11px] text-ink-faint">{nf(site.leads)} formulaires · {nf(pro.replies)} réponses</span>} />
          <Kpi icon={<I d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />} value={nf(pro.clients)} label="Clients signés" cur={pro.clients} prev={pro.prev?.clients} />
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h2 className="font-semibold text-lg">Répartition du trafic</h2>
            {!sources.length ? <p className="text-sm text-ink-soft mt-3">Aucune visite mesurée sur la période.</p> : (
              <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                <Donut items={sources} total={site.visits} center={nf(site.visits)} sub="visiteurs" />
                <ul className="flex-1 w-full space-y-2 text-sm">
                  {sources.slice(0, 8).map((s, i) => <li key={s.key} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: srcColor(s.key, i) }} /><span className="flex-1 truncate">{srcLabel(s.key)}</span><span className="tabular-nums text-ink-soft">{pctFr(pct(s.value, site.visits))}</span></li>)}
                </ul>
              </div>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-lg">Évolution du trafic</h2><span className="text-xs text-ink-faint">visiteurs par jour</span></div>
            <div className="mt-4"><LineChart points={traffic} /></div>
          </Card>
        </div>
      </>)}


      {tab === "canaux" && (
        <Card className="p-5">
          <h2 className="font-semibold text-lg">Ce que chaque canal t'apporte</h2>
          <div className="mt-3 overflow-x-auto"><table className="w-full text-sm min-w-[520px]">
            <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2 font-medium">Canal</th><th className="font-medium text-right">Visiteurs</th><th className="font-medium text-right">Part</th><th className="font-medium text-right">Leads</th><th className="font-medium text-right">Taux de conversion</th></tr></thead>
            <tbody className="divide-y divide-line">
              {sources.map((s, i) => <tr key={s.key}><td className="py-3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: srcColor(s.key, i) }} />{srcLabel(s.key)}</span></td><td className="text-right tabular-nums">{nf(s.value)}</td><td className="text-right tabular-nums text-ink-soft">{pctFr(pct(s.value, site.visits))}</td><td className="text-right tabular-nums">{nf(s.leads)}</td><td className="text-right tabular-nums">{pctFr(pct(s.leads, s.value))}</td></tr>)}
              <tr><td className="py-3"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-good" />Prospection Kairo (e-mails)</span></td><td className="text-right tabular-nums">{nf(pro.sent)} <span className="text-ink-faint text-xs">envoyés</span></td><td /><td className="text-right tabular-nums">{nf(pro.replies)} <span className="text-ink-faint text-xs">réponses</span></td><td className="text-right tabular-nums">{pctFr(pct(pro.replies, pro.sent))}</td></tr>
            </tbody>
          </table></div>
        </Card>
      )}

      {tab !== "mesure" && <Recos page="distribution" stats={stats} nav={nav} onMesure={() => setTab("mesure")} />}
    </div>
  );
}
