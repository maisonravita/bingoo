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
const HFONT = { fontFamily: "Nunito, Geist, system-ui, sans-serif" };
const PROGRESS = ["Ton site", "C'est parti"];

export default function Onboarding() {
  const { ws, create, reload, patch } = useWs();
  const toast = useToast();
  const [step, setStep] = useState(ws?.targets?.length ? 1 : 0);
  const [site, setSite] = useState((ws?.website ?? "").replace(/^https?:\/\//i, "").replace(/\/$/, ""));
  const [desc, setDesc] = useState("");
  const [showDesc, setShowDesc] = useState(false);
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
      const r = await fn("analyze", { workspace_id: id, website: site.trim(), description: desc.trim() });
      await reload();
      setDraft((d) => ({ ...(d ?? {}), id, profile: r.profile, targets: r.targets, zone: r.zone }));
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

  const launch = async () => {
    if (!sender.sender_name.trim()) return toast("Indique ton prénom et ton nom", "bad");
    setBusy(true);
    try {
      await patch({ targets: draft.targets, profile: draft.profile, sender_name: sender.sender_name.trim(), postal_address: sender.postal_address.trim(), name: draft.profile?.nom || ws.name });
      setStep(3);
      const r = await fn("search", { workspace_id: ws.id, pages: 1 });
      await supabase.from("workspaces").update({ onboarded: true }).eq("id", ws.id);
      // Premier Radar tout de suite (sources officielles, sans recherche web) : le client ne découvre jamais un Radar vide
      fn("r/radar-scan", { workspace_id: ws.id, web: false }).catch(() => {});
      toast(`${r.inserted} prospects trouvés`, "good");
      await reload();
      // Le premier « waouh » : l'équipe part dans la ville du client et lui montre ses premières entreprises
      if (r.inserted > 0) window.location.href = "/qg/?premiere=1";
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
            <span className="tnum">Étape {Math.min(step + 1, 2)} sur 2</span>
            <button type="button" onClick={() => supabase.auth.signOut()} className="font-semibold hover:text-ink">Se déconnecter</button>
          </span>
        </div>
        {/* Progression */}
        <div className="grid grid-cols-2 gap-2 mb-8" aria-hidden>
          {PROGRESS.map((l, k) => (
            <div key={l}>
              <div className="h-1.5 rounded-full bg-line overflow-hidden"><div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: (step >= 3 ? 2 : Math.min(step, 1)) > k ? "100%" : Math.min(step, 1) === k ? "50%" : "0%" }} /></div>
              <p className={cx("mt-1.5 text-[12px] font-semibold", Math.min(step, 1) >= k ? "text-ink" : "text-ink-faint")}>{l}</p>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft text-accent-dark px-3 py-1 text-[12.5px] font-bold">Bienvenue sur Bingoo!</span>
            <h1 className={cx(H, "mt-4 text-[34px] sm:text-[44px]")} style={HFONT}>Commençons par ton site.</h1>
            <p className="text-ink-soft mt-3 text-[17px]">Je le lis, je comprends ce que tu vends, puis je te montre qui en a besoin. Tu ne sais pas encore qui sont tes clients ? C'est mon travail : je te propose plusieurs pistes et je garde celles qui répondent.</p>
            {busy ? <Thinking site={site} /> : (<>
              <div className="mt-7 grid grid-cols-2 rounded-full bg-paper border border-line p-1 max-w-sm" role="tablist">
                {[[false, "J'ai un site"], [true, "Pas de site"]].map(([v, l]) => (
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
                      <input autoFocus aria-label="Adresse de ton site" placeholder="monentreprise.fr" value={site} onChange={(e) => setSite(e.target.value.replace(/^https?:\/\//i, ""))} className="flex-1 min-w-0 bg-transparent py-4 text-[17px] outline-none" />
                    </label>
                    <button type="submit" className="rounded-2xl bg-accent text-white px-7 py-4 text-[16px] font-bold hover:bg-accent-dark active:scale-[0.98] transition whitespace-nowrap">Analyser mon site →</button>
                  </div>
                ) : (<>
                  <label className="block">
                    <span className="block text-[13px] font-semibold mb-1.5">Décris ton activité en quelques phrases</span>
                    <Textarea autoFocus rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex. Une application qui automatise les notes de frais : photo du ticket, catégorie, export comptable. Pour l'instant quelques utilisateurs, je ne sais pas encore quel type d'entreprise viser." />
                    <span className="block text-xs text-ink-soft mt-1.5">Ce que tu vends et le problème que ça règle. Si tu ne sais pas à qui le vendre, dis-le simplement.</span>
                  </label>
                  <button type="submit" className="w-full sm:w-auto rounded-2xl bg-accent text-white px-7 py-4 text-[16px] font-bold hover:bg-accent-dark active:scale-[0.98] transition">Analyser mon activité →</button>
                </>)}
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
              <summary className="cursor-pointer list-none px-5 py-3.5 text-[15px] flex items-center justify-between">Corriger mon offre, mes cibles ou ma zone<span className="text-ink-soft group-open:rotate-90 transition">›</span></summary>
              <div className="px-5 pb-5 space-y-8">
            <div className="rounded-2xl bg-paper border border-line p-5 space-y-3">
              <Field label="Ce que tu vends"><Textarea rows={2} value={draft.profile?.offre ?? ""} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, offre: e.target.value } })} /></Field>
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
              <Field label="Adresse postale de l'entreprise" hint="Obligatoire en bas des e-mails de prospection : sans elle, aucun message ne peut partir.">
                <Input value={sender.postal_address} onChange={(e) => setSender({ ...sender, postal_address: e.target.value })} placeholder="12 rue de la Paix, 75002 Paris" />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3 items-center pt-6 border-t border-line">
              <Button variant="accent" size="lg" loading={busy} disabled={!active.length} onClick={launch}>Voir mes premières opportunités →</Button>
              <Button variant="ghost" onClick={() => setStep(0)}>Recommencer l'analyse</Button>
            </div>
            <p className="text-[13px] text-ink-soft">Rien ne part sans ta validation.</p>
          </div>
        )}

        {step === 3 && (
          <div className="rise rounded-3xl bg-white border border-line shadow-[0_24px_60px_-34px_rgba(21,22,26,.35)] p-6 sm:p-9">
            <h1 className={cx(H, "text-[34px] sm:text-[44px]")} style={HFONT}>Je prépare ton espace…</h1>
            <p className="text-ink-soft mt-3 text-[17px]">Quelques secondes : je trouve tes premiers prospects et je lance ton Radar.</p>
            <ul className="mt-8 space-y-3">
              {[["Je parcours le registre officiel des entreprises", 0], ["Je retiens celles qui correspondent à tes cibles", 1.2], ["Je lance ton premier Radar sur les sources officielles", 2.4]].map(([t, d]) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl bg-paper border border-line px-4 py-3.5 text-[15px] rise" style={{ animationDelay: `${d}s` }}>
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />{t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
