import { useEffect, useState } from "react";
import { fn, supabase } from "../lib/supabase";
import { useWs } from "../lib/ws";
import { Button, Card, Field, Input, Textarea, useToast } from "../components/ui";
import Logo from "../components/Logo";
import BizType from "../components/BizType";
import { PRESETS, fmtN, parseZone, zoneLabel } from "../lib/zones";
import { cx } from "../lib/utils";

const STEPS = ["Je lis ton site", "Je comprends ce que tu vends", "Je cherche qui en a besoin", "Je compte combien il en existe"];

function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, STEPS.length - 1)), 6500); return () => clearInterval(t); }, []);
  return (
    <div className="py-6">
      {STEPS.map((s, k) => (
        <div key={s} className={cx("flex items-center gap-3 py-2 text-lg transition", k > i ? "opacity-25" : "")}>
          <span className={cx("w-2.5 h-2.5 rounded-full", k < i ? "bg-good" : k === i ? "bg-accent pulse-dot" : "bg-line")} />
          {s}{k === i && "…"}
        </div>
      ))}
      <p className="text-sm text-ink-soft mt-4">Environ 30 secondes.</p>
    </div>
  );
}

export default function Onboarding() {
  const { ws, create, reload, patch } = useWs();
  const toast = useToast();
  const [step, setStep] = useState(ws?.targets?.length ? 1 : 0);
  const [site, setSite] = useState(ws?.website ?? "");
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
      toast(`${r.inserted} prospects trouvés`, "good");
      await reload();
    } catch (e) { toast(e.message, "bad"); setStep(2); } finally { setBusy(false); }
  };

  const active = draft?.targets?.filter((t) => t.actif !== false) ?? [];
  const total = active.reduce((s, t) => s + (t.total ?? 0), 0);

  return (
    <div className="min-h-full px-4 py-6 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Logo />
          <span className="text-sm text-ink-soft tnum">Étape {Math.min(step + 1, 3)} sur 3</span>
        </div>

        {step === 0 && (
          <div className="rise">
            <h1 className="font-serif text-5xl leading-[1] tracking-tight">Quel est ton site&nbsp;?</h1>
            <p className="text-ink-soft mt-3 text-lg">Je le lis, je comprends ce que tu vends, et je te montre qui en a besoin.</p>
            {busy ? <Thinking /> : (
              <div className="mt-8 space-y-4">
                <Input autoFocus placeholder="monentreprise.fr" value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={(e) => e.key === "Enter" && analyzeSite()} className="text-lg py-3.5" />
                {showDesc ? (
                  <Field label="Décris ton activité en quelques phrases" hint="Ce que tu vends, à qui, où tu interviens, ce qui te distingue.">
                    <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
                  </Field>
                ) : (
                  <button className="text-sm text-ink-soft hover:text-ink underline underline-offset-4" onClick={() => setShowDesc(true)}>Pas de site, ou envie de préciser ? Décris ton activité</button>
                )}
                <Button variant="accent" size="lg" onClick={analyzeSite}>Analyser mon entreprise →</Button>
              </div>
            )}
          </div>
        )}

        {step === 1 && draft && (
          <div className="rise space-y-6">
            <div>
              <p className="text-sm font-semibold text-accent">Voici ce que j'ai compris</p>
              <h1 className="font-serif text-4xl sm:text-5xl leading-[1] tracking-tight mt-2">{draft.profile?.nom || "Ton entreprise"}</h1>
              <p className="text-lg mt-3">{draft.profile?.resume}</p>
            </div>
            <Card className="p-5 space-y-3">
              <Field label="Ce que tu vends"><Textarea rows={2} value={draft.profile?.offre ?? ""} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, offre: e.target.value } })} /></Field>
              <Field label="Ce qui te distingue"><Textarea rows={2} value={draft.profile?.differenciation ?? ""} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, differenciation: e.target.value } })} /></Field>
              <Field label="Ton type d'entreprise" hint="Bingoo adapte ce qu'il cherche pour toi. Corrige si besoin.">
                <BizType value={draft.profile?.type} onChange={(v) => setDraft({ ...draft, profile: { ...draft.profile, type: v } })}
                  publicValue={draft.profile?.vend_public} onPublic={(v) => setDraft({ ...draft, profile: { ...draft.profile, vend_public: v } })} />
              </Field>
            </Card>

            <div>
              <h2 className="text-lg font-semibold">Où prospecter</h2>
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
              <h2 className="text-lg font-semibold">Tes clients idéaux <span className="text-ink-soft font-normal">· {fmtN(total)} établissements</span></h2>
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
                      {t.interlocuteur && <span className="block text-xs text-ink-faint mt-1.5">J'écrirai à : {t.interlocuteur}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="accent" size="lg" disabled={!active.length || busy} onClick={() => setStep(2)}>C'est bien ça →</Button>
              <Button variant="ghost" onClick={() => setStep(0)}>Recommencer l'analyse</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rise">
            <h1 className="font-serif text-5xl leading-[1] tracking-tight">Au nom de qui j'écris&nbsp;?</h1>
            <p className="text-ink-soft mt-3 text-lg">Les messages partiront signés de ton nom. Tu pourras tout modifier ensuite.</p>
            <Card className="p-5 mt-8 space-y-4">
              <Field label="Ton prénom et ton nom"><Input autoFocus value={sender.sender_name} onChange={(e) => setSender({ ...sender, sender_name: e.target.value })} placeholder="Camille Martin" /></Field>
              <Field label="Adresse postale de l'entreprise" hint="Obligatoire en bas des e-mails de prospection.">
                <Input value={sender.postal_address} onChange={(e) => setSender({ ...sender, postal_address: e.target.value })} placeholder="12 rue de la Paix, 75002 Paris" />
              </Field>
            </Card>
            <div className="flex gap-3 mt-6">
              <Button variant="accent" size="lg" loading={busy} onClick={launch}>Trouver mes premiers prospects →</Button>
              <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rise">
            <h1 className="font-serif text-5xl leading-[1] tracking-tight">Je cherche tes prospects…</h1>
            <p className="text-ink-soft mt-3 text-lg">Je parcours le registre officiel des entreprises pour chacune de tes cibles.</p>
            <div className="mt-8 h-1.5 bg-line rounded-full overflow-hidden"><div className="h-full w-1/3 bg-accent rounded-full animate-pulse" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
