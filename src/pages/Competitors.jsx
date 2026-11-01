import { useCallback, useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Empty, Input, PageHead, Spinner, useToast } from "../components/ui";
import { cx, fmtTime } from "../lib/utils";

const TABS = [["synthese", "Synthèse"], ["battlecard", "Battlecard"], ["comparatif", "Comparatif"], ["actus", "Actus et marchés"], ["reseaux", "Réseaux"], ["pubs", "Pubs et campagnes"], ["fiche", "Fiche"]];
const THREAT = ["", "Faible", "Modérée", "Réelle", "Forte", "Critique"];

const Src = ({ href }) => href && /^https?:/.test(href) ? <a href={href} target="_blank" rel="noreferrer" className="text-ink-faint underline text-xs ml-1 whitespace-nowrap">source ↗</a> : null;
const H = ({ children }) => <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2 mt-5 first:mt-0">{children}</p>;
const txt = (x) => (typeof x === "string" ? x : x?.texte ?? "").replace(/<\/?cite[^>]*>/g, "");

export function Analysis({ s, tab }) {
  if (tab === "synthese") return (
    <div className="text-sm">
      <p className="text-[15px] leading-relaxed">{s.resume}</p>
      <div className="grid sm:grid-cols-2 gap-5 mt-5">
        <div><H>Offre</H><p>{s.offre}</p><H>Positionnement</H><p>{s.positionnement}</p><H>Cibles</H><p>{s.cibles}</p></div>
        <div>
          <H>Prix</H><p>{typeof s.prix === "string" ? s.prix : s.prix?.affiches}</p>
          {s.prix?.indices?.map((x, i) => <p key={i} className="mt-1">• {x.texte}<Src href={x.source} /></p>)}
          <H>Avis</H>
          {s.avis ? <><p><b>Clients :</b> {s.avis.clients}</p><p className="mt-1"><b>Salariés :</b> {s.avis.salaries}</p></> : <p className="text-ink-soft">—</p>}
          {s.recrutements && <><H>Recrutements</H><p>{s.recrutements}</p></>}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5 mt-2">
        <div><H>Forces</H>{(s.forces ?? []).map((f, i) => <p key={i} className="mt-1">• {txt(f)}<Src href={f.source} /></p>)}</div>
        <div><H>Faiblesses</H>{(s.faiblesses ?? s.faiblesses_possibles ?? []).map((f, i) => <p key={i} className="mt-1">• {f.type === "hypothese" && <Badge tone="warn" className="mr-1">hypothèse</Badge>}{f.type === "fait" && <Badge tone="good" className="mr-1">fait</Badge>}{txt(f)}<Src href={f.source} /></p>)}</div>
      </div>
      {s.opportunites?.length > 0 && <><H>Où les déloger</H>{s.opportunites.map((x, i) => <p key={i} className="mt-1">• {x}</p>)}</>}
      {(s.actions ?? s.comment_gagner)?.length > 0 && <div className="mt-5 bg-accent-soft rounded-xl p-4"><H>À faire cette semaine</H>{(s.actions ?? s.comment_gagner).map((x, i) => <p key={i} className="mt-1">{i + 1}. {x}</p>)}</div>}
    </div>
  );
  if (tab === "battlecard") {
    const b = s.battlecard;
    if (!b) return <p className="text-sm text-ink-soft">Relance l'analyse complète pour obtenir la battlecard.</p>;
    return (
      <div className="text-sm">
        <div className="bg-ink text-white rounded-xl p-4"><p className="text-xs uppercase tracking-wider text-white/60 mb-1">Notre différence</p><p className="text-[15px] leading-relaxed">{b.pitch}</p></div>
        <div className="grid sm:grid-cols-2 gap-5 mt-5">
          <div><H>On gagne quand…</H>{b.quand_on_gagne?.map((x, i) => <p key={i} className="mt-1 text-good">✓ <span className="text-ink">{x}</span></p>)}</div>
          <div><H>On perd quand…</H>{b.quand_on_perd?.map((x, i) => <p key={i} className="mt-1 text-bad">✕ <span className="text-ink">{x}</span></p>)}</div>
        </div>
        <H>Objections et réponses</H>
        <div className="space-y-2">{b.objections?.map((o, i) => <div key={i} className="rounded-xl border border-line p-3"><p className="font-semibold">{o.objection}</p><p className="mt-1 text-ink-soft">→ {o.reponse}</p></div>)}</div>
        <H>Questions à poser au prospect</H>{b.questions_pieges?.map((x, i) => <p key={i} className="mt-1">? {x}</p>)}
        {b.a_ne_pas_dire?.length > 0 && <><H>À ne pas dire</H>{b.a_ne_pas_dire.map((x, i) => <p key={i} className="mt-1 text-bad">— <span className="text-ink">{x}</span></p>)}</>}
      </div>
    );
  }
  if (tab === "comparatif") return !s.comparatif?.length ? <p className="text-sm text-ink-soft">Relance l'analyse complète pour obtenir le comparatif.</p> : (
    <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]">
      <thead><tr className="text-left text-xs text-ink-soft border-b border-line"><th className="py-2 pr-3">Critère</th><th className="pr-3">Eux</th><th className="pr-3">Nous</th><th>Avantage</th></tr></thead>
      <tbody className="divide-y divide-line">{s.comparatif.map((r, i) => (
        <tr key={i} className="align-top"><td className="py-2 pr-3 font-medium">{r.critere}</td><td className="py-2 pr-3">{r.eux}</td><td className="py-2 pr-3">{r.nous}</td>
          <td className="py-2"><Badge tone={r.avantage === "nous" ? "good" : r.avantage === "eux" ? "bad" : "muted"}>{r.avantage === "nous" ? "Nous" : r.avantage === "eux" ? "Eux" : r.avantage === "egal" ? "Égal" : "?"}</Badge></td></tr>
      ))}</tbody>
    </table></div>
  );
  if (tab === "actus") return (
    <div className="text-sm">
      <H>Actualités</H>
      {!s.actualites?.length ? <p className="text-ink-soft">Rien de notable trouvé.</p> : s.actualites.map((a, i) => (
        <div key={i} className="border-l-2 border-line pl-3 mb-3"><p className="text-xs text-ink-faint">{a.date}</p><p className="font-medium">{a.titre}<Src href={a.source} /></p>{a.impact && <p className="text-ink-soft">→ {a.impact}</p>}</div>
      ))}
      <H>Marchés publics remportés</H>
      {!s.marches_publics?.length ? <p className="text-ink-soft">Aucun trouvé.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[520px]"><tbody className="divide-y divide-line">
          {s.marches_publics.map((m, i) => <tr key={i} className="align-top"><td className="py-2 pr-3 text-ink-faint whitespace-nowrap">{m.date}</td><td className="py-2 pr-3 font-medium">{m.acheteur}</td><td className="py-2 pr-3">{m.objet}</td><td className="py-2 whitespace-nowrap">{m.montant}<Src href={m.source} /></td></tr>)}
        </tbody></table></div>
      )}
    </div>
  );
  if (tab === "reseaux") {
    const r = s.reseaux;
    if (!r) return <p className="text-sm text-ink-soft">Clique sur « Mettre à jour » pour ajouter l'analyse de leurs réseaux sociaux.</p>;
    return (
      <div className="text-sm">
        {r.synthese && <p className="text-[15px] mb-4">{r.synthese}</p>}
        {r.presence?.length > 0 && <div className="grid sm:grid-cols-2 gap-2 mb-2">{r.presence.map((x, i) => (
          <div key={i} className="rounded-xl border border-line p-3">
            <div className="flex items-center justify-between gap-2"><p className="font-semibold capitalize">{x.reseau}</p>{/^https?:/.test(x.url ?? "") && <a href={x.url} target="_blank" rel="noreferrer" className="text-xs text-ink-faint underline">voir ↗</a>}</div>
            <p className="text-ink-soft mt-0.5">{[x.abonnes && `${x.abonnes} abonnés`, x.rythme].filter(Boolean).join(" · ")}</p>
            {x.sujets && <p className="mt-1">{x.sujets}</p>}
          </div>))}</div>}
        {r.ce_qui_marche?.length > 0 && <><H>Ce qui marche chez eux</H>{r.ce_qui_marche.map((x, i) => <p key={i} className="mt-1">• {txt(x)}</p>)}</>}
        {r.angles_a_reprendre?.length > 0 && <><H>Ce que tu peux faire mieux</H>{r.angles_a_reprendre.map((x, i) => <p key={i} className="mt-1 text-good">✓ <span className="text-ink">{txt(x)}</span></p>)}</>}
        {r.a_eviter?.length > 0 && <><H>À éviter</H>{r.a_eviter.map((x, i) => <p key={i} className="mt-1">✕ {txt(x)}</p>)}</>}
      </div>
    );
  }
  const f = s.fiche ?? {};
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
      {[["Raison sociale", f.raison_sociale], ["SIREN", f.siren], ["Création", f.creation], ["Effectif", f.effectif], ["Chiffre d'affaires", f.chiffre_affaires], ["Résultat", f.resultat], ["Dirigeants", (f.dirigeants ?? []).join(", ")], ["Implantations", f.implantations]].map(([k, v]) => (
        <><dt key={k} className="text-ink-soft">{k}</dt><dd>{v || "—"}</dd></>
      ))}
    </dl>
  );
}

export function Ads({ c, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const a = c.ads;
  const run = async () => {
    setBusy(true);
    try { await fn("competitor-ads", { workspace_id: ws.id, competitor_id: c.id }); toast("Campagnes analysées", "good"); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const PL = { meta: "Meta", linkedin: "LinkedIn", google: "Google", autre: "Autre" };
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button quota="veille" size="sm" variant={a ? "default" : "primary"} loading={busy} onClick={run}>{a ? "Mettre à jour" : "Analyser leurs campagnes"}</Button>
        {c.ads_at && !busy && <span className="text-xs text-ink-faint">analysé {fmtTime(c.ads_at)}</span>}
        {busy && <span className="text-ink-soft">L'IA cherche leurs pubs Meta, LinkedIn et Google, leurs promos, salons, webinaires… (1 minute)</span>}
      </div>
      {!a ? <p className="text-ink-soft">Leurs publicités en cours, leurs offres et actions marketing, les angles qu'ils martèlent et ceux que personne n'occupe.</p> : (
        <>
          {a.synthese && <p className="text-[15px] mb-2">{a.synthese}</p>}
          {a.ce_qu_ils_poussent && <p className="mb-4"><b>Ce qu'ils poussent en ce moment :</b> {a.ce_qu_ils_poussent}</p>}
          <H>Publicités repérées</H>
          {!a.pubs?.length ? <p className="text-ink-soft">Aucune publicité trouvée par la recherche. Vérifie directement dans les bibliothèques publiques ci-dessous.</p> : (
            <div className="grid sm:grid-cols-2 gap-2">{a.pubs.map((x, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2"><Badge>{PL[x.plateforme] ?? x.plateforme}</Badge><span className="text-xs text-ink-faint">{[x.format, x.depuis && `depuis ${x.depuis}`].filter(Boolean).join(" · ")}</span></div>
                <p className="mt-2 font-medium">« {x.message} »</p>
                {x.offre && <p className="text-ink-soft mt-1">Offre : {x.offre}</p>}
                {x.cible && <p className="text-ink-soft">Cible : {x.cible}</p>}
                <Src href={x.source} />
              </div>))}</div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">{(a.liens_verification ?? []).map((l, i) => <a key={i} href={l.url} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1 text-xs hover:border-ink-faint">Voir leurs pubs {l.plateforme} ↗</a>)}</div>
          {a.actions?.length > 0 && <><H>Autres actions marketing</H>{a.actions.map((x, i) => <p key={i} className="mt-1">• <Badge className="mr-1">{x.type}</Badge>{x.titre}{x.date && <span className="text-ink-faint"> · {x.date}</span>}<Src href={x.source} /></p>)}</>}
          <div className="grid lg:grid-cols-2 gap-x-8">
            {a.angles?.length > 0 && <div><H>Les arguments qu'ils martèlent</H>{a.angles.map((x, i) => <p key={i} className="mt-1">• {x}</p>)}</div>}
            {a.angles_libres?.length > 0 && <div><H>Les angles libres pour toi</H>{a.angles_libres.map((x, i) => <p key={i} className="mt-1 text-good">✓ <span className="text-ink">{x}</span></p>)}</div>}
          </div>
          {a.contre_campagne?.angle && (
            <div className="mt-5 rounded-xl bg-accent-soft p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-dark">Ta contre-campagne</p>
              <p className="mt-1"><b>Angle :</b> {a.contre_campagne.angle}</p>
              {a.contre_campagne.objet_email && <p><b>Objet d'e-mail :</b> {a.contre_campagne.objet_email}</p>}
              {a.contre_campagne.accroche && <p><b>Accroche :</b> {a.contre_campagne.accroche}</p>}
              
            </div>
          )}
          {a.recommandations?.length > 0 && <><H>Recommandations</H>{a.recommandations.map((x, i) => <p key={i} className="mt-1">→ {x}</p>)}</>}
          <p className="text-xs text-ink-faint mt-4">Les budgets et résultats de leurs campagnes ne sont pas publics : ils ne sont jamais estimés ici.</p>
        </>
      )}
    </div>
  );
}

function Comp({ c, onChange }) {
  const { ws } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("synthese");
  const s = c.summary;
  const run = async (force) => {
    setBusy(true);
    try { const r = await fn("competitor-check", { workspace_id: ws.id, competitor_id: c.id, force }); toast(r.changed ? "Veille mise à jour" : "Rien n'a changé depuis la dernière analyse", r.changed ? "good" : "default"); onChange(); }
    catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const lvl = Number(s?.menace?.niveau) || 0;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-3xl leading-tight">{c.name || s?.nom || c.url.replace(/^https?:\/\//, "")}</h3>
            {lvl > 0 && <Badge tone={lvl >= 4 ? "bad" : lvl === 3 ? "warn" : "muted"}>Menace {THREAT[lvl].toLowerCase()} · {lvl}/5</Badge>}
          </div>
          <a href={c.url} target="_blank" rel="noreferrer" className="text-sm text-ink-soft underline">{c.url.replace(/^https?:\/\//, "")}</a>
          {c.checked_at && <span className="text-xs text-ink-faint ml-2">· analysé {fmtTime(c.checked_at)}</span>}
        </div>
        <Button quota="veille" size="sm" variant={s ? "default" : "primary"} loading={busy} onClick={() => run(!!s)}>{s ? "Mettre à jour" : "Lancer la veille"}</Button>
        <Button size="sm" variant="danger" onClick={async () => { await supabase.from("competitors").delete().eq("id", c.id); onChange(); }}>Retirer</Button>
      </div>
      {busy && <p className="text-sm text-ink-soft mt-4">L'IA lit leur site, consulte le registre officiel, cherche leurs actualités, marchés publics, avis, recrutements et réseaux sociaux… (1 à 2 minutes)</p>}
      {s?.menace?.pourquoi && <p className="text-sm mt-3"><b>Pourquoi :</b> {s.menace.pourquoi}</p>}
      {s && !busy && (
        <>
          <div className="flex gap-1 mt-5 border-b border-line overflow-x-auto">
            {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap", tab === k ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>
          <div className="pt-5">{tab === "pubs" ? <Ads c={c} onChange={onChange} /> : <Analysis s={s} tab={tab} />}</div>
          {c.history?.length > 1 && <details className="mt-5 text-xs"><summary className="cursor-pointer text-ink-soft">Historique des changements</summary>{c.history.slice(0, 8).map((h, i) => <p key={i} className="mt-1"><span className="text-ink-faint">{fmtTime(h.at)} :</span> {h.changes}</p>)}</details>}
        </>
      )}
    </Card>
  );
}

export default function Competitors() {
  const { ws } = useWs();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [url, setUrl] = useState("");
  const [sugg, setSugg] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("competitors").select("*").eq("workspace_id", ws.id).order("created_at");
    setRows(data ?? []);
  }, [ws.id]);
  useEffect(() => { load(); }, [load]);
  const add = async (u0, name = "") => {
    let u = String(u0).trim(); if (!u) return; if (!/^https?:\/\//.test(u)) u = "https://" + u;
    const { error } = await supabase.from("competitors").insert({ workspace_id: ws.id, url: u, name });
    if (error) return toast(error.message, "bad");
    setUrl(""); setSugg((s) => s?.filter((x) => x.site !== u0)); load();
  };
  const suggest = async () => {
    setBusy(true);
    try { const r = await fn("competitor-suggest", { workspace_id: ws.id }); setSugg(r.suggestions); } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };
  const threats = (rows ?? []).filter((c) => c.summary?.menace?.niveau).sort((a, b) => b.summary.menace.niveau - a.summary.menace.niveau);

  return (
    <div>
      <PageHead title="Veille concurrentielle" sub="Site, registre officiel, actualités, marchés publics, avis, recrutements et réseaux sociaux, avec les sources. L'IA distingue toujours les faits des hypothèses.">
        <Button quota="veille" loading={busy} onClick={suggest}>Trouver mes concurrents</Button>
      </PageHead>
      <form onSubmit={(e) => { e.preventDefault(); add(url); }} className="flex gap-2 mb-5 max-w-xl"><Input placeholder="site-du-concurrent.fr" value={url} onChange={(e) => setUrl(e.target.value)} /><Button type="submit" variant="primary">Ajouter</Button></form>

      {sugg && (
        <Card className="p-5 mb-6 max-w-4xl rise">
          <p className="font-semibold mb-3">Concurrents proposés</p>
          {sugg.length === 0 ? <p className="text-sm text-ink-soft">Aucun trouvé.</p> : (
            <div className="divide-y divide-line">
              {sugg.map((x) => (
                <div key={x.site} className="py-2.5 flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex-1 min-w-[200px]"><p className="font-medium">{x.nom} <Badge>{x.type}</Badge></p><p className="text-ink-soft">{x.pourquoi}</p></div>
                  <a href={x.site} target="_blank" rel="noreferrer" className="text-ink-soft underline text-xs">{x.site.replace(/^https?:\/\//, "")}</a>
                  <Button size="sm" onClick={() => add(x.site, x.nom)}>Suivre</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {threats.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {threats.map((c) => <span key={c.id} className="text-sm bg-white border border-line rounded-full px-3 py-1">{c.name || c.summary.nom} <b className={c.summary.menace.niveau >= 4 ? "text-bad" : ""}>{c.summary.menace.niveau}/5</b></span>)}
        </div>
      )}

      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title="Aucun concurrent suivi.">Clique sur « Trouver mes concurrents » ou ajoute le site de tes concurrents directs.</Empty> : <div className="grid gap-5 max-w-5xl">{rows.map((c) => <Comp key={c.id} c={c} onChange={load} />)}</div>}
    </div>
  );
}
