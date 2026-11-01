import { useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, PageHead, useToast } from "../components/ui";
import { cx, fmtTime } from "../lib/utils";

const TABS = [["faq", "Questions → FAQ"], ["objections", "Objections → site"], ["segments", "Segments"], ["pages", "Pages à créer"]];
const H = ({ children }) => <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2 mt-6 first:mt-0">{children}</p>;
const SITE = { oui: ["Déjà sur ton site", "good"], partiellement: ["Partiellement sur ton site", "warn"], non: ["Absent de ton site", "bad"] };

function Copy({ text, label = "Copier" }) {
  const toast = useToast();
  return <button className="text-xs font-semibold text-accent hover:underline shrink-0" onClick={() => navigator.clipboard?.writeText(text).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad"))}>{label}</button>;
}
const Source = ({ x }) => x.source === "réponses"
  ? <Badge tone="accent">{x.frequence > 0 ? `Revient ${x.frequence} fois` : "Constaté"}</Badge>
  : <Badge>Hypothèse</Badge>;

export default function Intelligence() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("faq");
  const a = ws.intelligence;

  const run = async () => {
    setBusy(true);
    try { await fn("i/intelligence", { workspace_id: ws.id }); await reload(); toast("Analyse terminée", "good"); }
    catch (e) { toast(e.message, "bad"); }
    finally { setBusy(false); }
  };

  const faqText = (a?.faq ?? []).map((f) => `${f.question}\n${f.reponse}`).join("\n\n");
  return (
    <div>
      <PageHead title="Intelligence" sub="Ce que tes prospects te disent, transformé en corrections de ton site, de ton discours et de ton ciblage." />

      <Card className="p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button quota="intelligence" variant="accent" loading={busy} onClick={run}>{a ? "Mettre à jour l'analyse" : "Analyser mes apprentissages"}</Button>
          {busy ? <p className="text-sm text-ink-soft">Lecture des réponses, des comptes rendus de RDV, des devis et de ton site… (environ 1 minute)</p>
            : ws.intelligence_at && <p className="text-sm text-ink-faint">Dernière analyse : {fmtTime(ws.intelligence_at)} · mise à jour automatique chaque lundi</p>}
        </div>
        {!a && !busy && <p className="text-sm text-ink-soft mt-3">Même sans réponse, Kairo prépare les questions et objections probables de tes cibles (marquées « hypothèse »). Dès que les vraies réponses arrivent, elles prennent le relais, et Kairo s'en sert pour mieux rédiger tes e-mails.</p>}
      </Card>

      {a && (
        <>
          <Card className="p-5 sm:p-6 mb-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge tone={a.real ? "good" : "warn"}>{a.real ? `Basé sur ${a.data?.replies} réponses réelles` : "Peu de réponses : surtout des hypothèses"}</Badge>
              {a.data?.meetings > 0 && <Badge>{a.data.meetings} comptes rendus de RDV</Badge>}
              {!a.data?.site_read && <Badge tone="bad">Site non lu</Badge>}
            </div>
            <p className="font-serif text-2xl leading-snug">{a.verdict}</p>
            {a.actions?.length > 0 && <>
              <H>Actions prioritaires</H>
              <ol className="space-y-2 text-sm">
                {a.actions.map((x, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-ink text-white text-xs grid place-items-center shrink-0 tnum">{i + 1}</span>
                    <span className="flex-1 min-w-0">{x.action}</span>
                    <Badge tone={x.impact === "fort" ? "accent" : "muted"}>{x.ou}</Badge>
                  </li>
                ))}
              </ol>
            </>}
          </Card>

          <div className="flex gap-1 border-b border-line mb-5 overflow-x-auto">
            {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap", tab === k ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>

          {tab === "faq" && (
            <div className="space-y-3">
              {faqText && <div className="flex justify-end"><Copy text={faqText} label="Copier toute la FAQ" /></div>}
              {(a.faq ?? []).map((f, i) => (
                <Card key={i} className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2"><Source x={f} />{SITE[f.sur_le_site] && <Badge tone={SITE[f.sur_le_site][1]}>{SITE[f.sur_le_site][0]}</Badge>}</div>
                  <p className="font-semibold">{f.question}</p>
                  <p className="text-sm mt-1.5 whitespace-pre-line">{f.reponse}</p>
                  <div className="flex items-center justify-between gap-3 mt-3"><p className="text-xs text-ink-faint">À ajouter : {f.ou || "FAQ"}</p><Copy text={`${f.question}\n${f.reponse}`} /></div>
                </Card>
              ))}
              {!a.faq?.length && <p className="text-sm text-ink-soft">Aucune question récurrente pour l'instant.</p>}
            </div>
          )}

          {tab === "objections" && (
            <div className="space-y-3">
              {(a.objections ?? []).map((o, i) => (
                <Card key={i} className="p-4 sm:p-5">
                  <div className="mb-2"><Source x={o} /></div>
                  <p className="font-semibold">« {o.objection} »</p>
                  <H>Ta réponse en rendez-vous</H>
                  <p className="text-sm">{o.reponse}</p>
                  {o.correction?.texte && <>
                    <H>Correction du site · {o.correction.page}</H>
                    <p className="text-sm text-ink-soft">{o.correction.quoi}</p>
                    <div className="mt-2 rounded-xl bg-paper border border-line p-3 text-sm whitespace-pre-line">{o.correction.texte}</div>
                    <div className="flex justify-end mt-2"><Copy text={o.correction.texte} /></div>
                  </>}
                </Card>
              ))}
              {!a.objections?.length && <p className="text-sm text-ink-soft">Aucune objection récurrente pour l'instant.</p>}
            </div>
          )}

          {tab === "segments" && (
            <div>
              {a.segments?.conseil && <Card className="p-4 sm:p-5 mb-4 text-sm">
                <p>{a.segments.conseil}</p>
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  {a.segments.concentrer?.filter(Boolean).length > 0 && <div><H>Concentrer</H><ul className="list-disc pl-5 space-y-1">{a.segments.concentrer.filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></div>}
                  {a.segments.ralentir?.filter(Boolean).length > 0 && <div><H>Ralentir</H><ul className="list-disc pl-5 space-y-1">{a.segments.ralentir.filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></div>}
                </div>
              </Card>}
              <Card className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead><tr className="text-left text-xs text-ink-soft border-b border-line">
                    <th className="p-3 font-semibold">Segment</th><th className="p-3 font-semibold text-right">Contactés</th><th className="p-3 font-semibold text-right">Réponses</th><th className="p-3 font-semibold text-right">Positives</th><th className="p-3 font-semibold text-right">RDV</th><th className="p-3 font-semibold text-right">Clients</th>
                  </tr></thead>
                  <tbody>
                    {(a.stats ?? []).map((s) => (
                      <tr key={s.key} className="border-b border-line last:border-0">
                        <td className="p-3 font-medium">{s.label}{s.contacted < 15 && <span className="text-xs text-ink-faint font-normal"> · trop tôt pour juger</span>}</td>
                        <td className="p-3 text-right tnum">{s.contacted}</td>
                        <td className="p-3 text-right tnum">{s.reply_rate.toLocaleString("fr-FR")} %</td>
                        <td className="p-3 text-right tnum font-semibold">{s.positive_rate.toLocaleString("fr-FR")} %</td>
                        <td className="p-3 text-right tnum">{s.rdv}</td>
                        <td className="p-3 text-right tnum">{s.clients}</td>
                      </tr>
                    ))}
                    {!a.stats?.length && <tr><td colSpan={6} className="p-4 text-ink-soft">Aucun e-mail envoyé pour l'instant.</td></tr>}
                  </tbody>
                </table>
              </Card>
              {(a.messages?.ce_qui_marche?.filter(Boolean).length > 0 || a.messages?.a_changer?.filter(Boolean).length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
                  <Card className="p-4"><H>Ce qui marche dans tes messages</H><ul className="list-disc pl-5 space-y-1">{(a.messages.ce_qui_marche ?? []).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></Card>
                  <Card className="p-4"><H>À changer</H><ul className="list-disc pl-5 space-y-1">{(a.messages.a_changer ?? []).filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></Card>
                </div>
              )}
            </div>
          )}

          {tab === "pages" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(a.pages ?? []).map((p, i) => (
                <Card key={i} className="p-4 sm:p-5 text-sm">
                  <p className="font-semibold text-base">{p.titre}</p>
                  <p className="text-ink-soft mt-1">{p.pourquoi}</p>
                  <ul className="list-disc pl-5 mt-3 space-y-1">{(p.contenu ?? []).map((c) => <li key={c}>{c}</li>)}</ul>
                </Card>
              ))}
              {!a.pages?.length && <p className="text-sm text-ink-soft">Aucune page manquante détectée.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
