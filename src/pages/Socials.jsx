import { useEffect, useState } from "react";
import { fn } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Badge, Button, Card, Input, PageHead, useToast } from "../components/ui";
import { cx, fmtTime } from "../lib/utils";

const NETS = [
  ["linkedin", "LinkedIn", "linkedin.com/company/…"],
  ["instagram", "Instagram", "instagram.com/…"],
  ["facebook", "Facebook", "facebook.com/…"],
  ["tiktok", "TikTok", "tiktok.com/@…"],
  ["youtube", "YouTube", "youtube.com/@…"],
  ["x", "X (Twitter)", "x.com/…"],
];
const NAME = Object.fromEntries(NETS.map(([k, l]) => [k, l]));
const TABS = [["bilan", "Bilan"], ["plan", "Plan de posts"], ["bios", "Bios prêtes"]];
const H = ({ children }) => <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2 mt-6 first:mt-0">{children}</p>;
const tone = (n) => (n >= 70 ? "text-good" : n >= 40 ? "text-warn" : "text-bad");

function Copy({ text }) {
  const toast = useToast();
  return <button className="text-xs font-semibold text-accent hover:underline shrink-0" onClick={() => { navigator.clipboard?.writeText(text).then(() => toast("Copié", "good"), () => toast("Copie impossible", "bad")); }}>Copier</button>;
}

export default function Socials() {
  const { ws, reload } = useWs();
  const toast = useToast();
  const [links, setLinks] = useState(ws.socials ?? {});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("bilan");
  const [open, setOpen] = useState(null);
  useEffect(() => setLinks(ws.socials ?? {}), [ws.socials]);
  const a = ws.social_audit;

  const run = async () => {
    setBusy(true);
    try {
      await fn("social-audit", { workspace_id: ws.id, socials: links });
      await reload();
      toast("Audit terminé", "good");
    } catch (e) {
      await reload();
      toast(e.message, "bad");
    } finally { setBusy(false); }
  };

  const score = Math.round(Number(a?.score) || 0);
  return (
    <div>
      <PageHead title="Réseaux sociaux" sub="Ce qu'un prospect voit quand il te vérifie, et quoi publier pour qu'il te réponde." />

      <Card className="p-5 sm:p-6 mb-6">
        <p className="font-semibold">Tes profils</p>
        <p className="text-sm text-ink-soft mt-0.5">Laisse vide ce que tu n'as pas : l'agent cherche aussi tout seul sur ton site et sur le web.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {NETS.map(([k, l, ph]) => (
            <label key={k} className="block">
              <span className="block text-[13px] font-semibold mb-1">{l}</span>
              <Input value={links[k] ?? ""} placeholder={ph} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button variant="accent" loading={busy} onClick={run}>{a ? "Refaire l'audit" : "Analyser mes réseaux"}</Button>
          {busy ? <p className="text-sm text-ink-soft">L'agent cherche tes profils, lit tes dernières publications, compare avec tes concurrents et prépare ton plan… (1 à 2 minutes)</p>
            : ws.social_audit_at && <p className="text-sm text-ink-faint">Dernier audit : {fmtTime(ws.social_audit_at)}</p>}
        </div>
      </Card>

      {!a ? null : (
        <>
          <Card className="p-5 sm:p-6 mb-6 flex flex-col sm:flex-row gap-5 sm:items-center">
            <div className="shrink-0 text-center sm:w-32">
              <p className={cx("font-serif text-6xl leading-none tnum", tone(score))}>{score}</p>
              <p className="text-xs text-ink-faint mt-1">sur 100</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Ce qu'un prospect pense en te voyant</p>
              <p className="font-serif text-2xl leading-snug mt-1">{a.verdict}</p>
            </div>
          </Card>

          <div className="flex gap-1 border-b border-line mb-5 overflow-x-auto">
            {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cx("px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap", tab === k ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink")}>{l}</button>)}
          </div>

          {tab === "bilan" && (
            <div className="text-sm">
              {a.profils?.length > 0 && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {a.profils.map((x, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{NAME[x.reseau] ?? x.reseau}{x.type ? <span className="text-ink-faint font-normal"> · {x.type}</span> : null}</p>
                      {x.trouve === false ? <Badge tone="bad">introuvable</Badge> : <span className={cx("font-serif text-2xl tnum", tone(Number(x.note) || 0))}>{Math.round(Number(x.note) || 0)}</span>}
                    </div>
                    <p className="text-ink-soft mt-1">{[x.abonnes && `${x.abonnes} abonnés`, x.rythme].filter(Boolean).join(" · ")}</p>
                    {x.dernier_post && <p className="text-ink-faint text-xs mt-1">Dernier post : {x.dernier_post}</p>}
                    {x.constat && <p className="mt-2">{x.constat}</p>}
                    {/^https?:/.test(x.url ?? "") && <a href={x.url} target="_blank" rel="noreferrer" className="text-xs text-ink-faint underline mt-2 inline-block">ouvrir ↗</a>}
                  </Card>
                ))}
              </div>}

              <div className="grid lg:grid-cols-2 gap-x-8 mt-7">
                <div>
                  {a.problemes?.length > 0 && <><H>Ce qui te coûte des réponses</H>{a.problemes.map((x, i) => (
                    <p key={i} className="mt-1.5 flex gap-2"><Badge tone={x.priorite === "haute" ? "bad" : x.priorite === "moyenne" ? "warn" : "muted"} className="shrink-0 mt-0.5">{x.priorite}</Badge><span>{x.texte}</span></p>
                  ))}</>}
                  {a.forces?.length > 0 && <><H>Ce qui marche déjà</H>{a.forces.map((x, i) => <p key={i} className="mt-1">✓ {x}</p>)}</>}
                  {a.manquants?.length > 0 && <><H>Réseaux absents</H>{a.manquants.map((x, i) => <p key={i} className="mt-1"><b>{NAME[x.reseau] ?? x.reseau}</b> : {x.pourquoi}</p>)}</>}
                </div>
                <div>
                  {a.actions?.length > 0 && <><H>À faire cette semaine</H>
                    <div className="space-y-2">{a.actions.map((x, i) => (
                      <div key={i} className="rounded-xl border border-line bg-white p-3 flex gap-3">
                        <span className="font-serif text-xl text-ink-faint w-5 shrink-0">{i + 1}</span>
                        <div className="min-w-0"><p className="font-medium">{x.action}</p><p className="text-xs text-ink-soft mt-0.5">{[NAME[x.reseau] ?? x.reseau, x.impact && `impact ${x.impact}`, x.temps].filter(Boolean).join(" · ")}</p></div>
                      </div>
                    ))}</div></>}
                  {a.concurrents && <><H>Face à tes concurrents</H><p>{a.concurrents}</p></>}
                </div>
              </div>
            </div>
          )}

          {tab === "plan" && (
            <div>
              {a.piliers?.length > 0 && <div className="flex flex-wrap gap-2 mb-4">{a.piliers.map((x, i) => <Badge key={i} tone="accent">{x}</Badge>)}</div>}
              <div className="space-y-2">
                {(a.plan ?? []).map((x, i) => (
                  <Card key={i} className="p-4">
                    <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(open === i ? null : i)}>
                      <div className="w-20 shrink-0 text-xs text-ink-soft leading-tight pt-0.5"><p className="font-semibold text-ink">Sem. {x.semaine}</p><p className="capitalize">{x.jour}</p></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-soft">{NAME[x.reseau] ?? x.reseau} · {x.format}{x.cible ? ` · pour ${x.cible}` : ""}</p>
                        <p className="font-semibold mt-0.5">{x.sujet}</p>
                        {open !== i && x.accroche && <p className="text-sm text-ink-soft mt-0.5 truncate">{x.accroche}</p>}
                      </div>
                      <span className="text-ink-faint text-sm shrink-0">{open === i ? "−" : "+"}</span>
                    </button>
                    {open === i && <div className="mt-3 pl-0 sm:pl-[92px]">
                      <p className="whitespace-pre-line text-[15px] leading-relaxed bg-paper rounded-xl p-4">{x.texte || x.accroche}</p>
                      <div className="mt-2 flex justify-end"><Copy text={x.texte || x.accroche || ""} /></div>
                    </div>}
                  </Card>
                ))}
              </div>
              <p className="text-xs text-ink-faint mt-3">Relis chaque post avant de le publier : l'agent n'invente aucun chiffre, mais c'est ta voix.</p>
            </div>
          )}

          {tab === "bios" && (
            <div className="grid lg:grid-cols-2 gap-3">
              {[["linkedin_titre", "Titre LinkedIn (dirigeant)"], ["linkedin_info", "Section « Infos » LinkedIn"], ["page_entreprise", "Description page entreprise"], ["instagram", "Bio Instagram"]].map(([k, l]) => a.bios?.[k] ? (
                <Card key={k} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2"><p className="font-semibold text-sm">{l}</p><Copy text={a.bios[k]} /></div>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{a.bios[k]}</p>
                  <p className="text-xs text-ink-faint mt-2 tnum">{a.bios[k].length} caractères</p>
                </Card>
              ) : null)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
