import Opportunite from "../components/Opportunite";
import Demande from "../components/Demande";
import Quiz from "../components/Quiz";
import { CANAUX, DELAIS, arrondi, estimer, euros, pourObjectif } from "../lib/estimation";
import { declencheur, quandTexte, typeDe } from "../lib/opportunite";
import { trace } from "../lib/usage";
import { useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Field, Input, Textarea, useToast } from "../components/ui";
import Logo from "../components/Logo";
import BizType from "../components/BizType";
import { PRESETS, fmtN, parseZone, zoneLabel } from "../lib/zones";
import { cx } from "../lib/utils";

const STEPS = ["Je lis ton site", "Je comprends ce que tu vends", "Je cherche qui en a besoin", "Je compte combien il en existe"];

function Thinking({ site }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 6500); return () => clearInterval(t); }, []);
  return (
    <div className="mt-8 grid sm:grid-cols-[150px_1fr] gap-6 items-center">
      <div className="relative mx-auto h-[150px] w-[150px]">
        <div className="absolute inset-0 rounded-full border border-accent/25" />
        <div className="absolute inset-[22%] rounded-full border border-accent/25" />
        <div className="absolute inset-0 rounded-full animate-[spin_3s_linear_infinite]" style={{ background: "conic-gradient(from 0deg, rgba(224,83,31,.35), transparent 25%)" }} />
        <span className="absolute left-1/2 top-1/2 -ml-2 -mt-2 h-4 w-4 rounded-full bg-accent shadow-[0_0_0_6px_rgba(224,83,31,.18)]" />
      </div>
      <div>
        {site && <p className="text-[13px] font-semibold text-accent-dark mb-2 truncate">{site.replace(/^https?:\/\//, "")}</p>}
        {STEPS.map((st, k) => (
          <div key={st} className={cx("flex items-center gap-3 py-1.5 text-[16px] transition", k > i ? "opacity-30" : "")}>
            <span className={cx("h-6 w-6 rounded-full grid place-items-center shrink-0", k < i ? "bg-good text-white" : k === i ? "bg-accent/15" : "bg-line")}>
              {k < i ? <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="check-draw" d="m5 12.5 4.5 4.5L19 7.5" /></svg> : k === i ? <span className="h-2 w-2 rounded-full bg-accent pulse-dot" /> : null}
            </span>
            <span className={k === i ? "font-semibold" : ""}>{st}{k === i && "…"}</span>
          </div>
        ))}
        <p className="text-sm text-ink-soft mt-3">Environ 30 secondes.</p>
      </div>
    </div>
  );
}

const H = "font-black tracking-[-.02em] leading-[1.02]";
const HFONT = { fontFamily: "var(--font-titre)" };
const PROGRESS = ["Ton produit", "Ton plan du jour"];

export default function Onboarding() {
  const { ws, create, reload, patch } = useWs();
  const toast = useToast();
  // -1 : les questions (type d'entreprise, valeur d'un client, objectif) ; 0 : le lien du produit ; 1 : « C'est juste ? »
  const [quiz, setQuiz] = useState(ws?.profile?.questionnaire ?? null);
  const [step, setStep] = useState(ws?.targets?.length ? 1 : ws?.profile?.questionnaire ? 0 : -1);
  const [site, setSite] = useState((ws?.website ?? "").replace(/^https?:\/\//i, "").replace(/\/$/, ""));
  const [desc, setDesc] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [clientEx, setClientEx] = useState("");
  const [rivaux, setRivaux] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(ws ?? null);
  const [zoneText, setZoneText] = useState("");
  const [sender, setSender] = useState({ sender_name: "", postal_address: "" });

  useEffect(() => { if (ws) setDraft(ws); }, [ws]);

  const analyzeSite = async () => {
    if (!site.trim() && !desc.trim()) return toast("Indique ton site ou décris ton activité", "bad");
    setBusy(true);
    try {
      const id = ws?.id ?? (await create("", site));
      const r = await fn("analyze", { workspace_id: id, website: site.trim(), description: desc.trim(), client_exemple: clientEx.trim(), concurrents: rivaux.trim() });
      await reload();
      // Les réponses aux questions restent dans le profil ; le type déclaré corrige celui déduit du site
      const BIZ = { saas: "saas", app: "saas", agence: "services" };
      const profile = { ...r.profile, ...(quiz ? { questionnaire: quiz, ...(BIZ[quiz.type] ? { type: BIZ[quiz.type] } : {}) } : {}) };
      setDraft((d) => ({ ...(d ?? {}), id, profile, targets: r.targets, zone: r.zone }));
      if (quiz) await patch({ profile }).catch(() => {});
      setStep(1);
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };

  const setZone = async (zone) => {
    setDraft((d) => ({ ...d, zone }));
    setBusy(true);
    try {
      await patch({ zone });
      const r = await fn("count", { workspace_id: ws.id });
      setDraft((d) => ({ ...d, targets: r.targets }));
    } catch (e) { toast(e.message, "bad"); } finally { setBusy(false); }
  };

  const toggle = (id) => setDraft((d) => ({ ...d, targets: d.targets.map((t) => t.id === id ? { ...t, actif: t.actif === false } : t) }));

  const [express, setExpress] = useState(null);
  const launch = async () => {
    if (!sender.sender_name.trim()) return toast("Indique ton prénom et ton nom", "bad");
    setBusy(true);
    try {
      await patch({ targets: draft.targets, profile: draft.profile, sender_name: sender.sender_name.trim(), name: draft.profile?.nom || ws.name });
      setStep(3);
      setExpress({ phase: "chercher" });
      const r = await fn("search", { workspace_id: ws.id, pages: 1 });
      await supabase.from("workspaces").update({ onboarded: true }).eq("id", ws.id);
      // En parallèle : les gens qui demandent en public une solution comme la sienne (Reddit, LinkedIn, X, forums)
      const demandes = fn("r/spy-needs", { workspace_id: ws.id }).catch(() => ({ found: 0 }));
      // Premier Radar tout de suite (sources officielles, sans recherche web) : le client ne découvre jamais un Radar vide
      fn("r/radar-scan", { workspace_id: ws.id, web: false }).catch(() => {});
      // Démarrage express : on cherche les e-mails publiés de quelques entreprises, puis on rédige 3 premiers messages
      let e = { phase: "enqueter", trouves: r.inserted ?? 0, sites: 0, emails: 0, prets: 0 };
      setExpress({ ...e });
      for (let tour = 0; tour < 5 && r.inserted > 0; tour++) {
        const x = await fn("r/demarrage", { workspace_id: ws.id, etape: "chercher" }).catch(() => null);
        if (!x) break;
        e = { ...e, sites: e.sites + x.sites, emails: x.avec_email };
        setExpress({ ...e });
        if (x.avec_email >= 3 || !x.reste) break;
      }
      if (e.emails > 0) {
        setExpress({ ...e, phase: "rediger" });
        const d = await fn("r/demarrage", { workspace_id: ws.id, etape: "rediger" }).catch(() => ({ prets: 0 }));
        e = { ...e, prets: d.prets };
      }
      // Les demandes publiques : on attend au plus 40 s de plus, sinon elles arriveront dans l'espace
      setExpress({ ...e, phase: "demandes" });
      const dm = await Promise.race([demandes, new Promise((ok) => setTimeout(() => ok(null), 40000))]);
      e = { ...e, demandes: dm ? dm.found ?? 0 : null };
      // Pas de rechargement ici : l'écran de fin reste affiché, ses boutons ouvrent l'espace à jour
      setExpress({ ...e, phase: "fini" });
    } catch (e) { toast(e.message, "bad"); setStep(1); } finally { setBusy(false); }
  };

  const active = draft?.targets?.filter((t) => t.actif !== false) ?? [];
  const total = active.reduce((s, t) => s + (t.total ?? 0), 0);

  return (
    <div className="min-h-full px-4 py-6 sm:py-10" style={{ background: "radial-gradient(ellipse at 50% 0%, #FFF1E6 0%, #FAF9F6 60%)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <a href="#/accueil" aria-label="Voir le site Bingoo!"><Logo height={30} /></a>
          <span className="flex items-center gap-4 text-sm text-ink-soft">
            {step >= 0 && <span className="tnum">Étape {Math.min(step + 1, 2)} sur 2</span>}
            <button type="button" onClick={() => supabase.auth.signOut()} className="font-semibold hover:text-ink">Se déconnecter</button>
          </span>
        </div>
        {step === -1 && <Quiz onDone={(q) => { setQuiz(q); setStep(0); }} />}
        {/* Progression */}
        {step >= 0 && <div className="grid grid-cols-2 gap-2 mb-8" aria-hidden>
          {PROGRESS.map((l, k) => (
            <div key={l}>
              <div className="h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: (step >= 3 ? 2 : Math.min(step, 1)) > k ? "100%" : Math.min(step, 1) === k ? "50%" : "0%" }} /></div>
              <p className={cx("mt-1.5 text-[12px] font-semibold", Math.min(step, 1) >= k ? "text-ink" : "text-ink-faint")}>{l}</p>
            </div>
          ))}
        </div>}

        {step === 0 && (
          <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent-dark px-3 py-1 text-[12.5px] font-bold">Bienvenue sur Bingoo!</span>
            <h1 className={cx(H, "mt-4 text-[34px] sm:text-[44px]")} style={HFONT}>Colle le lien de ton produit.</h1>
            <p className="text-ink-soft mt-3 text-[17px]">En moins d'une minute, je te montre de vraies entreprises qui en ont besoin maintenant, et les gens qui le demandent en public. Puis ton plan du jour : 15 minutes, et je m'occupe du reste.</p>
            {busy ? <Thinking site={site} /> : (<>
              <div className="mt-7 grid grid-cols-2 rounded-full bg-paper border border-line p-1 max-w-sm" role="tablist">
                {[[false, "J'ai un lien"], [true, "Pas encore de site"]].map(([v, l]) => (
                  <button key={l} type="button" role="tab" aria-selected={showDesc === v} onClick={() => setShowDesc(v)}
                    className={cx("rounded-full py-2 text-[14px] font-semibold transition", showDesc === v ? "bg-white shadow-sm text-ink" : "text-ink-soft hover:text-ink")}>{l}</button>
                ))}
              </div>
              <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); analyzeSite(); }}>
                {!showDesc ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 min-w-0 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 transition">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-faint shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>
                      <span className="text-ink-faint text-[16px] hidden sm:inline">https://</span>
                      <input autoFocus aria-label="Lien de ton produit" placeholder="monproduit.com" value={site} onChange={(e) => setSite(e.target.value.replace(/^https?:\/\//i, ""))} className="flex-1 min-w-0 bg-transparent py-4 text-[17px] outline-none" />
                    </label>
                    <button type="submit" className="rounded-2xl bg-accent text-white px-7 py-4 text-[16px] font-bold hover:bg-accent-dark active:scale-[0.98] transition whitespace-nowrap">Voir qui en a besoin →</button>
                  </div>
                ) : (<>
                  <label className="block">
                    <span className="block text-[13px] font-semibold mb-1.5">Décris ton activité en quelques phrases</span>
                    <Textarea autoFocus rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex. Une application qui automatise les notes de frais : photo du ticket, catégorie, export comptable. Pour l'instant quelques utilisateurs, je ne sais pas encore quel type d'entreprise viser." />
                    <span className="block text-xs text-ink-soft mt-1.5">Ce que tu vends et le problème que ça règle. Si tu ne sais pas à qui le vendre, dis-le simplement.</span>
                  </label>
                  <button type="submit" className="w-full sm:w-auto rounded-2xl bg-accent text-white px-7 py-4 text-[16px] font-bold hover:bg-accent-dark active:scale-[0.98] transition">Analyser mon activité →</button>
                </>)}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <label className="block">
                    <span className="block text-[13px] font-semibold mb-1.5">Un client que tu as déjà <span className="font-normal text-ink-soft">(facultatif)</span></span>
                    <Input value={clientEx} onChange={(e) => setClientEx(e.target.value)} placeholder="Ex. un cabinet comptable de 15 personnes" />
                    <span className="block text-xs text-ink-soft mt-1">Je cherche d'abord des entreprises qui lui ressemblent.</span>
                  </label>
                  <label className="block">
                    <span className="block text-[13px] font-semibold mb-1.5">Tes concurrents <span className="font-normal text-ink-soft">(facultatif)</span></span>
                    <Input value={rivaux} onChange={(e) => setRivaux(e.target.value)} placeholder="Ex. Lemlist, Kaspr" />
                    <span className="block text-xs text-ink-soft mt-1">Je ne leur écrirai jamais.</span>
                  </label>
                </div>
              </form>
              <div className="mt-8 pt-6 border-t border-line grid sm:grid-cols-3 gap-4">
                {[["Je lis ton site", "Ton offre, le problème que tu règles."], ["Je trouve ton public", "Les types d'entreprises qui en ont besoin, et quand."], ["Je compte", "Combien existent, et je teste les pistes."]].map(([t, d], k) => (
                  <div key={t} className="flex gap-3">
                    <span className="h-7 w-7 rounded-full bg-ink text-white grid place-items-center text-[12px] font-black shrink-0" style={HFONT}>{k + 1}</span>
                    <span><span className="block text-[14px] font-bold">{t}</span><span className="block text-[13px] text-ink-soft">{d}</span></span>
                  </div>
                ))}
              </div>
            </>)}
          </div>
        )}

        {step === 1 && draft && (
          <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9 space-y-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent-dark px-3 py-1 text-[12.5px] font-bold">Voici ce que j'ai compris</span>
              <h1 className={cx(H, "text-[34px] sm:text-[44px] mt-4")} style={HFONT}>{draft.profile?.nom || "Ton entreprise"}</h1>
              <p className="text-ink-soft text-[17px] mt-3">{draft.profile?.resume}</p>
            </div>
            <div className="rounded-2xl bg-paper border border-line p-5 space-y-4">
              <p className="text-[15px] font-bold">C'est juste ? Corrige directement si besoin.</p>
              <Field label="Tu vends"><Textarea rows={2} value={draft.profile?.offre ?? ""} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, offre: e.target.value } })} /></Field>
              <div>
                <p className="text-[13px] font-semibold mb-1.5">J'écrirai à</p>
                <ul className="space-y-1 text-[14.5px]">
                  {active.slice(0, 4).map((t) => <li key={t.id}><b>{t.interlocuteur || "Dirigeant"}</b> <span className="text-ink-soft">· {t.label}{t.moment ? `, ${t.moment.charAt(0).toLowerCase()}${t.moment.slice(1)}` : ""}</span></li>)}
                </ul>
              </div>
            </div>
            <div>
              <p className="text-[15px] font-semibold">Je vais chercher pour toi</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {active.map((t) => <span key={t.id} className="rounded-full bg-paper border border-line px-3 py-1.5 text-[14px]">{t.label}{t.confiance === "a_tester" ? " · à tester" : ""}</span>)}
                <span className="rounded-full bg-paper border border-line px-3 py-1.5 text-[14px] text-ink-soft">{zoneLabel(draft.zone)}</span>
              </div>
            </div>
            {active.some((t) => t.confiance === "a_tester") && (
              <p className="rounded-2xl bg-accent-soft/50 border border-accent/20 px-4 py-3 text-[14.5px]">Tu n'as pas besoin de savoir qui viser : je contacte un petit nombre d'entreprises de chaque piste, puis je garde celles qui répondent. Tu verras chaque semaine laquelle marche le mieux.</p>
            )}
            <details className="rounded-2xl border border-line group">
              <summary className="cursor-pointer list-none px-5 py-3.5 text-[15px] flex items-center justify-between">Corriger mes cibles, ma zone ou ce qui me distingue<span className="text-ink-soft group-open:rotate-90 transition">›</span></summary>
              <div className="px-5 pb-5 space-y-8">
            <div className="rounded-2xl bg-paper border border-line p-5 space-y-3">
              <Field label="Ce qui te distingue"><Textarea rows={2} value={draft.profile?.differenciation ?? ""} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, differenciation: e.target.value } })} /></Field>
              <Field label="Ton type d'entreprise" hint="Bingoo adapte ce qu'il cherche pour toi. Corrige si besoin.">
                <BizType value={draft.profile?.type} onChange={(v) => setDraft({ ...draft, profile: { ...draft.profile, type: v } })}
                  publicValue={draft.profile?.vend_public} onPublic={(v) => setDraft({ ...draft, profile: { ...draft.profile, vend_public: v } })} />
              </Field>
            </div>

            <div>
              <h2 className="text-[19px] font-bold">Où prospecter</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {PRESETS.map((p) => (
                  <button key={p.label} disabled={busy} onClick={() => setZone(p.zone)}
                    className={cx("rounded-full px-3.5 py-1.5 text-sm font-medium border transition", zoneLabel(draft.zone) === p.label ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink-faint")}>{p.label}</button>
                ))}
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const z = parseZone(zoneText); if (z.length) setZone(z); }}>
                  <Input placeholder="Départements : 33, 40…" value={zoneText} onChange={(e) => setZoneText(e.target.value)} className="py-1.5 text-sm !w-48" />
                </form>
              </div>
              <p className="text-sm text-ink-soft mt-2">Actuellement : {zoneLabel(draft.zone)}</p>
            </div>

            <div>
              <h2 className="text-[19px] font-bold">Tes clients idéaux <span className="text-ink-soft font-normal text-[15px]">· {fmtN(total)} établissements</span></h2>
              <div className="mt-3 space-y-2">
                {draft.targets.map((t) => (
                  <button key={t.id} onClick={() => toggle(t.id)} className={cx("w-full text-left rounded-2xl border p-4 transition flex gap-4 items-start", t.actif === false ? "bg-transparent border-line opacity-50" : "bg-white border-line hover:border-ink-faint")}>
                    <span className={cx("mt-1 w-5 h-5 rounded-md border-2 grid place-items-center shrink-0", t.actif === false ? "border-line" : "bg-ink border-ink text-white")}>
                      {t.actif !== false && <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m3 8 3.5 3.5L13 5" /></svg>}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold">{t.label}</span>
                        <span className="text-sm text-ink-soft tnum">{busy ? "…" : `${fmtN(t.total)} trouvables`}</span>
                      </span>
                      <span className="block text-sm text-ink-soft mt-1">{t.pourquoi}</span>
                      {t.moment && <span className="block text-xs text-ink-soft mt-1">Le bon moment : {t.moment}</span>}
                      {t.confiance === "a_tester" && <span className="inline-block mt-1.5 rounded-full bg-accent-soft text-accent-dark px-2 py-0.5 text-[11.5px] font-semibold">Piste à tester</span>}
                      {t.interlocuteur && <span className="block text-xs text-ink-faint mt-1.5">J'écrirai à : {t.interlocuteur}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
              </div>
            </details>
            <div className="space-y-4 pt-2">
              <Field label="Les messages partiront signés de"><Input value={sender.sender_name} onChange={(e) => setSender({ ...sender, sender_name: e.target.value })} placeholder="Ton prénom et ton nom" /></Field>
            </div>
            <div className="flex flex-wrap gap-3 items-center pt-6 border-t border-line">
              <Button variant="accent" size="lg" loading={busy} disabled={!active.length} onClick={launch}>Voir mes premières opportunités →</Button>
              <Button variant="ghost" onClick={() => setStep(0)}>Recommencer l'analyse</Button>
            </div>
            <p className="text-[13px] text-ink-soft">Rien ne part sans ta validation.</p>
          </div>
        )}

        {step === 3 && <Express e={express} ws={ws} quiz={quiz ?? draft?.profile?.questionnaire} />}
      </div>
    </div>
  );
}

const PHASES = [
  ["chercher", "Je parcours le registre officiel des entreprises"],
  ["enqueter", "Je trouve leur site et l'e-mail qu'elles publient"],
  ["rediger", "J'écris tes premiers messages, chacun sur un fait vérifié"],
  ["demandes", "Je cherche qui demande une solution comme la tienne, en public"],
];

function Express({ e, ws, quiz }) {
  const ordre = ["chercher", "enqueter", "rediger", "demandes", "fini"];
  const k = ordre.indexOf(e?.phase ?? "chercher");
  if (e?.phase === "fini") {
    const ok = e.prets > 0;
    return (
      <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9">
        <span className="inline-flex items-center gap-2 rounded-full bg-good-soft text-good px-3 py-1 text-[12.5px] font-bold">Fait à l'instant, sur de vraies données</span>
        <h1 className={cx(H, "mt-4 text-[34px] sm:text-[44px]")} style={HFONT}>Ton plan du jour est prêt.</h1>
        <p className="text-ink-soft mt-3 text-[17px]">Rien d'inventé : chaque entreprise et chaque demande a sa source. Toi, tu valides. Moi, je m'occupe du reste.</p>
        {quiz?.type && quiz?.valeur && <PlanAction q={quiz} />}
        <Plan ws={ws} e={e} />
        {ok ? <Cartes ws={ws} /> : e.trouves > 0 ? <Apercus ws={ws} /> : null}
        <DemandesApercu ws={ws} />
        {ok && <Debloquer ws={ws} />}
        <div className="mt-7 flex flex-wrap gap-3">
          {ok ? <Button variant="accent" size="lg" onClick={() => { window.location.href = "/#/valider"; }}>Commencer mon plan</Button>
            : <Button variant="accent" size="lg" onClick={() => { window.location.href = "/#/"; }}>Ouvrir mon espace</Button>}
          <button className="text-[15px] font-semibold text-ink-soft hover:text-ink px-3" onClick={() => { window.location.href = "/qg/?premiere=1"; }}>Voir mon équipe partir dans ma ville</button>
        </div>
      </div>
    );
  }
  return (
    <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9">
      <h1 className={cx(H, "text-[34px] sm:text-[44px]")} style={HFONT}>{e?.trouves > 0 ? `${fmtN(e.trouves)} entreprises trouvées. J'écris tes premiers messages…` : "Je cherche tes premières entreprises…"}</h1>
      <p className="text-ink-soft mt-3 text-[17px]">{e?.trouves > 0 ? "Voici déjà les premières, avec la raison de leur écrire maintenant. Les messages arrivent dans une à trois minutes." : "Quelques secondes."}</p>
      <ul className="mt-8 space-y-3">
        {PHASES.map(([cle, t], i) => (
          <li key={cle} className={cx("flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-[15px] transition", i < k ? "bg-good/5 border-good/30" : i === k ? "bg-paper border-line" : "bg-paper border-line opacity-40")}>
            {i < k ? <span className="h-5 w-5 shrink-0 rounded-full bg-good text-white grid place-items-center text-[11px]">✓</span>
              : <span className={cx("h-5 w-5 shrink-0 rounded-full border-2", i === k ? "border-accent border-t-transparent animate-spin" : "border-line")} />}
            <span className="flex-1">{t}</span>
            {cle === "chercher" && e?.trouves > 0 && <span className="text-[13px] font-semibold tabular-nums">{fmtN(e.trouves)} trouvées</span>}
            {cle === "enqueter" && k >= 1 && <span className="text-[13px] font-semibold tabular-nums">{e.sites} sites · {e.emails} e-mails</span>}
          </li>
        ))}
      </ul>
      {/* Du concret tout de suite : les vraies entreprises trouvées, pendant que les messages s'écrivent */}
      {e?.trouves > 0 && <Apercus ws={ws} />}
    </div>
  );
}

/** Le plan d'action : les canaux, le rythme, et ce que ça peut rapporter (fourchette, hypothèses visibles, jamais une promesse). */
export function PlanAction({ q }) {
  const e = estimer(q);
  const h = e.horizon;
  const quand = DELAIS.find(([v]) => Number(v) === h)?.[1]?.toLowerCase() ?? `d'ici ${h} mois`;
  const [c0, c1] = e.clients.map(arrondi);
  const objectifTotal = (q.objectif ?? 5) * Math.max(0.5, h - 0.5);
  const besoin = pourObjectif(q.objectif ?? 5, e);
  const atteint = e.clients[1] >= objectifTotal;
  const type = { saas: "un SaaS", app: "une application", startup: "une startup", pme: "une PME", tpe: "une TPE", agence: "une agence" }[q.type];
  const deja = (q.canaux ?? []).filter((c) => c !== "rien").map((c) => CANAUX.find(([k]) => k === c)?.[1]).filter(Boolean);
  // Courbe : clients cumulés mois par mois (prudent et probable)
  const mois = Array.from({ length: Math.min(h, 12) }, (_, k) => k + 1);
  const cum = (lvl) => mois.map((m) => e.parMois.clients[lvl] * Math.max(0.5, m - 0.5));
  const max = Math.max(...cum(1), objectifTotal, 1);
  return (
    <div className="mt-7 rounded-2xl border border-line overflow-hidden">
      <div className="bg-[#FFF1E6] px-5 py-5">
        <p className="text-[13px] font-bold text-[#C2410C]">Ton plan d'action</p>
        <p className="mt-1 text-[26px] sm:text-[30px] font-black leading-tight" style={HFONT}>{c0} à {c1} nouveaux clients {quand}</p>
        <p className="mt-1 text-[15px] text-ink-soft">soit {euros(e.revenu[0])} à {euros(e.revenu[1])} {e.recurrent ? "de revenu récurrent en plus chaque mois" : "de chiffre d'affaires signé"}, pour {type ?? "ton activité"}, avec un client à {euros(Number(q.valeur))}{e.recurrent ? " par mois" : " par an"}.</p>
        <div className="mt-4 flex items-end gap-1.5 h-24" aria-hidden>
          {mois.map((m, k) => (
            <div key={m} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
              <div className="w-full rounded-t-md bg-accent/25 relative" style={{ height: `${Math.max(4, (cum(1)[k] / max) * 85)}%` }}>
                <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-accent" style={{ height: `${(cum(0)[k] / Math.max(cum(1)[k], 0.01)) * 100}%` }} />
              </div>
              <span className="text-[10.5px] text-ink-faint tnum">M{m}</span>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] text-ink-faint"><span className="inline-block h-2 w-2 rounded-sm bg-accent mr-1" />prudent <span className="inline-block h-2 w-2 rounded-sm bg-accent/25 ml-2 mr-1" />probable · clients cumulés</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-[14px] font-bold">Chaque jour, Bingoo! s'occupe de :</p>
        <ul className="mt-2 space-y-2 text-[14.5px]">
          {[["✉️", "15 e-mails aux décideurs d'entreprises au bon moment", "Il écrit, tu valides en un clic"], ["💼", "10 invitations LinkedIn, puis le message quand elles sont acceptées", "Envoyées par l'extension, depuis ton compte"], ["🗣️", "Les demandes publiques du jour, avec ta réponse prête", "Reddit, LinkedIn, X, forums : tu publies"], ["📞", "Les appels à passer après deux relances sans réponse", "Numéro et script qui reprend ton e-mail"]].map(([i, t, d]) => (
            <li key={t} className="flex gap-3"><span className="text-[18px] leading-6" aria-hidden>{i}</span><span><span className="block font-semibold">{t}</span><span className="block text-[13px] text-ink-soft">{d}</span></span></li>
          ))}
        </ul>
        {deja.length > 0 && <p className="mt-3 text-[13px] text-ink-soft">Tu gardes ce qui marche déjà ({deja.join(", ")}) : Bingoo! s'ajoute, il ne remplace rien.</p>}
        <p className={cx("mt-4 rounded-xl px-4 py-3 text-[14px]", atteint ? "bg-good-soft text-good" : "bg-paper")}>
          {atteint ? `Ton objectif de ${q.objectif} client${q.objectif > 1 ? "s" : ""} par mois est dans la fourchette probable de ce plan.`
            : `Ton objectif : ${q.objectif} client${q.objectif > 1 ? "s" : ""} par mois. Pour l'atteindre, il faut environ ${besoin} contacts par jour : on y monte progressivement, en ajoutant des boîtes d'envoi, et en gardant les cibles qui répondent le mieux.`}
        </p>
        <details className="mt-3 text-[13px] text-ink-soft">
          <summary className="cursor-pointer font-semibold">Comment on calcule</summary>
          <ul className="mt-2 list-disc pl-5 space-y-1">{e.hypotheses.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-2">C'est une estimation, pas une promesse. Dès tes premiers envois, tes vrais taux s'affichent dans Résultats.</p>
        </details>
      </div>
    </div>
  );
}

/** Le plan du jour : ce qu'il y a à faire aujourd'hui, compté sur les vraies données de l'espace, avec le temps que ça prend. */
function Plan({ ws, e }) {
  const [k, setK] = useState(null);
  useEffect(() => {
    const head = (q) => q.then((x) => x.count ?? 0);
    Promise.all([
      head(supabase.from("messages").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "brouillon")),
      head(supabase.from("radar_opps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("kind", "besoin").eq("status", "nouveau")),
      head(supabase.from("radar_opps").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("status", "nouveau").neq("kind", "besoin")),
      head(supabase.from("prospects").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).neq("status", "ignore")),
    ]).then(([msgs, dem, opps, ent]) => setK({ msgs, dem, opps, ent }));
  }, [ws.id, e?.demandes]);
  if (!k) return <div className="mt-7 h-32 rounded-2xl bg-paper animate-pulse" />;
  const lignes = [
    k.msgs > 0 && { n: k.msgs, t: `message${k.msgs > 1 ? "s" : ""} prêt${k.msgs > 1 ? "s" : ""} à relire et envoyer`, d: "Chacun part d'un fait récent et vérifié chez l'entreprise.", min: Math.min(6, k.msgs * 2) },
    k.dem > 0 && { n: k.dem, t: `personne${k.dem > 1 ? "s demandent" : " demande"} en public une solution comme la tienne`, d: "Sur Reddit, LinkedIn, X ou un forum. Ta réponse est écrite, tu la publies.", min: Math.min(6, k.dem * 2) },
    e?.demandes === null && { n: "…", t: "demandes publiques en cours de recherche", d: "Elles t'attendront dans ton espace dans quelques minutes.", min: 0 },
    (k.opps > 0 || k.ent > 0) && { n: k.opps || k.ent, t: k.opps ? `entreprise${k.opps > 1 ? "s" : ""} au bon moment, repérée${k.opps > 1 ? "s" : ""}` : `entreprise${k.ent > 1 ? "s" : ""} qui correspondent à ta cible`, d: "Je cherche leur décideur et son e-mail vérifié cette nuit. Rien à faire pour toi.", min: 0 },
  ].filter(Boolean);
  if (!lignes.length) return <p className="mt-7 rounded-2xl bg-paper px-4 py-3 text-[15px]">Je n'écris que lorsqu'une entreprise a un fait récent à citer et une adresse vérifiée. Je continue cette nuit : ton premier plan t'attendra demain matin.</p>;
  const total = Math.max(5, Math.min(15, lignes.reduce((s, l) => s + l.min, 0)));
  return (
    <div className="mt-7 rounded-2xl border border-line overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-ink text-white px-4 py-3">
        <p className="font-bold text-[15px]">Aujourd'hui</p>
        <p className="text-[14px] font-semibold tnum">≈ {total} minutes</p>
      </div>
      <ol className="divide-y divide-line">
        {lignes.map((l, i) => (
          <li key={i} className="flex gap-4 px-4 py-3.5">
            <span className="w-12 shrink-0 text-[26px] font-black leading-none tnum text-accent-dark" style={HFONT}>{l.n}</span>
            <span className="min-w-0"><span className="block text-[15px] font-semibold">{l.t}</span><span className="block text-[13.5px] text-ink-soft">{l.d}</span></span>
            {l.min > 0 && <span className="ml-auto shrink-0 text-[12.5px] text-ink-faint tnum">{l.min} min</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Les deux meilleures demandes publiques trouvées pendant l'inscription, avec leur réponse prête. */
function DemandesApercu({ ws }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from("radar_opps").select("id, title, summary, why, url, source, published, created_at, raw, status").eq("workspace_id", ws.id).eq("kind", "besoin").eq("status", "nouveau").order("score", { ascending: false, nullsFirst: false }).limit(2)
      .then(({ data }) => setRows(data ?? []));
  }, [ws.id]);
  if (!rows.length) return null;
  return (
    <div className="mt-6">
      <p className="text-[15px] font-bold">Ils cherchent une solution comme la tienne</p>
      <div className="mt-3 space-y-3">{rows.map((o) => <Demande key={o.id} o={o} compact onDone={(id) => setRows((x) => x.filter((r) => r.id !== id))} />)}</div>
    </div>
  );
}

/** Sur l'écran des messages prêts : ce qui manque pour qu'ils puissent partir (adresse, boîte mail), à faire ici même. */
function Debloquer({ ws }) {
  const toast = useToast();
  const [adresse, setAdresse] = useState(ws?.postal_address ?? "");
  const [okAdresse, setOkAdresse] = useState(!!ws?.postal_address);
  const [busy, setBusy] = useState("");
  const boite = ws?.domain_status === "verified" || !!ws?.integrations?.mailbox?.ok;
  if (okAdresse && boite) return null;
  const retour = () => { try { localStorage.setItem("bingoo-apres-boite", "/#/valider"); } catch { /* rien */ } };
  const outlook = async () => { setBusy("outlook"); retour(); try { const r = await fn("o/microsoft-url", { workspace_id: ws.id }); window.location.href = r.url; } catch (x) { toast(x.message, "bad"); setBusy(""); } };
  const sauver = async () => {
    if (adresse.trim().length < 8) return toast("Indique l'adresse complète (rue, code postal, ville)", "bad");
    setBusy("adresse");
    // Mise à jour directe, sans recharger l'espace (sinon l'écran de fin disparaît : l'espace est déjà marqué « prêt »)
    try { const { error } = await supabase.from("workspaces").update({ postal_address: adresse.trim() }).eq("id", ws.id); if (error) throw new Error(error.message); setOkAdresse(true); } catch (x) { toast(x.message, "bad"); } finally { setBusy(""); }
  };
  return (
    <div className="mt-6 rounded-2xl bg-[#FFF1E6] p-4">
      <p className="font-semibold text-[15px]">Pour qu'ils puissent partir</p>
      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black", okAdresse ? "bg-good text-white" : "bg-white text-ink-faint border border-line")}>{okAdresse ? "✓" : "1"}</span>
          {okAdresse ? <span className="text-[14px]">Adresse de l'entreprise ajoutée</span> : (<>
            <Input className="!w-auto min-w-0 flex-1" value={adresse} onChange={(x) => setAdresse(x.target.value)} placeholder="Adresse de l'entreprise (obligatoire en bas des e-mails)" />
            <Button loading={busy === "adresse"} onClick={sauver}>Enregistrer</Button>
          </>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black", boite ? "bg-good text-white" : "bg-white text-ink-faint border border-line")}>{boite ? "✓" : "2"}</span>
          {boite ? <span className="text-[14px]">Boîte mail connectée</span> : (<>
            <span className="flex-1 text-[14px]">Ta boîte mail, pour envoyer de ton adresse</span>
            <Button loading={busy === "outlook"} onClick={outlook}>Outlook</Button>
            <Button onClick={() => { retour(); window.location.href = "/#/connexions"; }}>Gmail ou autre (2 min)</Button>
          </>)}
        </div>
      </div>
    </div>
  );
}

/** Pas encore d'adresse vérifiée : on montre quand même 3 vraies entreprises et la raison de leur écrire maintenant. */
function Apercus({ ws }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    supabase.from("prospects").select("id, name, city, activity, contact_name, contact_role, signals").eq("workspace_id", ws.id).neq("status", "ignore").order("score", { ascending: false, nullsFirst: false }).limit(60)
      .then(({ data }) => setRows((data ?? []).map((p) => ({ p, d: declencheur(p) })).sort((a, b) => Number(!!b.d) - Number(!!a.d) || Number(!!b.p.contact_name) - Number(!!a.p.contact_name)).slice(0, 3)));
  }, [ws.id]);
  if (!rows) return <div className="mt-6 h-40 rounded-2xl bg-paper animate-pulse" />;
  return (
    <div className="mt-6 space-y-3">
      {rows.map(({ p, d }) => (
        <article key={p.id} className="rounded-2xl border border-line p-4">
          <p className="text-[18px] font-black leading-tight" style={HFONT}>{p.name}</p>
          <p className="text-[13px] text-ink-soft">{[p.activity, p.city].filter(Boolean).join(" · ")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl bg-[#FFF1E6] px-3 py-2 text-[13.5px]"><b className="text-[#C2410C]">Pourquoi maintenant</b><br />{d ? <>{typeDe(d.type)}{d.quand ? ` · ${quandTexte(d.quand)}` : ""}<span className="block text-ink-soft line-clamp-2">{d.label}</span></> : "Correspond à ta cible"}</p>
            <p className="rounded-xl bg-paper px-3 py-2 text-[13.5px]"><b className="text-ink-soft">À qui</b><br />{p.contact_name || "Dirigeant à confirmer"}{p.contact_role ? <span className="text-ink-soft">, {String(p.contact_role).replace(/\s*\(.*$/, "")}</span> : null}<span className="block text-ink-soft">Je cherche son adresse vérifiée</span></p>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Le moment magique : les opportunités elles-mêmes, et une question. La réponse est mesurée (activation). */
function Cartes({ ws }) {
  const [rows, setRows] = useState(null);
  const [avis, setAvis] = useState({});
  useEffect(() => {
    supabase.from("messages").select("id, subject, body, prospects(*)").eq("workspace_id", ws.id).eq("status", "brouillon").eq("step", 0).order("created_at").limit(3)
      .then(({ data }) => setRows(data ?? []));
  }, [ws.id]);
  if (!rows) return <div className="mt-6 h-40 rounded-2xl bg-paper animate-pulse" />;
  const repondre = (id, v) => { setAvis((a) => ({ ...a, [id]: v })); trace(ws.id, "moment_magique", v); };
  return (
    <div className="mt-6 space-y-4">
      {rows.map((m) => (
        <article key={m.id} className="rounded-2xl border border-line p-4">
          <p className="text-[19px] font-black leading-tight" style={HFONT}>{m.prospects?.name}</p>
          <div className="mt-3"><Opportunite p={m.prospects ?? {}} /></div>
          <details className="mt-3 group">
            <summary className="cursor-pointer list-none text-[14px]"><span className="font-semibold">Le message :</span> <span className="text-ink-soft">{m.subject}</span> <span className="text-accent-dark underline group-open:hidden">lire</span></summary>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed">{m.body}</p>
          </details>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-semibold">Tu l'enverrais ?</span>
            {avis[m.id] ? <span className="text-ink-soft">{avis[m.id] === "oui" ? "Noté : il t'attend dans « Messages à envoyer »." : "Noté : tu pourras le modifier ou l'écarter dans « Messages à envoyer »."}</span> : (<>
              <button onClick={() => repondre(m.id, "oui")} className="rounded-full bg-good/10 px-3 py-1 font-semibold text-good hover:bg-good/20">Oui</button>
              <button onClick={() => repondre(m.id, "non")} className="rounded-full bg-paper px-3 py-1 font-semibold text-ink-soft hover:text-ink">Pas tel quel</button>
            </>)}
          </div>
        </article>
      ))}
    </div>
  );
}
